# Technical architecture

## Platform
React Native 0.86 via Expo SDK 57; TypeScript strict mode; real-device **development build**. Android and iOS targeted. This starter deliberately uses lightweight state-driven navigation instead of a heavyweight routing dependency; migrate to Expo Router only when deep links and share extensions justify it.

## Separation
- `src/screens`: page components, display and event handlers.
- `src/components`: shared native UI and Chrome. Bottom/nav overlays shared across screens.
- `src/lib/appContext.tsx`: current screen state + application/event/profile repository facade.
- `src/lib/db.ts`: one SQLite file with JSON payload rows. Good for hackathon; eventually index/filter SQL columns and transactions/migrations.
- `src/lib/jobs.ts`: only network job discovery. `Jobicy` public remote listings; not an application submission API. Requires internet and use terms.
- `src/lib/imports.ts`: native image picking, OCR, resume document picking, model copy.
- `src/lib/ai.ts`: single local model loader, completion endpoint, persona-specific system prompts, model error propagation.

## Motion & input
`react-native-reanimated` 4 + `react-native-worklets` (UI-thread animation), `react-native-gesture-handler` (UI-thread gestures; `GestureHandlerRootView` at the root and inside each `Modal`), `react-native-keyboard-controller` (`KeyboardProvider` at the root; composers use its `KeyboardAvoidingView`). The worklets Babel plugin is added by `babel-preset-expo`. Tokens live in `src/theme/motion.ts`. Core `Animated` remains only for native-driver ambient loops (cloud, typing dots, skeleton, mascot reactions).

## Data boundary & schema
**SQLite persisted:** applications (id, company, title, status, description, etc), calendar events, message threads and profile info (experience, skills, resume URI, extracted text), imported GGUF URI.

Application: id, company, title, status, location, salary, employmentType, description, sourceUrl, createdAt, appliedAt?, notes.
Event: id, applicationId?, title, date ISO, notes.
Profile: name, skills, education, experience, goals, resumeUri, resumeText.
Message: id, thread, user/assistant role, content, timestamp.

**Threat model:** job descriptions and OCR text are untrusted inputs; never allow them to override system prompts, trigger external URLs, read other local files, or exfiltrate data. Don't log candidate PII. Keep model file private and local. Remote APIs receive only search keywords; never upload resume data or message transcript. For resume removal delete the copied local file as well (follow-up action).

## Local AI execution
Select .gguf locally, copy to app document directory, `llama.rn.initLlama` on device, `completion({ messages, n_predict, temperature })`. `n_ctx=2048`, CPU initial default for maximal device portability, GPU and prompt sizes after physical profiling. `ensureModel` errors must be visible, with Settings CTA. There is no cloud fallback. See `../ai/LOCAL_AI.md`.

## OCR
ImagePicker camera/library -> Expo OCR Kit platform-native Vision/ML Kit -> raw string -> LLM structured extraction with JSON contract -> human review form. OCR itself should remain usable when LLM fails; save manually.

## Resume
DocumentPicker -> file copied into private app documents -> locally extract native text for digital PDF via Expo PDF Text Extract when supported -> editable `experience/education/skills/goals` plus extracted text in local prompts. DOCX and scanned PDFs need parser/OCR extension; no claims otherwise. Large Resume preview in starter is a formatted visual summary, **not actual PDF page rendering**. Planned native PDF renderer: react-native-pdf + compatible config plugin, with device QA.

## Real job discovery
Jobicy endpoint `https://jobicy.com/api/v2/remote-jobs?count=40&tag=...`. No API key but last-7-day remote-job scope and rate limits. Keep canonical source URL. Filter by eligible location using provider data when needed; don't fabricate geography, employer logo, salary, or "verified" status. Later add licensed Philippines provider as separate adapter.

## Exchange rates
Salary display can convert provider salaries (structured `pay`: min, max, currency, period) into the user's chosen currency (Settings, default PHP; "As listed" turns it off). Rates are ECB reference rates from `https://api.frankfurter.dev/v1/latest?base=EUR` (no key). The request carries no user data; results are cached in SQLite (`fxRates`) and refreshed when older than 12 h, so conversion works offline with the last rates. Converted values are prefixed "≈"; manual salaries are shown as typed.

## Security / offline
- Airplane mode must not block SQLite, imported OCR photos, current profile and local chat/mock (once model installed).
- Job discovery is explicit online-only; no cached search results promised unless implemented.
- Do not use AsyncStorage as a duplicate source of truth; SQLite holds records.
- User data from resume can be long; use deterministic prompt budgets and select relevant snippets.
- AI is not an authority on scams/employment law; require evidence and cautious wording.

## Future production upgrades
Transactional migrations; CRUD edit event; date/time picker with timezone; local notification scheduling; full PDF view + DOCX/text parsing; status/activity timeline; stream local completions and cancellation; local voice STT/TTS, audio permission and on-device speech packs; job-to-resume skill gap scoring with evidence; robust offline job-cache + API pagination; terms/privacy/data export/delete; deep linking/share extension; native crash instrumentation opt-in; UI tests and device test matrix.
