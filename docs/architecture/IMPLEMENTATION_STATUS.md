# Actual implementation status — do not exaggerate

## Source included and substantially coded
- All named main screens route (Home, Applications, Jobs, Job detail, Application detail, Calendar, Mock picker/session, Ask Brief, Add Job, Resume, Settings, Notifications, Onboarding).
- Floating split navigation, anchored two-row add menu, top-right compact profile popover.
- Local SQLite CRUD for applications/events/chat/profile and basic persistence.
- Search/sort applications; rolling weekly activity bars derived from records.
- Jobicy network discovery adapter, remote listing view and external apply link.
- Native camera/gallery OCR import adapter and optional model structured parse.
- `llama.rn` native local GGUF loading/completion adapter (no network fallback), system prompts with selected job and resume context.
- Mock typed interview, local message history, end feedback request.
- Resume PDF/DOCX copy; digital PDF text extraction bridge; user-controlled AI consent toggle; editable summary; system open/share. Large **summary preview** rather than inline document rendering.

## NOT built or not validated
- No npm package installation in generation environment (network unavailable), no native build/simulator test, no real-device local LLM benchmark.
- No GGUF file included. User must import permitted model weights into app storage.
- No inline true PDF rendering (needs native PDF component), DOCX text extraction, scanned PDF OCR, automatic resume parsing into profile fields.
- No live speech-to-text mock interview or trustworthy microphone waveform; mock is typed and local.
- No real notification scheduling and no functional event edit screen beyond create/delete.
- No OS share extension or background worker/streaming LLM UI.
- No release-grade offline provider caching, API pagination or Philippine listings provider.
- No automated E2E mobile device tests, no actual APK/IPA generated.
- Some layout details and performance need native device refinement.

## Change log

### 2026-10-09 — dependency repair, logic tests, P0 fixes (no device yet)
- **Dependencies:** installed and pinned; `npx expo-doctor` 21/21; `npm run typecheck` clean; `npx expo export --platform android` bundles. `llama.rn` pinned to **0.12.9** (npm `latest` tag points at `0.13.0-rc.7`, a release candidate); its native-artifact postinstall is approved via `allowScripts`. Removed unused `expo-linking`/`expo-speech`/`react-native-svg`/`expo-status-bar` (duplicate `expo-constants`); added required `expo-font` peer. Deleted `babel.config.js` (Expo applies `babel-preset-expo` itself; the file broke Metro). `newArchEnabled` removed from `app.json` (always on in SDK 57); llama.rn plugin option renamed to `enableOpenCLAndHexagon`.
- **Jobicy adapter bug fixes (verified against live API):** `jobType` is an array (was stored as an array in a string field); salary fields are `salaryMin/salaryMax/salaryCurrency/salaryPeriod` (adapter read nonexistent `annualSalary*`, so salary was always "Not specified"). Missing salary is now `""`, rendered "Salary not listed". HTML → text keeps paragraphs/bullets and decodes entities. Offline fetch shows a clear message. Jobicy credit link added per its API notice.
- **Testable seams:** `src/lib/tracker.ts` (progress buckets by week start, search/sort with pipeline status order), `src/lib/prompts.ts` (prompt contracts v1 with fenced untrusted text, strict extraction parsing that drops unknown keys, clamped profile context). `tests/logic.test.mjs` covers them (Node 24 runs the TS directly).
- **AI runtime:** Qwen3 thinking disabled (`enable_thinking:false`, `jinja:true`), `<think>` stripped; concurrent loads share one promise; importing a model releases the old context; OOM/load errors map to actionable messages; Settings shows real load progress and measured load time + tokens/s.
- **Navigation/UX:** Android hardware back (overlay → tab root → Home → exit); floating bar hides while the keyboard is up; chat/mock composers use `KeyboardAvoidingView` `padding` on both platforms (Android is edge-to-edge in SDK 57, so `adjustResize` alone does not lift content) — **needs device check**; job detail save options are a real `Modal` sheet (was absolutely positioned inside scroll content); "Practice mock interview" opens Mock with that job; missing model shows an Open Settings button; haptic on save.
- **Files:** model and resume imports move (not copy) the picker's cached file, avoiding a second ~1 GB copy; removing/replacing a resume deletes the stored file.

## Next tasks in order
1. **P0**: `scripts/setup.sh` + `npm run typecheck` + Android dev build; fix dependency APIs, permissions, runtime import errors, SafeArea/keyboard collisions, design bugs.
2. **P0**: import/test Qwen Q4 GGUF on actual target phone; run airplane-mode chat and mock; reduce prompt/context memory footprint as needed.
3. **P0**: OCR camera/gallery end to end + review; verify persistence on app relaunch.
4. **P1**: true native resume PDF preview, DOCX text extraction; scanned docs fallback; user consent control for resume use.
5. **P1**: local notifications, event editor and timeline.
6. **P1**: beautiful design polish against references, test small-screen iOS/Android dark mode, Dynamic Type, reduced motion.
7. **P2**: local on-device voice STT/TTS for mock; optional OS share extension and job discovery pagination/filter.
