# Local AI agentic system — verification report

**Date:** 2026-10-10 · **Host:** Windows 11, Node 24.20 · **No Android SDK, device, emulator or Mac on this host.**

> **Read this first.** Nothing in this report was run on a phone. No Qwen3-VL inference — text or vision — has been executed by this work. The agent logic below is verified by automated tests against a seeded in-memory store. Everything that needs the native runtime, the model, the camera, notifications or a real SQLite file is **implemented but not device-tested**. The offline acceptance run (§9) has **not** been performed.

## 1. Classification summary

| Feature | Status |
|---|---|
| Tool registry: allowlist, argument validation, record-ID checks, writes only as proposals | **Verified working** (unit tests) |
| Intent rules for the spec's example phrasings; schema-validated router output | **Verified working** (unit tests) |
| Record resolution (names → stable IDs, ambiguity → selection, focus fallback) | **Verified working** (unit tests) |
| Local-time natural date parsing, ambiguity reporting | **Verified working** (unit tests) |
| Confirmed execution with storage re-read, once-only execution, Undo for deletes | **Verified working** (unit tests, in-memory store) |
| Deterministic insights, interview session/feedback retrieval | **Verified working** (unit tests) |
| Vision/route/event output parsing (injected keys dropped, bad URLs/dates dropped) | **Verified working** (unit tests) |
| Ask Brief agent UI: native cards, confirm/Undo, editable job preview, event preview → shared `EventSheet`, interview setup | Implemented but not device-tested |
| Streaming answers, Stop (cancellation), serialized completions | Implemented but not device-tested |
| Qwen3-VL image job import, invitation → event, image Q&A, OCR as second source | Implemented but not device-tested |
| Vision self-test in Settings (real inference on a bundled image) | Implemented but not device-tested |
| GGUF header/architecture check (`qwen3vl`) before switching models | Implemented but not device-tested |
| Mock modes, single-question practice, resumable sessions, archived history | Implemented but not device-tested |
| Per-job context focus, history limited to that job, extractive summary of older turns | Partially implemented (summary is extractive, not model-written) |
| Model release on OS memory warning | Partially implemented (iOS event; Android delivery unverified) |
| Image preprocessing | Partially implemented (bounded by `image_max_tokens: 512`; no resize/crop step) |
| Offline STT / TTS | Implemented later, not device-tested — see `MULTIMODAL_AI_VOICE_VERIFICATION.md` |
| Device RAM pre-check | Not implemented (load errors are mapped to a clear memory message instead) |
| SHA-256 verification of downloaded weights | Not implemented (size check + GGUF header/architecture check instead) |

## 2. Qwen3-VL configuration

| Item | Value | Evidence |
|---|---|---|
| Language model | `Qwen3VL-2B-Instruct-Q4_K_M.gguf` | `src/lib/modelCatalog.ts`, pinned revision `704a1fab…` of `Qwen/Qwen3-VL-2B-Instruct-GGUF` |
| Vision encoder | `mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf` (same repo/revision) | same |
| Runtime | `llama.rn` 0.12.9 | `package.json` |
| Architecture support | `LLM_ARCH_QWEN3VL → "qwen3vl"` in bundled llama.cpp; `PROJECTOR_TYPE_QWEN3VL` + deepstack tensors in bundled mtmd | `node_modules/llama.rn/cpp/llama-arch.cpp:39`, `cpp/tools/mtmd/clip-impl.h:364` (source inspection, not runtime) |
| Context | `n_ctx` 4096 with projector (2048 text-only), `n_gpu_layers: 0`, `ctx_shift: false` with projector | `src/lib/ai.ts` `ensureModel` |
| Vision init | `initMultimodal({ use_gpu:false, image_min_tokens:128, image_max_tokens:512 })`, then `getMultimodalSupport().vision` | `src/lib/ai.ts` |
| Chat template | Model's own Jinja template (`jinja: true`), `enable_thinking: false`; images sent as `image_url` content parts | `src/lib/ai.ts` `complete` |
| Structured output | `response_format: { type:'json_schema', strict:true }` (llama.rn converts to a grammar); one unconstrained retry if the runtime rejects the grammar; output always re-validated | `completeJson` |
| Streaming | `completion(params, onToken)`; Ask Brief streams the `answer` field out of partial JSON (`partialAnswer`) | `ai.ts`, `prompts.ts` |
| Cancellation | `stopCompletion()`; `interrupted` → `Cancelled` with partial text (answers keep it with "— Stopped"; JSON tasks discard it) | `ai.ts` |
| Lifecycle | One context per app run, reused by Ask Brief, Mock, Add Job and Settings; completions serialized through one queue; released on memory warning when idle | `ai.ts` |

