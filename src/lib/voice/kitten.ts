import * as ExpoAudio from 'expo-audio';
import { getFreeDiskStorageAsync } from 'expo-file-system/legacy';
import type { KittenTTS as KittenEngine, KittenTTSResult, KittenVoice as SdkKittenVoice, ProgressHandler } from '@kittentts/react-native';
import type { DownloadProgressInfo } from '@kittentts/react-native';
import { speakable } from './audio';

export const KittenVoice = {
  Bella: 'expr-voice-2-f', Jasper: 'expr-voice-2-m', Luna: 'expr-voice-3-f', Bruno: 'expr-voice-3-m',
  Rosie: 'expr-voice-4-f', Hugo: 'expr-voice-4-m', Kiki: 'expr-voice-5-f', Leo: 'expr-voice-5-m',
} as const;
export type KittenVoice = typeof KittenVoice[keyof typeof KittenVoice];
export const ALL_VOICES = [KittenVoice.Bella, KittenVoice.Jasper, KittenVoice.Luna, KittenVoice.Bruno, KittenVoice.Rosie, KittenVoice.Hugo, KittenVoice.Kiki, KittenVoice.Leo] as const;
export const voiceDisplayName = (voice: KittenVoice) => Object.entries(KittenVoice).find(([, value]) => value === voice)?.[0] ?? 'Kitten voice';
export const isKittenVoice = (voice: string): voice is KittenVoice => ALL_VOICES.some(item => item === voice);

export type KittenDownloadProgress = ProgressHandler;
export type KittenDownloadInfo = DownloadProgressInfo;
export const KITTEN_MODEL = 'KittenTTS Mini · 80M';
export const KITTEN_DOWNLOAD_BYTES = 83_000_000;
export const KITTEN_PREVIEW_TEXT = "Hi! It's nice to meet you. Before we get started, could you tell me a little about yourself?";
const PREVIEW = KITTEN_PREVIEW_TEXT;
const CONFIG = { ortNumThreads: 2, maxTokensPerChunk: 220 };

let engine: KittenEngine | undefined;
let creating: Promise<KittenEngine> | undefined;
let activeOperations = 0;
let disposeWhenIdle = false;
let idleWaiters: Array<() => void> = [];
let installTask: Promise<Awaited<ReturnType<typeof kittenCacheInfo>>> | undefined;
let installProgress: { value: number; info?: DownloadProgressInfo } | null = null;
let installError = '';
const installListeners = new Set<ProgressHandler>();
let verification: Promise<void> | undefined;

// Load the developer-preview native SDK only when a Kitten feature is used. Text
// interviews and the legacy system voice remain loadable in Expo Go and old builds.
const loadSdk = () => import('@kittentts/react-native');

async function getEngine() {
  if (engine) return engine;
  if (!creating) {
    creating = loadSdk().then((sdk) => sdk.KittenTTS.create({
      ...CONFIG,
      model: sdk.KittenModel.Mini,
      player: sdk.createExpoAudioPlayer(ExpoAudio as Parameters<typeof sdk.createExpoAudioPlayer>[0]),
    })).then((ready) => {
      engine = ready;
      return ready;
    }).finally(() => { creating = undefined; });
  }
  return creating;
}

async function withEngine<T>(work: (tts: KittenEngine) => Promise<T>) {
  activeOperations++;
  disposeWhenIdle = false;
  try { return await work(await getEngine()); }
  finally {
    activeOperations--;
    if (activeOperations === 0) {
      idleWaiters.splice(0).forEach(resolve => resolve());
      if (disposeWhenIdle) await disposeEngine();
    }
  }
}

async function disposeEngine() {
  const old = engine;
  engine = undefined;
  disposeWhenIdle = false;
  await old?.dispose();
}

async function modelConfig() {
  const sdk = await loadSdk();
  return { sdk, config: { ...CONFIG, model: sdk.KittenModel.Mini } };
}

export async function kittenCacheInfo() {
  const [{ sdk, config }, fs] = await Promise.all([modelConfig(), import('react-native-fs')]);
  const model = await sdk.KittenTTS.getModelCacheInfo(config);
  const phonemizerDirectory = `${fs.DocumentDirectoryPath}/KittenTTS/CEPhonemizer`;
  const [rules, list] = await Promise.all([fs.exists(`${phonemizerDirectory}/en_rules`), fs.exists(`${phonemizerDirectory}/en_list`)]);
  const phonemizerCached = rules && list;
  return { ...model, phonemizerCached, isCached: model.isCached && phonemizerCached };
}

