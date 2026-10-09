# Brief — 60 s promo video plan

Status: planned, not built. Read with `HANDOFF.md` (tooling) and the product docs in `../docs/`.

## Locked decisions

| Topic | Decision |
|---|---|
| Format | 1920×1080, 30 fps, 1800 frames (60 s), one landscape cut |
| Footage | Hybrid. **All app UI is real screen recordings.** Remotion-built graphics only for non-app moments: hook, logo reveal, privacy graphic, outro |
| Capture | The user records every clip on their own phone with its built-in screen recorder and drops the files in `public/clips/raw/`. No emulator, no adb |
| Narration | User-recorded voiceover from the script below; captions transcribed locally |
| Persona | **Jade**, fictional fresh graduate applying for entry-level roles. Tracked jobs use fictional company names; Explore shows real live Jobicy listings |
| Honesty | Never fake an app feature. If a flow cannot be captured for real, change the script, not the footage. Sped-up clips carry a "Sped up N×" badge |

## Defaults to confirm (used unless changed)

1. Tagline: **"Job hunting, made lighter."** (README) — alternative: "Your career, completely private."
2. End-card CTA: **"Coming soon"** (no store badge — the app is not released).
3. Persona: **Jade Santos**, BS Information Technology '26, Manila. Targets: Junior Frontend Developer, Associate Product Designer, QA Analyst.
4. Data: entered by hand in the app on the phone. The progress chart only shows real dates, so jobs marked applied on recording day all land in the current week. Accept that, or spread the entry over a few days before recording Home.
5. Music: royalty-free bed supplied by the user (TBD).

## Claims we may and may not make

