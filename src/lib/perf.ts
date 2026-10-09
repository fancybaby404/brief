// In-session performance samples (memory only, never uploaded). Settings → Performance shows them, so
// timings can be read on a real phone instead of guessed. Pure: unit-tested.

const MAX = 30;
const samples = new Map<string, number[]>();

export const PERF_LABELS: Record<string, { label: string; unit: 'ms' | 'tok/s' }> = {
  'startup.ready': { label: 'Startup to usable', unit: 'ms' },
  'db.load': { label: 'Load saved data', unit: 'ms' },
  'model.load': { label: 'Qwen3-VL load', unit: 'ms' },
  'vision.load': { label: 'Vision encoder load', unit: 'ms' },
  'llm.ttft': { label: 'Time to first token', unit: 'ms' },
  'llm.prompt': { label: 'Prompt processing', unit: 'ms' },
  'llm.tps': { label: 'Generation speed', unit: 'tok/s' },
  'vision.preprocess': { label: 'Image preprocessing', unit: 'ms' },
  'agent.turn': { label: 'Request → actionable reply', unit: 'ms' },
  'stt.load': { label: 'Speech model load', unit: 'ms' },
  'stt.transcribe': { label: 'Transcription', unit: 'ms' },
  'tts.start': { label: 'Reply → audible speech', unit: 'ms' },
  'jobs.fetch': { label: 'Job listings fetch', unit: 'ms' },
};

export function record(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  const list = samples.get(name) ?? [];
  list.push(value);
  if (list.length > MAX) list.shift();
  samples.set(name, list);
}
/** Starts a timer; call the returned function to record the elapsed milliseconds. */
export function timer(name: string) { const t0 = Date.now(); return () => record(name, Date.now() - t0); }

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
export function summary() {
  return [...samples.entries()].map(([name, list]) => {
    const sorted = [...list].sort((a, b) => a - b);
    return { name, label: PERF_LABELS[name]?.label ?? name, unit: PERF_LABELS[name]?.unit ?? 'ms', count: list.length, last: list[list.length - 1], median: pct(sorted, 0.5), p90: pct(sorted, 0.9) };
  }).sort((a, b) => Object.keys(PERF_LABELS).indexOf(a.name) - Object.keys(PERF_LABELS).indexOf(b.name));
}
export const resetPerf = () => samples.clear();
export const formatValue = (v: number, unit: 'ms' | 'tok/s') => (unit === 'tok/s' ? `${v.toFixed(1)} tok/s` : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
