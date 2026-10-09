# KittenTTS Voice Upgrade Report

## Status

The KittenTTS Mini integration is implemented behind the existing native speech provider. The app keeps the system voice as its default until the voice comparison has been run on a real device. No Kitten voice has been declared the winner without listening tests.

The TypeScript checks and automated test suite pass. Native build, audio quality, memory, and end-to-end interview behavior remain unverified because this environment has no Android device or emulator and has no Java compiler.

## SDK and model

- `@kittentts/react-native` **1.2.0**, pinned exactly. This is the SDK's developer preview.
- Model: `KittenModel.Mini` (`kitten-tts-mini-0.8`), 80M parameters.
- SDK-reported model download: about **83 MB**; the English phonemizer rules and dictionary are additional assets.
- `expo-audio` **57.0.5** plays the SDK's generated WAV files. The SDK removes its temporary playback WAV after use.
- `onnxruntime-react-native` **1.24.3** is supplied by KittenTTS. The existing `llama.rn` **0.12.9** and `whisper.rn` **0.7.4** remain in place; no replacement or duplicate TTS package was added.
- Expo SDK in the installed workspace: **57.0.27**; React Native **0.86.3**.

The SDK and Expo Audio are autolinked in the Expo development build. The app lazy-loads the Kitten SDK so text interviews and native speech can still load in Expo Go or an older binary. Kitten itself requires a rebuilt development app; Expo Go does not contain ONNX Runtime or the native file system module.

## Model setup and lifecycle

- The app downloads Mini plus the SDK's phonemizer assets to the SDK-managed app document directory. It checks free storage first and requires a 20 MB cushion beyond the SDK's approximate model size.
- A model is called **Ready** only after a local ONNX synthesis produces finite, non-empty audio. File presence alone displays as installed and asks the user to verify it.
- Cache checks include the model, voice embeddings, and both phonemizer files. Missing or corrupt files can be retried or removed and reinstalled.
- The SDK downloader has no cancellation API. The UI prevents duplicate downloads and exposes progress, retry, and removal; the SDK writes temporary download files and retries failed transfers.
- A single Mini engine is reused during speech and disposed when the voice screen/session releases it. ONNX uses two intra-op threads. Sentence streaming holds the current segment and at most one prefetched segment, rather than generating an entire WAV in memory.
- Qwen generation finishes before Kitten synthesis starts, so the two inference calls do not run concurrently. Whisper's existing interview-session lifetime is unchanged. Peak memory and thermal behavior still need measurement on the target phone; no automatic downgrade to Micro was made.

## Speech behavior

- The reducer now has a separate synthesis phase. The speaking indicator and microphone gate change only when audio playback actually starts.
- Complete LLM replies are saved before speech starts. The interviewer prompt asks for warm, concise, spoken follow-ups that acknowledge one specific answer detail, avoid canned transitions, and ask one question at a time.
- Kitten produces sentence chunks in order and starts preparing the next sentence during current playback. It does not speak partial Qwen output.
- Slower, Normal, and Faster map to the existing persisted values `0.85`, `1.0`, and `1.15`, all supported by the SDK.
- Pause, backgrounding, end, replay, and stop invalidate late playback callbacks. If Kitten fails before audible playback, a verified on-device system voice takes over. That fallback is saved as the provider for future turns. If it fails after playback began, the app avoids replaying the whole reply over already-heard audio; the transcript remains saved and Replay remains available.
- If no verified offline system voice exists, the failure is shown and the interview transcript stays intact. Android system voices are considered verified only when the OS identifies them as local.

## Voice comparison

A development-only comparison panel is available in Voice Interviews settings. It plays the same three requested samples through the current native voice (Samantha when installed) or any of the eight Kitten voices. It records first-audible latency and request-to-playback-end time; for Kitten it also sums per-sentence synthesis compute time. The native speech API does not expose synthesis-only timing. Naturalness, pronunciation, continuity, and stability use manual 1–5 ratings.

No device comparison results are recorded yet. Peak native memory cannot be read reliably from JavaScript; measure it with Android Studio Profiler or iOS Instruments. The app's SDK/native combo has not been built in this environment, so the comparison tool has not been run.

**Default voice:** existing native/system voice, unchanged pending Android A/B results.

## Verification

- `npm run typecheck`: passed.
- `npm test`: passed, 10 test files including reducer turn-taking and prompt coverage.
- `npx expo-doctor`: 20/21 checks passed. React Native Directory reports `react-native-fs` as untested on the New Architecture/unmaintained and has no metadata for KittenTTS, ONNX Runtime, Whisper, and several existing native packages. The SDK currently aliases `react-native-fs` to `@dr.pogodin/react-native-fs`; this warning is still a compatibility risk that needs a native build.
- `npx expo prebuild --platform android --no-install`: passed and generated the native project. Gradle resolved Expo's Android minimum as API 24 and autolinked the ONNX dependency.
- `npx expo run:android --no-install`: stopped before build because no device or emulator was available.
- `./android/gradlew -p android :app:assembleDebug`: native configuration reached `onnxruntime-react-native`, then failed because the installed OpenJDK 25 runtime has no Java compiler (`JAVA_COMPILER`/`javac`). Gradle also reported a missing `release` software component after that configuration failure. No native APK was produced.
- No physical-device or emulator test was run for download, spoken playback, microphone capture, Whisper transcription, Qwen follow-up, five-turn continuity, airplane mode, interruptions, Bluetooth routing, low memory, or relaunch persistence.

## Remaining release checks

1. Build a fresh Android development client with the pinned SDK and verify native linking.
2. On the target Android phone, install Mini in airplane mode after download, compare all voices against the installed Samantha/system voice, and record latency and manual ratings.
3. Run at least five complete interview turns; test pause/resume, replay, stop, backgrounding, audio interruptions, Bluetooth output, and a low-memory device. Capture peak process memory before selecting a default voice.
4. Select a Kitten default only after the comparison confirms acceptable naturalness, pronunciation, latency, and stability.
