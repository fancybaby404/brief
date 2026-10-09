import type { RemoteJob } from '../types';
import { htmlToText } from './format';
import { formatPay, type Pay, type Period } from './currency';
// Public endpoint, remote positions only. Jobicy terms: credit Jobicy with a link and send
// every apply action to the original job URL from the feed.
export const JOBICY_CREDIT_URL = 'https://jobicy.com';

const PERIODS: Record<string, Period> = { yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
function pay(j: any): Pay | undefined {
  const rawMin=Number(j.salaryMin),rawMax=Number(j.salaryMax);
  const min=Number.isFinite(rawMin)&&rawMin>0?rawMin:0,max=Number.isFinite(rawMax)&&rawMax>0?rawMax:0;
  if (!min && !max) return undefined;
  return { min, max, currency: String(j.salaryCurrency || '').trim().toUpperCase(), period: PERIODS[String(j.salaryPeriod || '').toLowerCase()] ?? '' };
}
const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map(String);
const list = (v: unknown) => arr(v).join(', ');
const LEVELS: Record<string, string> = { Midweight: 'Mid-level', 'Entry-Level, Junior': 'Entry-level', 'Entry-Level': 'Entry-level' };
const level = (raw: unknown) => (raw && raw !== 'Any' ? LEVELS[String(raw)] || String(raw) : '');

export function mapJobicyJob(j: any): RemoteJob {
  const p = pay(j);
  return {
    id: String(j.id), company: j.companyName || 'Company not listed', title: j.jobTitle || 'Untitled role',
    location: String(j.jobGeo || 'Remote').replace(/\s*,\s*/g, ', '), employmentType: list(j.jobType),
    salary: p ? formatPay(p, 'original', null).text : '', pay: p,
    description: htmlToText(j.jobDescription || ''), url: j.url || '', logo: j.companyLogo || '',
    level: level(j.jobLevel), industry: arr(j.jobIndustry)[0] || '', postedAt: String(j.pubDate || ''),
    // Chips: industry + seniority as the provider states them ("Any" level says nothing).
    tags: [...arr(j.jobIndustry), level(j.jobLevel)].filter(Boolean),
  };
}

// Jobicy industry slugs and names (from ?get=industries, checked 2026-10-09).
export const INDUSTRIES: { value: string; label: string }[] = [
  ['admin-support', 'Admin & Virtual Assistance'], ['business', 'Business Development'], ['copywriting', 'Content & Editorial'],
  ['design-multimedia', 'Creative & Design'], ['supporting', 'Customer Support & Success'], ['cybersecurity', 'Cybersecurity'],
  ['data-science', 'Data Science & Analytics'], ['admin', 'DevOps & Infrastructure'], ['education', 'Education & E-learning'],
  ['accounting-finance', 'Finance & Accounting'], ['healthcare', 'Healthcare & Medical'], ['hr', 'HR & Recruiting'],
  ['legal', 'Legal & Compliance'], ['marketing', 'Marketing & Sales'], ['management', 'Product & Operations'],
  ['project-management', 'Project & Program Management'], ['qa-testing', 'QA & Testing'], ['seller', 'Sales'], ['seo', 'SEO'],
  ['engineering', 'Software Engineering'], ['technical-support', 'Technical Support'], ['web-app-design', 'Web, UI & UX Design'],
].map(([value, label]) => ({ value, label }));

/** geo and industry go to the API; type, experience, salary and recency are matched on-device (the API has no such params). */
export type JobFilters = {
  geo: 'philippines' | 'apac' | '';
  industry: string;
  type: '' | 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship';
  level: '' | 'Entry-level' | 'Mid-level' | 'Senior' | 'Director';
  salaryOnly: boolean;
  posted: 0 | 1 | 3 | 7; // days; 0 = any time
};
export const DEFAULT_FILTERS: JobFilters = { geo: 'philippines', industry: '', type: '', level: '', salaryOnly: false, posted: 0 };
export function jobsUrl(query: string, f: JobFilters) {
  return 'https://jobicy.com/api/v2/remote-jobs?count=50' + (f.geo ? '&geo=' + f.geo : '') + (f.industry ? '&industry=' + f.industry : '') + (query.trim() ? '&tag=' + encodeURIComponent(query.trim()) : '');
}
export function applyFilters(jobs: RemoteJob[], f: JobFilters, now = Date.now()) {
  return jobs.filter(j =>
    (!f.type || j.employmentType.split(', ').includes(f.type)) &&
    (!f.level || !j.level || j.level === f.level) && // a job open to any level matches every level
    (!f.salaryOnly || !!j.pay) &&
    (!f.posted || (!!j.postedAt && now - new Date(j.postedAt).getTime() <= f.posted * 86400000)));
}
export const activeFilterCount = (f: JobFilters) =>
  (Object.keys(DEFAULT_FILTERS) as (keyof JobFilters)[]).filter(k => f[k] !== DEFAULT_FILTERS[k]).length;

/** 'offline' = the request never reached the provider; 'server' = it answered with a failure. Screens show different states. */
export class JobsError extends Error {
  kind: 'offline' | 'server';
  constructor(kind: 'offline' | 'server', message: string) { super(message); this.kind = kind; }
}

/** One Jobicy request, unfiltered (type/level/salary/posted are applied on-device, so they never need a refetch).
 *  Times out after 15 s; an aborted request rejects with an AbortError. */
export async function fetchJobicy(url: string, signal?: AbortSignal): Promise<RemoteJob[]> {
  const timeout = new AbortController(), t = setTimeout(() => timeout.abort(), 15000);
  signal?.addEventListener('abort', () => timeout.abort());
  let r: Response;
  try { r = await fetch(url, { headers: { Accept: 'application/json' }, signal: timeout.signal }); }
  catch (e) {
    if (signal?.aborted) throw e;
    throw new JobsError('offline', timeout.signal.aborted ? 'Jobicy took too long to respond. Check your connection and try again.' : 'Job discovery needs an internet connection. Your saved jobs still work offline.');
  } finally { clearTimeout(t); }
  if (!r.ok) throw new JobsError('server', `Jobicy isn’t responding right now (HTTP ${r.status}). Try again in a moment.`);
  let data: any;
  try { data = await r.json(); } catch { throw new JobsError('server', 'Jobicy sent an unreadable response. Try again in a moment.'); }
  if (data.success === false) throw new JobsError('server', data.error || 'Jobicy couldn’t load jobs right now.');
  return (Array.isArray(data.jobs) ? data.jobs : []).map(mapJobicyJob);
}

/** Cached listings count as fresh for 15 minutes; older ones are shown at once and refreshed in the background. */
export const JOBS_FRESH_MS = 15 * 60 * 1000;
export const freshness = (fetchedAt: number | undefined, now = Date.now()) => (fetchedAt === undefined ? 'none' : now - fetchedAt < JOBS_FRESH_MS ? 'fresh' : 'stale');
/** What decides a server request: the URL (geo, industry, keywords). Client-side filters are not part of it. */
export const jobsCacheKey = (query: string, f: JobFilters) => 'jobs:' + jobsUrl(query, f);

export async function fetchRemoteJobs(query = '', filters: JobFilters = DEFAULT_FILTERS): Promise<RemoteJob[]> {
  return applyFilters(await fetchJobicy(jobsUrl(query, filters)), filters);
}
