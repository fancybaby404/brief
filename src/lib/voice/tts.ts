// Interviewer voice: the platform speech engine with a voice that is verified to run on the device
// (see chooseVoice). One utterance at a time; every utterance has an id so late callbacks are ignored.
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { getPref, setPref } from '../db';
import { chooseVoice, type VoiceChoice } from './catalog';
import { speakable } from './audio';
import { record } from '../perf';

export async function voiceChoice(): Promise<VoiceChoice> {
  try { return chooseVoice(await Speech.getAvailableVoicesAsync(), Platform.OS, await getPref('ttsVoice')); }
  catch { return { offline: 'none', reason: 'This phone’s speech engine didn’t respond.' }; }
}
export const setPreferredVoice = (id: string) => setPref('ttsVoice', id);
export async function speechRate() { const r = Number(await getPref('ttsRate')); return r >= 0.6 && r <= 1.4 ? r : 1; }
export const setSpeechRate = (r: number) => setPref('ttsRate', String(r));

let seq = 0;
/** Speaks `text` after stopping anything already playing. `onEnd(id, finished)` fires once per utterance. */
export async function speak(text: string, voice: VoiceChoice['voice'], rate: number, onEnd: (id: number, finished: boolean) => void) {
  const id = ++seq;
  let ended = false;
  const end = (finished: boolean) => { if (ended) return; ended = true; onEnd(id, finished); };
  await Speech.stop();
  const t0 = Date.now();
  Speech.speak(speakable(text), { onStart: () => record('tts.start', Date.now() - t0), voice: voice?.identifier, language: voice?.language ?? 'en-US', rate: Platform.OS === 'ios' ? rate * 0.5 : rate, pitch: 1, onDone: () => end(true), onStopped: () => end(false), onError: () => end(false) });
  return id;
}
export async function stopSpeaking() { seq++; await Speech.stop(); }
