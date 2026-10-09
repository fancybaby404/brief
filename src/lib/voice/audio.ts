// Microphone PCM helpers: 16 kHz, mono, signed 16-bit little-endian. Pure: unit-tested.
export const SAMPLE_RATE = 16000;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => { const t = new Uint8Array(256); for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i; return t; })();
/** Base64 → bytes (chunks from the recorder). No dependency on atob being present. */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)], b = LOOKUP[clean.charCodeAt(i + 1)], c = LOOKUP[clean.charCodeAt(i + 2)], d = LOOKUP[clean.charCodeAt(i + 3)];
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}

/** Joins recorded chunks into one buffer (even byte length, so every sample is whole). */
export function joinChunks(chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((n, c) => n + c.length, 0) & ~1;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { const n = Math.min(c.length, total - o); out.set(c.subarray(0, n), o); o += n; if (o >= total) break; }
  return out.buffer;
}

/** Loudness of a chunk, 0..1 (RMS of the samples). Drives the listening ring and end-of-speech detection. */
export function level(bytes: Uint8Array): number {
  const n = bytes.length >> 1;
  if (!n) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  let sum = 0;
  for (let i = 0; i < n; i++) { const v = view.getInt16(i * 2, true) / 32768; sum += v * v; }
  return Math.sqrt(sum / n);
}

export const durationMs = (byteLength: number) => (byteLength / 2 / SAMPLE_RATE) * 1000;

/** Energy-based end-of-turn detection. It only proposes stopping after the person has spoken and then
 *  paused for `silenceMs`; natural mid-answer pauses shorter than that never end the turn. The noise
 *  floor adapts to the room, so steady background noise isn't mistaken for speech. */
export class Endpointer {
  private floor = 0.004; private spokenMs = 0; private quietMs = 0; private elapsed = 0;
  private o: { silenceMs: number; minSpeechMs: number; maxMs: number; ratio: number };
  constructor(o = { silenceMs: 1800, minSpeechMs: 600, maxMs: 120000, ratio: 3 }) { this.o = o; }
  /** Feed one chunk's level and duration. Returns true when the turn should end. */
  push(lv: number, ms: number): boolean {
    this.elapsed += ms;
    const speaking = lv > Math.max(0.012, this.floor * this.o.ratio);
    if (speaking) { this.spokenMs += ms; this.quietMs = 0; }
    else { this.quietMs += ms; this.floor = this.floor * 0.95 + lv * 0.05; }
    if (this.elapsed >= this.o.maxMs) return true;
    return this.spokenMs >= this.o.minSpeechMs && this.quietMs >= this.o.silenceMs;
  }
  get heardSpeech() { return this.spokenMs >= this.o.minSpeechMs; }
}

/** Text a speech engine reads well: no markdown, bullets, emoji or URLs; one sentence per line break. */
export function speakable(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, 'the link')
    .replace(/[*_#`>|~]+/g, '')
    .replace(/^\s*(?:[-•–]|\d+[.)])\s+/gm, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Whisper hallucinates on silence/noise ("Thank you.", "[BLANK_AUDIO]", "(music)"). Treat those as nothing heard. */
export function cleanTranscript(raw: string) {
  const t = raw.replace(/\[(BLANK_AUDIO|MUSIC|NOISE|SILENCE|INAUDIBLE)\]|\((music|silence|noise|inaudible|background noise)\)/gi, ' ').replace(/\s+/g, ' ').trim();
  if (/^(thank you\.?|thanks for watching\.?|you|\.|bye\.?)$/i.test(t)) return '';
  return t;
}
