# Brief — Remotion Video Planning Handoff

> [!NOTE]
> This handoff document is prepared for an incoming AI model to design the storyboard, narrative structure, scene sequencing, and Remotion implementation plan for **Brief**.

---

## 1. Product Context & Identity

- **Product Name:** Brief (Never rename the product).
- **Core Value Proposition:** Privacy-first, offline-first iOS-style job search tracker powered by local on-device AI (`llama.rn`, `whisper.rn`, KittenTTS, on-device OCR, and PDF parsing). No remote AI inference; resume, chats and interviews stay on the phone. Job discovery (Jobicy) and the one-time model download do use the network.
- **Visual Design Identity:**
  - **Color Palette:** Pure white background, light blue tints, `#1677F2` primary accent blue, muted slate typography.
  - **Typography:** Apple SF Pro styling in the app, rounded badges, clean iOS card containers. In the video use Inter (SF Pro is not licensed for Linux rendering) and Fredoka 700 for the `brief` wordmark.
  - **Mascot:** Arm-free happy mascot at `assets/mascot-happy.png` (cropped) / `assets/mascot-happy-original.png`; other moods in `assets/mascot/` (`shocked`, `question`, `sad`, `error`). There is no `HAPPY.png`.
  - **Key Screens:** Home (Application progress bar chart + recent applications), Applications list (single list, no Kanban), Explore jobs, Add Job (camera/OCR, link, manual), Application detail (status, Up next, notes, activity), Calendar, Ask Brief, Mock interview (typed or voice with Whisper/KittenTTS, scored feedback), Resume, Settings → Brief AI. There is no resume matcher and no analytics dashboard.

---

## 2. Infrastructure & Tooling Setup

> [!NOTE]
> The emulator and `npm run record` are **not used** for this video: the host machine can't run the emulator reliably. The user supplies phone screen recordings in `video/public/clips/raw/` (see `PLAN.md` → Recording guide).

All necessary tools, emulators, and video rendering packages have already been installed, verified, and configured in this repository:

| Capability | Path / Command | Details |
| :--- | :--- | :--- |
| **Remotion Subproject** | `video/` | Isolated Remotion 4.0.534 subproject with React 19.2.3 and exact `zod` 4.5.4. |
| **Sound Effects (SFX)** | `@remotion/sfx` | Installed in `video/`. Pre-bundled effects (`whoosh`, `uiSwitch`, `mouseClick`, `ding`, `pageTurn`). |
| **Studio Preview** | `npm run video` | Launches Remotion interactive preview player at `http://localhost:3000`. |
| **Video Production Build** | `npm run video:build` | Bundles Remotion compositions for headless or production rendering. |
| **Android Emulator** | `npm run emulator` | Idempotent launcher for `Pixel_API_36` (x86_64, Android 16). Skips relaunch if already open. |
| **Demo Screen Recorder** | `npm run record` | Automatically records emulator screen, pulls MP4 directly to `video/public/demo.mp4`, and cleans device. |
| **Remotion Agent Skills** | `.agents/skills/`, `.claude/skills/` | 12 official upstream skills synced (`remotion-best-practices`, `remotion-create`, `remotion-markup`, `remotion-render`, etc.). |

---

## 3. Video Objectives & Target Formats

The incoming model should establish the video strategy based on these goals:

### Target Output Options
- **Format A (Product Showcase / YouTube / Web):** `1920x1080` (16:9), 30fps or 60fps, 45–60 seconds.
- **Format B (Mobile Ad / TikTok / Reels / App Store):** `1080x1920` (9:16), 30fps or 60fps, 15–30 seconds.

> [!IMPORTANT]
> Chosen direction and full storyboard: **`video/PLAN.md`** (Format A, 60 s, user voiceover, persona "Jade", physical-phone recordings). The arc below is the original suggestion.

### Narrative Arc (Original suggestion)
1. **The Hook (0–5s):** The problem with modern job hunts: chaotic spreadsheets, privacy-invasive cloud AI, repetitive applications.
2. **The Reveal (5–12s):** Introducing Brief — clean iOS aesthetics, floating action bars, privacy badge ("100% On-Device AI").
3. **Core Feature 1: Job Organization (12–20s):** Fast pipeline tracking, status badges, one-tap logging.
4. **Core Feature 2: Local AI Mock Interview & Ask Brief (20–35s):** Offline AI coaching, a mic-level listening ring driven by the real microphone, and end-of-interview feedback scores (Relevance, Clarity, Completeness, Examples).
5. **Brand Closer & Call to Action (35–45s):** Mascot `HAPPY.png` celebration animation, `#1677F2` branding, "Your career, completely private."

---

## 4. Technical Guidelines for Remotion Planning

When writing Remotion compositions in `video/src/`:

1. **Composition Entrypoint:**
   - Root configuration is in `video/src/Root.tsx`.
   - Component templates live in `video/src/Composition.tsx`.
2. **Video Asset Loading:**
   - Emulator recordings pulled by `npm run record` are placed in `video/public/demo.mp4`.
   - Pass a path to record each clip separately: `npm run record -- video/public/clips/home.mp4`.
   - Use `<Video>` from `@remotion/media` (recommended by current docs; add with `npx remotion add @remotion/media`):
     ```tsx
     import { staticFile } from 'remotion';
     import { Video } from '@remotion/media';
     <Video src={staticFile('clips/home.mp4')} />
     ```
3. **Mascot & Graphic Assets:**
   - Copy `assets/mascot-happy.png` and `assets/mascot/*.png` into `video/public/mascot/` for Remotion usage.
4. **Animation Mechanics:**
   - Use Remotion's `spring()` and `interpolate()` primitives rather than CSS transitions for frame-deterministic motion.
   - Reference `.agents/skills/remotion-markup/REFERENCE.md` for timing curves and layout rules.
5. **Audio & SFX Layering:**
   - `@remotion/sfx` exports remote URLs (e.g. `whoosh` = `https://remotion.media/whoosh.wav`). Download the ones you use into `video/public/sfx/` and play them with `<Audio>` from `@remotion/media` so renders work offline.

---

## 5. Next Steps for the Planning Agent

The incoming AI model should produce:
1. **A Concrete Storyboard & Scene Breakdown:** Exact timestamps, scene titles, visual contents, voiceover/on-screen captions, and sound effects.
2. **Device Mockup Framing Plan:** 3D or CSS-framed mobile viewport wrapping the recorded `demo.mp4`.
3. **Component Architecture:** Suggested modular Remotion component tree (e.g. `<IntroHook>`, `<PhoneFrame>`, `<FeatureCallout>`, `<OutroCta>`).
4. **Exact Implementation Task List:** Ordered file modifications in `video/src/`.
