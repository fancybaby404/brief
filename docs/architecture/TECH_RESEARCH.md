# Technical research and install references (checked October 9, 2026)

## Expo
- Expo SDK 57 (RN 0.86, React 19.2.3, Node >=22.13): https://docs.expo.dev/versions/latest/ and https://expo.dev/changelog/sdk-57
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo DocumentPicker: https://docs.expo.dev/versions/latest/sdk/document-picker/
- Use `npx expo install` for native module compatible versions and an actual native dev build.

## AI and OCR
- `llama.rn`: https://github.com/mybigday/llama.rn (initLlama, completion with messages; Expo config, GGUF loading)
- `expo-ocr-kit`: https://github.com/ManojKanth/expo-ocr-kit (Vision iOS, ML Kit Android, `recognizeText(uri)`; Expo dev build)
- `expo-pdf-text-extract`: https://github.com/gr8pathik/expo-pdf-text-extract (native digital PDF text, not scanned PDFs)
- `react-native-pdf`: https://github.com/wonday/react-native-pdf (real PDF previews, extra native setup; not yet included)

## Job provider
- Jobicy public REST: https://jobicy.com/jobs-rss-feed and https://github.com/Jobicy/remote-jobs-api
- No key for public remote listings, bounded recent publication window, fair-use and rate limits; keep provider canonical URL. Optional original ATS URLs may require paid/commercial API. This is NOT a Philippines-wide job database.
- Adzuna alternative (requires app_id/app_key, keep keys on backend not shipped in mobile): https://developer.adzuna.com/overview

## Exchange rates
- Frankfurter (ECB reference rates, ~30 currencies incl. PHP): https://frankfurter.dev — `GET /v1/latest?base=EUR`, no API key. Checked 2026-10-09.

## Agent skills
- Matt Pocock engineering skills: https://github.com/mattpocock/skills ; install with skills.sh, select `setup-matt-pocock-skills`, design/tdd/implement/qa workflows. A plugin alternative exists; do not install BOTH plugin and copied skills for the same agent.
- Ponytail & Caveman: https://github.com/DietrichGebert/ponytail ; installer docs https://github.com/DietrichGebert/ponytail/blob/main/INSTALL.md . Ponytail = simpler code, Caveman = terse explanations.
- Vercel skills CLI: https://github.com/vercel-labs/skills ; `-a claude-code --copy -s ... -y` supported. Use `bash scripts/install-agent-skills.sh`, then verify presence under `.claude/skills` and run `/setup-matt-pocock-skills` in Claude Code.

## Prompt engineering
- OpenAI API prompting: https://developers.openai.com/api/docs/guides/prompt-engineering — clear instructions, grounding, explicit success criteria, context and tests.
- OpenAI on lean skills/AGENTS: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra — avoid duplicated instructions/overstuffed agent context. Keep always-on agent guidance lean, specific specs in separate docs.
- Matt Pocock workflow recommends grill/spec/implement/test/review; use it to clarify genuinely missing details, **not** to reopen agreed UI requirements.
