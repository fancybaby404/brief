# Device test results

Gates from `ACCEPTANCE_TESTS.md`. PASS needs evidence; BLOCKED names what is missing. Nothing here is claimed beyond the evidence column.

**Host:** Windows 11, Node 24.20, npm 11.19. **No Android SDK/JDK/adb and no device connected yet; iOS cannot build on Windows.**
**Test phone:** _not yet_ · **GGUF:** _not yet_ (license, size, checksum to record)

| Gate | Result | Evidence / blocker |
|---|---|---|
| `scripts/setup.sh` installs without ignored errors | PASS (2026-10-09) | llama.rn postinstall downloaded `jniLibs/arm64-v8a/librnllama*.so` and `rnllama.xcframework` |
| `npm run typecheck` | PASS (2026-10-09) | `tsc --noEmit`, 0 errors |
| `npx expo-doctor` | PASS (2026-10-09) | 21/21 checks |
| Unit/static tests | PASS (2026-10-09) | `npm test`: 18/18 |
| JS bundle builds | PASS (2026-10-09) | `npx expo export --platform android` → 2.1 MB Hermes bundle |
| Jobicy live response | PASS (2026-10-09, desktop curl) | HTTP 200, 1.5 s; field shape captured in `tests/logic.test.mjs` |
| Native Android dev build | PASS (2026-10-09) | EAS `development` APK, build d0b5c757-a07f-4499-b8c3-2395925f0fe8 (adds Reanimated 4.5.1, Gesture Handler 2.32, Keyboard Controller 1.21.9; supersedes 87dd59d0). Not yet launched on a phone |
| Native iOS dev build | BLOCKED | Needs macOS + Xcode |
| UI & navigation gates on device | BLOCKED | Needs dev build |
| SQLite persistence across force-close | BLOCKED | Needs dev build |
| Local GGUF load, latency/RAM | BLOCKED | Needs device + GGUF (Settings → Test local model reports load s and tokens/s) |
| Airplane-mode Ask Brief + 3-turn Mock | BLOCKED | Needs device + GGUF |
| Camera/gallery OCR → review → save | BLOCKED | Needs dev build |
| Jobs online/offline on device | BLOCKED | Needs dev build |
| No network inference in offline flows | BLOCKED | Needs device traffic capture |
| No secrets/resume/GGUF in git | PASS (2026-10-09) | `.gitignore` covers `*.gguf`, `.env`, keystores; `git status` reviewed before commit |

## 2026-10-10 — application detail redesign (desktop gates only)
- `npm run typecheck` PASS; `npx expo-doctor` 21/21 PASS; `npx expo export --platform android` PASS (3.9 MB Hermes bundle); `npm test` 57/58 — the one failure (`repo.test.mjs` expects the string `add-job` in `App.tsx`) predates this change.
- Not run on a device or simulator. **A new development build is required**: `expo-notifications` and `@react-native-community/datetimepicker` are new native modules, and builds without them crash on the event editor import.
- Device checks for this screen: status sheet drag/dismiss; event sheet keyboard (title, location, notes) on iOS page sheet and Android full screen; iOS compact date/time pickers and Android dialogs (12/24 h); reminder permission prompt, denial path and a reminder actually firing (foreground and locked); notes autosave across swipe-down, Done, Android back and app switch; Back from Ask Brief / Practice returns to the job; compact title fade on scroll; long company names and titles; large Dynamic Type; VoiceOver/TalkBack labels.

## Known issues to check on device
- **Use a build made after the voice work (2026-10-10)**: adds expo-notifications, datetimepicker, expo-asset, whisper.rn, audio-pcm-stream, expo-speech and expo-image-manipulator. Offline runs still to do: `LOCAL_AI_AGENTIC_VERIFICATION.md` §9 and `MULTIMODAL_AI_VOICE_VERIFICATION.md` §11. The agent/vision offline run in `LOCAL_AI_AGENTIC_VERIFICATION.md` §9 is still to do. Builds before d0b5c757 also lack Reanimated / Gesture Handler / Keyboard Controller.
- Feel-check on the slowest phone: flick the save/filter sheet down fast and slow, grab it mid-close; swipe a job left slowly past the threshold and back (haptic should tick both ways), then flick; scroll Explore vertically to confirm swipes never steal the scroll; open/close the + and profile menus rapidly; swipe calendar months.
- Keyboard: composers rely on `KeyboardAvoidingView behavior="padding"` with offset `insets.top + 59` (header height). Verify on Android edge-to-edge and iOS.
- Jobicy `count=40` with no pagination yet (`nextCursor` is available).
