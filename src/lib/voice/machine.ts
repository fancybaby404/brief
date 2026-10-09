// Interview turn-taking as an explicit state machine. Pure: unit-tested.
// Every transition not listed is ignored (the same state object comes back), which is what
// stops duplicate recordings, overlapping speech and repeated questions from late callbacks.

export type Phase = 'preparing' | 'ready' | 'synthesizing' | 'speaking' | 'listening' | 'transcribing' | 'reviewing' | 'thinking' | 'paused' | 'completed' | 'error';

export type VoiceState = {
  phase: Phase;
  /** Which interviewer turn is current. Speech callbacks carry it; a stale turn is ignored. */
  turn: number;
  /** The answer as transcribed, editable before it's sent. */
  draft: string;
  /** Where Resume returns to. */
  resumeTo?: 'ready' | 'reviewing';
  /** Ending: the next reply is the feedback, then completed. */
  finishing?: boolean;
  /** Short, user-facing note (e.g. "I didn't catch that"). Cleared by the next action. */
  notice?: string;
  error?: string;
};

export type VoiceEvent =
  | { type: 'PREPARED' }
  | { type: 'FAILED'; error: string }
  | { type: 'SPEAK'; turn: number }          // start reading the current question aloud (also Replay)
  | { type: 'PLAYBACK_STARTED'; turn: number } // audio is audible; synthesis alone is not speaking
  | { type: 'SPOKEN'; turn: number }         // TTS finished (or was stopped) for that turn
  | { type: 'LISTEN' }                       // mic on
  | { type: 'STOP_LISTENING' }               // "Done speaking" or end of speech detected
  | { type: 'CANCEL_LISTENING' }             // discard the recording
  | { type: 'HEARD'; text: string }
  | { type: 'NOTHING_HEARD'; notice: string }
  | { type: 'EDIT'; text: string }
  | { type: 'SEND'; text?: string }          // send the reviewed (or typed) answer
  | { type: 'REPLY'; turn: number; speak: boolean }
  | { type: 'PAUSE' } | { type: 'RESUME' } | { type: 'BACKGROUND' }
  | { type: 'CONTINUE' }                     // resume a session whose last answer has no reply yet
  | { type: 'END' }                          // ask for feedback now (also the automatic wrap-up)
  | { type: 'DONE' }                         // feedback received
  | { type: 'RETRY'; to?: 'thinking' };     // 'thinking' = regenerate the reply that failed

export const initialVoiceState = (turn = 0): VoiceState => ({ phase: 'preparing', turn, draft: '' });

export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  const to = (phase: Phase, extra: Partial<VoiceState> = {}): VoiceState => ({ ...s, phase, notice: undefined, ...extra });
  // Any live phase can fail (mic, speech engine, model); a finished interview can't.
  if (e.type === 'FAILED' && s.phase !== 'completed' && s.phase !== 'error') return to('error', { error: e.error });
  switch (s.phase) {
    case 'preparing':
      if (e.type === 'PREPARED') return to('ready');
      if (e.type === 'FAILED') return to('error', { error: e.error });
      return s;
    case 'ready':
      if (e.type === 'LISTEN') return to('listening', { draft: '' });
      if (e.type === 'SPEAK' && e.turn === s.turn) return to('synthesizing');
      if (e.type === 'SEND' && e.text?.trim()) return to('thinking', { draft: e.text.trim() });
      if (e.type === 'PAUSE') return to('paused', { resumeTo: 'ready' });
      if (e.type === 'END') return to('thinking', { finishing: true });
      if (e.type === 'CONTINUE') return to('thinking');
      return s;
    case 'synthesizing':
      if (e.type === 'PLAYBACK_STARTED' && e.turn === s.turn) return to('speaking');
      if (e.type === 'SPOKEN' && e.turn === s.turn) return to('ready');
      if (e.type === 'PAUSE' || e.type === 'BACKGROUND') return to('paused', { resumeTo: 'ready' });
      if (e.type === 'END') return to('thinking', { finishing: true });
      return s;
    case 'speaking':
      if (e.type === 'SPOKEN' && e.turn === s.turn) return to('ready');
      if (e.type === 'PAUSE' || e.type === 'BACKGROUND') return to('paused', { resumeTo: 'ready' });
      if (e.type === 'END') return to('thinking', { finishing: true });
      return s;
    case 'listening':
      if (e.type === 'STOP_LISTENING') return to('transcribing');
      if (e.type === 'CANCEL_LISTENING') return to('ready');
      if (e.type === 'PAUSE' || e.type === 'BACKGROUND') return to('paused', { resumeTo: 'ready', draft: '' });
      return s;
    case 'transcribing':
      if (e.type === 'HEARD') return to('reviewing', { draft: e.text });
      if (e.type === 'NOTHING_HEARD') return { ...to('ready'), notice: e.notice };
      if (e.type === 'FAILED') return to('error', { error: e.error });
      return s;
    case 'reviewing':
      if (e.type === 'EDIT') return { ...s, draft: e.text };
      if (e.type === 'SEND') { const t = (e.text ?? s.draft).trim(); return t ? to('thinking', { draft: t }) : s; }
      if (e.type === 'LISTEN') return to('listening', { draft: '' });
      if (e.type === 'PAUSE' || e.type === 'BACKGROUND') return to('paused', { resumeTo: 'reviewing' });
      if (e.type === 'END') return to('thinking', { finishing: true });
      return s;
    case 'thinking':
      if (e.type === 'REPLY' && !s.finishing && e.turn > s.turn) return to(e.speak ? 'synthesizing' : 'ready', { turn: e.turn, draft: '' });
      if (e.type === 'DONE' && s.finishing) return to('completed', { draft: '' });
      if (e.type === 'END' && !s.finishing) return { ...s, finishing: true }; // wrap-up after the last answer
      return s;
    case 'paused':
      if (e.type === 'RESUME') return to(s.resumeTo ?? 'ready');
      if (e.type === 'END') return to('thinking', { finishing: true });
      return s;
    case 'error':
      if (e.type === 'RETRY') return to(e.to ?? 'ready', { error: undefined, finishing: false });
      if (e.type === 'END') return to('thinking', { finishing: true, error: undefined });
      return s;
    case 'completed':
      return s;
  }
}

/** The mic may only open from these phases: never while Brief is talking or thinking. */
export const canListen = (p: Phase) => p === 'ready' || p === 'reviewing';
export const PHASE_LABEL: Record<Phase, string> = {
  preparing: 'Getting ready…', ready: 'Your turn', synthesizing: 'Preparing voice…', speaking: 'Brief is asking…', listening: 'Listening…', transcribing: 'Transcribing on your phone…',
  reviewing: 'Check your answer', thinking: 'Brief is thinking…', paused: 'Paused', completed: 'Interview complete', error: 'Something went wrong',
};
