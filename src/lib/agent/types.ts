// Agent data shapes. Cards are stored on chat messages (SQLite JSON payload), so they survive restarts.
import type { Application, ApplicationStatus, Event, EventKind, Message, Profile } from '../../types';

export type MockMode = 'job' | 'hr' | 'behavioral' | 'technical' | 'manager' | 'general' | 'resume';
export const MOCK_MODES: { value: MockMode; label: string }[] = [
  { value: 'job', label: 'This role' }, { value: 'hr', label: 'HR screen' }, { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' }, { value: 'manager', label: 'Hiring manager' }, { value: 'general', label: 'General' }, { value: 'resume', label: 'My resume' },
];

/** Fields a job import can fill. Missing = "" (never guessed). */
export type JobFields = { company: string; title: string; location: string; salary: string; employmentType: string; description: string; sourceUrl: string };

/** A write the user must confirm. Holds only validated values and real record IDs. */
export type Pending =
  | { tool: 'updateApplicationStatus'; id: string; applicationId: string; status: ApplicationStatus }
  | { tool: 'deleteApplication'; id: string; applicationId: string }
  | { tool: 'addApplicationNote'; id: string; applicationId: string; note: string }
  | { tool: 'deleteEvent'; id: string; eventId: string };

export type EventProposal = { applicationId: string | null; kind: EventKind; title: string; date: string; location?: string; notes?: string; assumed?: string; eventId?: string };

export type CardState = 'pending' | 'done' | 'cancelled' | 'failed';
export type FollowUp = 'qualify' | 'schedule_interview' | 'practice';

export type AgentCard =
  /** Real application records. `pick` = the user is choosing one to continue an action. */
  | { type: 'apps'; title: string; ids: string[]; pick?: PickTarget }
  | { type: 'events'; title: string; ids: string[] }
  | { type: 'confirm'; pending: Pending; state: CardState; result?: string; undo?: { app?: Application; events?: Event[]; event?: Event; used?: boolean } }
  | { type: 'status'; applicationId: string; state: CardState }
  | { type: 'job'; fields: JobFields; status: 'interested' | 'applied'; state: CardState; savedId?: string; duplicateId?: string; note?: string; followUps?: FollowUp[] }
  | { type: 'event'; proposal: EventProposal; state: CardState; savedId?: string; offerInterviewStatus?: boolean }
  | { type: 'interview'; applicationId?: string; mode: MockMode; question?: string; topic?: string; voice?: boolean; resume?: boolean; state: CardState }
  | { type: 'choices'; options: { label: string; send: string }[] }
  /** Resume details read from an image; saved to the profile only when the user taps Save. */
  | { type: 'resume'; fields: { name: string; skills: string; experience: string; education: string; goals: string }; state: CardState; interview?: boolean }
  | { type: 'next'; applicationId: string; followUps: FollowUp[] };

export type PickTarget =
  | { action: 'open' } | { action: 'delete' } | { action: 'status'; status?: ApplicationStatus } | { action: 'note'; note: string }
  | { action: 'schedule'; proposal: Omit<EventProposal, 'applicationId' | 'title'> } | { action: 'practice'; mode: MockMode; question?: string; topic?: string } | { action: 'focus' };

/** What the agent can read and change. The app passes its SQLite-backed context; tests pass an in-memory store. */
export interface AgentStore {
  applications: Application[]; events: Event[]; profile: Profile;
  putApp(a: Application): Promise<unknown>; removeApp(id: string): Promise<void>;
  putEvent(e: Event): Promise<unknown>; removeEvent(id: string): Promise<void>;
  /** Fresh rows from storage, used to verify a write actually happened before saying so. */
  reload(): Promise<{ applications: Application[]; events: Event[] }>;
  /** Saved chat/mock messages whose thread starts with `prefix` (interview sessions and feedback). */
  messages(prefix: string): Promise<Message[]>;
}
