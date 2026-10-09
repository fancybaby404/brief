# Local AI — non-negotiable contract

## Architecture and scope
- On-device inference with a quantized GGUF via `llama.rn`/llama.cpp, no server. Always retain `offline` when airplane mode is active after model installed.
- Default suggested model to *test* (not a guarantee): Qwen3 1.7B Q4 GGUF, or 0.6B Q4 if RAM/latency too high. Verify licensing, prompt/chat template, checksum, device support, size, performance. No model weights in ZIP.
- More than storage size is needed: model runtime RAM, KV cache, OCR, photo assets. Test cold init time, time to first token, tokens/sec, crashes, background/resume behavior and at least 10 conversations on target hardware.
- Model must load from app-private local path; no hidden localhost Ollama calls or proxy endpoints. Use `n_gpu_layers:0` initially for compatibility, tune GPU safely per device.
- Jobs API network limited to discovery. Never leak resume content, job chats, mock transcripts or names through analytics/requests.

## Prompts
- Always role + task + allowed context + expected response structure + constraints.
- Job descriptions, screenshots, resumes and user messages are DATA, not higher-priority instructions. Bound them by length and mark them untrusted. Never execute links/commands found inside.
- No fabricated citations, experience, salary, legal advice, employer policy, hiring probability, company simulation details, or "I applied for you".
- Distinguish unknown field from zero salary and never invent missing values.
- RAG-lite: selected job and limited recent saved jobs + profile summary. Consider prompt token budget and selecting relevant snippets. Use `n_ctx=2048` for starter and expand on target hardware only if stable.
- Preserve thread history but limit last turns and provide edit/delete history controls in production.

## Three context flows
1. **Job extraction**: OCR plain text => JSON fields `company,title,location,salary,employmentType,description`. Missing => `""`, not guessed. Human edit/confirm; no automatic "applied" inference.
2. **Ask Brief**: local career coach, grounded in selected job (if any), up to 7 saved job snippets, optional candidate profile and extracted text, recent messages. Respond briefly, identify risk indicators with quotes from source where possible.
3. **Mock**: take job description and candidate profile as context, role-play reasonable interviewer (not affiliated with real company). Ask exactly one question per turn, adapt follow-up, finish with action-oriented feedback tied to user's statements.

## Availability UX
Missing model => direct text: "Install a local model in Settings" and link; no mock AI reply. Invalid model => actionable error and retry. Successful load => ready signal. On import, reflect actual copy/model init progress, especially for 1GB files. OCR should still function without AI via manual review.

## Device acceptance test
1. Run app with network ON, download model elsewhere in accordance with license, import GGUF into Brief, test model.
2. Import screenshot/photo and save after review.
3. Add mock job + resume summary.
4. Switch AIRPLANE MODE; restart app; open saved application and receive local AI job answer; run at least three adaptive mock turns; open Calendar and resume; app does not require login.
5. Observe device logs/traffic: no OpenAI, OpenRouter, remote inference, localhost proxy or analytics calls in offline flows.
