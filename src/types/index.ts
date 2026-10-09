import type { Pay } from '../lib/currency';
import type { AgentCard, MockMode } from '../lib/agent/types';
// 'saved' was merged into 'interested'; old rows are normalised on load (tracker.normalizeApplication).
// 'rejected' is labelled "Not selected"; stored values never change so existing rows stay valid.
export type ApplicationStatus = 'interested' | 'applied' | 'interview' | 'under_review' | 'offer' | 'rejected' | 'withdrawn';
/** One status move, appended by `trackStatus` (tracker.ts) whenever a saved application's status changes. */
export type StatusChange = { at: string; from: ApplicationStatus; to: ApplicationStatus };
export type Application = {
  id: string; company: string; title: string; status: ApplicationStatus; location: string;
  salary: string; employmentType: string; description: string; sourceUrl: string;
  createdAt: string; appliedAt: string | null; notes: string;
  logoUrl?: string; // provider logo for jobs saved from Explore; manual jobs have none
  pay?: Pay; // structured provider salary (converted for display); manual jobs keep only the typed `salary`
  activity?: StatusChange[]; // oldest first; rows saved before activity existed have none
};
export type EventKind = 'interview' | 'deadline' | 'assessment' | 'follow_up' | 'other';
/** Calendar event. Fields after `notes` are optional so events saved before them still load (no kind = 'other'). */
export type Event = {
  id: string; applicationId: string | null; title: string; date: string; notes: string;
  kind?: EventKind; location?: string; createdAt?: string;
  reminderMinutes?: number | null; // minutes before `date`; null/undefined = no reminder
  notificationId?: string; // the scheduled local notification, so edits and deletes can cancel it
};
export type Message = {
  id: string; role: 'user'|'assistant'; content: string; createdAt: string; thread: string; imageUri?: string; suggestions?: string[];
  card?: AgentCard; // interactive agent result (selection, confirmation, preview…); stored with the message
  focusId?: string | null; // the job this turn was about, so follow-ups ("Am I qualified?") keep their context
  source?: 'saved' | 'model'; // replies built from saved data vs written by the on-device model
  meta?: { mode?: MockMode; question?: string; topic?: string; via?: 'voice' | 'text' }; // mock session setup (first message); how an answer was given
  feedback?: InterviewFeedback; // structured end-of-interview feedback (the text version is `content`)
};
/** End-of-interview feedback. Scores 1–5; `technical` 0 = not assessed for this role. No judgements of accent, personality or hireability. */
export type InterviewFeedback = {
  summary: string; relevance: number; clarity: number; completeness: number; examples: number; technical: number;
  strengths: string[]; improvements: string[]; betterAnswer: string; nextSteps: string[];
};
export type Profile = { name: string; skills: string; education: string; experience: string; goals: string; resumeUri: string; resumeText: string; useResumeForAI: boolean; };
export type RemoteJob = { id: string; company: string; title: string; location: string; salary: string; pay?: Pay; employmentType: string; description: string; url: string; logo: string; tags: string[]; level: string; industry: string; postedAt: string; };
export type Page = 'home' | 'jobs' | 'calendar' | 'mock' | 'applications' | 'job-detail' | 'application-detail' | 'chat' | 'resume' | 'notifications' | 'settings' | 'onboarding';
export type Tab = 'home'|'jobs'|'calendar'|'mock';
