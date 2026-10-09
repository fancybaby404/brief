import type { RemoteJob } from '../types';
// Public endpoint, remote positions only. Jobicy terms: credit Jobicy with a link and send
// every apply action to the original job URL from the feed.
export const JOBICY_CREDIT_URL = 'https://jobicy.com';

const entities: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', bull: '•' };
export function htmlToText(html: string) {
  return html
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>|<\/(p|div|h\d|li|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

const periods: Record<string, string> = { yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
function salary(j: any) {
  const n = (v: unknown) => Number(v).toLocaleString('en-US');
  if (!j.salaryMin && !j.salaryMax) return '';
  const range = j.salaryMin && j.salaryMax ? `${n(j.salaryMin)}–${n(j.salaryMax)}` : n(j.salaryMin || j.salaryMax);
  const period = periods[String(j.salaryPeriod)] ? ` / ${periods[String(j.salaryPeriod)]}` : '';
  return `${range}${j.salaryCurrency ? ' ' + j.salaryCurrency : ''}${period}`;
}
const list = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map(String).join(', ');

export function mapJobicyJob(j: any): RemoteJob {
  return {
    id: String(j.id), company: j.companyName || 'Company not listed', title: j.jobTitle || 'Untitled role',
    location: j.jobGeo || 'Remote', salary: salary(j), employmentType: list(j.jobType),
    description: htmlToText(j.jobDescription || ''), url: j.url || '',
  };
}

export async function fetchRemoteJobs(query = ''): Promise<RemoteJob[]> {
  const url = 'https://jobicy.com/api/v2/remote-jobs?count=40' + (query.trim() ? '&tag=' + encodeURIComponent(query.trim()) : '');
  let r: Response;
  try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
  catch { throw new Error("You're offline. Job discovery needs internet; your saved jobs still work."); }
  if (!r.ok) throw new Error(`Job discovery unavailable (HTTP ${r.status}). Your saved jobs still work offline.`);
  const data = await r.json();
  if (data.success === false) throw new Error(data.error || 'Could not load jobs');
  return (Array.isArray(data.jobs) ? data.jobs : []).map(mapJobicyJob);
}
