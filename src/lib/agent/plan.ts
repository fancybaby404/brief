// Turns one user message into what Brief does next. Pure and deterministic given the intent:
// the model only ever helps classify (router) or write prose (answers); records, IDs, dates and
// permissions are decided here. Unit-tested with an in-memory store.
import type { Application, ApplicationStatus } from '../../types';
import { STATUS_LABEL, isClosed } from '../tracker';
import { suggestTitle, toLocalIso } from '../events';
import { parseWhen } from './dates';
import { followUpsIn, ruleIntent, type Intent } from './intent';
import { resolveApplication, resolveEvent, mentionScore } from './resolve';
import { callTool } from './tools';
import { hasProfileDetails } from '../profile';
import { summarizeSessions } from '../voice/sessions';
import type { AgentCard, AgentStore, EventProposal, FollowUp, MockMode, PickTarget } from './types';

export type Turn =
  /** Brief replies from saved data (no model). `focusId` updates the conversation's current job. */
  | { type: 'reply'; text: string; card?: AgentCard; focusId?: string | null }
  /** The on-device model writes the answer, grounded in the focused job (and `facts` when given). */
  | { type: 'answer'; focusId?: string | null; facts?: string }
  /** The vision model reads the attached image. */
  | { type: 'vision'; task: 'import' | 'event' | 'question' | 'resume'; followUps: FollowUp[] }
  /** Rules couldn't read an action-like message: ask the model to classify it, then plan again. */
  | { type: 'route' };

const tomorrowAt = (h: number, now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, 0);
const pickCard = (title: string, apps: Application[], pick: PickTarget): AgentCard => ({ type: 'apps', title, ids: apps.slice(0, 8).map(a => a.id), pick });
const ask = (text: string, apps: Application[], pick: PickTarget): Turn =>
  apps.length ? { type: 'reply', text, card: pickCard('Your saved jobs', apps, pick) } : { type: 'reply', text: 'You don’t have any saved jobs yet. Add one with the + button or from Jobs.' };

