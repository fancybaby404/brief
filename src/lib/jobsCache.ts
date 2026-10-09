// Job listings cache. Memory first, then SQLite (survives restarts and works offline), then Jobicy.
// Identical concurrent requests share one fetch. Cached listings are shown as "saved at …", never as live.
import { cacheGet, cacheSet } from './db';
import { applyFilters, fetchJobicy, jobsCacheKey, jobsUrl, type JobFilters } from './jobs';
import { record } from './perf';
import type { RemoteJob } from '../types';

type Entry = { jobs: RemoteJob[]; fetchedAt: number };
const memory = new Map<string, Entry>(), inflight = new Map<string, Promise<Entry>>();

export type JobsResult = { jobs: RemoteJob[]; fetchedAt: number };

/** Cached listings for this search (filters applied), or null. Never touches the network. */
export async function peekJobs(query: string, f: JobFilters): Promise<JobsResult | null> {
  const key = jobsCacheKey(query, f);
  let e = memory.get(key);
  if (!e) { const row = await cacheGet<RemoteJob[]>(key).catch(() => null); if (row) { e = { jobs: row.value, fetchedAt: row.fetchedAt }; memory.set(key, e); } }
  return e ? { jobs: applyFilters(e.jobs, f), fetchedAt: e.fetchedAt } : null;
}

/** Network fetch for this search (deduplicated), cached on success. Throws JobsError (offline/server) or AbortError. */
export async function fetchJobs(query: string, f: JobFilters, signal?: AbortSignal): Promise<JobsResult> {
  const key = jobsCacheKey(query, f);
  let p = inflight.get(key);
  if (!p) {
    const t0 = Date.now();
    p = fetchJobicy(jobsUrl(query, f), signal).then(jobs => {
      const e = { jobs, fetchedAt: Date.now() };
      memory.set(key, e);
      record('jobs.fetch', Date.now() - t0);
      void cacheSet(key, jobs, e.fetchedAt).catch(() => {}); // persistence is best-effort; memory already has it
      return e;
    }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  const e = await p;
  return { jobs: applyFilters(e.jobs, f), fetchedAt: e.fetchedAt };
}
