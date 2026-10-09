// Offline speech-to-text: microphone PCM (16 kHz mono) → Silero VAD check → whisper.cpp, all on device.
// whisper.rn uses its own ggml build (wsp_ prefixed), so it runs alongside llama.rn without symbol clashes.
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { WhisperContext, WhisperVadContext } from 'whisper.rn/index';
import { getPref, setPref } from '../db';
import { STT_MODELS, VAD_MODEL, type SpeechModel } from './catalog';
import { Sha256 } from './sha256';
import { record, timer } from '../perf';
import { base64ToBytes, cleanTranscript, durationMs, Endpointer, joinChunks, level } from './audio';

let whisper: WhisperContext | null = null, vad: WhisperVadContext | null = null, loadedPath = '', transcribing = false;
// Backgrounded for 3 minutes with nothing transcribing: give Whisper's memory back (reloads on next answer).
let idle: ReturnType<typeof setTimeout> | null = null;
AppState.addEventListener('change', s => { if (idle) { clearTimeout(idle); idle = null; } if (s === 'background') idle = setTimeout(() => { if (!transcribing) void releaseSpeech(); }, 180000); });

export async function speechModelPaths() { const [stt, vadPath] = await Promise.all([getPref('sttModelPath'), getPref('vadModelPath')]); return { stt, vad: vadPath }; }
/** Installed = both files present on disk (a deleted cache or OS cleanup is caught here, not mid-interview). */
export async function speechInstalled() {
  const p = await speechModelPaths();
  if (!p.stt || !p.vad) return false;
  const [a, b] = await Promise.all([FileSystem.getInfoAsync(p.stt), FileSystem.getInfoAsync(p.vad)]);
  return a.exists && b.exists;
}
export const installedModel = async () => { const id = await getPref('sttModelId'); return STT_MODELS.find(m => m.id === id) ?? null; };

/** SHA-256 of a downloaded file, read in 1 MB pieces so a 190 MB model never sits in memory at once. */
async function hashFile(uri: string, size: number, onProgress?: (f: number) => void) {
  const h = new Sha256(), step = 1 << 20;
  for (let pos = 0; pos < size; pos += step) {
    h.update(base64ToBytes(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: pos, length: Math.min(step, size - pos) })));
    onProgress?.(Math.min(1, (pos + step) / size));
  }
  return h.hex();
}

/** Downloads Whisper + Silero VAD into app storage, checks size and the publisher's SHA-256, then switches. */
export async function downloadSpeechModels(model: SpeechModel, onProgress: (stage: 'download' | 'verify', fraction: number) => void, onTask: (t: FileSystem.DownloadResumable | null) => void) {
  if (!FileSystem.documentDirectory) throw new Error('Private storage is unavailable.');
  const free = await FileSystem.getFreeDiskStorageAsync().catch(() => null);
  const total = model.bytes + VAD_MODEL.bytes;
  if (free !== null && free < total * 1.2) throw new Error(`Voice interviews need about ${Math.round(total / 1e6)} MB free. Free some space and try again.`);
  const items = [VAD_MODEL, model].map(m => ({ m, dest: `${FileSystem.documentDirectory}brief-speech-${m.id}-${Date.now()}.bin` }));
  let done = 0;
  try {
    for (const { m, dest } of items) {
      const task = FileSystem.createDownloadResumable(m.url, dest, {}, p => onProgress('download', Math.min(1, (done + p.totalBytesWritten) / total)));
      onTask(task);
      let r: FileSystem.FileSystemDownloadResult | undefined;
      try { r = await task.downloadAsync(); } finally { onTask(null); }
      if (!r) { for (const i of items) await FileSystem.deleteAsync(i.dest, { idempotent: true }); return null; }
      if (r.status < 200 || r.status >= 300) throw new Error(`The model source returned ${r.status}. Try again on a stable connection.`);
      const info = await FileSystem.getInfoAsync(dest);
      if (!info.exists || info.size !== m.bytes) throw new Error(`${m.name} download was incomplete. Please try again.`);
      done += m.bytes;
    }
    for (const [i, { m, dest }] of items.entries()) {
      const hex = await hashFile(dest, m.bytes, f => onProgress('verify', (i + f) / items.length));
      if (hex !== m.sha256) throw new Error(`${m.name} failed its integrity check. The file was deleted; please download again.`);
    }
    const old = await speechModelPaths();
    await releaseSpeech();
    await setPref('vadModelPath', items[0].dest); await setPref('sttModelPath', items[1].dest); await setPref('sttModelId', model.id);
    for (const p of [old.stt, old.vad]) if (p) await FileSystem.deleteAsync(p, { idempotent: true }).catch(() => {});
    return { stt: items[1].dest, vad: items[0].dest };
  } catch (e) {
    for (const i of items) await FileSystem.deleteAsync(i.dest, { idempotent: true }).catch(() => {});
    throw e;
  }
}

