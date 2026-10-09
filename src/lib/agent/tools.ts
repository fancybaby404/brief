// Central tool registry. The allowlist is this object: a name not here cannot run.
// Every call validates its arguments; IDs must exist in the store; writes never run here —
// they return a Pending proposal that the user confirms in the chat (see execute.ts).
import type { Application, Event, EventKind, Message } from '../../types';
import { STATUS_LABEL, STATUS_ORDER, buildActivity, isApplied, isClosed } from '../tracker';
import { reminderLabel, upcomingFor } from '../events';
import { userContext, MOCK_FINISH } from '../prompts';
import { validate, type Infer, type Schema } from './validate';
import { findDuplicateApplication } from './resolve';
import type { AgentStore, JobFields, MockMode, Pending } from './types';

const ID = { type: 'string', max: 80 } as const;
const STATUS = { type: 'string', enum: STATUS_ORDER } as const;
const KIND = { type: 'string', enum: ['interview', 'deadline', 'assessment', 'follow_up', 'other'] } as const;
const MODE = { type: 'string', enum: ['job', 'hr', 'behavioral', 'technical', 'manager', 'general', 'resume'] } as const;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/;

/** Read results carry facts (plain, for the model or the user) and the record IDs they came from. */
export type ToolResult =
  | { ok: true; facts: string; ids?: string[]; data?: unknown; pending?: Pending; navigate?: { applicationId: string; mode: MockMode; question?: string; resume?: boolean }; needsModel?: boolean }
  | { ok: false; error: string };

type Tool<S extends Schema> = {
  kind: 'read' | 'write' | 'navigate' | 'model';
  description: string;
  schema: S;
  run: (args: Infer<S>, store: AgentStore) => ToolResult | Promise<ToolResult>;
};
const tool = <S extends Schema>(t: Tool<S>) => t;
const uidPending = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const fail = (error: string): ToolResult => ({ ok: false, error });
const appLine = (a: Application) => `${a.title} at ${a.company} · ${STATUS_LABEL[a.status]}${a.location ? ' · ' + a.location : ''}`;
const findApp = (store: AgentStore, id: string) => store.applications.find(a => a.id === id);
const findEvent = (store: AgentStore, id: string) => store.events.find(e => e.id === id);
const eventLine = (e: Event, apps: Application[]) => {
  const job = apps.find(a => a.id === e.applicationId);
  return `${e.title} · ${new Date(e.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${job ? ` · ${job.company}` : ''}${e.reminderMinutes != null ? ` · reminder ${reminderLabel(e.reminderMinutes).toLowerCase()}` : ''}`;
};
const DAY = 86400000;

/** Deterministic progress facts: no model involved, so nothing here can be invented. */
export function applicationInsights(apps: Application[], events: Event[], now = Date.now()) {
  const counts = STATUS_ORDER.map(s => [s, apps.filter(a => a.status === s).length] as const).filter(([, n]) => n);
  const waiting = apps.filter(a => (a.status === 'applied' || a.status === 'under_review') && now - Date.parse(a.appliedAt || a.createdAt) > 10 * DAY && !events.some(e => e.applicationId === a.id && Date.parse(e.date) >= now));
  const soon = events.filter(e => { const t = Date.parse(e.date); return t >= now && t < now + 14 * DAY; }).sort((a, b) => a.date.localeCompare(b.date));
  const notApplied = apps.filter(a => a.status === 'interested');
  return { counts, waiting, soon, notApplied, active: apps.filter(a => !isClosed(a.status)).length };
}

