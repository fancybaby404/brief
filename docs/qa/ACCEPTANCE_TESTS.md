# Acceptance and quality gates

These are **not** claimed as passed. The agent must mark each result PASS/FAIL with evidence before asserting app completion.

## Build and engineering
- `bash scripts/setup.sh`; install exact Expo-compatible native versions, no ignored install errors.
- `npm run typecheck` and `npx expo-doctor` pass.
- Native Android or iOS dev build compiles (Expo Go is NOT acceptable).
- Open native app on one low/mid-range test phone and one emulator or second platform where possible.
- No secrets or resume bytes in Git; no `*.gguf` model weights bundled or cloud model URL.

## UI & navigation
- Floating WHITE 4-item tab bar, separately floating blue +, + popup ~50% width with root Add Job and Ask Brief. Add Job expands in the same popup to Camera / Photo, Paste job link, and Enter manually.
- Top right profile PERSON icon; menu only name, Resume, Notifications, Settings. No Career Profile entry and no notification bell icon.
- Dashboard mascot left (NO arms), bubble right, REAL blue bar chart, recent applications See All, no Up Next or rainbow progress tiles.
- Applications see all ONE list, search and sort; open/update/delete app.
- Jobs/Calendar/Mock/details screens, scroll, iOS safe areas, keyboard, small phone and large text.
- Job detail initially FULL PAGE with NO "save to your applications" popup. User-initiated popover and real external URL.
- Resume large preview plus editable summary, no filename label/status banner and no how-it-works marketing block.
- Ask Brief has model-generated, conversation-specific bottom suggestions; hide suggestions when no local model is installed. Text-only models keep image attachment disabled; a compatible vision model plus projector enables local image chat.

## Functional
- First run skip/onboard/resume; reopen app persists profile.
- Add manual job from the draggable sheet; only company and position required, More details starts collapsed. Test sheet dismissal and keyboard avoidance.
- Add a job with the full-screen camera and gallery: permissions, capture, preview, retake, use photo, OCR, Local AI present/missing/failing, editable review, save.
- Paste a job link: valid readable page, blocked/unsupported page, invalid URL, network timeout, local model present/missing; verify manual fallback and editable review.
- Import PDF digital text locally, editable summary; evaluate DOCX/scanned fallback, OS preview/share.
- Multiple applications and status updates persist across restart; search/sort works.
- Calendar create, mark dates, remove; time zone and scheduled notifications follow-ups tracked.
- Fetch real Jobicy results online, offline failure displayed without app crash, no invented salary or employer logo.
- Chat with saved job, resume; mock one-question-at-a-time grounded in job.
- Airplane mode with local GGUF installed: Ask Brief and Mock still complete; no network inference requests.
- Without GGUF: show actionable model setup error and no fake pre-scripted AI response.
- Red flags are appropriately uncertain and based on quotes from job text.

## Specific demo flow for judges (3 minutes)
1. Home → show progress from actual saved applications, open See all and sort.
2. Add Job → screenshot of real posting → local OCR → AI field extraction → review → Interested; status = NOT APPLIED.
3. Switch airplane mode, open saved job, ask red flags; AI references its job description on-device.
4. Mock → select same application → local interview with follow-up → finish with feedback, optional resume skill alignment.
5. Resume profile through top-right profile menu, open visual preview, show locally saved content and ability to edit.
6. Jobs list is explicitly network-only; disclose that data discovery requires connectivity while saved data/AI does not.

## Important evidence records
`docs/qa/DEVICE_TEST_RESULTS.md` (create after testing) should include test phone, OS/RAM, GGUF filename + model license, inference latency/RAM, photo OCR, build errors, screenshots, flight-mode test, and known issues.