**Text works ≠ vision works.** Settings now runs two separate checks: the existing text benchmark (load time, tokens/s) and a new **vision self-test** that sends the bundled mascot (a cartoon briefcase) to the model and checks the answer names a case/bag. The capability flag alone is no longer reported as "images supported". Not yet run on a device.

## 3. Tool registry (`src/lib/agent/tools.ts`)

24 tools. A name not in `TOOLS` cannot run (`callTool` uses an own-property check, so `__proto__`/unknown names fail). Arguments are validated by `validate.ts` (types, enums, lengths, patterns; unknown keys dropped). IDs must exist in the store. **Write tools never write**: they return a `Pending` proposal; `execute.ts` runs it only after the user taps Confirm.

| Group | Tools (kind) |
|---|---|
| Applications | `listApplications` `searchApplications` `getApplication` `getApplicationHistory` (read) · `createApplication` `updateApplication` `updateApplicationStatus` `deleteApplication` `addApplicationNote` (write → proposal) |
| Calendar | `listEvents` `getUpcomingEvents` (read) · `createEvent` `updateEvent` `deleteEvent` (write → proposal / editor) |
| Interviews | `startMockInterview` `startQuestionPractice` `resumeMockInterview` (navigate after Start) · `getInterviewSessions` `getInterviewFeedback` (read) |
| Career | `getResumeContext` `getApplicationInsights` (read, deterministic) · `analyzeJob` `compareApplications` `analyzeJobImage` (model, grounded in retrieved facts) |

Execution rules (`execute.ts`): each proposal runs at most once (double taps, re-renders); after writing, storage is **re-read** and success is reported only if the change is there (a storage layer that silently drops the write is reported as a failure — tested). Deletes return a snapshot; **Undo** restores the job with its events (reminders rescheduled). Deletion is a hard delete with snapshot-based Undo, not a soft-delete flag.

## 4. Agentic workflow

```
message ─▶ ruleIntent (deterministic, ~40 phrasings)
            ├─ recognised ─▶ planTurn ─▶ reply from saved data + card   (no model needed)
            │                          ├▶ answer: model, grounded in focused job + retrieved facts
            │                          └▶ vision task (image attached)
            └─ not recognised, action-like ─▶ routeIntent (Qwen3-VL, JSON-schema constrained, validated; invalid → chat)
                                              └─▶ planTurn (same path)
card ─▶ user confirms / edits / picks ─▶ commit ─▶ verify ─▶ "Done" (+ Undo)
```

- **The model never supplies record IDs.** It may name a company or classify an action; `resolve.ts` maps names to IDs, and ties become a selection card.
- **One action per turn.** Compound requests ("add this job, tell me if I'm qualified, schedule an interview, help me practice") run the first step, then offer the rest as one-tap follow-ups after the job is saved (`followUpsIn`, `NextCard`).
- **Status is never changed by scheduling.** An interview event card offers "Move to Interview" only after the event is saved.
- **Untrusted content**: job text, OCR, resumes, screenshots and messages are fenced as data in every prompt; extraction output is schema-validated so injected keys (`status`, `id`) and non-http URLs are dropped.
- **Facts vs suggestions**: replies built from records are marked "From your saved data"; retrieved facts go into prompts in a labelled block the model is told not to change.
- **Works without the model**: saved-data actions (list, delete, status, notes, schedule, cancel, insights) run on rules alone; answers and images show the setup card.

## 5. Context handling

- Chat history (including cards) persists in SQLite `messages`. Each message stores `focusId`, the job it was about.
- The focused job is shown above the composer (with a clear button). Naming another job switches it; "Am I qualified?" uses it.
- Only the last 6 turns **about the focused job** go to the model (no cross-job leakage); older ones become a short extractive summary of the user's earlier questions (no model call). Prompt clips: job description 900 chars, resume 700, facts 1200, OCR 3000.
- The whole database is never sent: only the focused job (or 7 short job snippets when none is focused) and the profile fields the user allowed.

## 6. Tests performed

`npm test` — **85/85 pass** (`tests/agent.test.mjs` 27, `tests/detail.test.mjs` 13, existing suites). `npx tsc --noEmit` clean. `npx expo-doctor` 21/21. `npx expo export --platform android` builds a 4.1 MB Hermes bundle.

