import type { Application, ApplicationStatus } from '../types';

export const STATUS_ORDER: ApplicationStatus[] = ['interested', 'applied', 'under_review', 'interview', 'offer', 'rejected'];
export const isApplied = (a: Application) => a.status !== 'interested';
/** Rows saved before 'saved' merged into 'interested' load as 'interested'. */
export const normalizeApplication = (a: Application): Application => ((a.status as string) === 'saved' ? { ...a, status: 'interested' } : a);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK = 7 * 86400000;

export type ProgressRange = '4w' | '8w' | '6m';
export const RANGES: { value: ProgressRange; label: string }[] = [
  { value: '4w', label: 'Last 4 weeks' }, { value: '8w', label: 'Last 8 weeks' }, { value: '6m', label: 'Last 6 months' },
];

/** Applications the user reported as applied (or further), oldest bucket first:
 *  rolling weeks labelled by start date, or calendar months for '6m'. */
export function progressBuckets(apps: Application[], now = Date.now(), range: ProgressRange = '4w') {
  const times = apps.filter(isApplied).map(a => new Date(a.appliedAt || a.createdAt).getTime());
  const count = (since: number, until: number) => times.filter(t => t >= since && t < until).length;
  if (range === '6m') {
    const d = new Date(now);
    return [5, 4, 3, 2, 1, 0].map(ago => {
      const start = new Date(d.getFullYear(), d.getMonth() - ago, 1), end = new Date(d.getFullYear(), d.getMonth() - ago + 1, 1);
      return { label: MONTHS[start.getMonth()], count: count(start.getTime(), end.getTime()) };
    });
  }
  const weeks = range === '8w' ? 8 : 4;
  return Array.from({ length: weeks }, (_, i) => weeks - 1 - i).map(weeksAgo => {
    const until = now - weeksAgo * WEEK, since = until - WEEK, start = new Date(since);
    return { label: `${MONTHS[start.getMonth()]} ${start.getDate()}`, count: count(since, until) };
  });
}

/** Round gridline values (1/2/5 × 10ⁿ steps, about 3 intervals) from 0 up to ≥ max. */
export function niceAxis(max: number) {
  if (max <= 0) return [0, 1, 2, 3];
  const raw = max / 3, pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw)!;
  const ticks = [];
  for (let v = 0; v < max + step; v += step) { ticks.push(v); if (v >= max) break; }
  return ticks;
}

export type SortKey = 'newest' | 'oldest' | 'company' | 'status';
export function filterSortApplications(apps: Application[], query: string, sort: SortKey) {
  const q = query.trim().toLowerCase();
  const rank = (a: Application) => STATUS_ORDER.indexOf(a.status);
  return apps
    .filter(a => !q || `${a.company} ${a.title}`.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'company' ? a.company.localeCompare(b.company)
      : sort === 'status' ? rank(a) - rank(b)
      : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt));
}