export function isKittenInstalling() { return !!installTask; }
export function subscribeKittenDownload(listener: ProgressHandler) {
  installListeners.add(listener);
  if (installProgress) listener(installProgress.value, installProgress.info);
  return () => { installListeners.delete(listener); };
}
function publishInstallProgress(value: number, info?: DownloadProgressInfo) {
  installProgress = { value, info };
  installListeners.forEach(listener => { try { listener(value, info); } catch { /* UI observers must not interrupt the SDK download. */ } });
}

export async function installKitten(onProgress?: ProgressHandler) {
  if (onProgress) installListeners.add(onProgress);
  if (!installTask) {
    installError = '';
    installTask = (async () => {
      const free = await getFreeDiskStorageAsync();
      const required = KITTEN_DOWNLOAD_BYTES + 20_000_000;
      if (free < required) throw new Error(`Free up at least ${Math.ceil(required / 1_000_000)} MB, then try again.`);
      const { sdk, config } = await modelConfig();
      await sdk.KittenTTS.predownload(config, publishInstallProgress);
      const cache = await kittenCacheInfo();
      if (!cache.isCached) throw new Error('The voice files did not finish installing. Try again on a stable connection.');
      return cache;
    })().catch((error: unknown) => { installError = error instanceof Error ? error.message : String(error); throw error; }).finally(() => {
      const lastValue = installProgress?.value ?? 0;
      installTask = undefined;
      publishInstallProgress(lastValue, { stage: 'complete', message: installError || undefined });
      installProgress = null;
    });
  }
  try { return await installTask; }
  finally { if (onProgress) installListeners.delete(onProgress); }
}

export async function removeKitten() {
  if (installTask) throw new Error('Wait for the current voice download to finish before removing it.');
  await releaseKitten();
  const [{ sdk, config }, fs] = await Promise.all([modelConfig(), import('react-native-fs')]);
  await sdk.KittenTTS.clearModelCache(config);
  const phonemizerDirectory = `${fs.DocumentDirectoryPath}/KittenTTS/CEPhonemizer`;
  await Promise.all(['en_rules', 'en_list', 'en_rules.download', 'en_list.download'].map(path => fs.unlink(`${phonemizerDirectory}/${path}`).catch(() => undefined)));
  return kittenCacheInfo();
}

/** A cached pair of files is not Ready until ONNX can synthesize non-empty audio. */
export function verifyKitten() {
  if (!verification) verification = (async () => {
    const cache = await kittenCacheInfo();
    if (!cache.isCached) throw new Error('Install the offline voice model first.');
    await withEngine(async (tts) => {
      const result = await tts.generate(PREVIEW, KittenVoice.Luna as SdkKittenVoice, 1);
      assertAudio(result);
    });
  })().finally(() => { verification = undefined; });
  return verification;
}

function assertAudio(result: KittenTTSResult) {
  if (!result.samples.length || !result.samples.some((sample) => Number.isFinite(sample) && sample !== 0)) {
    throw new Error('The voice model loaded but did not produce usable audio. Remove and reinstall it.');
  }
}

/**
 * Synthesizes complete sentences in order. The next sentence is prepared while the
 * current one plays; at most the audible sentence and one prefetched result are held.
 */
export async function speakWithKitten(
  text: string,
  voice: KittenVoice,
  speed: number,
  current: () => boolean,
  onPlaybackStart: () => void,
  onSynthesis?: (elapsedMs: number) => void,
) {
  const spoken = speakable(text);
  if (!spoken) throw new Error('There is no text to speak.');
  const cache = await kittenCacheInfo();
  if (!cache.isCached) throw new Error('The offline voice files are incomplete. Install or repair KittenTTS Mini in Voice interviews settings.');
  await withEngine(async (tts) => {
    if (!current()) return;
    const iterator = tts.generateStreaming(spoken, voice as SdkKittenVoice, speed);
    const firstStarted = Date.now();
    let item = await iterator.next();
    onSynthesis?.(Date.now() - firstStarted);
    while (!item.done) {
      if (!current()) return;
      assertAudio(item.value);
      const nextStarted = Date.now();
      const next = iterator.next().then(result => { onSynthesis?.(Date.now() - nextStarted); return result; });
      try {
        await tts.play(item.value, { onPlaybackStart: () => { if (current()) onPlaybackStart(); } });
      } catch (error) {
        await next.catch(() => undefined);
        throw error;
      }
      if (!current()) {
        await next.catch(() => undefined);
        return;
      }
      item = await next;
    }
  });
}

export async function stopKittenPlayback() {
  await engine?.stopSpeaking();
}

/** Release ONNX outside an active run; inference itself has no SDK cancellation API. */
export async function releaseKitten() {
  disposeWhenIdle = true;
  await engine?.stopSpeaking();
  if (activeOperations > 0) await new Promise<void>(resolve => idleWaiters.push(resolve));
  if (activeOperations === 0) await disposeEngine();
}
