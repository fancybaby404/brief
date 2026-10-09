# Performance optimization report

**Date:** 2026-10-10 · **Host:** Windows 11, Node 24.20 · **No phone, emulator, Android SDK or Mac on this host.**

> **Only one result here is a measured improvement, and it was measured on a desktop, not a phone:** the SQLite message queries (§5). Everything else is a code-level fix of an identified root cause and is **implemented but not measured** on a device. Settings → **Diagnostics** now records real on-device timings, so before/after numbers can be collected on a phone. No benchmark results are invented here.

Context notes:
- `MASTER_CONTEXT.md` doesn't exist.
- The brief mentions Expo Router, but **Brief doesn't use Expo Router**: navigation is a page state in `appContext` rendered by `App.tsx`. Fixes target that real architecture.
- A new build is still required for the earlier native additions; this round adds no native modules.

## 1. Classification

| Optimization | Status |
|---|---|
| Messages table index + thread-scoped queries (chat, agent, mock history) | **Verified improvement** (desktop benchmark: 23.2 ms → 0.09 ms per thread open at 20k messages) |
| Chat card updates no longer reorder history after restart (upsert) | **Verified** by reasoning about SQLite semantics; device restart test pending |
| Keep-alive + freeze for Home, Jobs, Calendar, Applications, Ask Brief | Implemented but not measured (requires physical-device testing) |
| `expo-image` (memory cache, view-size decode) for mascot faces and company logos | Implemented but not measured (requires physical-device testing) |
| Ionicons font preloaded with the brand font | Implemented but not measured |
| Job listings: memory + SQLite cache, stale-while-revalidate, dedupe, timeout, cancellation, offline fallback | Implemented but not measured (logic tested: cache keys, freshness) |
| Virtualized Jobs and Applications lists, memoized rows, stable handlers, deferred search | Implemented but not measured |
| Streaming throttled to ≤ 12 repaints/s; memoized message bubbles | Implemented but not measured (throttle unit-tested) |
| Ask Brief no longer loads the 1.2 GB model just for suggestion chips | Implemented but not measured |
| Chat history paging (newest 60, "Show earlier") | Implemented but not measured |
| Model released after 3 min idle in background; Whisper likewise | Requires physical-device testing |
| Transactions: delete job + events, archive interview session, cache writes | Implemented (atomicity) |
| `synchronous=NORMAL` with WAL | Implemented but not measured |
| On-device metrics: startup, DB load, model/vision/STT load, TTFT, prompt ms, tok/s, image prep, agent turn, transcription, TTS start, jobs fetch | Implemented (the measurement tool itself) |
| Context split / selective subscriptions | Investigated but not changed (§9) |
| llama.cpp threads, batch, KV-cache type, GPU layers | Investigated but not changed: needs device benchmarks (§6) |
| Downscaled mascot assets | Investigated but not changed (supplied mascot files left untouched; `expo-image` decodes at view size instead) |
| Resumable model downloads across app restarts | Investigated but not changed (§6) |
| Jobicy pagination | Investigated but not changed (one 50-item page; cursor not used) |

## 2. Navigation: why Home "reloaded" and the fix

**Root cause:**
- `App.tsx` rendered only the current page (Jobs excepted), so every tab switch **unmounted Home** and returning **remounted** it.
- Remounting re-ran React Native `Image` for the mascot (842×924 PNGs; each `LiveMascot` mounts all 5 faces, about 3 MB decoded each, for instant face swaps) and for every company logo. RN `Image` has no dependable memory cache on Android, so these visibly re-decoded or re-fetched.
- The Ionicons font wasn't preloaded, so icons could render blank until it loaded.
- In development builds, bundled images are also served from Metro over the network, which makes this worse; release builds bundle them.

**Fix:**
- Home, Jobs, Calendar, Applications and Ask Brief **stay mounted once visited** and are **frozen while hidden** (`src/components/Freeze.tsx`: a Suspense boundary parked on a never-settling promise via React 19 `use()`, the same technique as react-freeze, without a dependency).
- Hidden screens keep state, scroll position and decoded images, but **don't re-render** on every app-state change. Previously Jobs, kept mounted with `display:none`, re-rendered on every context update.
- **Mock is deliberately not kept alive:** unmounting it releases the microphone, Whisper and speech resources. Detail, Settings and Resume are cheap to mount and hold no long-lived state.
- Memory trade-off: five lightweight screen trees vs. the previous one. No model or audio memory is retained by the kept screens.

## 3. Images and assets

| Asset | Before | After |
|---|---|---|
| Mascot (`Mascot`, `LiveMascot`, "???" mark) | RN `Image`, full 842×924 decode per mount | `expo-image`, `cachePolicy="memory"`, `priority="high"`, no transition: decoded at view size and reused across remounts |
| Company logos | RN `Image`; failures retried on every mount | `expo-image` memory+disk, keyed by URL (instant on return, **available offline after first view**); broken URLs remembered for the session; briefcase tile shown only until a new logo loads (no white flash, no tile behind transparent logos) |
| Icons | Ionicons font loaded lazily | Preloaded with Fredoka before the first screen (one startup step, no extra wait) |
| Chat images | already `expo-image`; stored pre-scaled to ≤ 1536 px JPEG (previous round) | unchanged |

