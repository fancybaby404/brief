// Interviewer voice: the platform speech engine with a voice that is verified to run on the device
// (see chooseVoice). One utterance at a time; every utterance has an id so late callbacks are ignored.
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getPref, setPref } from '../db';
import { chooseVoice, type VoiceChoice } from './catalog';
import { speakable } from './audio';
import { record } from '../perf';
import { KittenVoice, releaseKitten, speakWithKitten, stopKittenPlayback } from './kitten';

export async function voiceChoice(): Promise<VoiceChoice> {
  try { return chooseVoice(await Speech.getAvailableVoicesAsync(), Platform.OS, await getPref('ttsVoice')); }
  catch { return { offline: 'none', reason: 'This phone’s speech engine didn’t respond.' }; }
}
export const setPreferredVoice = (id: string) => setPref('ttsVoice', id);
export async function speechRate() { const r = Number(await getPref('ttsRate')); return r >= 0.6 && r <= 1.4 ? r : 1; }
export const setSpeechRate = (r: number) => setPref('ttsRate', String(r));
export type TtsEngine = 'system' | 'kitten';
export async function ttsEngine(): Promise<TtsEngine> { return (await getPref('ttsEngine')) === 'kitten' ? 'kitten' : 'system'; }
export const setTtsEngine = (engine: TtsEngine) => setPref('ttsEngine', engine);
export async function kittenVoice(): Promise<KittenVoice | undefined> {
  const value = await getPref('kittenTtsVoice');
  return Object.values(KittenVoice).includes(value as KittenVoice) ? value as KittenVoice : undefined;
}
export async function setKittenVoice(voice: KittenVoice) {
  await setPref('kittenTtsVoice', voice);
  await setTtsEngine('kitten');
}

let seq = 0;
let activeEnd: ((finished: boolean) => void) | undefined;

function startSystem(id: number, text: string, voice: VoiceChoice['voice'], rate: number, onStart: () => void, end: (finished: boolean) => void) {
  if (id !== seq) return;
  const t0 = Date.now();
  Speech.speak(speakable(text), {
    onStart: () => { if (id === seq) { record('tts.start', Date.now() - t0); onStart(); } },
    voice: voice?.identifier,
    language: voice?.language ?? 'en-US',
    rate: Platform.OS === 'ios' ? rate * 0.5 : rate,
    pitch: 1,
    onDone: () => end(true), onStopped: () => end(false), onError: () => end(false),
  });
}

