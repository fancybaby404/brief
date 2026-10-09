// 'saved' was merged into 'interested'; old rows are normalised on load (tracker.normalizeApplication).
export type ApplicationStatus = 'interested' | 'applied' | 'interview' | 'under_review' | 'offer' | 'rejected';
export type Application = {
  id: string; company: string; title: string; status: ApplicationStatus; location: string;
  salary: string; employmentType: string; description: string; sourceUrl: string;
  createdAt: string; appliedAt: string | null; notes: string;
  logoUrl?: string; // provider logo for jobs saved from Explore; manual jobs have none
};
export type Event = { id: string; applicationId: string | null; title: string; date: string; notes: string; };
export type Message = { id: string; role: 'user'|'assistant'; content: string; createdAt: string; thread: string; };
export type Profile = { name: string; skills: string; education: string; experience: string; goals: string; resumeUri: string; resumeText: string; useResumeForAI: boolean; };
export type RemoteJob = { id: string; company: string; title: string; location: string; salary: string; employmentType: string; description: string; url: string; logo: string; tags: string[]; };
export type Page = 'home' | 'jobs' | 'calendar' | 'mock' | 'applications' | 'job-detail' | 'application-detail' | 'chat' | 'resume' | 'notifications' | 'settings' | 'add-job' | 'onboarding';
export type Tab = 'home'|'jobs'|'calendar'|'mock';
