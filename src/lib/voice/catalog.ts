// Offline speech models and voice selection. Pure: unit-tested.

export type SpeechModel = { id: string; name: string; description: string; fileName: string; url: string; bytes: number; sha256: string; license: string };

/** whisper.cpp GGML models, pinned to one immutable revision; sizes and SHA-256 from the Hugging Face API. */
const WHISPER_REV = '5359861c739e955e79d9a303bcbc70fb988958b1';
const VAD_REV = '9ffd54a1e1ee413ddf265af9913beaf518d1639b';
const hf = (repo: string, rev: string, file: string) => `https://huggingface.co/${repo}/resolve/${rev}/${file}`;

export const STT_MODELS: SpeechModel[] = [
  { id: 'whisper-base-en', name: 'Standard', description: 'Whisper base.en · faster replies', fileName: 'ggml-base.en-q5_1.bin', url: hf('ggerganov/whisper.cpp', WHISPER_REV, 'ggml-base.en-q5_1.bin'), bytes: 59721011, sha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f', license: 'MIT' },
  { id: 'whisper-small-en', name: 'More accurate', description: 'Whisper small.en · better with accents, slower', fileName: 'ggml-small.en-q5_1.bin', url: hf('ggerganov/whisper.cpp', WHISPER_REV, 'ggml-small.en-q5_1.bin'), bytes: 190098681, sha256: 'bfdff4894dcb76bbf647d56263ea2a96645423f1669176f4844a1bf8e478ad30', license: 'MIT' },
];
/** Silero VAD (GGML) for whisper.rn: confirms a recording actually contains speech before transcribing. */
export const VAD_MODEL: SpeechModel = { id: 'silero-vad', name: 'Speech detector', description: 'Silero VAD v6.2.0', fileName: 'ggml-silero-v6.2.0.bin', url: hf('ggml-org/whisper-vad', VAD_REV, 'ggml-silero-v6.2.0.bin'), bytes: 885098, sha256: '2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987', license: 'MIT' };

export const formatMB = (b: number) => `${Math.round(b / 1e6)} MB`;

export type VoiceInfo = { identifier: string; name: string; quality: string; language: string };
export type VoiceChoice = { voice?: VoiceInfo; offline: 'verified' | 'unverified' | 'none'; reason: string };

/** Picks an English interviewer voice that runs on the device.
 *  iOS: AVSpeechSynthesizer voices are synthesised on-device, so any installed English voice is offline.
 *  Android: the API doesn't say; Google's engine names on-device voices "…-local" and cloud ones "…-network",
 *  so only "-local" voices count as verified. Anything else is reported as unverified, never assumed. */
export function chooseVoice(voices: VoiceInfo[], platform: 'ios' | 'android' | string, preferred?: string): VoiceChoice {
  const en = voices.filter(v => /^en([-_]|$)/i.test(v.language));
  const rank = (v: VoiceInfo) => (v.quality === 'Enhanced' ? 4 : 0) + (/^en[-_](us|gb|au)$/i.test(v.language) ? 2 : /^en[-_]ph$/i.test(v.language) ? 3 : 0) + (/novelty|whisper|bells|bad news|boing|bubbles|jester|organ|trinoids|zarvox|cellos|superstar|wobble|albert|fred|junior|ralph|kathy/i.test(v.name) ? -10 : 0);
  if (platform === 'ios') {
    const pool = [...en].sort((a, b) => rank(b) - rank(a));
    const voice = pool.find(v => v.identifier === preferred) ?? pool[0];
    return voice ? { voice, offline: 'verified', reason: 'iOS voices are synthesised on this phone.' } : { offline: 'none', reason: 'No English voice is installed. Add one in Settings → Accessibility → Spoken Content → Voices.' };
  }
  const local = en.filter(v => /-local$/i.test(v.identifier)).sort((a, b) => rank(b) - rank(a));
  const voice = local.find(v => v.identifier === preferred) ?? local[0];
  if (voice) return { voice, offline: 'verified', reason: 'On-device voice (Google “local” voice).' };
  const other = en.filter(v => !/-network$/i.test(v.identifier)).sort((a, b) => rank(b) - rank(a))[0];
  if (other) return { voice: other, offline: 'unverified', reason: 'This voice’s engine doesn’t say whether it works offline. Test it with airplane mode on.' };
  return { offline: 'none', reason: 'No offline English voice found. Install one in Android Settings → Text-to-speech → Install voice data.' };
}
