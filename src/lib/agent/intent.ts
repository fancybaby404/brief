// Intent recognition, separated from execution. Deterministic rules handle the common phrasings
// (fast, predictable); only action-like messages the rules can't read go to the on-device model,
// whose output is schema-constrained and validated. Pure: unit-tested.
import type { ApplicationStatus, EventKind } from '../../types';
import { validate, type Schema } from './validate';
import type { FollowUp, MockMode } from './types';

export type Intent =
  | { kind: 'list_apps'; status?: ApplicationStatus | 'applied_any' }
  | { kind: 'show_app' }
  | { kind: 'delete_app' }
  | { kind: 'set_status'; status?: ApplicationStatus }
  | { kind: 'add_note'; note?: string }
  | { kind: 'schedule'; eventKind: EventKind }
  | { kind: 'move_event'; eventKind?: EventKind }
  | { kind: 'cancel_event'; eventKind?: EventKind }
  | { kind: 'list_events'; week: boolean; eventKind?: EventKind }
  | { kind: 'practice'; mode: MockMode; question?: string; topic?: string }
  | { kind: 'import_job' }
  | { kind: 'image_event' }
  | { kind: 'insights' }
  | { kind: 'compare' }
  | { kind: 'interview_history' }
  | { kind: 'resume_interview' }
  | { kind: 'import_resume' }
  | { kind: 'chat' };

const EVENT_WORD = /\b(interviews?|events?|deadlines?|follow[- ]?ups?|assessments?|exams?|meetings?|calls?|reminders?)\b/;
export function eventKindIn(s: string): EventKind | undefined {
  if (/\binterview/.test(s)) return 'interview';
  if (/\b(assessment|exam|test|coding challenge|take[- ]home)/.test(s)) return 'assessment';
  if (/\bdeadline|due\b/.test(s)) return 'deadline';
  if (/\bfollow[- ]?up|check in|nudge/.test(s)) return 'follow_up';
  return undefined;
}

