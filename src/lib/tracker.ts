import type { Application, ApplicationStatus } from '../types';

export const STATUS_ORDER: ApplicationStatus[] = ['saved', 'interested', 'applied', 'under_review', 'interview', 'offer', 'rejected'];
export const isApplied = (a: Application) => a.status !== 'saved' && a.status !== 'interested';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK = 7 * 86400000;

/** Applications the user reported as applied (or further), per rolling week, oldest first. */
export function progressBuckets(apps: Application[], now = Date.now()) {
  const times = apps.filter(isApplied).map(a => new Date(a.appliedAt || a.createdAt).getTime());
  return [3, 2, 1, 0].map(weeksAgo => {
    const until = now - weeksAgo * WEEK, since = until - WEEK, start = new Date(since);
    return { label: `${MONTHS[start.getMonth()]} ${start.getDate()}`, count: times.filter(t => t >= since && t < until).length };
  });
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
