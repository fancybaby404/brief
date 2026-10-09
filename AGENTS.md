# Brief agent instructions (always on)

This repo builds **Brief**, a privacy-first React Native/Expo iOS-style job tracker with offline local AI. The detailed specifications are in `docs/`. Never rename the product or replace the supplied mascot.

## Every new session
1. Read `README.md`, `docs/INDEX.md`, and `docs/product/SCREEN_INVENTORY.md` before editing code.
2. For relevant work read `docs/design/DESIGN_SYSTEM.md`, `docs/architecture/ARCHITECTURE.md`, `docs/ai/LOCAL_AI.md`, `docs/qa/ACCEPTANCE_TESTS.md`, `docs/product/USER_JOURNEYS.md`. Check `design/references/current/` visually. Read the uploaded Apple design reference `docs/design/apple-design-reference.md` when changing interaction patterns.
3. Check `.claude/skills/` for Matt Pocock setup, implementation/TDD/design skills plus Ponytail. If missing, tell the user and run `bash scripts/install-agent-skills.sh` if network access and consent allow. After install, execute relevant skill workflow. Do not claim skills installed without verifying on disk.
4. Follow `prompts/INITIAL_PROMPT.md` for the full implementation workflow.

## Engineering guardrails
- On-device means ON-DEVICE: no hosted inference, proxy model, remote speech recognition, or hidden network fallback. If a model is not installed, show explicit installation affordance and retain non-AI features.
- Job discovery may use the documented Jobicy API; saved jobs, tracking, chat, and mock must work offline once the model exists.
- No fake success states: opening a listing != applying for the job; importing a screenshot != actual application; static mock UI != working model.
- Keep source paths and responsibilities clear, code focused, type-safe, and tested. Prefer the smallest solution and brief progress reporting (Ponytail).
- Design: white/light blue, #1677F2 accent, native SF system typography, separated floating bottom bar and blue add button, arm-free HAPPY.png mascot, concise copy, no four-color analytics tiles, restrained animation, reduced-motion support.
- Respect privacy. Never commit user resumes, private keys, .gguf models, or test personal information. Never log resume text or chat prompts in production.
- No direct `npm install` version guessing: use `npx expo install` to align Expo-compatible native package versions, `npx expo-doctor` after changes, and test on a development build rather than Expo Go.
- Before finishing any feature: verify screen navigation, empty/loading/error/offline states, save/relaunch persistence, device safe areas, keyboard overlap, accessibility targets, and typecheck.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (fancybaby404/brief), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Verification
- `npx tsc --noEmit` and `npm test`. After changing a model catalog, run `CHECK_MODEL_SOURCES=1 npm test` to compare the pinned sizes with Hugging Face.