## 4. Data caching and invalidation

| Data | Cached where | Expiry | Invalidated by | Sync |
|---|---|---|---|---|
| Applications, events, profile | In memory (`appContext` state) loaded once from SQLite at startup | Never stale (single writer) | Every write goes through `putApp/removeApp/putEvent/removeEvent/updateProfile`, which writes SQLite then updates state | All screens read the same context state, so Home, Applications, Calendar and Job Details update together. The agent re-reads SQLite after writes to verify them |
| Job listings | Memory map + SQLite `cache` table (newest 12 searches), keyed by **server parameters** (geo, industry, keywords) | Fresh 15 min; stale entries shown immediately, then revalidated | Refresh (pull), stale age, new search | Type/level/salary/posted filters re-filter the cached response **without a request** (previously every filter change refetched). Shown as "Listings saved … Some may have closed", never as live |
| In-flight job requests | Promise map | Until settled | — | Identical concurrent requests share one fetch; a newer search aborts the older one and stale responses are ignored (sequence id); 15 s timeout |
| Resume text | `profile.resumeText`, extracted once at import | Until the resume is replaced | `importResume` (replace/remove) | No re-parsing (verified in code; unchanged) |
| Chat history | SQLite, newest 60 per thread on open; older pages on request | — | New/updated messages upsert in place | Kept-alive Ask Brief doesn't reload on return; a thread switch reloads that thread only |
| Vision preprocessing | Scaled JPEG stored once per attachment | Lifetime of the message | — | Model responses are never cached |
| Model contexts | Module singletons (llama, Whisper) | Memory warning; 3 min idle in background; Mock unmount (Whisper) | — | Single-flight loading prevents duplicate instances |

Agent writes still require confirmation every time; nothing about authorization is cached.

## 5. SQLite

Changes (all additive, no destructive migration):
- `CREATE INDEX IF NOT EXISTS messages_by_thread ON messages(thread)`.
- `listMessages(thread, limit, offset)` now reads `WHERE thread=?` with paging. It used to `SELECT` **every message in the app**, `JSON.parse` all of them, then filter in JS.
- `listThreadMessages(prefix)` uses an index range instead of a full scan. The all-sessions list uses two ranges instead of `LIKE`, which SQLite can't serve from the index.
- `saveMessage` now upserts (`ON CONFLICT DO UPDATE`). **Bug fixed:** `INSERT OR REPLACE` re-created the row with a new rowid, so a message whose card changed (Confirm, Undo, Save) jumped to the end of the conversation after a restart.
- Transactions: deleting a job together with its events, archiving a mock session, and cache writes with pruning.
- `PRAGMA synchronous = NORMAL` (the standard pairing with WAL).
- Applications intentionally keep `INSERT OR REPLACE`: "recently touched first" ordering matches the in-memory list.

**Measured (desktop, `node scripts/bench-sqlite-messages.mjs`, 20,000 messages, 101 threads; numbers vary run to run):**

| Query | Before | After |
|---|---|---|
| Open one chat thread | 23.2 ms | 0.09 ms (newest 60) |
| Agent: one job's interview sessions | 22.6 ms | 0.53 ms |

`EXPLAIN QUERY PLAN`: `SEARCH messages USING INDEX messages_by_thread (thread=?)`. The old cost grew with total chat history across all jobs; on a phone it also blocked the JS thread while parsing.

## 6. Qwen3-VL lifecycle and inference