| Spec test | Result |
|---|---|
| 1 List · 2 Search · 3 Delete after confirm · 4 Multiple matches · 5 Status · 6 Notes · 7 Undo | **Automated, pass** (planner + executor on seeded store) |
| 8 Attach screenshot · 9 Real Qwen3-VL understanding · 10 Extract from image · 11 Correct fields · 12 Save extracted | Not run (needs device + model). Output parsing for 10 is automated |
| 13 Duplicate listings | **Automated, pass** (`findDuplicateApplication`); UI path not device-tested |
| 14 Unclear images · 15 Injected instructions | Output-side **automated** (readable=false path; injected keys dropped). Model behaviour not tested |
| 16 Red-flag analysis | Not run |
| 17 Ask about a job · 18 "Am I qualified?" · 19 Switch · 20 Return | Focus/routing **automated, pass**; answers not run |
| 21 Permitted resume context | **Automated** (`userContext` respects the toggle) |
| 22 Persistence after restart | Not run |
| 23 Start interview via Ask Brief · 24 Select application · 25 "Tell me about yourself" · 26 "Why this company?" | Planning/question extraction **automated, pass**; sessions not run |
| 27 Follow-up questions · 29 Structured feedback | Prompt contracts **automated** (content checks); model output not run |
| 28 Resume interview · 30 Save/retrieve history | Retrieval tools **automated, pass**; UI not run |
| 31 Create · 32 Modify · 33 Cancel · 34 Ambiguous dates · 35 Upcoming · 36 Job–event link | **Automated, pass** (planner); editor/notifications not device-tested |
| 37 Invalid args · 38 Malformed JSON · 39 Ambiguity · 40 Duplicate execution | **Automated, pass** |
| 41 Interrupted inference · 42 Model unavailable · 43 Low memory · 44 Airplane mode | Implemented, **not run** |

## 7. Performance

**No device measurements exist.** Settings reports real load time, tokens/s and vision-check latency once run on a phone; record them in `docs/qa/DEVICE_TEST_RESULTS.md`. Design choices aimed at mobile limits: one shared context (no reload between screens), serialized completions, rules before the model (most actions cost no inference), one model pass for answer + follow-up chips, router capped at 120 tokens, vision capped at 512 image tokens.

## 8. Bugs fixed during this work

- Settings reported "images supported" from a capability flag without any image inference → added a real vision check.
- Overlapping completions on one context (follow-up suggestions while an answer generated) → serialized queue.
- No way to stop a long generation → Stop button in Ask Brief and Mock.
- Add Job's photo import never used the vision model (OCR → text only); Ask Brief image import now uses Qwen3-VL with OCR as a second source.
- Intent rule read "What should I ask during the interview?" as "list my events" (caught by tests) → tightened.
- `tests/repo.test.mjs` asserted a removed `'add-job'` route name → now checks `AddJobScreen`.
- Low-memory load errors suggested a "0.6B" model that the app doesn't offer → message now says what to do.

## 9. Mandatory offline verification — NOT PERFORMED

Requires a development build that includes this work's native modules (`expo-notifications`, `@react-native-community/datetimepicker`, `expo-asset`) and the Qwen3-VL pair installed. Steps (from the brief) with what each exercises:

1. Build independent of Metro (EAS `preview`/release profile or `expo run:android --variant release`).
2. Settings → download Qwen3-VL → confirm text benchmark **and** "image check passed".
3. Airplane mode on. Ask Brief: general career question (streams; Stop works).
4. Attach a job screenshot: "add this to my applications" → job card → Edit → Save.
5. "Show me my <company> application" → "Am I qualified?" → answer uses that job + resume.
6. "I got an interview for my <company> application" → Confirm → status changes on the job page.
7. "Schedule my <company> interview tomorrow at 2 PM" → Review & save → appears in Calendar and the job's Activity.
8. "Help me answer Tell me about yourself" → Start practice → answer twice → feedback.
9. Force-close, reopen: job, event, chat (with cards) and mock session still there.
10. Record results, timings and RAM in `docs/qa/DEVICE_TEST_RESULTS.md`.

## 10. Known limitations and remaining work

- **Device verification of everything in §1 marked "not device-tested"** — the top priority.
- Voice (offline STT/TTS) not started. Mock shows no recording UI, by design.
- Router accuracy on Qwen3-VL 2B is unmeasured; rules cover the documented phrasings, and unrecognised messages default to chat (safe failure).
- Older-turn summary is extractive (user questions only).
- Images go to the model at picker quality; no explicit resize/crop step before inference.
- Hard delete with snapshot Undo (not a `deletedAt` soft delete); Undo is available on the confirmation card, persisted with the chat.
- Model download integrity: size + GGUF header/architecture, not a checksum.
- Android delivery of `memoryWarning` to JS is unverified.
