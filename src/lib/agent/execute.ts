// Executes a confirmed proposal, then re-reads storage to confirm it really happened before
// reporting success. Each proposal runs at most once (double taps, re-renders, retries).
import { STATUS_LABEL } from '../tracker';
import type { AgentCard, AgentStore, Pending } from './types';

const executed = new Set<string>();
export type Outcome = { ok: true; message: string; undo?: Extract<AgentCard, { type: 'confirm' }>['undo'] } | { ok: false; message: string };

/** How a note will be stored: dated, so "next week" still makes sense later. Shown in the preview exactly. */
export const datedNote = (note: string, now = new Date()) => `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${note.trim()}`;
export const appendNote = (notes: string, line: string) => (notes.trim() ? `${notes.trimEnd()}\n\n${line}` : line);

export async function commit(p: Pending, store: AgentStore, now = new Date()): Promise<Outcome> {
  if (executed.has(p.id)) return { ok: false, message: 'Already done.' };
  executed.add(p.id);
  try {
    if (p.tool === 'deleteEvent') {
      const e = store.events.find(x => x.id === p.eventId);
      if (!e) return { ok: false, message: 'That event was already removed.' };
      await store.removeEvent(e.id);
      const fresh = await store.reload();
      if (fresh.events.some(x => x.id === e.id)) throw new Error('The event is still in your calendar.');
      return { ok: true, message: `Cancelled “${e.title}”.`, undo: { event: e } };
    }
    const a = store.applications.find(x => x.id === p.applicationId);
    if (!a) return { ok: false, message: 'That job is no longer in Brief.' };
    if (p.tool === 'deleteApplication') {
      const events = store.events.filter(e => e.applicationId === a.id);
      await store.removeApp(a.id);
      const fresh = await store.reload();
      if (fresh.applications.some(x => x.id === a.id)) throw new Error('The job is still saved.');
      return { ok: true, message: `Deleted ${a.title} at ${a.company}.`, undo: { app: a, events } };
    }
    if (p.tool === 'updateApplicationStatus') {
      await store.putApp({ ...a, status: p.status });
      const fresh = (await store.reload()).applications.find(x => x.id === a.id);
      if (fresh?.status !== p.status) throw new Error('The status didn’t change.');
      return { ok: true, message: `${a.company} is now ${STATUS_LABEL[p.status]}.` };
    }
    const line = datedNote(p.note, now);
    await store.putApp({ ...a, notes: appendNote(a.notes, line) });
    const fresh = (await store.reload()).applications.find(x => x.id === a.id);
    if (!fresh?.notes.includes(line)) throw new Error('The note wasn’t saved.');
    return { ok: true, message: `Note added to ${a.company}.` };
  } catch (e) {
    executed.delete(p.id); // a failed write may be retried
    return { ok: false, message: `Couldn’t do that: ${(e as Error).message}` };
  }
}

/** Restores what a delete removed (job with its events, or one event). Reminders are rescheduled by putEvent. */
export async function undo(snapshot: NonNullable<Extract<AgentCard, { type: 'confirm' }>['undo']>, store: AgentStore): Promise<Outcome> {
  try {
    if (snapshot.app) {
      await store.putApp(snapshot.app);
      for (const e of snapshot.events ?? []) await store.putEvent({ ...e, notificationId: undefined });
    }
    if (snapshot.event) await store.putEvent({ ...snapshot.event, notificationId: undefined });
    const fresh = await store.reload();
    const back = snapshot.app ? fresh.applications.some(a => a.id === snapshot.app!.id) : fresh.events.some(e => e.id === snapshot.event!.id);
    if (!back) throw new Error('It couldn’t be restored.');
    return { ok: true, message: 'Restored.' };
  } catch (e) { return { ok: false, message: `Couldn’t undo: ${(e as Error).message}` }; }
}