- **Single instance:** `ensureModel` is single-flight (concurrent callers await one load) and reused across Ask Brief, Mock, Add Job and Settings. Completions are serialized (previous round). No duplicate contexts.
- **No accidental loads:** Ask Brief used to generate suggestion chips on open, which **loaded the 1.2 GB model just to show chips**. Chips are now generated only if the model is already in memory (`modelLoaded()`). Startup never touches the model, Whisper or TTS.
- **Memory pressure:** released on OS memory warning when idle (previous round), and now also **after 3 idle minutes in the background**. Quick app switches keep it.
- **Vision:** the encoder loads lazily on the first image and is released before voice interviews (previous round). Images are pre-scaled once.
- **Measured on device from now on:** model load, vision-encoder load, time to first token, prompt processing, generation tokens/s (from llama.cpp's own timings) and image preprocessing, all in Settings → Diagnostics.
- **Not changed without device data:**
  - `n_threads` (llama.rn default), `n_batch`, KV-cache type and GPU layers (`0`) were left alone. The brief rightly warns that more threads or context isn't automatically faster, and nothing can be benchmarked here.
  - Downloads use `createDownloadResumable` but don't persist resume data across app restarts; an interrupted download restarts.
  - Integrity checks remain size + GGUF architecture for the LLM (fast) and SHA-256 for the speech models.

## 7. Agent

- Rules handle common requests with **no model call**; the model router runs only for unrecognised, action-like messages (previous round). Routing prompts stay small: one message plus an 8-field schema, never records.
- **Request → actionable reply** time is now recorded (`agent.turn`).
- Confirmation, once-only execution and storage verification are unchanged. Nothing here is cached across actions.

## 8. Voice pipeline

- Whisper and VAD load once per interview, are released on leaving Mock, and now also after 3 idle minutes in the background.
- Audio buffers are bounded: the end-of-speech detector caps a turn at 2 minutes (about 3.8 MB of PCM), and buffers are freed after transcription.
- TTS engine warm-up happens on Mock open (voice listing initialises the engine).
- **Measured on device from now on:** Whisper load, transcription time per answer (the mic test also reports audio length), and reply → audible speech (`tts.start`).
- No changes to turn-taking: correctness and echo protection were kept as they were.

## 9. Rendering

| Hotspot | Fix |
|---|---|
| Hidden screens re-rendered on every context change | Frozen while hidden (§2) |
| Streaming repainted the whole transcript per token (10–20×/s) | Throttled to ≤ 12×/s (leading + trailing, last value never dropped, unit-tested); `MessageBubble` memoized |
| Jobs: 50 cards in a `ScrollView`, inline closures | `FlatList` (windowed), memoized `JobCard`, one stable handler |
| Applications: all rows in a `ScrollView` | `Reanimated.FlatList` keeping the reflow animation, memoized rows, stable `onOpen`, `useDeferredValue` search |
| Mic level (8×/s) | Already UI-thread shared value; unchanged |

**Investigated, not changed:** splitting the single `appContext` into selective subscriptions. With hidden screens frozen, only the visible screen re-renders on a context change. A split would touch every screen for a smaller remaining gain, and should wait for device profiling.

## 10. Startup

- Unchanged and confirmed: startup awaits only SQLite and the two fonts; exchange rates refresh in the background; no AI, speech or network work blocks the first screen.
- New: `startup.ready` (JS start → data ready) and `db.load` are recorded for device measurement. Splash duration wasn't changed (no native splash configuration exists beyond Expo's default).

## 11. Offline

- Job listings fetched before are shown offline with an "Offline · Listings saved …" note instead of an error screen.
- Company logos seen before show offline (disk cache).
- No automatic retry loops exist: retries are user-initiated (Try again, pull to refresh), so there's no hammering of an unreachable API.
- Local features (applications, calendar, chat history, resume, inference, speech) are unchanged and still work offline.

## 12. Tests and checks

- `npm test`: **105/105**. The new `tests/perf.test.mjs` covers the metrics ring buffer, the deterministic throttle with mock timers, and job cache keys/freshness; all earlier suites pass.
- `npx tsc --noEmit` clean.
- `node scripts/validate-source.cjs` pass.
- `npx expo-doctor` 21/21.
- `npx expo export`: Android 4.3 MB, iOS 4.3 MB Hermes bundles.
- One flaky timing test I wrote was found under parallel load and made deterministic.

Required navigation, data, AI and stability tests (brief §16, 1–40): **not run**, as they need a production-like build on a phone. Per-test notes:

| Tests | Code-level status |
|---|---|
| 1–4 cold start, Home↔Jobs, no asset reload, tab switching | Root cause fixed (§2, §3) |
| 5–10 details, notes, sheets, chat return, scroll | Kept-alive screens preserve scroll; details remount (cheap) |
| 11–18 many apps, search, status sync, jobs cache reuse, offline | Virtualized lists; single source of truth; job cache + offline fallback |
| 19–30 model init, reloads avoided, image, agent, mock, STT/TTS, memory | Single-flight model, no chip-triggered loads, lazy vision, metrics in place |
| 31–40 background, rapid switching, cancel, permissions, failures, storage, low memory, restart | Background release timers; cancellation and abort paths; upsert ordering fix |

## 13. How to measure on a phone (before/after)

1. Build a **release** variant (EAS `preview`/`production`, or `npx expo run:android --variant release`), not a dev build.
2. Settings → Diagnostics → Clear.
3. Run the brief's §16 tests: tab switching, Ask Brief (text and image), an agent action, a voice interview, Jobs twice, then airplane mode.
4. Settings → Diagnostics → Show. Record median/p90 for each metric in `docs/qa/DEVICE_TEST_RESULTS.md`, together with Android Studio / Xcode memory graphs.
5. For the "before" baseline, run the same on the previous commit's build (the Diagnostics panel won't exist there, so use the profiler/Perf Monitor for navigation, and the Settings model test for load and tok/s).

## 14. Remaining bottlenecks and risks

- **No device data yet.** The highest-value next step is a release-build profile on a mid-range Android phone (4–6 GB RAM).
- `Freeze` relies on React 19 Suspense hiding host views in React Native's renderer. That is standard behaviour, used by react-native-screens via react-freeze, but it needs a device check: tab switch, return, and verifying no blank screen.
- llama.cpp thread/batch tuning and image token budget (768) need on-device benchmarks.
- One context object for app state; consider splitting if device profiles show re-render cost on the visible screen.
- Model downloads don't resume across app restarts.
