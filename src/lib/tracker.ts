import type { Application, ApplicationStatus, Event } from '../types';

export const STATUS_ORDER: ApplicationStatus[] = ['interested', 'applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn'];
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: 'Interested', applied: 'Applied', under_review: 'In review', interview: 'Interview',
  offer: 'Offer', rejected: 'Not selected', withdrawn: 'Withdrawn',
};
/** Statuses that imply the user sent an application. Withdrawn counts only with an applied date. */
const SENT: ApplicationStatus[] = ['applied', 'under_review', 'interview', 'offer', 'rejected'];
export const isApplied = (a: Application) => a.status !== 'interested' && (!!a.appliedAt || SENT.includes(a.status));
export const isClosed = (s: ApplicationStatus) => s === 'rejected' || s === 'withdrawn';

/** Records a status move in the application's history (and its applied date the first time it's sent).
 *  A quick change back within a minute rewrites the last entry instead of piling up mis-taps. */
export function trackStatus(prev: Application | undefined, next: Application, now = new Date().toISOString()): Application {
  if (!prev || prev.status === next.status) return next;
  // Back to Interested means not applied (yet): the date goes, so the progress chart stops counting it.
  const appliedAt = next.status === 'interested' ? null : next.appliedAt || (SENT.slice(0, 4).includes(next.status) ? now : null);
  const log = [...(prev.activity ?? [])], last = log[log.length - 1];
  if (last && last.to === prev.status && Date.parse(now) - Date.parse(last.at) < 60000) {
    log.pop();
    if (last.from !== next.status) log.push({ at: now, from: last.from, to: next.status });
  } else log.push({ at: now, from: prev.status, to: next.status });
  return { ...next, appliedAt, activity: log };
}

export type ActivityItem = { key: string; at: string; kind: 'saved' | 'status' | 'event'; status?: ApplicationStatus; event?: Event };
/** Newest first: saved, each status move (or the legacy applied date), and events scheduled for this job. */
export function buildActivity(a: Application, events: Event[]): ActivityItem[] {
  const items: ActivityItem[] = [{ key: 'saved', at: a.createdAt, kind: 'saved' }];
  const log = a.activity ?? [];
  log.forEach((c, i) => items.push({ key: `status-${i}`, at: c.at, kind: 'status', status: c.to }));
  if (!log.length && a.appliedAt) items.push({ key: 'applied', at: a.appliedAt, kind: 'status', status: 'applied' });
  for (const e of events) if (e.applicationId === a.id) items.push({ key: e.id, at: e.createdAt || e.date, kind: 'event', event: e });
  return items.sort((x, y) => Date.parse(y.at) - Date.parse(x.at)); // parse: event dates are local, the rest UTC
}

/** When the current status last changed (falls back to applied, then saved). */
export const statusSince = (a: Application) => a.activity?.[a.activity.length - 1]?.at || (a.status !== 'interested' && a.appliedAt) || a.createdAt;

export type NextAction = 'mark_applied' | 'deadline' | 'open_posting' | 'follow_up' | 'practice' | 'add_event' | 'schedule_interview' | 'review_offer' | 'decision_deadline' | 'offer_notes';
/** What makes sense to do next at each stage. Closed applications get none: their history stays, actions don't. */
export function nextActions(status: ApplicationStatus, o: { hasPosting: boolean; hasInterview: boolean }): NextAction[] {
  switch (status) {
    case 'interested': return ['mark_applied', 'deadline', ...(o.hasPosting ? ['open_posting' as const] : [])];
    case 'applied': return ['follow_up', 'practice'];
    case 'under_review': return ['follow_up', 'add_event'];
    case 'interview': return [...(o.hasInterview ? [] : ['schedule_interview' as const]), 'practice'];
    case 'offer': return ['review_offer', 'decision_deadline', 'offer_notes'];
    default: return [];
  }
}
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