export async function removeSpeechModels() {
  const p = await speechModelPaths();
  await releaseSpeech();
  for (const f of [p.stt, p.vad]) if (f) await FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {});
  await setPref('sttModelPath', ''); await setPref('vadModelPath', ''); await setPref('sttModelId', '');
}

export type MicPermission = 'granted' | 'denied' | 'blocked';
/** Asks only when the user starts speaking. "blocked" = the OS won't ask again; send them to Settings. */
export async function requestMic(): Promise<MicPermission> {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, { title: 'Microphone', message: 'Brief listens only while you answer. Speech is turned into text on this phone and the audio is discarded.', buttonPositive: 'Allow' });
    return r === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
  }
  const { Camera } = await import('expo-camera');
  const r = await Camera.requestMicrophonePermissionsAsync();
  return r.granted ? 'granted' : r.canAskAgain ? 'denied' : 'blocked';
}

/** Loads Whisper + VAD once per interview; reused across turns, released when the interview ends. */
export async function loadSpeech() {
  const p = await speechModelPaths();
  if (!p.stt || !p.vad) throw new Error('Voice models aren’t installed. Add them in Settings → Voice interviews.');
  if (whisper && loadedPath === p.stt && vad) return;
  await releaseSpeech();
  const { initWhisper, initWhisperVad } = await import('whisper.rn/index');
  const done = timer('stt.load');
  try {
    whisper = await initWhisper({ filePath: p.stt, useGpu: Platform.OS === 'ios' });
    vad = await initWhisperVad({ filePath: p.vad, useGpu: false, nThreads: 2 });
    loadedPath = p.stt; done();
  } catch (e) {
    await releaseSpeech();
    const msg = String((e as Error)?.message || e);
    throw new Error(/memory|alloc/i.test(msg) ? 'Not enough memory for speech recognition. Close other apps or use a text interview.' : `Speech recognition couldn’t start (${msg}).`);
  }
}
export async function releaseSpeech() {
  const w = whisper, v = vad; whisper = null; vad = null; loadedPath = '';
  await w?.release().catch(() => {}); await v?.release().catch(() => {});
}

/** One answer's recording. Audio lives only in memory and is dropped after transcription. */
export function createRecorder(opts: { onLevel?: (lv: number) => void; onEndOfSpeech?: () => void; autoStop: boolean }) {
  let chunks: Uint8Array[] = [], sub: { remove(): void } | null = null, active = false;
  const end = new Endpointer();
  return {
    async start() {
      const { default: Rec } = await import('@fugood/react-native-audio-pcm-stream');
      chunks = []; active = true;
      // VOICE_RECOGNITION (6) on Android: tuned for speech, with the platform's noise handling.
      await Rec.init({ sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 4096, wavFile: '' });
      sub = Rec.on('data', b64 => {
        if (!active) return;
        const bytes = base64ToBytes(b64); chunks.push(bytes);
        const lv = level(bytes); opts.onLevel?.(lv);
        if (opts.autoStop && end.push(lv, durationMs(bytes.length))) opts.onEndOfSpeech?.();
      });
      Rec.start();
    },
    /** Stops the mic and returns the PCM (16 kHz mono s16le). */
    async stop() {
      if (!active) return new ArrayBuffer(0);
      active = false; sub?.remove(); sub = null;
      const { default: Rec } = await import('@fugood/react-native-audio-pcm-stream');
      await Rec.stop();
      const pcm = joinChunks(chunks); chunks = [];
      return pcm;
    },
    async cancel() { await this.stop(); },
    get heardSpeech() { return end.heardSpeech; },
  };
}

export type Transcript = { text: string; ms: number; audioMs: number; reason?: 'too-short' | 'no-speech' };
/** VAD first: silence or background noise never reaches Whisper (which would invent words for it). */
export async function transcribe(pcm: ArrayBuffer, hint = ''): Promise<Transcript> {
  const audioMs = durationMs(pcm.byteLength), t0 = Date.now();
  if (audioMs < 500) return { text: '', ms: 0, audioMs, reason: 'too-short' };
  await loadSpeech();
  transcribing = true;
  try {
  const segments = await vad!.detectSpeechData(pcm, { threshold: 0.5, minSpeechDurationMs: 250, minSilenceDurationMs: 300, speechPadMs: 120 });
  if (!segments.length) return { text: '', ms: Date.now() - t0, audioMs, reason: 'no-speech' };
  // The prompt nudges spelling of interview vocabulary; it isn't an instruction to the model.
  const { promise } = whisper!.transcribeData(pcm, { language: 'en', maxThreads: 4, prompt: hint.slice(0, 200) });
  const { result } = await promise;
  const text = cleanTranscript(result);
  record('stt.transcribe', Date.now() - t0);
  return { text, ms: Date.now() - t0, audioMs, reason: text ? undefined : 'no-speech' };
  } finally { transcribing = false; }
}