| Allowed | Not allowed |
|---|---|
| On-device AI (llama.rn Qwen3-VL 2B, whisper.rn, KittenTTS, on-device OCR) | "No servers" — Explore uses the Jobicy API; models download once from Hugging Face |
| "Your resume, chats and interviews never leave your phone" | "Applied" via Brief — Brief only tracks; it never submits |
| "AI works in airplane mode" (shown on camera) | Kanban pipeline, analytics tiles, resume matcher / relevance score (don't exist) |
| Mock feedback scores: Relevance, Clarity, Completeness, Examples (1–5) | Fake waveform / recording visuals |

## Storyboard

8 transitions × 12 frames = 96 frames overlap. Scene sum 1896 − 96 = **1800**.

| # | Time | Frames | Scene | Visual | Headline | Voiceover | SFX |
|---|---|---|---|---|---|---|---|
| 1 | 0:00–0:05.5 | 165 | Hook (graphic) | Illustrated street map (slow push-in). The mascot walks along a street, stops at an intersection, a no-Wi-Fi badge pops above it and its face turns sad; a generic "You're offline — interview practice needs an internet connection" card slides up | No signal. Interview tomorrow. | "Interview tomorrow, but no signal? Most AI coaches just stop working." | blip on Wi-Fi drop, whoosh into reveal |
| 2 | 0:05–0:11.5 | 192 | Reveal | White canvas, mascot spring-drops in, `brief` wordmark (Fredoka 700), "On-device AI" badge, phone slides in on the welcome screen | Meet brief | "Meet Brief, a job tracker with AI that lives entirely on your phone." | soft pop on mascot land |
| 3 | 0:11–0:17.5 | 192 | Home | Clip `home`: "Good morning, Jade", Application progress chart, Recent applications; callout on the chart | Every job, one glance | "Jade sees every application and her weekly progress at a glance." | — |
| 4 | 0:17–0:26.5 | 282 | Discover + Add | Clip `explore`: swipe left → "Added to Brief" toast. Clip `addjob`: + → Add Job → Camera / Photo → posting photo → on-device OCR → review → Save | Swipe to save. Snap to add. | "She swipes to save jobs she likes, or snaps a photo of a posting, and Brief fills in the details." | tick on swipe, ding on toast, shutter |
| 5 | 0:26–0:33.5 | 222 | Track | Clip `track`: application detail → status sheet → Interview → "Schedule it" → event sheet → Calendar marker | Interviews, sorted | "Statuses, notes and interviews stay together, and land right on her calendar." | switch on status pick |
| 6 | 0:33–0:40.5 | 222 | Ask Brief | Clip `resume` (~2 s resume summary) → clip `ask`: question about a role, streamed answer, follow-up chips | Knows your resume | "Unsure about a role? She asks Brief, which already knows her resume." | — |
| 7 | 0:40–0:50.5 | 312 | Mock interview | Clip `mock`: picker "Who are you interviewing for?" → voice session (real mic-level ring, spoken question) → feedback card with scores | Practice out loud | "Then she practices out loud. Brief plays the interviewer, listens, and gives honest feedback." | ding on feedback card |
| 8 | 0:50–0:55.5 | 162 | Privacy proof | Clip `offline`: airplane mode on, Ask Brief still answers; chips Local LLM · Whisper · KittenTTS · OCR — "all on-device" | Works in airplane mode | "Her resume, chats and interviews never leave her phone." | switch on airplane toggle |
| 9 | 0:55–1:00 | 147 | Outro (graphic) | Mascot happy hop, wordmark, tagline, "Coming soon" | Job hunting, made lighter. | "Brief. Job hunting, made lighter." | one soft ding |

Coverage: Onboarding (2), Home (3), Explore + Add Job + OCR (4), Application detail + status + events + Calendar (5), Resume + Ask Brief (6), Mock voice + feedback (7), Settings → Brief AI + offline (8).

Fallback for scene 7: if voice capture fails on device, record the typed mock and change the line to "…practices with a mock interview built from the job post, and gets honest feedback."

Voiceover budget: ~110 words at ~150 wpm. Record dry, one take per scene line with 1 s room tone between lines.

## Layout and motion

- Headline on one side, phone on the other, alternating sides per scene.
- Safe area: key content ≥ 140 px from left/right, ≥ 100 px from top/bottom.
- Type: headline ≥ 140 px, supporting ≥ 78 px (skill minimums scaled to 1920 wide), 2–5 words per headline.
- Phone frame: generic CSS Android frame (rounded body, punch-hole), screen height ≤ 880 px; aspect ratio taken from the clip (physical phones are often 20:9, not 16:9).
- Status bar: `PhoneFrame` crops the recorded status bar (`cropTop`) and draws a clean one (09:41, full battery). Taps are highlighted by `TapRipple` overlays.
- Palette from `../src/theme/tokens.ts`: accent `#1677F2`, canvas `#F8FBFF`, mist `#EAF4FF`, ink `#101B3F`, secondary `#687B9F`.
- Fonts: Fredoka 700 (wordmark) + Inter (everything else) via `@remotion/google-fonts`. SF Pro is not licensed for Linux rendering.
- Motion per `../docs/design/DESIGN_SYSTEM.md`: ease-out `(0.23, 1, 0.32, 1)`, non-bouncy springs (bounce only for the mascot hop), 12-frame fade/slide transitions. Mascot never has arms.

## Component architecture (`src/`)

```
Root.tsx                 BriefPromo + Folder "Scenes" + Folder "Elements" (connected compositions)
BriefPromo.tsx           TransitionSeries of 9 scenes + VO / music / subtitles layers
theme.ts, fonts.ts       tokens, easing curves, font loading
components/
  PhoneFrame.tsx         Interactive.withSchema: src, trimBefore, durationInFrames, playbackRate, side
  Headline.tsx           headline + subline, spring entrance
  Callout.tsx            pill pointing at a screen region
  TapRipple.tsx          tap highlight at frame + x/y
  Mascot.tsx             CanvasImage face swap, hop / settle
  PrivacyBadge.tsx, SpeedBadge.tsx, Subtitles.tsx (@remotion/captions, prop toggle)
scenes/
  HookScene, RevealScene, HomeScene, DiscoverScene, TrackScene,
  AskScene, MockScene, PrivacyScene, OutroScene (.tsx)
```

Public assets (`public/`): `mascot/*.png` (copied from `../assets/mascot-happy.png` and `../assets/mascot/*.png`), `clips/*.mp4`, `vo/voiceover.wav`, `music/bed.mp3`, `sfx/*.wav` (downloaded from the `@remotion/sfx` URLs so renders work offline). Clips and VO are gitignored.

## Recording guide (user, on the phone)

Before recording:
- Install a current Brief build that includes the voice modules. Without USB, use a cloud build (`npx eas-cli@latest build --profile preview --platform android`) and install the APK from its download link on the phone.
- Enter Jade's profile and fictional resume, plus ~6–8 tracked jobs at fictional companies with mixed statuses. Never use real personal data.
- Settings → Brief AI: download Qwen3-VL 2B + image encoder. Settings → Voice interviews: Whisper base.en + a KittenTTS voice. Run the readiness checks.
- Turn on Do Not Disturb, charge above 80 %, use light mode, and keep the default font size.
- Turn off the recorder's "show touches" option. Record with **no audio**, except `mock`: record that one with **device/internal audio** so the interviewer voice is captured.

While recording:
- Portrait, native resolution, highest quality setting.
- Slow, deliberate taps, with ~2 s of stillness at the start and end of each clip.
- One clip per file, named exactly as in the table. Retakes go in as `home-2.mp4` etc.
- Long AI waits are fine. Don't cut them on the phone; I trim or speed them up (with a "Sped up" badge).

Drop the files in `video/public/clips/raw/`. I convert them to constant 30 fps clips in `video/public/clips/`.

## Shot list (one file per clip)

| Clip | Actions |
|---|---|
| `onboarding` | Welcome page → swipe to page 2 (short, for scene 2) |
| `home` | Home at rest → tap mascot once → slow scroll to Recent applications |
| `explore` | Scroll Explore → swipe a card left past threshold → toast "Added to Brief" |
| `addjob` | Tap + → Add Job → Camera / Photo → gallery → fictional posting screenshot → reading text → review → Save |
| `track` | Open an application → status button → Interview → "Schedule it" → fill event → Save → Calendar tab |
| `resume` | Profile → Resume → preview + Resume summary |
| `ask` | From the application: Ask Brief → ask "What should I prepare for this role?" → answer streams → chips appear |
| `mock` | Mock tab → pick job → Speak → answer one question aloud → End → feedback card |
| `offline` | Pull down quick settings → Airplane mode on → Ask Brief → new question → answer |

Post-process every clip to constant 30 fps (phone recorders produce variable frame rate):
`ffmpeg -i clips/raw/<name>.mp4 -r 30 -c:v libx264 -crf 16 -pix_fmt yuv420p clips/<name>.mp4` (add `-c:a aac` for `mock`, `-an` for the rest)

## Ordered task list

### A. Recordings (user)
1. Prepare the phone and record the shot list per the recording guide; drop the files in `public/clips/raw/`.

### B. Ingest (agent)
2. Probe each clip (`ffprobe`: resolution, fps, duration), convert to CFR 30 fps, note the status-bar height for `cropTop`.
3. Log in/out points and tap timestamps per clip for trims and `TapRipple`s.

### C. Build in `video/` (can start before the recordings arrive)
4. `npx remotion add @remotion/media @remotion/transitions @remotion/google-fonts @remotion/captions`.
5. Copy mascots, download SFX, write `theme.ts` and `fonts.ts`.
6. Build components and register them under Elements; `PhoneFrame` shows a labeled placeholder until real clips exist.
7. Build the 9 scenes (registered under Scenes) and `BriefPromo` with the inline durations above; replace the template `Composition.tsx`.
8. Start Studio (`npx remotion studio --no-open`) and open the preview.
9. Swap the placeholders for the real clips as they arrive.

### D. Voiceover and finishing
10. User records `public/vo/voiceover.wav`. Transcribe with `@remotion/whisper-webgpu` (`small.en`), or import an SRT if no compatible GPU.
11. Retime scenes to the VO, place `TapRipple`s and callouts, add subtitles.
12. Music bed at ~0.15 volume ducked under VO; SFX pass (≤ 8 cues).
13. `npm run lint`, render stills for review. Final MP4 only on explicit request.
