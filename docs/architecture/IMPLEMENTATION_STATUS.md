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

## Next tasks in order
1. **P0**: `scripts/setup.sh` + `npm run typecheck` + Android dev build; fix dependency APIs, permissions, runtime import errors, SafeArea/keyboard collisions, design bugs.
2. **P0**: import/test Qwen Q4 GGUF on actual target phone; run airplane-mode chat and mock; reduce prompt/context memory footprint as needed.
3. **P0**: OCR camera/gallery end to end + review; verify persistence on app relaunch.
4. **P1**: true native resume PDF preview, DOCX text extraction; scanned docs fallback; user consent control for resume use.
5. **P1**: local notifications, event editor and timeline.
6. **P1**: beautiful design polish against references, test small-screen iOS/Android dark mode, Dynamic Type, reduced motion.
7. **P2**: local on-device voice STT/TTS for mock; optional OS share extension and job discovery pagination/filter.
