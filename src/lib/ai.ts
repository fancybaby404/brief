// On-device inference only: llama.rn loads a local GGUF. There is no network fallback.
import type { LlamaContext } from 'llama.rn';
import type { Application, Profile, Message } from '../types';
import { getPref, setPref } from './db';
import { askBriefSystem, mockSystem, EXTRACT_SYSTEM, extractUser, parseJobExtraction } from './prompts';

let context: LlamaContext | null = null;
let loading: Promise<LlamaContext> | null = null;
let loadedPath = '';
const stop = ['<|im_end|>', '<|endoftext|>', '</s>', '<|eot_id|>', '<end_of_turn>'];

export const MODEL_MISSING = 'Install a local model in Settings to use Brief AI. Brief never sends your chats to a cloud model.';
export async function modelPath() { return await getPref('modelPath'); }

export async function configureModel(path: string) {
  await releaseModel();
  await setPref('modelPath', path);
}
export async function releaseModel() {
  const c = context; context = null; loading = null; loadedPath = '';
  if (c) await c.release().catch(() => {});
}

export async function ensureModel(onProgress?: (pct: number) => void): Promise<LlamaContext> {
  const model = await modelPath();
  if (!model) throw new Error(MODEL_MISSING);
  if (context && loadedPath === model) return context;
  if (!loading) {
    loading = (async () => {
      const { initLlama } = await import('llama.rn');
      try { return await initLlama({ model, use_mlock: false, n_ctx: 2048, n_gpu_layers: 0 }, onProgress); }
      catch (e) {
        const msg = String((e as Error)?.message || e);
        throw new Error(/memory|alloc|oom/i.test(msg)
          ? 'Not enough memory to load this model. Try a smaller one (e.g. 0.6B Q4) in Settings.'
          : `The model could not be loaded (${msg}). Re-import a compatible .gguf in Settings.`);
      }
    })();
  }
  try { context = await loading; loadedPath = model; return context; }
  finally { loading = null; }
}

async function complete(system: string, user: string, history: Message[], maxTokens: number) {
  const ctx = await ensureModel();
  const messages = [{ role: 'system', content: system }, ...history.slice(-6).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: user }];
  return ctx.completion({ messages, n_predict: maxTokens, temperature: 0.55, stop, jinja: true, enable_thinking: false });
}
export async function generate(system: string, user: string, history: Message[] = [], maxTokens = 260) {
  const r = await complete(system, user, history, maxTokens);
  const out = String(r.text || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  if (!out) throw new Error('The on-device model returned an empty response. Try again or change models.');
  return out;
}

/** Loads the model and runs a tiny prompt, returning real on-device timings for Settings. */
export async function benchmarkModel(onProgress?: (pct: number) => void) {
  const t0 = Date.now();
  await ensureModel(onProgress);
  const loadMs = Date.now() - t0;
  const r = await complete('Reply with one short sentence.', 'Say hello to a job seeker.', [], 32);
  return { loadMs, tokensPerSec: r.timings.predicted_per_second, promptMs: r.timings.prompt_ms, sample: String(r.text || '').trim() };
}

export function askBrief(prompt: string, p: Profile, jobs: Application[], history: Message[] = [], selected?: Application) {
  return generate(askBriefSystem(p, jobs, selected), prompt, history, 300);
}
export function mockInterview(prompt: string, p: Profile, job: Application, history: Message[] = [], finish = false) {
  return generate(mockSystem(p, job, finish), prompt, history, finish ? 380 : 160);
}
export async function extractJob(ocr: string) {
  return parseJobExtraction(await generate(EXTRACT_SYSTEM, extractUser(ocr), [], 420), ocr);
}