export async function planTurn(text: string, store: AgentStore, o: { hasImage?: boolean; focusId?: string | null; now?: Date; intent?: Intent } = {}): Promise<Turn> {
  const now = o.now ?? new Date(), apps = store.applications;
  const intent = o.intent ?? ruleIntent(text, o.hasImage);
  if (o.hasImage) return { type: 'vision', task: intent?.kind === 'import_job' ? 'import' : intent?.kind === 'image_event' ? 'event' : intent?.kind === 'import_resume' ? 'resume' : 'question', followUps: followUpsIn(text) };
  if (!intent) return { type: 'route' };
  const target = () => resolveApplication(text, apps, o.focusId);
  /** No job named or focused: the job of the most recent mock session (for "continue", "last time"). */
  const latestSession = async (unfinishedOnly: boolean) => summarizeSessions(await store.messages('')).find(s => apps.some(a => a.id === s.applicationId) && (!unfinishedOnly || (s.current && !s.finished)));

  switch (intent.kind) {
    case 'resume_interview': {
      const r = target();
      if (r.kind === 'many') return { type: 'reply', text: 'Which interview?', card: pickCard('Matching jobs', r.items, { action: 'practice', mode: 'job' }) };
      const s = r.kind === 'one' ? summarizeSessions(await store.messages(`mock:${r.item.id}`)).find(x => x.current && x.applicationId === r.item.id) ?? summarizeSessions(await store.messages(`practice:${r.item.id}`)).find(x => x.current) : await latestSession(true);
      const a = s ? apps.find(x => x.id === s.applicationId) : r.kind === 'one' ? r.item : undefined;
      if (!s || !a) return a ? practiceTurn(a, 'job') : { type: 'reply', text: 'There’s no paused interview to continue. Want to start one? Tell me which job.' };
      if (s.finished) return { type: 'reply', text: `Your last ${a.company} interview is finished — its feedback is in Mock. Start a new one?`, card: { type: 'interview', applicationId: a.id, mode: s.mode, state: 'pending' }, focusId: a.id };
      return { type: 'reply', text: `Your ${a.company} interview is paused after ${s.answers} answer${s.answers === 1 ? '' : 's'}. Pick up where you left off?`, card: { type: 'interview', applicationId: a.id, mode: s.mode, question: s.question, voice: s.voice, resume: true, state: 'pending' }, focusId: a.id };
    }
    case 'chat': {
      // A job named in passing switches the conversation to it; otherwise keep the current one.
      const named = resolveApplication(text, apps, null);
      return { type: 'answer', focusId: named.kind === 'one' ? named.item.id : o.focusId };
    }
    case 'list_apps': {
      const r = await callTool('listApplications', intent.status === 'applied_any' ? { appliedOnly: true } : { status: intent.status }, store);
      if (!r.ok || !r.ids?.length) return { type: 'reply', text: intent.status ? `No ${intent.status === 'applied_any' ? 'applied' : STATUS_LABEL[intent.status].toLowerCase()} jobs right now.` : 'You don’t have any saved jobs yet.' };
      return { type: 'reply', text: `${r.ids.length} saved job${r.ids.length > 1 ? 's' : ''}. Tap one to open it.`, card: { type: 'apps', title: 'Saved jobs', ids: r.ids.slice(0, 20), pick: { action: 'focus' } } };
    }
    case 'show_app': {
      const r = resolveApplication(text, apps, null);
      if (r.kind === 'one') return { type: 'reply', text: `${r.item.title} at ${r.item.company} · ${STATUS_LABEL[r.item.status]}.`, card: { type: 'apps', title: 'Saved job', ids: [r.item.id], pick: { action: 'open' } }, focusId: r.item.id };
      if (r.kind === 'many') return { type: 'reply', text: 'Which one?', card: pickCard('Matching jobs', r.items, { action: 'focus' }) };
      return ask('I couldn’t find that job in Brief. Is it one of these?', apps, { action: 'focus' });
    }
    case 'delete_app': {
      const r = target();
      if (r.kind === 'many') return { type: 'reply', text: 'Which one should I delete?', card: pickCard('Matching jobs', r.items, { action: 'delete' }) };
      if (r.kind === 'none') return ask('Which job should I delete?', apps, { action: 'delete' });
      return pendingTurn(await callTool('deleteApplication', { id: r.item.id }, store), r.item.id);
    }
    case 'set_status': {
      const r = target();
      if (r.kind === 'many') return { type: 'reply', text: 'Which job is this about?', card: pickCard('Matching jobs', r.items, { action: 'status', status: intent.status }) };
      if (r.kind === 'none') return ask('Which job is this about?', apps, { action: 'status', status: intent.status });
      return statusTurn(r.item, intent.status, store);
    }
    case 'add_note': {
      const r = target();
      if (!intent.note) return { type: 'reply', text: 'What should the note say? For example: “Add a note to Google saying HR will call next week.”', focusId: r.kind === 'one' ? r.item.id : o.focusId };
      if (r.kind === 'many') return { type: 'reply', text: 'Which job is the note for?', card: pickCard('Matching jobs', r.items, { action: 'note', note: intent.note }) };
      if (r.kind === 'none') return ask('Which job is the note for?', apps, { action: 'note', note: intent.note });
      return pendingTurn(await callTool('addApplicationNote', { id: r.item.id, note: intent.note }, store), r.item.id);
    }
    case 'schedule': {
      const when = parseWhen(text, now);
      if (when?.options) return { type: 'reply', text: 'Which date did you mean?', card: { type: 'choices', options: when.options.map(d => ({ label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }), send: text.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/, d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })) })) } };
      const date = when ? (when.hasTime ? when.date : new Date(when.date.getFullYear(), when.date.getMonth(), when.date.getDate(), intent.eventKind === 'follow_up' ? 9 : 10)) : tomorrowAt(10, now);
      const assumed = !when ? 'No date given — set one before saving' : [when.assumed, !when.hasTime ? 'No time given — check it' : ''].filter(Boolean).join(' · ') || undefined;
      const base = { kind: intent.eventKind, date: toLocalIso(date), assumed };
      const r = resolveApplication(text, apps, o.focusId);
      if (r.kind === 'many') return { type: 'reply', text: 'Which job is this for?', card: pickCard('Matching jobs', r.items, { action: 'schedule', proposal: base }) };
      return eventTurn(r.kind === 'one' ? r.item : null, base);
    }
    case 'move_event': {
      const r = resolveEvent(text, store.events, apps, o.focusId, intent.eventKind, now.getTime());
      if (r.kind === 'none') return { type: 'reply', text: `I couldn’t find an upcoming ${intent.eventKind ? intent.eventKind.replace('_', '-') : 'event'} to move.` };
      if (r.kind === 'many') return { type: 'reply', text: 'Which one? Tap it to change the time.', card: { type: 'events', title: 'Upcoming', ids: r.items.map(e => e.id) } };
      const when = parseWhen(text, now);
      if (!when) return { type: 'reply', text: `When should I move “${r.item.title}” to?`, focusId: r.item.applicationId };
      const old = new Date(r.item.date), d = when.options ? when.options[0] : when.date;
      const next = new Date(when.hasDate ? d.getFullYear() : old.getFullYear(), when.hasDate ? d.getMonth() : old.getMonth(), when.hasDate ? d.getDate() : old.getDate(), when.hasTime ? d.getHours() : old.getHours(), when.hasTime ? d.getMinutes() : old.getMinutes());
      const proposal: EventProposal = { applicationId: r.item.applicationId, kind: r.item.kind ?? 'other', title: r.item.title, date: toLocalIso(next), location: r.item.location, notes: r.item.notes, eventId: r.item.id, assumed: when.options ? 'Two dates matched — check the day' : when.assumed };
      return { type: 'reply', text: 'Here’s the new time. Review it, then save.', card: { type: 'event', proposal, state: 'pending' }, focusId: r.item.applicationId };
    }
    case 'cancel_event': {
      const r = resolveEvent(text, store.events, apps, o.focusId, intent.eventKind, now.getTime());
      if (r.kind === 'none') return { type: 'reply', text: 'I couldn’t find a matching upcoming event.' };
      if (r.kind === 'many') return { type: 'reply', text: 'Which one? Tap it to open and delete it.', card: { type: 'events', title: 'Upcoming', ids: r.items.map(e => e.id) } };
      return pendingTurn(await callTool('deleteEvent', { id: r.item.id }, store), r.item.applicationId);
    }
    case 'list_events': {
      const r = await callTool('getUpcomingEvents', { days: intent.week ? 7 : 60, kind: intent.eventKind }, store);
      const label = intent.eventKind ? `${intent.eventKind.replace('_', '-')}s` : 'events';
      if (!r.ok || !r.ids?.length) return { type: 'reply', text: `No upcoming ${label}${intent.week ? ' this week' : ''}.` };
      return { type: 'reply', text: `${r.ids.length} upcoming ${r.ids.length === 1 ? label.replace(/s$/, '') : label}${intent.week ? ' in the next 7 days' : ''}.`, card: { type: 'events', title: 'Upcoming', ids: r.ids } };
    }
    case 'practice': {
      const r = target();
      if (r.kind === 'many') return { type: 'reply', text: 'Which job are you practicing for?', card: pickCard('Matching jobs', r.items, { action: 'practice', mode: intent.mode, question: intent.question, topic: intent.topic }) };
      if (r.kind === 'none') return ask('Which job are you practicing for?', apps, { action: 'practice', mode: intent.mode, question: intent.question, topic: intent.topic });
      if (intent.mode === 'resume' && !hasProfileDetails(store.profile)) return { type: 'reply', text: 'I don’t have your resume details yet. Add them in Resume (or attach a photo of your resume here), then ask again.', focusId: r.item.id };
      return practiceTurn(r.item, intent.mode, intent.question, intent.topic);
    }
    case 'insights': {
      const r = await callTool('getApplicationInsights', {}, store);
      return { type: 'reply', text: r.ok ? r.facts : r.error, card: r.ok && r.ids?.length ? { type: 'apps', title: 'Worth a follow-up', ids: r.ids, pick: { action: 'focus' } } : undefined };
    }
    case 'interview_history': {
      let r = target();
      if (r.kind === 'none') { const s = await latestSession(false); const a = s && apps.find(x => x.id === s.applicationId); if (a) r = { kind: 'one', item: a }; }
      if (r.kind !== 'one') return ask('Which job’s mock interviews?', r.kind === 'many' ? r.items : apps, { action: 'focus' });
      const [sessions, feedback] = await Promise.all([callTool('getInterviewSessions', { applicationId: r.item.id }, store), callTool('getInterviewFeedback', { applicationId: r.item.id }, store)]);
      const text = [`Mock interviews for ${r.item.title} at ${r.item.company}:`, sessions.ok ? sessions.facts : '', feedback.ok ? `\nLatest feedback:\n${feedback.facts}` : ''].filter(Boolean).join('\n');
      return { type: 'reply', text, card: { type: 'interview', applicationId: r.item.id, mode: 'job', state: 'pending' }, focusId: r.item.id };
    }
    case 'compare': {
      const named = apps.filter(a => mentionScore(text, a) >= 4).slice(0, 3);
      const ids = (named.length >= 2 ? named : apps.filter(a => !isClosed(a.status)).slice(0, 3)).map(a => a.id);
      const r = await callTool('compareApplications', { ids }, store);
      return r.ok ? { type: 'answer', facts: r.facts, focusId: null } : { type: 'reply', text: r.error };
    }
    default: return { type: 'answer', focusId: o.focusId };
  }
}

