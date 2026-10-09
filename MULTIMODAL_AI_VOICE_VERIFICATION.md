# Multimodal AI & offline voice interviews — verification report

**Date:** 2026-10-10 · **Host:** Windows 11, Node 24.20 · **No phone, emulator, Android SDK or Mac on this host.**

> **Nothing in this report was verified on a physical device.** No model inference, speech recognition, speech synthesis, microphone capture or camera capture ran during this work. What *is* verified: TypeScript, 102 automated tests of the pure logic, `expo-doctor`, and JS bundles for Android and iOS. Every native path is **implemented but not device-tested**. The mandatory offline device test (§11) has **not been performed**. Builds made before this change do not contain the new native modules and will crash on the Mock screen.

`MASTER_CONTEXT.md` doesn't exist in this repo; `AGENTS.md`, `docs/` and the previous `LOCAL_AI_AGENTIC_VERIFICATION.md` were used.

## 1. Status by feature

| Feature | Status |
|---|---|
| Interview turn-taking state machine (no overlap, no duplicate recordings, stale-callback protection) | **Verified working** (unit tests) |
| PCM decoding, loudness, energy end-of-speech detection, Whisper-hallucination filter, TTS text cleanup | **Verified working** (unit tests) |
| SHA-256 model verification (vs Node `crypto`, multi-chunk) | **Verified working** (unit tests) |
| Offline-voice selection rules (iOS on-device; Android `-local` only) | **Verified working** (unit tests of the rule; real voice lists not seen) |
| Session summaries, 5-question wrap-up, feedback/resume JSON validation, interview intents | **Verified working** (unit tests) |
| Qwen3-VL text + image inference, lazy vision-encoder load/release, image preprocessing | Implemented but not device-tested |
| Offline STT: whisper.rn (Whisper base.en / small.en) + Silero VAD, mic capture | Implemented but not device-tested |
| Offline TTS: platform engine with verified on-device voice, speed, replay, stop | Implemented but not device-tested |
| Voice mock interview UI (mic, listening ring, speaking indicator, review/correct transcript, pause/resume/replay/skip/end, progress, hands-free) | Implemented but not device-tested |
| Structured feedback, interview history and review, resume paused sessions | Implemented but not device-tested |
| Ask Brief → interview (voice/text choice), continue, "what did I struggle with", resume deep-dive, topics, prep from screenshots, resume from image | Implemented but not device-tested |
| Bluetooth headset routing | Partially implemented (iOS session allows Bluetooth via the recorder; Android routing is the OS default) — untested |
| Barge-in / speaking while the AI talks | Not implemented (by design: turn-based first) |
| Neural offline TTS (sherpa-onnx Piper/Kitten) | Not implemented (evaluated, deferred — §5) |
| Persisting raw audio | Not implemented (by design: audio is never saved) |

## 2. Qwen3-VL 2B configuration

| Item | Value |
|---|---|
| Model / encoder | `Qwen3VL-2B-Instruct-Q4_K_M.gguf` + `mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf`, official repo `Qwen/Qwen3-VL-2B-Instruct-GGUF`, pinned revision `704a1fab…`, Apache 2.0 |
| Runtime | `llama.rn` 0.12.9; bundled llama.cpp has `LLM_ARCH_QWEN3VL = "qwen3vl"` (`cpp/llama-arch.cpp:39`) and `PROJECTOR_TYPE_QWEN3VL` with deepstack tensors (`cpp/tools/mtmd/clip-impl.h:364`). Source inspection, not runtime. |
| Integrity | Download: size check, then `loadLlamaModelInfo` must report `general.architecture = "qwen3vl"` before switching. Import: readable GGUF header required. (No SHA-256 for the 1.2 GB file: hashing it in JS on device would take minutes.) |
| Context | `n_ctx` 4096 when a projector exists (image tokens + prompt + reply), `ctx_shift:false`, `n_gpu_layers:0` |
| Vision encoder | **Lazy**: `initMultimodal({ image_min_tokens:128, image_max_tokens:768 })` on the first image; `releaseVision()` before a voice interview loads Whisper. Real support = `getMultimodalSupport().vision` **and** the Settings vision self-test (real inference on a bundled image). |
| Chat template | The model's Jinja template (`jinja:true`, `enable_thinking:false`); images as `image_url` content parts |
| Streaming / cancel | Token callback; `stopCompletion()` → `interrupted` → `Cancelled` |
| Lifecycle | One context per app run, serialized completions, released on OS memory warning when idle |

