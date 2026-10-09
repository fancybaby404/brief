// Resolves what the user is talking about to real records. The model never supplies record IDs:
// it can only name a company or role, and this code maps names to IDs (or asks which one).
import type { Application, Event, EventKind } from '../../types';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
const GENERIC = new Set(['inc', 'llc', 'ltd', 'corp', 'co', 'company', 'the', 'group', 'technologies', 'technology', 'labs', 'solutions', 'services', 'and', 'of', 'ph', 'philippines', 'global']);
const TITLE_STOP = new Set(['senior', 'junior', 'jr', 'sr', 'lead', 'i', 'ii', 'iii', 'remote', 'the', 'a', 'an', 'and', 'of', 'for', 'to', 'in', 'at', 'with', 'level', 'entry', 'mid', 'staff', 'part', 'time', 'full', 'contract']);

/** How strongly the message mentions this application: whole company name 10, a distinctive company word 6, each title word 2. */
export function mentionScore(text: string, a: Application) {
  const t = ` ${norm(text)} `, company = norm(a.company);
  let score = 0;
  if (company && t.includes(` ${company} `)) score += 10;
  else for (const w of company.split(' ')) if (w.length > 2 && !GENERIC.has(w) && t.includes(` ${w} `)) { score += 6; break; }
  for (const w of new Set(norm(a.title).split(' '))) if (w.length > 2 && !TITLE_STOP.has(w) && t.includes(` ${w} `)) score += 2;
  return score;
}

export type Resolution<T> = { kind: 'one'; item: T } | { kind: 'many'; items: T[] } | { kind: 'none' };

/** Finds the application a message refers to. A job named in the message wins; otherwise follow-ups
 *  ("Am I qualified?", "delete it") mean the job the conversation is focused on. */
export function resolveApplication(text: string, apps: Application[], focusId?: string | null): Resolution<Application> {
  const scored = apps.map(a => ({ a, s: mentionScore(text, a) })).filter(x => x.s >= 4).sort((x, y) => y.s - x.s);
  if (scored.length) {
    const top = scored.filter(x => x.s === scored[0].s).map(x => x.a);
    return top.length === 1 ? { kind: 'one', item: top[0] } : { kind: 'many', items: top };
  }
  const focused = focusId ? apps.find(a => a.id === focusId) : undefined;
  return focused ? { kind: 'one', item: focused } : { kind: 'none' };
}

/** Same, but only when the message names a job (no fallback to the focused one). */
export function namedApplication(text: string, apps: Application[]): Resolution<Application> {
  return resolveApplication(text, apps, null);
}

/** Finds the event a message refers to: by linked job and/or kind, upcoming first. */
export function resolveEvent(text: string, events: Event[], apps: Application[], focusId: string | null | undefined, kind?: EventKind, now = Date.now()): Resolution<Event> {
  const job = namedApplication(text, apps);
  const jobIds = job.kind === 'one' ? [job.item.id] : job.kind === 'many' ? job.items.map(a => a.id) : focusId ? [focusId] : null;
  let pool = events.filter(e => Date.parse(e.date) >= now - 3600000);
  if (jobIds) pool = pool.filter(e => e.applicationId && jobIds.includes(e.applicationId));
  if (kind) pool = pool.filter(e => (e.kind ?? 'other') === kind);
  pool.sort((a, b) => a.date.localeCompare(b.date));
  if (!pool.length) return { kind: 'none' };
  return pool.length === 1 ? { kind: 'one', item: pool[0] } : { kind: 'many', items: pool };
}

/** Same company and (near-)same title already saved: importing again would duplicate it. */
export function findDuplicateApplication(apps: Application[], company: string, title: string) {
  const c = norm(company), t = norm(title);
  if (!c || !t) return undefined;
  return apps.find(a => { const at = norm(a.title); return norm(a.company) === c && !!at && (at === t || at.includes(t) || t.includes(at)); });
}