function pendingTurn(r: Awaited<ReturnType<typeof callTool>>, focusId: string | null): Turn {
  if (!r.ok) return { type: 'reply', text: r.error };
  if (!r.pending) return { type: 'reply', text: r.facts, focusId };
  return { type: 'reply', text: r.facts, card: { type: 'confirm', pending: r.pending, state: 'pending' }, focusId };
}

export async function statusTurn(a: Application, status: ApplicationStatus | undefined, store: AgentStore): Promise<Turn> {
  if (!status) return { type: 'reply', text: `What’s the new status for ${a.company}?`, card: { type: 'status', applicationId: a.id, state: 'pending' }, focusId: a.id };
  return pendingTurn(await callTool('updateApplicationStatus', { id: a.id, status }, store), a.id);
}

export function eventTurn(a: Application | null, base: Omit<EventProposal, 'applicationId' | 'title'>): Turn {
  const proposal: EventProposal = { ...base, applicationId: a?.id ?? null, title: suggestTitle(base.kind, a) || 'Event' };
  // Scheduling an interview never changes the status by itself; the card offers it after saving.
  const offer = base.kind === 'interview' && !!a && ['interested', 'applied', 'under_review'].includes(a.status);
  return { type: 'reply', text: a ? 'Here’s the event. Review it, then save.' : 'Here’s the event (not linked to a saved job). Review it, then save.', card: { type: 'event', proposal, state: 'pending', offerInterviewStatus: offer }, focusId: a?.id };
}

