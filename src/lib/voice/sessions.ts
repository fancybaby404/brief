// Interview sessions are derived from their saved messages (SQLite `messages`), so there is no second
// copy of session state to drift: setup is on the first message, answers and questions are the turns,
// feedback is the reply to the finish request. Pure: unit-tested.
import type { Message } from '../../types';
import { MOCK_BEGIN, MOCK_FINISH } from '../prompts';
import type { MockMode } from '../agent/types';

export const TARGET_QUESTIONS = 5;

export type SessionSummary = {
  thread: string; applicationId: string; kind: 'interview' | 'practice'; current: boolean;
  mode: MockMode; question?: string; voice: boolean;
  startedAt: string; endedAt: string; durationMs: number;
  questions: number; answers: number; finished: boolean; feedback?: Message;
};

export function parseThread(thread: string) {
  const m = thread.match(/^(mock|practice):([^:]+)(?::(\d+))?$/);
  return m ? { kind: m[1] === 'mock' ? 'interview' as const : 'practice' as const, applicationId: m[2], current: !m[3] } : null;
}

/** Interviewer questions so far: assistant turns before the finish request (feedback isn't a question). */
export function questionsAsked(ms: Message[]) {
  const end = ms.findIndex(m => m.content === MOCK_FINISH);
  return (end < 0 ? ms : ms.slice(0, end)).filter(m => m.role === 'assistant').length;
}
export const answersGiven = (ms: Message[]) => ms.filter(m => m.role === 'user' && m.content !== MOCK_BEGIN && m.content !== MOCK_FINISH).length;
export const isFinished = (ms: Message[]) => ms.some(m => m.content === MOCK_FINISH) && ms[ms.length - 1]?.role === 'assistant';
/** A full interview wraps up after this many answers; practice never auto-ends. */
export const shouldWrapUp = (ms: Message[], practice: boolean) => !practice && !isFinished(ms) && !ms.some(m => m.content === MOCK_FINISH) && answersGiven(ms) >= TARGET_QUESTIONS;

export function summarizeSessions(all: Message[]): SessionSummary[] {
  const byThread = new Map<string, Message[]>();
  for (const m of all) if (parseThread(m.thread)) byThread.set(m.thread, [...(byThread.get(m.thread) ?? []), m]);
  const out: SessionSummary[] = [];
  for (const [thread, raw] of byThread) {
    const ms = [...raw].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), t = parseThread(thread)!;
    const fin = ms.findIndex(m => m.content === MOCK_FINISH);
    const first = ms[0], last = ms[ms.length - 1];
    out.push({
      thread, applicationId: t.applicationId, kind: t.kind, current: t.current,
      mode: first.meta?.mode ?? 'job', question: first.meta?.question, voice: ms.some(m => m.meta?.via === 'voice'),
      startedAt: first.createdAt, endedAt: last.createdAt, durationMs: Math.max(0, Date.parse(last.createdAt) - Date.parse(first.createdAt)),
      questions: questionsAsked(ms), answers: answersGiven(ms), finished: isFinished(ms),
      feedback: fin >= 0 ? ms.slice(fin + 1).find(m => m.role === 'assistant') : undefined,
    });
  }
  return out.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}

export const formatDuration = (ms: number) => { const m = Math.round(ms / 60000); return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
