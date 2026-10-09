// On-device inference only: llama.rn loads a local GGUF. There is no network fallback.
import type { LlamaContext } from 'llama.rn';
import type { Application, Profile, Message } from '../types';
import { getPref, setPref } from './db';
import { askBriefSystem, mockSystem, EXTRACT_SYSTEM, extractUser, parseJobExtraction } from './prompts';

let context: LlamaContext | null = null;
let loading: Promise<LlamaContext> | null = null;
let loadedPath = '', loadedProjectorPath = '';
let visionSupported = false;
const stop = ['<|im_end|>', '<|endoftext|>', '</s>', '<|eot_id|>', '<end_of_turn>'];

export const MODEL_MISSING = 'Install a local model in Settings to use Brief AI. Brief never sends your chats to a cloud model.';
export async function modelPath() { return await getPref('modelPath'); }
export async function visionProjectorPath(){return getPref('mmprojPath');}

export async function configureModel(path: string,projector='') {
  const previousModel=await getPref('modelPath'),previousProjector=await getPref('mmprojPath');
  await releaseModel();
  try{
    await setPref('modelPath', path);
    await setPref('mmprojPath', projector);
  }catch(error){
    await setPref('modelPath',previousModel).catch(()=>{});
    await setPref('mmprojPath',previousProjector).catch(()=>{});
    throw error;
  }
}
export async function configureVisionProjector(path:string){await releaseModel();await setPref('mmprojPath',path);}
export async function releaseModel() {
  const c = context; context = null; loading = null; loadedPath = '';
  loadedProjectorPath='';visionSupported=false;
  if(c){await c.releaseMultimodal().catch(()=>{});await c.release().catch(()=>{});}
}

export async function ensureModel(onProgress?: (pct: number) => void): Promise<LlamaContext> {
  const [model,projector] = await Promise.all([modelPath(),getPref('mmprojPath')]);
  if (!model) throw new Error(MODEL_MISSING);
  if (context && loadedPath === model&&loadedProjectorPath===projector) return context;
  if (!loading) {
    loading = (async () => {
      const { initLlama } = await import('llama.rn');
      try {
        const ctx=await initLlama({model,use_mlock:false,n_ctx:projector?4096:2048,n_gpu_layers:0,...(projector?{ctx_shift:false}:{})},onProgress);
        visionSupported=false;
        if(projector){try{const loaded=await ctx.initMultimodal({path:projector,use_gpu:false,image_min_tokens:128,image_max_tokens:512});visionSupported=loaded&&(await ctx.getMultimodalSupport()).vision;if(!visionSupported)await ctx.releaseMultimodal().catch(()=>{});}catch{visionSupported=false;await ctx.releaseMultimodal().catch(()=>{});}}
        return ctx;
      }
      catch (e) {
        const msg = String((e as Error)?.message || e);
        throw new Error(/memory|alloc|oom/i.test(msg)
          ? 'Not enough memory to load this model. Try a smaller one (e.g. 0.6B Q4) in Settings.'
          : `The model could not be loaded (${msg}). Re-import a compatible .gguf in Settings.`);
      }
    })();
  }
  try { context = await loading; loadedPath = model;loadedProjectorPath=projector;return context; }
  finally { loading = null; }
}

export async function supportsVision(){const [,projector]=await Promise.all([modelPath(),getPref('mmprojPath')]);if(!projector)return false;const ctx=await ensureModel();return (await ctx.getMultimodalSupport()).vision;}

async function complete(system: string, user: string, history: Message[], maxTokens: number, imageUri?:string, responseFormat?:{type:'json_object'}) {
  const ctx = await ensureModel();
  if(imageUri&&!visionSupported)throw new Error('This local model does not support image input. Import a matching vision projector in Settings.');
  const messages = [{ role: 'system', content: system }, ...history.slice(-6).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: imageUri?[{type:'text',text:user},{type:'image_url',image_url:{url:imageUri}}]:user }];
  return ctx.completion({ messages, n_predict: maxTokens, temperature: 0.55, stop, jinja: true, enable_thinking: false,...(responseFormat?{response_format:responseFormat}:{}) });
}
async function completeJson(system:string,user:string,history:Message[],maxTokens:number,imageUri?:string){
  try{return await complete(system,user,history,maxTokens,imageUri,{type:'json_object'});}
  catch(e){if(!/(json|format|grammar|schema)/i.test(String((e as Error)?.message||e)))throw e;return complete(system,user,history,maxTokens,imageUri);}
}
export async function generate(system: string, user: string, history: Message[] = [], maxTokens = 260) {
  const r = await complete(system, user, history, maxTokens);
  const out = String(r.text || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  if (!out) throw new Error('The on-device model returned an empty response. Try again or change models.');
  return out;
}

/** Loads the model and runs a tiny prompt, returning real on-device timings for Settings. */
export async function benchmarkModel(onProgress?: (pct: number) => void,onLoaded?:()=>void) {
  const t0 = Date.now();
  await ensureModel(onProgress);
  const loadMs = Date.now() - t0;
  onLoaded?.();
  const r = await complete('Reply with one short sentence.', 'Say hello to a job seeker.', [], 32);
  return { loadMs, tokensPerSec: r.timings.predicted_per_second, promptMs: r.timings.prompt_ms, sample: String(r.text || '').trim() };
}

function parseJsonObject(raw:string){const start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start<0||end<start)return null;try{return JSON.parse(raw.slice(start,end+1)) as Record<string,unknown>;}catch{return null;}}
function parseSuggestions(raw:string){const data=parseJsonObject(raw);return Array.isArray(data?.suggestions)?data.suggestions.filter((x):x is string=>typeof x==='string').map(x=>x.trim().slice(0,80)).filter(Boolean).slice(0,3):[];}
export async function suggestBriefQuestions(p:Profile,jobs:Application[],history:Message[]=[],selected?:Application){
  const system=askBriefSystem(p,jobs,selected)+'\nReturn only a JSON object with a "suggestions" array of exactly 3 short, specific follow-up questions. Make each useful for this conversation and avoid repeating questions already asked.';
  const r=await completeJson(system,'Suggest useful next questions based on the current conversation.',history,100);
  return parseSuggestions(String(r.text||''));
}
export async function askBrief(prompt: string, p: Profile, jobs: Application[], history: Message[] = [], selected?: Application,imageUri?:string) {
  const system=askBriefSystem(p,jobs,selected)+'\nReturn only a JSON object with "answer" (your concise reply) and "suggestions" (exactly 3 short, distinct follow-up questions tailored to the user\'s latest message and the conversation). Never include the JSON keys in the answer text.';
  const r=await completeJson(system,prompt,history,440,imageUri);
  const raw=String(r.text||'').replace(/<think>[\s\S]*?(<\/think>|$)/g,'').trim(),data=parseJsonObject(raw);
  if(typeof data?.answer==='string'&&data.answer.trim())return {answer:data.answer.trim(),suggestions:parseSuggestions(raw)};
  if(!raw)throw new Error('The on-device model returned an empty response. Try again or change models.');
  return {answer:raw,suggestions:[]};
}
export function mockInterview(prompt: string, p: Profile, job: Application, history: Message[] = [], finish = false) {
  return generate(mockSystem(p, job, finish), prompt, history, finish ? 380 : 160);
}
export async function extractJob(ocr: string) {
  return parseJobExtraction(await generate(EXTRACT_SYSTEM, extractUser(ocr), [], 420), ocr);
}
