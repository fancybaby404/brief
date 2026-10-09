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
| Native Android dev build | PASS (2026-10-09) | EAS `development` profile, build 87dd59d0-9743-40ff-a528-854b3e13445f (APK). Not yet launched on a phone |
| Native iOS dev build | BLOCKED | Needs macOS + Xcode |
| UI & navigation gates on device | BLOCKED | Needs dev build |
| SQLite persistence across force-close | BLOCKED | Needs dev build |
| Local GGUF load, latency/RAM | BLOCKED | Needs device + GGUF (Settings → Test local model reports load s and tokens/s) |
| Airplane-mode Ask Brief + 3-turn Mock | BLOCKED | Needs device + GGUF |
| Camera/gallery OCR → review → save | BLOCKED | Needs dev build |
| Jobs online/offline on device | BLOCKED | Needs dev build |
| No network inference in offline flows | BLOCKED | Needs device traffic capture |
| No secrets/resume/GGUF in git | PASS (2026-10-09) | `.gitignore` covers `*.gguf`, `.env`, keystores; `git status` reviewed before commit |

## Known issues to check on device
- **Rebuild required:** Reanimated, Gesture Handler and Keyboard Controller are native modules added after build 87dd59d0. Loading the new JS into that build will fail; install a new development build first.
- Feel-check on the slowest phone: flick the save/filter sheet down fast and slow, grab it mid-close; swipe a job left slowly past the threshold and back (haptic should tick both ways), then flick; scroll Explore vertically to confirm swipes never steal the scroll; open/close the + and profile menus rapidly; swipe calendar months.
- Keyboard: composers rely on `KeyboardAvoidingView behavior="padding"` with offset `insets.top + 59` (header height). Verify on Android edge-to-edge and iOS.
- Jobicy `count=40` with no pagination yet (`nextCursor` is available).