/** Speaks with the saved provider. Kitten starts only after the first audio segment is ready. */
export function speak(
  text: string,
  voice: VoiceChoice['voice'],
  rate: number,
  onEnd: (id: number, finished: boolean) => void,
  onPlaybackStart: () => void = () => undefined,
  onFallback: (reason: string) => void = () => undefined,
  offline: VoiceChoice['offline'] = 'none',
) {
  if (activeEnd) activeEnd(false);
  const id = ++seq;
  const requestedAt = Date.now();
  let ended = false;
  const end = (finished: boolean) => {
    if (ended || id !== seq) return;
    ended = true;
    if (activeEnd === end) activeEnd = undefined;
    onEnd(id, finished);
  };
  activeEnd = end;
  let selectedProvider: TtsEngine = 'system';
  let playbackStarted = false;
  const beginPlayback = () => { playbackStarted = true; onPlaybackStart(); };
  void (async () => {
    await Promise.all([Speech.stop().catch(() => undefined), stopKittenPlayback().catch(() => undefined)]);
    if (id !== seq) return id;
    const provider = await ttsEngine();
    selectedProvider = provider;
    if (id !== seq) return id;
    if (provider === 'kitten') {
      const selected = await kittenVoice();
      if (id !== seq) return id;
      if (selected) {
        const startedAt = Date.now();
        await speakWithKitten(text, selected, rate, () => id === seq, () => {
          if (id !== seq) return;
          record('tts.start', Date.now() - requestedAt);
          record('tts.kitten.firstAudio', Date.now() - requestedAt);
          beginPlayback();
        }, (elapsedMs) => record('tts.kitten.synthesis', elapsedMs));
        if (id === seq) { record('tts.kitten.duration', Date.now() - startedAt); end(true); }
        return id;
      }
      if (voice?.identifier && offline === 'verified') {
        void setTtsEngine('system').catch(() => undefined);
        onFallback('No Kitten voice is selected. Using your verified phone voice for this turn.');
        startSystem(id, text, voice, rate, beginPlayback, end);
      } else {
        onFallback('Choose a Kitten voice in Voice interviews first.');
        end(false);
      }
      return id;
    }
    startSystem(id, text, voice, rate, beginPlayback, end);
  })().catch((error: unknown) => {
    if (id !== seq) return;
    const reason = error instanceof Error ? error.message : String(error);
    record('tts.kitten.failed', Date.now() - requestedAt);
    if (selectedProvider === 'kitten' && playbackStarted) {
      if (voice?.identifier && offline === 'verified') void setTtsEngine('system').catch(() => undefined);
      onFallback('The Kitten voice stopped mid-response. Your transcript is saved; tap Replay to hear the question again.');
      end(false);
    } else if (selectedProvider === 'kitten' && voice?.identifier && offline === 'verified') {
      void setTtsEngine('system').catch(() => undefined);
      onFallback(`Kitten voice failed before playback. Switching to your verified phone voice for this turn. ${reason}`);
      startSystem(id, text, voice, rate, beginPlayback, end);
    } else {
      onFallback(selectedProvider === 'kitten' ? `${reason} No verified offline phone voice is available.` : `The phone speech engine could not start. ${reason}`);
      end(false);
    }
  });
  return id;
}

/** Preview an explicit Kitten voice without changing the user's selected voice. */
export function previewKittenVoice(text: string, selected: KittenVoice, rate: number, onEnd: (id: number, finished: boolean) => void, onPlaybackStart: () => void = () => undefined, onSynthesis?: (elapsedMs: number) => void, onError: (reason: string) => void = () => undefined) {
  if (activeEnd) activeEnd(false);
  const id = ++seq;
  let ended = false;
  const end = (finished: boolean) => {
    if (ended || id !== seq) return;
    ended = true;
    if (activeEnd === end) activeEnd = undefined;
    onEnd(id, finished);
  };
  activeEnd = end;
  void (async () => {
    await Promise.all([Speech.stop().catch(() => undefined), stopKittenPlayback().catch(() => undefined)]);
    if (id !== seq) return;
    await speakWithKitten(text, selected, rate, () => id === seq, onPlaybackStart, onSynthesis);
    end(true);
  })().catch((error: unknown) => {
    onError(error instanceof Error ? error.message : String(error));
    end(false);
  });
  return id;
}

/** Preview the legacy phone TTS provider directly for side-by-side comparison. */
export function previewSystemVoice(text: string, selected: VoiceChoice['voice'], rate: number, onEnd: (id: number, finished: boolean) => void, onPlaybackStart: () => void = () => undefined) {
  if (activeEnd) activeEnd(false);
  const id = ++seq;
  let ended = false;
  const end = (finished: boolean) => {
    if (ended || id !== seq) return;
    ended = true;
    if (activeEnd === end) activeEnd = undefined;
    onEnd(id, finished);
  };
  activeEnd = end;
  void Promise.all([Speech.stop().catch(() => undefined), stopKittenPlayback().catch(() => undefined)]).then(() => {
    if (id === seq) startSystem(id, text, selected, rate, onPlaybackStart, end);
  }).catch(() => end(false));
  return id;
}

export async function stopSpeaking() {
  const end = activeEnd;
  activeEnd = undefined;
  end?.(false);
  seq++;
  await Promise.all([Speech.stop(), stopKittenPlayback()]);
}

export async function releaseTts() { await stopSpeaking(); await releaseKitten(); }