export function statusIn(s: string): ApplicationStatus | undefined {
  if (/\b(not selected|rejected|rejection|didn'?t (get|make) it|turned (me )?down|unsuccessful|no longer (being )?considered)\b/.test(s)) return 'rejected';
  if (/\b(withdr[ae]w|withdrawn|withdrawing|pull(ed)? out|declined? (the|their) offer|no longer interested|not interested anymore)\b/.test(s)) return 'withdrawn';
  if (/\boffer\b/.test(s)) return 'offer';
  if (/\binterview(ing)?\b/.test(s)) return 'interview';
  if (/\b(in review|under review|being reviewed|reviewing)\b/.test(s)) return 'under_review';
  if (/\b(applied|submitted|sent (in )?(my|the) application)\b/.test(s)) return 'applied';
  if (/\binterested\b|\bsaved\b/.test(s)) return 'interested';
  return undefined;
}

/** The note text after "saying", "that says", ":" or in quotes. */
function noteIn(raw: string) {
  const q = raw.match(/["“]([^"”]{2,})["”]/);
  if (q) return q[1].trim();
  const m = raw.match(/\b(?:saying|that says|which says|that reads|to say|reading)\b[:,]?\s+([\s\S]+)$/i) || raw.match(/\bnotes?\b[^:]{0,40}:\s*([\s\S]+)$/i) || raw.match(/\bnote that\s+([\s\S]+)$/i);
  return m ? m[1].trim().replace(/[.!]+$/, '') : undefined;
}

const QUESTION_STARTS = /^(tell me|why|what|how|where|describe|walk me|can you|could you|do you|have you|give me an example)/i;
/** "Help me answer Tell me about yourself", "Practice 'Why do you want to work here?'", "Ask me about my technical experience". */
export function practiceQuestion(raw: string): string | undefined {
  const quoted = raw.match(/["“]([^"”]{6,})["”]/);
  if (quoted) return quoted[1].trim();
  let m = raw.match(/\b(?:help me (?:answer|with)|practice|practise|answer|rehearse)\s*:?\s+(.{6,})$/i);
  if (m && QUESTION_STARTS.test(m[1].trim())) return tidy(m[1]);
  m = raw.match(/\bask me about (.{3,})$/i);
  if (m) return `Tell me about ${swap(m[1])}.`;
  m = raw.match(/\bhelp me (?:explain|talk about|describe) (.{3,})$/i);
  if (m) return `Walk me through ${swap(m[1])}.`;
  return undefined;
}
const tidy = (q: string) => { const t = q.trim().replace(/\s+/g, ' '); const c = t[0].toUpperCase() + t.slice(1); return /[?.!]$/.test(c) ? c : `${c}${/^(why|what|how|where|can|could|do|have)/i.test(c) ? '?' : '.'}`; };
const swap = (s: string) => s.trim().replace(/[.!?]+$/, '').replace(/\bmy\b/gi, 'your').replace(/\bi\b/gi, 'you').replace(/\bme\b/gi, 'you');

export function modeIn(s: string): MockMode {
  if (/\bbehaviou?ral\b|\bstar\b/.test(s)) return 'behavioral';
  if (/\btechnical\b|\bcoding\b/.test(s)) return 'technical';
  if (/\bhiring manager\b|\bmanager\b/.test(s)) return 'manager';
  if (/\bhr\b|\brecruiter\b|\bscreen(ing)?\b/.test(s)) return 'hr';
  if (/\bgeneral\b|\bcommon\b/.test(s)) return 'general';
  if (/\b(resume|cv)\b/.test(s)) return 'resume';
  return 'job';
}

/** Rules for the common phrasings. null = not recognised (maybe the model can read it, maybe it's just chat). */
export function ruleIntent(raw: string, hasImage = false): Intent | null {
  const s = raw.toLowerCase().replace(/[’]/g, "'");
  if (hasImage) {
    // "Here's my resume", "read my CV", "interview me based on it" — not "does this match my resume?" (a question about a job image).
    if (/\b(here('s| is)|this is|attached|i('ve| have) (attached|sent))\b.{0,15}\b(my )?(resume|cv)\b|\b(read|import|save|add|use|update)\b.{0,20}\b(my )?(resume|cv)\b|\binterview me based on\b/.test(s)) return { kind: 'import_resume' };
    if (/\b(add|save|track|import|keep|put)\b.{0,40}\b(this|it|job|jobs|application|applications|listing|post|brief|tracker)\b/.test(s)) return { kind: 'import_job' };
    // Invites and recruiter messages: read the date/time. "Help me prepare" on them is advice (model + image).
    const fromRecruiter = /\b(message|email|e-mail|hr|recruiter|invite|invitation|text|dm)\b/.test(s);
    if (/\b(when is|what time|schedule|calendar|add (it|this) to)\b/.test(s) || (/\binvit/.test(s) && !/\bprep/.test(s))) return { kind: 'image_event' };
    // "I have an interview for this job", "help me prepare for this job": save the posting, then offer practice.
    if (!fromRecruiter && /\b(interview|prepare|prep|practi[cs]e|mock)\b/.test(s) && /\b(this|the)\s+(job|role|position|posting|listing|post|screenshot)\b|\bfor (this|it)\b/.test(s)) return { kind: 'import_job' };
    return null; // a question about the image: answered by the model with the image
  }
  if (/\b(continue|resume|pick up|go back to)\b.{0,30}\b(interview|mock|practice|session)\b/.test(s)) return { kind: 'resume_interview' };
  if (/\b(my|last|past|previous)\b.{0,20}\b(mock|practice|interview) (feedback|sessions?|results?)\b|\bhow did (i|my) .{0,20}(mock|practice)|\b(struggle|struggled|weak|weakest|did badly|went wrong|improve on)\b.{0,40}\b(last time|mock|interview|practice|answers?)\b/.test(s)) return { kind: 'interview_history' };
  // Notes first: their text often contains dates and other trigger words.
  if (/\b(add|save|put|write|make|leave|jot)\b.{0,25}\bnotes?\b|\bnote that\b/.test(s)) return { kind: 'add_note', note: noteIn(raw) };
  if ((/\b(practi[cs]e|mock|rehearse|prep(are)? me|quiz me|drill me|help me answer|ask me about|help me explain|interview me)\b/.test(s) || /\bask (me )?(some )?(technical )?questions\b/.test(s)) && !/\b(schedule|book)\b/.test(s)) {
    const question = practiceQuestion(raw), topic = question ? undefined : raw.match(/\bquestions?\s+(?:about|on)\s+(.{2,60}?)[.!?]*$/i)?.[1]?.trim();
    return { kind: 'practice', mode: modeIn(s), question, ...(topic ? { topic } : {}) };
  }
  const evt = EVENT_WORD.test(s);
  if (evt && /\b(cancel|delete|remove|clear|call off)\b/.test(s)) return { kind: 'cancel_event', eventKind: eventKindIn(s) };
  if (evt && /\b(move|reschedule|change|push|postpone|shift|bring forward)\b/.test(s)) return { kind: 'move_event', eventKind: eventKindIn(s) };
  if (/\b(schedule|book|set up|create|plan|add|put|calendar)\b/.test(s) && evt || /\bremind me\b|\bfollow up with\b/.test(s)) return { kind: 'schedule', eventKind: eventKindIn(s) ?? (/\bremind me\b/.test(s) ? 'follow_up' : 'other') };
  // "What interviews do I have", "when is my interview", "upcoming deadlines" — not "what should I ask in the interview".
  if (evt && (/\b(do i have|have i got|upcoming|show|list|see|any|when('s| is| are| do)|coming up|scheduled)\b/.test(s) || /\b(what|which)\s+(interviews?|events?|deadlines?|follow[- ]?ups?|assessments?)\b/.test(s))) return { kind: 'list_events', week: /\b(this|next 7 days|the) week\b/.test(s), eventKind: eventKindIn(s) };
  if (/\b(delete|remove|drop|get rid of|trash|erase)\b/.test(s)) return { kind: 'delete_app' };
  if (/\bcompare\b/.test(s)) return { kind: 'compare' };
  if (/\b(summari[sz]e|progress|overview|how am i doing|waiting|awaiting|haven'?t heard|no (reply|response)|who should i follow up|stale)\b/.test(s)) return { kind: 'insights' };
  if (/\b(show|list|see|view|display|what are|what're|give me)\b.{0,30}\b(jobs|applications|apps|positions|roles)\b|\bwhat jobs\b|\bjobs (have i|did i)\b/.test(s)) {
    const status = /\bapplied\b/.test(s) ? 'applied_any' as const : /\binterested\b/.test(s) ? 'interested' as const : /\binterview/.test(s) ? 'interview' as const : /\boffers?\b/.test(s) ? 'offer' as const : undefined;
    return { kind: 'list_apps', status };
  }
  if (/\b(show|open|view|pull up|look up|go to|find)\b/.test(s) && /\b(application|job|role|position|listing)\b/.test(s)) return { kind: 'show_app' };
  // Status news: "I got an interview for Spotify!", "Mark Notion as applied", "I was rejected by Acme".
  // Questions ("What should I ask in the interview?") are never status news.
  const status = statusIn(s), question = /\?\s*$/.test(s) || /^(should|how|what|why|when|could|would|do|does|is|am|can|will|which)\b/.test(s.trim());
  if (status && !question && /\b(i|i'm|i've|i was|we|mark|set|move|change|update|got|received|landed|have|has)\b/.test(s)) return { kind: 'set_status', status };
  if (/\b(update|change|set)\b.{0,30}\bstatus\b/.test(s)) return { kind: 'set_status' };
  return null;
}

/** Worth asking the model to classify? (Questions and small talk go straight to the answer.) */
export const looksLikeAction = (s: string) => /\b(add|save|delete|remove|cancel|move|reschedule|schedule|remind|mark|update|change|set|track|book|note|practi[cs]e|open|show|list)\b/i.test(s);

/** Things a compound request asks for after the main action ("…tell me whether I'm qualified, schedule an interview, and help me practice"). */
export function followUpsIn(raw: string): FollowUp[] {
  const s = raw.toLowerCase(), out: FollowUp[] = [];
  if (/\b(qualif|good fit|a fit|match(es)? my|am i (a )?(good|right))/.test(s)) out.push('qualify');
  const hasInterview = /\b(have|got|landed) an interview\b/.test(s);
  if (/\b(schedule|book|set up)\b.{0,30}\binterview\b/.test(s) || hasInterview) out.push('schedule_interview');
  if (/\b(practi[cs]e|prepare|prep|mock)\b/.test(s) || hasInterview) out.push('practice');
  return out;
}

// ---- Model router (fallback) ----
export const ROUTER_ACTIONS = ['list_apps', 'show_app', 'delete_app', 'set_status', 'add_note', 'schedule', 'move_event', 'cancel_event', 'list_events', 'practice', 'insights', 'compare', 'chat'] as const;
const STATUSES = ['interested', 'applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn'] as const;
const KINDS = ['interview', 'deadline', 'assessment', 'follow_up', 'other'] as const;
export const ROUTER_SCHEMA = {
  action: { type: 'string', enum: ROUTER_ACTIONS },
  status: { type: 'string', enum: STATUSES, optional: true },
  event_kind: { type: 'string', enum: KINDS, optional: true },
  note: { type: 'string', max: 500, optional: true },
  question: { type: 'string', max: 200, optional: true },
} as const satisfies Schema;

/** Validated router output → intent. Anything invalid becomes plain chat (never a guessed action). */
export function intentFromRouter(raw: unknown): Intent {
  const v = validate(ROUTER_SCHEMA, raw);
  if (!v.ok) return { kind: 'chat' };
  const r = v.value;
  switch (r.action) {
    case 'set_status': return { kind: 'set_status', status: r.status };
    case 'add_note': return { kind: 'add_note', note: r.note };
    case 'schedule': return { kind: 'schedule', eventKind: r.event_kind ?? 'other' };
    case 'move_event': return { kind: 'move_event', eventKind: r.event_kind };
    case 'cancel_event': return { kind: 'cancel_event', eventKind: r.event_kind };
    case 'list_events': return { kind: 'list_events', week: false, eventKind: r.event_kind };
    case 'practice': return { kind: 'practice', mode: 'job', question: r.question };
    case 'list_apps': return { kind: 'list_apps' };
    default: return { kind: r.action } as Intent;
  }
}