**Image preprocessing** (`prepareImageForVision`): every chat image is re-encoded to JPEG (quality 0.9, EXIF rotation applied), with the long edge capped at **1536 px**. 768 image tokens ≈ 880×880 px of detail, so larger images cost decode time and memory without adding readable detail. Native OCR (`expo-ocr-kit`) runs on the same image and is passed to the model as a second, fenced, untrusted source, which helps small text. The values are chosen, not measured: tune `IMAGE_MAX_TOKENS` and `VISION_MAX_EDGE` on real devices.

## 3. Speech-to-text

| Item | Choice |
|---|---|
| Library | **whisper.rn 0.7.4** (whisper.cpp; same maintainers as llama.rn). Its ggml symbols are prefixed `wsp_ggml_*` vs llama.rn's `lm_ggml_*`, so both link into one app. Imported as `whisper.rn/index` (its `exports` map has no `"."` entry). Needs the `buffer` polyfill (`safe-buffer`). |
| Models (downloaded on request, Settings → Voice interviews) | **Standard**: `ggml-base.en-q5_1.bin` 59.7 MB · **More accurate** (better with accents, slower): `ggml-small.en-q5_1.bin` 190 MB · **VAD**: `ggml-silero-v6.2.0.bin` 0.9 MB. Pinned revisions; **SHA-256 verified on device** against the Hugging Face LFS hashes; MIT. |
| Capture | `@fugood/react-native-audio-pcm-stream` 1.1.4 (whisper.rn's recommended recorder): 16 kHz mono PCM16, Android `VOICE_RECOGNITION` source; iOS PlayAndRecord with speaker + Bluetooth. Audio is held in memory only, then dropped. |
| Pipeline | PCM → Silero VAD (`detectSpeechData`; nothing reaches Whisper without speech) → `transcribeData` (language `en`, job title as decoding hint) → hallucination filter ("Thank you.", `[BLANK_AUDIO]`) → **editable transcript** → send |
| Permissions | iOS mic string and Android `RECORD_AUDIO` via the `expo-camera` plugin config; requested on first mic tap; denied/blocked paths offer Settings or typing |
| Filipino-accented English | Not measured. The "More accurate" (small.en) option exists for this; WER on device recordings is still to be measured |

Alternatives evaluated: `react-native-sherpa-onnx` STT (more native weight, see §5); RealtimeTranscriber with VAD auto-slicing (rejected for v1: turn-based capture is more predictable).

## 4. Voice activity / turn detection

Two layers, prioritising reliability:
1. **Live end-of-speech (energy)**: `Endpointer` tracks an adaptive noise floor; the turn ends only after ≥ 0.6 s of speech followed by **1.8 s** of quiet, or at 2 min. Natural pauses under 1.8 s don't end an answer (tested). A **Done** button always works.
2. **Post-hoc speech check (Silero VAD)**: a recording without detected speech is reported as "I didn't catch any speech", and nothing is sent.

Echo protection: the mic can only open from `ready`/`reviewing`. It never opens while speaking, thinking or transcribing (enforced by the reducer, tested), and hands-free waits 400 ms after the voice finishes.

## 5. Text-to-speech

| Item | Choice |
|---|---|
| Engine | Platform TTS via `expo-speech` (iOS `AVSpeechSynthesizer`, Android `TextToSpeech`) |
| Offline guarantee | iOS: on-device by platform design, so any installed English voice qualifies (Enhanced preferred; novelty voices excluded). Android: the API doesn't expose "needs network", so only Google voices named `…-local` are **verified**; other engines are labelled **"offline not confirmed"**, and with none, voice falls back to typing. |
| Controls | Speed (slower/normal/faster), Replay, Stop speaking, one utterance at a time (`Speech.stop()` before each; utterance ids drop late callbacks) |
| Text | Replies are cleaned for speech (no markdown, bullets, emoji, URLs); the voice-mode prompt asks for plain sentences |

**sherpa-onnx evaluation:** `react-native-sherpa-onnx` 0.4.4 offers neural offline voices (Piper/Kitten/Kokoro), marked production-ready on both platforms. It was **deferred** because it adds three more native dependencies (`react-native-fs`, a background downloader, MMKV). It also pulls its Android binaries from the maintainer's personal Maven repo at build time and downloads an ~80 MB iOS framework during `pod install`, none of which can be build-tested here. It's the upgrade path if platform voices prove unnatural, or if Android phones lack a `-local` voice. `react-native-sherpa-onnx-offline-tts` 0.2.6 was rejected: its iOS framework isn't in the npm package.

## 6. Interview architecture

```
Ask Brief / Mock picker ─▶ MockSetup {job, mode, question?, topic?, voice}
                               │
   ┌───────────── voiceReducer (pure state machine) ─────────────┐
   │ preparing → ready ⇄ speaking → ready → listening →          │
   │ transcribing → reviewing → thinking → speaking …            │
   │ paused / error (retry) / completed                          │
   └──────────────────────────────────────────────────────────────┘
 speak: expo-speech     listen: PCM → VAD → Whisper     think: Qwen3-VL (streamed, stoppable)
```

- Every user action calls `fire(event)`; the reducer rejects invalid transitions, and the action only proceeds if it was accepted. That stops double taps, duplicate recordings, overlapping speech and repeated questions; tests cover each.
- **Full interviews:** about 5 questions; the interviewer reacts in one sentence, with no scoring mid-interview; after the 5th answer it wraps up automatically with feedback. **Question practice:** each answer is rated (relevance, clarity, completeness) and the user can retry. In-session requests ("harder follow-up", "better example", "repeat", "try again") are honoured by the prompt.
- **Modes:** this role, HR screen, behavioral (STAR), technical (optional topic, e.g. "about React"), hiring manager, general, **resume deep-dive** (only listed experience).
- **Backgrounding** pauses: speech stops, the mic closes, and nothing is recorded in the background. A reply that arrives while backgrounded isn't spoken; Replay is available.
- **Memory:** entering voice mode releases the vision encoder, then loads Whisper + VAD once per session. Leaving Mock releases them.

## 7. Persistence (SQLite, no second session store)

Sessions are derived from the `messages` table:
- **Setup:** mode, question and topic are stored on the first message.
- **Answers:** each is a message, marked voice or typed.
- **Questions:** the interviewer's turns.
- **Feedback:** the reply to the finish request, as readable text plus structured scores (`InterviewFeedback`: relevance, clarity, completeness, examples, technical (0 = not assessed), strengths, improvements, a better answer using only the candidate's facts, next steps).
- **Date and duration:** first to last message.

**New session** archives the old one (`mock:<job>:<ts>`). History appears on the Mock picker ("Past interviews": review the transcript and feedback, continue paused ones) and in Ask Brief ("What did I struggle with last time?"). Feedback rules forbid comments on accent, voice, personality or hireability. No audio is saved.

## 8. Ask Brief integration (extends the agent from the previous report)

- "I want to do a mock interview for my Notion application" / "Practice my Spotify interview" → resolve the job (a selection card if ambiguous) → interview card (style + **Speak/Type**) → Mock opens with the job and resume context → starts on **Start**.
- "Continue my previous interview" → latest paused session (or a named job's) → **Continue**.
- "What did I struggle with last time?" → feedback facts from saved sessions.
- "Ask questions based on my resume" → resume deep-dive, or asks for resume details first if there are none.
- "Ask me technical questions about React" → technical mode with a topic.
- Screenshot + "I have an interview for this job" / "help me prepare for this job" → Qwen3-VL job import (editable) → after saving: schedule interview + practice; duplicates offer **Practice for it**.
- HR message screenshot + "help me prepare" → image-grounded advice. "When is my interview?" → event preview.
- Resume photo + "Here is my resume, interview me based on it" → Qwen3-VL resume extraction → editable card → save to profile on confirm → pick a job for a resume interview.
- Ask Brief images: camera **or** library.

## 9. Tests

`npm test` **102/102** pass:
- `tests/voice.test.mjs`: 16 tests (state machine, audio, end-of-speech, SHA-256, voice choice, sessions, prompts, feedback/resume parsing, interview intents).
- `tests/agent.test.mjs`: 28 tests.
- `tests/detail.test.mjs` and the earlier suites.

Also: `npx tsc --noEmit` clean, `npx expo-doctor` 21/21, `npx expo export` **Android 4.3 MB and iOS 4.2 MB** Hermes bundles build (this caught the missing `buffer` polyfill whisper.rn needs).

| Spec scenario | Result |
|---|---|
| 1–10 Text & vision (text chat, describe screenshot, import, photo, requirements, missing salary, suspicious post, HR invite, prep from screenshot, offline vision) | Not run (needs device + model). Routing/parsing for 3, 8, 9 automated |
| 11–25 Voice (start, hear, speak, transcription, follow-up, TTS, 5 questions, pause/resume, replay, correct transcript, silence/noise, permission denial, Bluetooth, restart/history, airplane mode) | Not run on device. State transitions for 11, 17, 18, 19, 20, 21 and session history for 24 automated; 22 implemented; 23 untested |
| 26–31 Agent (interview from Ask Brief, select job, question practice, continue, resume context, image context) | Planning **automated, pass**; UI and inference not run |

## 10. Performance

**No measurements exist.** Settings now produces real numbers on a phone: model load time and tokens/s, vision-check latency, mic → transcription time (audio length vs processing time), and voice playback time. Record them in `docs/qa/DEVICE_TEST_RESULTS.md`.

Rough memory budget (**estimates from file sizes and model shape, not measured**):

| Component | Approx. |
|---|---|
| Qwen3-VL 2B Q4_K_M weights | 1.1 GB |
| KV cache, 4096 ctx, f16 | ~0.45 GB |
| Vision encoder Q8_0 (loaded only for images) | ~0.45 GB + compute |
| Whisper base.en / small.en (voice mode only) | ~0.2 / ~0.5 GB with buffers |

Vision and Whisper are never both loaded by design; the realistic minimum is a 6 GB RAM phone, which needs confirming on hardware.

## 11. Mandatory offline device test — NOT PERFORMED

1. Create a **new** development or release build (EAS), since this adds whisper.rn, the PCM recorder, expo-speech and expo-image-manipulator. Install it independent of Metro.
2. Online, once: Settings → On-device AI → download Qwen3-VL → **image check passed**. Settings → Voice interviews → download Standard → **Test microphone** (read the transcript and timing) → **Test voice**.
3. Turn on airplane mode and force-close the app.
4. Ask Brief: attach a job screenshot, then "add this to my applications" → edit → Save.
5. "Practice my <company> interview" → **Speak** → Start.
6. Hear question 1, answer by mic, check and correct the transcript, then Send. Repeat; try Replay, Pause/Resume, Skip, a silent turn, and Hands-free.
7. After 5 answers: feedback appears. Force-close and reopen: Mock → Past interviews shows the transcript and feedback.
8. Repeat step 2's Test voice in airplane mode. On Android, confirm the voice still plays (this is the offline-voice proof).
9. Record results, timings, RAM and temperature in `docs/qa/DEVICE_TEST_RESULTS.md`.

## 12. Known limitations and remaining work

- **All device verification** in §1 and §11, starting with whisper.rn + llama.rn on one device.
- Filipino-accented English WER unmeasured. The base vs small choice should be decided from real recordings.
- Android offline voice depends on a Google "local" voice being installed; other engines are flagged, not guaranteed.
- No barge-in; turn-based only.
- Silero VAD is a post-recording check; live endpointing is energy-based (can be fooled by loud steady noise; Done always works).
- iOS rate mapping (`rate × 0.5`) needs ear-checking on device.
- The image token budget (768) and the 1536 px cap are untuned.