export function practiceTurn(a: Application, mode: MockMode, question?: string, topic?: string): Turn {
  return { type: 'reply', text: question ? `Let’s practice “${question}” for ${a.title} at ${a.company}.` : `Mock interview for ${a.title} at ${a.company}. Pick a style, then start.`, card: { type: 'interview', applicationId: a.id, mode, question, ...(topic ? { topic } : {}), state: 'pending' }, focusId: a.id };
}

/** The user picked a job from a selection card: continue what they were doing with that real ID. */
export async function planPick(pick: PickTarget, a: Application, store: AgentStore): Promise<Turn> {
  switch (pick.action) {
    case 'open': case 'focus': return { type: 'reply', text: `Now talking about ${a.title} at ${a.company}. Ask me anything about it.`, focusId: a.id };
    case 'delete': return pendingTurn(await callTool('deleteApplication', { id: a.id }, store), a.id);
    case 'status': return statusTurn(a, pick.status, store);
    case 'note': return pendingTurn(await callTool('addApplicationNote', { id: a.id, note: pick.note }, store), a.id);
    case 'schedule': return eventTurn(a, pick.proposal);
    case 'practice': return practiceTurn(a, pick.mode, pick.question, pick.topic);
  }
}

/** Buttons offered after a job is saved from a compound request. */
export const FOLLOW_UP_LABEL: Record<FollowUp, string> = { qualify: 'Am I qualified?', schedule_interview: 'Schedule an interview', practice: 'Practice for it' };
