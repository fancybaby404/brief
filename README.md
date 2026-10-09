# brief — job hunting, made lighter

**Offline-first React Native / Expo mobile app**, with a local application tracker, resume context, online job discovery, native job-post OCR, contextual AI chat, and personalized mock interviews using a local GGUF model.

> **Status:** substantial functional starter, not a completed/released app. Source screens, SQLite data operations, Jobicy adapter and llama.rn integration are included. Native dependencies, physical-device testing, end-to-end QA, resume PDF rendering, real-time voice STT, notifications, and deployment are not validated in this sandbox. See `docs/qa/ACCEPTANCE_TESTS.md` and `docs/architecture/IMPLEMENTATION_STATUS.md`. The model weights are deliberately not bundled (large download/licensing/device variance).

## Get started

Requires **Node 22.13+** and Android Studio/Android device, or macOS/Xcode for iOS. Expo SDK 57 (React Native 0.86).

```bash
unzip brief-local-ai-starter.zip
cd brief-starter
bash scripts/install-agent-skills.sh    # requires internet, installs selected Claude Code skills
bash scripts/setup.sh                   # requires internet, installs Expo and native libraries
npx eas-cli@latest build --profile development --platform android   # cloud dev build (no local SDK); or npm run android with Android Studio
# or npm run ios                       # on macOS with Xcode
```

Open **Settings → On-device AI** and tap **Download model** to install the optional Qwen3‑VL 2B GGUF plus its matching image encoder directly from Hugging Face, or import a compatible model already on your phone. The pair is about 1.6 GB. Brief validates image support before switching models; the download does not start until the user taps the button. Inference stays on-device and no prompts are sent to the model source. `expo-camera`, `llama.rn`, and `expo-ocr-kit` require a **development build, not Expo Go**.

**Start your coding agent:** open `prompts/INITIAL_PROMPT.md`, paste its contents into Claude Code with this directory as working directory. It forces a full documentation read, skill verification/install, implementation verification, and quality gates.

## Layout

- `App.tsx`, `src/screens/`, `src/components/`: navigable UI and behavior
- `src/lib/db.ts`: local SQLite persistence
- `src/lib/ai.ts`: local GGUF inference and safe prompt construction
- `src/lib/imports.ts`: image OCR, PDF text extraction, model and resume import
- `src/lib/jobs.ts`: Jobicy remote job discovery adapter (needs internet)
- `src/theme/tokens.ts`: colors and proportions
- `design/references/current/`: four original **user-supplied** latest attachments
- `design/references/history/`: selected earlier user references and mockups
- `docs/`: product, UX, AI, engineering and acceptance specifications
- `AGENTS.md`: stable agent guidance, deliberately short
- `scripts/`: dependency and skills bootstrap

## Real feature flows in this starter

- Onboarding (resume optional, manually supplied skills/experience optional, skip)
- Home: mascot left + conversational card right, last four weeks' application bars, recent list
- Applications: local list, search, sorting, statuses and detail
- Add Job: anchored quick-menu submenu, in-app Expo Camera/gallery preview, on-device OCR and optional local extraction, readable job-link import, minimal manual sheet, editable review then save
- Jobs: fetch public remote listings from Jobicy; open details, visit listing, save for later, mark interested/applied **in Brief**
- Job detail: distinguish opening employer page vs tracking state; ask AI
- Calendar: month navigation, local events and long-press delete
- Mock: select a saved application, text Q&A with local AI, end-with-feedback
- Ask Brief: offline model chat with contextual saved application, resume summary and recent message history
- Profile menu: profile icon top right → Resume / Notifications / Settings
- Resume: local PDF/DOCX import; local PDF text extraction for digital PDF if supported; manually editable skills/education/experience; visual summary and OS open/share
- Settings: local .gguf import and testing
- Bottom: white floating four-destination pill (Home / Jobs / Calendar / Mock) plus **separate** blue square rounded +. Popup is ~half screen width; its root is **Add Job / Ask Brief**, and Add Job expands in place to Camera / Photo, Paste job link, or Enter manually.

## Important limitations

1. Online job discovery uses a **public remote listings feed**, not all Philippine jobs and not company application submission. Swap in a properly licensed Philippine jobs API as available.
2. Resume preview in source is a **visual summary**, not a true inline PDF renderer. OS file opening is supported; implementation needed for full PDF preview (see follow-ups).
3. PDF text extractor handles **digital PDF text**, not scanned PDFs; DOCX imported but not parsed in this starter. Editable career summary works immediately and is included in AI context.
4. Local LLM needs a downloaded and supported GGUF plus physical-device performance testing. CPU first; tune hardware-specific layers.
5. Mock supports **offline voice** (Whisper STT via whisper.rn + on-device platform TTS) after downloading the speech models in Settings, and falls back to typing otherwise. **Not yet tested on a device** — see `MULTIMODAL_AI_VOICE_VERIFICATION.md`.
6. Event reminders are scheduled as local notifications (expo-notifications); delivery is not yet verified on a device.
7. Native builds, compilation, network API calls, and hardware benchmarks could **not** be executed in this environment. `tests` cover static packaging/spec invariants only, not native runtime.

## Source links and licenses

See `docs/architecture/TECH_RESEARCH.md`. Mascot and product screenshots supplied by the user for this project; keep them only in the project. Upstream agent skill files are **not vendored** into this archive; script downloads them at install time from the owners' repositories, with upstream licenses preserved.
