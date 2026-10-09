// Calendar event rules shared by the event sheet, Calendar and application detail. Pure: unit-tested.
import type { Application, ApplicationStatus, Event, EventKind } from '../types';

export const EVENT_KINDS: { value: EventKind; label: string; icon: string }[] = [
  { value: 'interview', label: 'Interview', icon: 'people-outline' },
  { value: 'deadline', label: 'Deadline', icon: 'flag-outline' },
  { value: 'assessment', label: 'Assessment', icon: 'clipboard-outline' },
  { value: 'follow_up', label: 'Follow-up', icon: 'mail-outline' },
  { value: 'other', label: 'Other', icon: 'calendar-outline' },
];
export const kindOf = (e: Pick<Event, 'kind'>): EventKind => e.kind ?? 'other';
export const kindInfo = (k: EventKind) => EVENT_KINDS.find(x => x.value === k)!;

export const REMINDERS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' }, { value: 0, label: 'At time' }, { value: 15, label: '15 min before' },
  { value: 60, label: '1 hour before' }, { value: 1440, label: '1 day before' },
];
export const reminderLabel = (m: number | null | undefined) => REMINDERS.find(r => r.value === (m ?? null))?.label ?? `${m} min before`;

/** Title from the job, so most events need no typing. */
export function suggestTitle(kind: EventKind, a: Pick<Application, 'company' | 'title'> | null) {
  const at = a?.company.trim() || a?.title.trim() || '';
  if (!at) return kind === 'other' ? '' : kindInfo(kind).label;
  return { interview: `Interview with ${at}`, deadline: `Application deadline · ${at}`, assessment: `Assessment · ${at}`, follow_up: `Follow up with ${at}`, other: at }[kind];
}

/** The kind of event someone at this stage most likely wants to add. */
export function defaultKind(status: ApplicationStatus): EventKind {
  return status === 'interested' || status === 'offer' ? 'deadline' : status === 'applied' ? 'follow_up' : status === 'interview' ? 'interview' : 'other';
}

/** Another event for the same job, kind and minute: saving would create a duplicate. */
export function findDuplicate(events: Event[], e: Pick<Event, 'id' | 'applicationId' | 'date' | 'kind'>) {
  const minute = (d: string) => Math.floor(Date.parse(d) / 60000);
  return events.find(x => x.id !== e.id && x.applicationId === e.applicationId && kindOf(x) === kindOf(e) && minute(x.date) === minute(e.date));
}

/** When the reminder should fire, or null when there's no reminder or that moment has passed. */
export function reminderAt(e: Pick<Event, 'date' | 'reminderMinutes'>, now = Date.now()) {
  if (e.reminderMinutes == null) return null;
  const t = Date.parse(e.date) - e.reminderMinutes * 60000;
  return t > now ? new Date(t) : null;
}

/** Local "YYYY-MM-DDTHH:mm:00", the format events have always been stored in (no timezone shift). */
export function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export const upcomingFor = (events: Event[], applicationId: string, now = Date.now()) =>
  events.filter(e => e.applicationId === applicationId && Date.parse(e.date) >= now).sort((a, b) => a.date.localeCompare(b.date));