export const TOOLS = {
  // ---- Applications ----
  listApplications: tool({ kind: 'read', description: 'List saved applications, optionally by status.', schema: { status: { ...STATUS, optional: true }, appliedOnly: { type: 'boolean', optional: true } },
    run: (a, s) => { const list = s.applications.filter(x => (!a.status || x.status === a.status) && (!a.appliedOnly || isApplied(x))); return { ok: true, facts: list.map(appLine).join('\n') || 'No saved applications.', ids: list.map(x => x.id) }; } }),
  searchApplications: tool({ kind: 'read', description: 'Find saved applications by company or title words.', schema: { query: { type: 'string', max: 120 } },
    run: (a, s) => { const q = a.query.toLowerCase(); const list = s.applications.filter(x => `${x.company} ${x.title}`.toLowerCase().includes(q)); return { ok: true, facts: list.map(appLine).join('\n') || 'No match.', ids: list.map(x => x.id) }; } }),
  getApplication: tool({ kind: 'read', description: 'One application by id.', schema: { id: ID },
    run: (a, s) => { const x = findApp(s, a.id); return x ? { ok: true, facts: appLine(x), ids: [x.id], data: x } : fail('That application no longer exists.'); } }),
  getApplicationHistory: tool({ kind: 'read', description: 'Saved date, status changes and events for one application.', schema: { id: ID },
    run: (a, s) => { const x = findApp(s, a.id); if (!x) return fail('That application no longer exists.');
      const lines = buildActivity(x, s.events).map(i => `${new Date(i.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${i.kind === 'saved' ? 'Saved' : i.kind === 'status' ? `Status → ${STATUS_LABEL[i.status!]}` : i.event!.title}`);
      return { ok: true, facts: lines.join('\n'), ids: [x.id] }; } }),
  createApplication: tool({ kind: 'write', description: 'Save a new job (after the user reviews the preview).', schema: { company: { type: 'string', max: 120 }, title: { type: 'string', max: 160 }, status: { type: 'string', enum: ['interested', 'applied'] } },
    run: (a, s) => { const dup = findDuplicateApplication(s.applications, a.company, a.title); return dup ? { ok: true, facts: `Already saved: ${appLine(dup)}`, ids: [dup.id] } : { ok: true, facts: 'Ready to save after review.' }; } }),
  updateApplication: tool({ kind: 'write', description: 'Edit job details: opens the job so the user edits and confirms.', schema: { id: ID },
    run: (a, s) => (findApp(s, a.id) ? { ok: true, facts: 'Open the job to edit its details.', ids: [a.id] } : fail('That application no longer exists.')) }),
  updateApplicationStatus: tool({ kind: 'write', description: 'Change an application status (needs confirmation).', schema: { id: ID, status: STATUS },
    run: (a, s) => { const x = findApp(s, a.id); if (!x) return fail('That application no longer exists.');
      if (x.status === a.status) return { ok: true, facts: `${x.company} is already ${STATUS_LABEL[a.status]}.`, ids: [x.id] };
      return { ok: true, facts: `Change ${x.title} at ${x.company} from ${STATUS_LABEL[x.status]} to ${STATUS_LABEL[a.status]}?`, ids: [x.id], pending: { tool: 'updateApplicationStatus', id: uidPending(), applicationId: x.id, status: a.status } }; } }),
  deleteApplication: tool({ kind: 'write', description: 'Delete an application and its events (needs confirmation; can be undone).', schema: { id: ID },
    run: (a, s) => { const x = findApp(s, a.id); if (!x) return fail('That application no longer exists.');
      const n = s.events.filter(e => e.applicationId === x.id).length;
      return { ok: true, facts: `Delete ${x.title} at ${x.company}${n ? ` and its ${n} calendar event${n > 1 ? 's' : ''}` : ''}?`, ids: [x.id], pending: { tool: 'deleteApplication', id: uidPending(), applicationId: x.id } }; } }),
  addApplicationNote: tool({ kind: 'write', description: 'Append a private note to an application (needs confirmation).', schema: { id: ID, note: { type: 'string', max: 1000 } },
    run: (a, s) => { const x = findApp(s, a.id); if (!x) return fail('That application no longer exists.');
      return { ok: true, facts: `Add to ${x.company}: “${a.note}”`, ids: [x.id], pending: { tool: 'addApplicationNote', id: uidPending(), applicationId: x.id, note: a.note } }; } }),

  // ---- Calendar ----
  listEvents: tool({ kind: 'read', description: 'Events, optionally for one application.', schema: { applicationId: { ...ID, optional: true } },
    run: (a, s) => { const list = s.events.filter(e => !a.applicationId || e.applicationId === a.applicationId).sort((x, y) => x.date.localeCompare(y.date)); return { ok: true, facts: list.map(e => eventLine(e, s.applications)).join('\n') || 'No events.', ids: list.map(e => e.id) }; } }),
  getUpcomingEvents: tool({ kind: 'read', description: 'Upcoming events within N days, optionally of one kind.', schema: { days: { type: 'number', min: 1, max: 365, integer: true, optional: true }, kind: { ...KIND, optional: true }, applicationId: { ...ID, optional: true } },
    run: (a, s) => { const now = Date.now(), until = now + (a.days ?? 30) * DAY;
      const list = (a.applicationId ? upcomingFor(s.events, a.applicationId, now) : s.events.filter(e => Date.parse(e.date) >= now)).filter(e => Date.parse(e.date) < until && (!a.kind || (e.kind ?? 'other') === a.kind)).sort((x, y) => x.date.localeCompare(y.date));
      return { ok: true, facts: list.map(e => eventLine(e, s.applications)).join('\n') || 'Nothing scheduled.', ids: list.map(e => e.id) }; } }),
  createEvent: tool({ kind: 'write', description: 'Propose a calendar event; the user reviews it in the event editor.', schema: { applicationId: { ...ID, optional: true }, kind: KIND, title: { type: 'string', max: 160 }, date: { type: 'string', pattern: LOCAL_DATE } },
    run: (a, s) => (a.applicationId && !findApp(s, a.applicationId) ? fail('That application no longer exists.') : { ok: true, facts: 'Ready to review.' }) }),
  updateEvent: tool({ kind: 'write', description: 'Propose new details for an event; the user reviews them in the editor.', schema: { id: ID, date: { type: 'string', pattern: LOCAL_DATE, optional: true } },
    run: (a, s) => (findEvent(s, a.id) ? { ok: true, facts: 'Ready to review.', ids: [a.id] } : fail('That event no longer exists.')) }),
  deleteEvent: tool({ kind: 'write', description: 'Delete an event (needs confirmation; can be undone).', schema: { id: ID },
    run: (a, s) => { const e = findEvent(s, a.id); return e ? { ok: true, facts: `Cancel ${eventLine(e, s.applications)}?`, ids: [e.id], pending: { tool: 'deleteEvent', id: uidPending(), eventId: e.id } } : fail('That event no longer exists.'); } }),

  // ---- Interviews ----
  startMockInterview: tool({ kind: 'navigate', description: 'Open a mock interview for an application.', schema: { applicationId: ID, mode: MODE },
    run: (a, s) => (findApp(s, a.applicationId) ? { ok: true, facts: 'Ready to start.', navigate: { applicationId: a.applicationId, mode: a.mode } } : fail('That application no longer exists.')) }),
  startQuestionPractice: tool({ kind: 'navigate', description: 'Practice one interview question for an application.', schema: { applicationId: ID, question: { type: 'string', max: 200 } },
    run: (a, s) => (findApp(s, a.applicationId) ? { ok: true, facts: 'Ready to practice.', navigate: { applicationId: a.applicationId, mode: 'job', question: a.question } } : fail('That application no longer exists.')) }),
  resumeMockInterview: tool({ kind: 'navigate', description: 'Continue the saved mock interview for an application.', schema: { applicationId: ID },
    run: async (a, s) => { if (!findApp(s, a.applicationId)) return fail('That application no longer exists.');
      const msgs = await s.messages(`mock:${a.applicationId}`);
      return msgs.some(m => m.thread === `mock:${a.applicationId}`) ? { ok: true, facts: 'Resuming.', navigate: { applicationId: a.applicationId, mode: 'job', resume: true } } : fail('There’s no saved interview for this job yet.'); } }),
  getInterviewSessions: tool({ kind: 'read', description: 'Saved mock interview sessions for an application.', schema: { applicationId: ID },
    run: async (a, s) => { const msgs = await s.messages(`mock:${a.applicationId}`); const threads = [...new Set(msgs.map(m => m.thread))];
      const facts = threads.map(t => { const ms = msgs.filter(m => m.thread === t); return `${t.split(':').length > 2 ? 'Past session' : 'Current session'} · ${ms.filter(m => m.role === 'user').length} answers · ${ms.some(m => m.content === MOCK_FINISH) ? 'finished' : 'in progress'}`; });
      return { ok: true, facts: facts.join('\n') || 'No interview sessions yet.' }; } }),
  getInterviewFeedback: tool({ kind: 'read', description: 'The latest end-of-interview feedback for an application.', schema: { applicationId: ID },
    run: async (a, s) => { const msgs = (await s.messages(`mock:${a.applicationId}`)).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
      const i = msgs.map(m => m.content).lastIndexOf(MOCK_FINISH), fb = i >= 0 ? msgs.slice(i + 1).find((m: Message) => m.role === 'assistant') : undefined;
      return fb ? { ok: true, facts: fb.content } : fail('No feedback yet. Finish a mock interview to get some.'); } }),

  // ---- Career assistance ----
  getResumeContext: tool({ kind: 'read', description: 'The resume details the user allowed Brief to use.', schema: {},
    run: (_a, s) => ({ ok: true, facts: userContext(s.profile) || 'No resume details saved (or not allowed for AI).' }) }),
  getApplicationInsights: tool({ kind: 'read', description: 'Progress summary, jobs awaiting a reply, upcoming deadlines.', schema: {},
    run: (_a, s) => { const r = applicationInsights(s.applications, s.events);
      const lines = [`${s.applications.length} saved · ${r.active} active · ${r.counts.map(([st, n]) => `${n} ${STATUS_LABEL[st].toLowerCase()}`).join(', ') || 'none yet'}`];
      if (r.waiting.length) lines.push(`Waiting 10+ days with nothing scheduled: ${r.waiting.map(a => a.company).join(', ')}`);
      if (r.soon.length) lines.push(`Next 2 weeks: ${r.soon.map(e => eventLine(e, s.applications)).join('; ')}`);
      if (r.notApplied.length) lines.push(`Saved but not applied: ${r.notApplied.length}`);
      return { ok: true, facts: lines.join('\n'), ids: r.waiting.map(a => a.id) }; } }),
  analyzeJob: tool({ kind: 'model', description: 'Answer a question about one saved job using its description and the allowed resume.', schema: { applicationId: ID },
    run: (a, s) => (findApp(s, a.applicationId) ? { ok: true, facts: '', ids: [a.applicationId], needsModel: true } : fail('That application no longer exists.')) }),
  compareApplications: tool({ kind: 'model', description: 'Compare two or three saved jobs side by side.', schema: { ids: { type: 'strings', max: 3 } },
    run: (a, s) => { const list = a.ids.map(id => findApp(s, id)).filter((x): x is Application => !!x);
      if (list.length < 2) return fail('Pick at least two saved jobs to compare.');
      return { ok: true, facts: list.map(x => `- ${x.title} at ${x.company}; status ${STATUS_LABEL[x.status]}; location ${x.location || 'not listed'}; salary ${x.salary || 'not listed'}; type ${x.employmentType || 'not listed'}`).join('\n'), ids: list.map(x => x.id), needsModel: true }; } }),
  analyzeJobImage: tool({ kind: 'model', description: 'Answer a question about an attached image with the vision model.', schema: { question: { type: 'string', max: 500 } },
    run: () => ({ ok: true, facts: '', needsModel: true }) }),
} as const;

export type ToolName = keyof typeof TOOLS;
export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];

/** The only way tools run: allowlisted name, validated arguments. */
export async function callTool(name: string, args: unknown, store: AgentStore): Promise<ToolResult> {
  if (!Object.prototype.hasOwnProperty.call(TOOLS, name)) return fail(`Unknown tool: ${name}`);
  const t = TOOLS[name as ToolName] as Tool<Schema>;
  const v = validate(t.schema, args ?? {});
  if (!v.ok) return fail(v.error);
  try { return await t.run(v.value, store); } catch (e) { return fail((e as Error).message || 'That didn’t work.'); }
}

export const jobFieldsOk = (f: JobFields) => !!f.company.trim() && !!f.title.trim();
export type { EventKind };
