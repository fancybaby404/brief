import type { RemoteJob } from '../types';
import { htmlToText } from './format';
// Public endpoint, remote positions only. Jobicy terms: credit Jobicy with a link and send
// every apply action to the original job URL from the feed.
export const JOBICY_CREDIT_URL = 'https://jobicy.com';

const periods: Record<string, string> = { yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
function salary(j: any) {
  const n = (v: unknown) => Number(v).toLocaleString('en-US');
  if (!j.salaryMin && !j.salaryMax) return '';
  const range = j.salaryMin && j.salaryMax ? `${n(j.salaryMin)}–${n(j.salaryMax)}` : n(j.salaryMin || j.salaryMax);
  const period = periods[String(j.salaryPeriod)] ? ` / ${periods[String(j.salaryPeriod)]}` : '';
  return `${range}${j.salaryCurrency ? ' ' + j.salaryCurrency : ''}${period}`;
}
const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map(String);
const list = (v: unknown) => arr(v).join(', ');
const LEVELS: Record<string, string> = { Midweight: 'Mid-level', 'Entry-Level, Junior': 'Entry-level', 'Entry-Level': 'Entry-level' };

export function mapJobicyJob(j: any): RemoteJob {
  return {
    id: String(j.id), company: j.companyName || 'Company not listed', title: j.jobTitle || 'Untitled role',
    location: String(j.jobGeo || 'Remote').replace(/\s*,\s*/g, ', '), salary: salary(j), employmentType: list(j.jobType),
    description: htmlToText(j.jobDescription || ''), url: j.url || '', logo: j.companyLogo || '',
    // Chips: industry + seniority as the provider states them ("Any" level says nothing).
    tags: [...arr(j.jobIndustry), j.jobLevel && j.jobLevel !== 'Any' ? LEVELS[j.jobLevel] || String(j.jobLevel) : ''].filter(Boolean),
  };
}

/** geo is a Jobicy geoSlug ('' = all regions); type is matched on-device (the API has no type filter). */
export type JobFilters = { geo: 'philippines' | 'apac' | ''; type: '' | 'Full-Time' | 'Part-Time' | 'Contract' };
export const DEFAULT_FILTERS: JobFilters = { geo: 'philippines', type: '' };
export function jobsUrl(query: string, f: JobFilters) {
  return 'https://jobicy.com/api/v2/remote-jobs?count=50' + (f.geo ? '&geo=' + f.geo : '') + (query.trim() ? '&tag=' + encodeURIComponent(query.trim()) : '');
}
export const filterByType = (jobs: RemoteJob[], type: JobFilters['type']) =>
  type ? jobs.filter(j => j.employmentType.split(', ').includes(type)) : jobs;

export async function fetchRemoteJobs(query = '', filters: JobFilters = DEFAULT_FILTERS): Promise<RemoteJob[]> {
  const url = jobsUrl(query, filters);
  let r: Response;
  try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
  catch { throw new Error("You're offline. Job discovery needs internet; your saved jobs still work."); }
  if (!r.ok) throw new Error(`Job discovery unavailable (HTTP ${r.status}). Your saved jobs still work offline.`);
  const data = await r.json();
  if (data.success === false) throw new Error(data.error || 'Could not load jobs');
  return filterByType((Array.isArray(data.jobs) ? data.jobs : []).map(mapJobicyJob), filters.type);
}
