# Local AI — non-negotiable contract

## Architecture and scope
- On-device inference with a quantized GGUF via `llama.rn`/llama.cpp, no server. Always retain `offline` when airplane mode is active after model installed.
- Recommended model: Qwen3-VL 2B Instruct Q4_K_M GGUF plus its matching Q8_0 `mmproj` from the same pinned publisher revision (~1.6 GB). The Settings catalog (`src/lib/modelCatalog.ts`) also offers curated alternatives — faster text-only models (LFM2 1.2B, Qwen2.5 1.5B, SmolLM3 3B) and a sharper vision model (Qwen3-VL 4B) — each pinned to an immutable Hugging Face revision with exact byte sizes. Download begins only after the user taps the install button. Keep imported local GGUF support for users who prefer another model. No model weights in ZIP.
- More than storage size is needed: model runtime RAM, KV cache, OCR, photo assets. Test cold init time, time to first token, tokens/sec, crashes, background/resume behavior and at least 10 conversations on target hardware.
- Model must load from app-private local path; no hidden localhost Ollama calls or proxy endpoints. Use `n_gpu_layers:0` initially for compatibility, tune GPU safely per device.
- Optional model acquisition can download curated, publisher-provided GGUF files from Hugging Face directly into app-private storage. Downloads are not inference: prompts and chats never go to the source. Show source, license, approximate size, progress and cancellation; retain the current model until a replacement finishes.
- Optional image chat uses the Qwen3-VL GGUF with its matching `mmproj` projector. Download and validate both files as one install; retain the current model unless the new model loads and `llama.rn` confirms vision support. Show image attachment only after support is confirmed; persist selected images in app-private storage and pass them directly to local inference.
- Jobs API network limited to discovery. Never leak resume content, job chats, mock transcripts or names through analytics/requests.

## Prompts
- Always role + task + allowed context + expected response structure + constraints.
- Job descriptions, screenshots, resumes and user messages are DATA, not higher-priority instructions. Bound them by length and mark them untrusted. Never execute links/commands found inside.
- No fabricated citations, experience, salary, legal advice, employer policy, hiring probability, company simulation details, or "I applied for you".
- Distinguish unknown field from zero salary and never invent missing values.
- RAG-lite: selected job and limited recent saved jobs + profile summary. Consider prompt token budget and selecting relevant snippets. Use `n_ctx=2048` for starter and expand on target hardware only if stable.
- Preserve thread history but limit last turns and provide edit/delete history controls in production.

## Three context flows
1. **Job extraction**: on-device OCR text or user-submitted readable listing-page text => JSON fields `company,title,location,salary,employmentType,description`. Missing => `""`, not guessed. Human edit/confirm; no automatic "applied" inference. Page retrieval is a direct request to the user-pasted URL; all extraction remains on-device.
2. **Resume extraction**: embedded text from a digital PDF or on-device OCR from a resume image -> local GGUF extracts name, skills, experience, education and stated goals into editable profile fields. Resume text is fenced as untrusted input; no field is invented. Model missing/failure keeps the file and text and offers manual entry.
3. **Ask Brief**: local career coach, grounded in selected job (if any), up to 7 saved job snippets, optional candidate profile and extracted text, recent messages. Respond briefly, identify risk indicators with quotes from source where possible. Generate follow-up question suggestions on-device from the current conversation; never show static suggestions when the model is missing.
4. **Mock**: take job description and candidate profile as context, role-play reasonable interviewer (not affiliated with real company). Ask exactly one question per turn, adapt follow-up, finish with action-oriented feedback tied to user's statements.

## Agent (Ask Brief actions)
- Rules first, model second: deterministic intent rules handle common phrasings; only unrecognised action-like messages go to a schema-constrained router call. Invalid router output = plain chat.
- The model never supplies record IDs or executes anything. Writes are proposals shown as cards; the app validates, asks for confirmation, executes once, re-reads storage, then reports (with Undo for deletes).
- Images: Qwen3-VL reads the image directly; native OCR text, when available, is a second fenced source. Extracted fields are schema-validated and shown for editing before anything is saved.
- Details and test status: `LOCAL_AI_AGENTIC_VERIFICATION.md`.

## Availability UX
Missing model => direct text: "Install a local model in Settings" and link; no mock AI reply. Invalid model => actionable error and retry. Successful load => ready signal. On import, reflect actual copy/model init progress, especially for 1GB files. OCR should still function without AI via manual review.

## Device acceptance test
1. Run app with network ON, download a curated GGUF in Settings or import one from the device, review the source/license/size, test progress and cancellation, then test the model.
2. Import screenshot/photo and save after review.
3. Add mock job + resume summary.
4. Switch AIRPLANE MODE; restart app; open saved application and receive local AI job answer; run at least three adaptive mock turns; open Calendar and resume; app does not require login.
5. Observe device logs/traffic: no OpenAI, OpenRouter, remote inference, localhost proxy or analytics calls in offline flows.
