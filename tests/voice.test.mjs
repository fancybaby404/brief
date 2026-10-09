// Voice interview core: turn-taking state machine, PCM handling, end-of-speech detection, model integrity,
// offline voice choice, session summaries and the feedback/resume contracts. Pure logic only: real
// microphone, Whisper and TTS behaviour need a device (see MULTIMODAL_AI_VOICE_VERIFICATION.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { voiceReducer, initialVoiceState, canListen } from '../src/lib/voice/machine.ts';
import { base64ToBytes, joinChunks, level, durationMs, Endpointer, cleanTranscript, speakable } from '../src/lib/voice/audio.ts';
import { Sha256 } from '../src/lib/voice/sha256.ts';
import { chooseVoice, STT_MODELS, VAD_MODEL } from '../src/lib/voice/catalog.ts';
import { summarizeSessions, questionsAsked, shouldWrapUp, parseThread, TARGET_QUESTIONS } from '../src/lib/voice/sessions.ts';
import { mockSystem, parseFeedback, feedbackText, parseVisionResume, MOCK_BEGIN, MOCK_FINISH } from '../src/lib/prompts.ts';

const run = (events, s = initialVoiceState()) => events.reduce(voiceReducer, s);

// ---- state machine ----
test('a full voice turn: ready → speaking → listening → transcribing → reviewing → thinking → speaking', () => {
  let s = run([{ type: 'PREPARED' }, { type: 'SPEAK', turn: 0 }, { type: 'PLAYBACK_STARTED', turn: 0 }]);
  assert.equal(s.phase, 'speaking');
  s = run([{ type: 'SPOKEN', turn: 0 }, { type: 'LISTEN' }, { type: 'STOP_LISTENING' }, { type: 'HEARD', text: 'I led a team' }], s);
  assert.deepEqual([s.phase, s.draft], ['reviewing', 'I led a team']);
  s = run([{ type: 'EDIT', text: 'I led a team of four' }, { type: 'SEND' }], s);
  assert.deepEqual([s.phase, s.draft], ['thinking', 'I led a team of four']);
  s = voiceReducer(s, { type: 'REPLY', turn: 1, speak: true });
  assert.deepEqual([s.phase, s.turn, s.draft], ['synthesizing', 1, '']);
  s = voiceReducer(s, { type: 'PLAYBACK_STARTED', turn: 1 });
  assert.equal(s.phase, 'speaking');
});

test('spoken replies stay quiet while synthesizing and only show speaking on actual playback', () => {
  const thinking = run([{ type: 'PREPARED' }, { type: 'SEND', text: 'My answer' }]);
  const preparing = voiceReducer(thinking, { type: 'REPLY', turn: 1, speak: true });
  assert.equal(preparing.phase, 'synthesizing');
  assert.equal(voiceReducer(preparing, { type: 'LISTEN' }), preparing, 'the mic stays closed during synthesis');
  const playing = voiceReducer(preparing, { type: 'PLAYBACK_STARTED', turn: 1 });
  assert.equal(playing.phase, 'speaking');
  assert.equal(voiceReducer(playing, { type: 'PLAYBACK_STARTED', turn: 1 }), playing, 'duplicate playback events do not restart a turn');
  assert.equal(voiceReducer(playing, { type: 'SPOKEN', turn: 1 }).phase, 'ready');
});

test('pause and stop during synthesis invalidate late playback callbacks', () => {
  const thinking = run([{ type: 'PREPARED' }, { type: 'SEND', text: 'My answer' }]);
  const preparing = voiceReducer(thinking, { type: 'REPLY', turn: 1, speak: true });
  const paused = voiceReducer(preparing, { type: 'PAUSE' });
  assert.equal(paused.phase, 'paused');
  assert.equal(voiceReducer(paused, { type: 'PLAYBACK_STARTED', turn: 1 }), paused);
  const stopped = voiceReducer(preparing, { type: 'SPOKEN', turn: 1 });
  assert.equal(stopped.phase, 'ready', 'a user stop returns to the answer-ready state');
});

test('no recording while Brief speaks or thinks; duplicate and stale callbacks are ignored', () => {
  const speaking = run([{ type: 'PREPARED' }, { type: 'SPEAK', turn: 0 }]);
  assert.equal(voiceReducer(speaking, { type: 'LISTEN' }), speaking, 'mic cannot open over the interviewer');
  assert.ok(!canListen('synthesizing') && !canListen('speaking') && !canListen('thinking') && !canListen('transcribing'));
  const listening = run([{ type: 'SPOKEN', turn: 0 }, { type: 'LISTEN' }], speaking);
  assert.equal(voiceReducer(listening, { type: 'LISTEN' }), listening, 'no second recording');
  const thinking = run([{ type: 'STOP_LISTENING' }, { type: 'HEARD', text: 'x' }, { type: 'SEND' }], listening);
  const replied = voiceReducer(thinking, { type: 'REPLY', turn: 1, speak: true });
  assert.equal(voiceReducer(replied, { type: 'REPLY', turn: 1, speak: true }), replied, 'same reply twice is ignored');
  assert.equal(voiceReducer(replied, { type: 'SPOKEN', turn: 0 }), replied, 'a late "done" from the previous question is ignored');
  assert.equal(voiceReducer(replied, { type: 'SPOKEN', turn: 1 }).phase, 'ready');
});

test('silence returns to ready with a notice; empty answers are not sent', () => {
  const s = run([{ type: 'PREPARED' }, { type: 'LISTEN' }, { type: 'STOP_LISTENING' }, { type: 'NOTHING_HEARD', notice: 'I didn’t catch that.' }]);
  assert.deepEqual([s.phase, s.notice], ['ready', 'I didn’t catch that.']);
  const r = run([{ type: 'LISTEN' }, { type: 'STOP_LISTENING' }, { type: 'HEARD', text: '   ' }], s);
  assert.equal(voiceReducer(r, { type: 'SEND' }), r);
});

test('pause, background, resume, replay, end and feedback', () => {
  const speaking = run([{ type: 'PREPARED' }, { type: 'SPEAK', turn: 0 }]);
  const bg = voiceReducer(speaking, { type: 'BACKGROUND' });
  assert.deepEqual([bg.phase, bg.resumeTo], ['paused', 'ready']);
  const ready = voiceReducer(bg, { type: 'RESUME' });
  assert.equal(voiceReducer(ready, { type: 'SPEAK', turn: 0 }).phase, 'synthesizing', 'replay starts in synthesis');
  assert.equal(voiceReducer(voiceReducer(ready, { type: 'SPEAK', turn: 0 }), { type: 'PLAYBACK_STARTED', turn: 0 }).phase, 'speaking', 'playback starts only when audio is audible');
  assert.equal(voiceReducer(ready, { type: 'SPEAK', turn: 3 }), ready, 'cannot speak a question that is not current');
  const reviewing = run([{ type: 'LISTEN' }, { type: 'STOP_LISTENING' }, { type: 'HEARD', text: 'draft' }, { type: 'PAUSE' }, { type: 'RESUME' }], ready);
  assert.deepEqual([reviewing.phase, reviewing.draft], ['reviewing', 'draft'], 'pausing keeps the transcript to correct');
  const ending = voiceReducer(reviewing, { type: 'END' });
  assert.equal(voiceReducer(ending, { type: 'REPLY', turn: 9, speak: true }), ending, 'no new question once ending');
  assert.equal(voiceReducer(ending, { type: 'DONE' }).phase, 'completed');
  const typed = voiceReducer(ready, { type: 'SEND', text: 'typed answer' });
  assert.deepEqual([typed.phase, typed.draft], ['thinking', 'typed answer'], 'text fallback uses the same machine');
});

// ---- audio ----
const pcm = (samples) => { const b = new Uint8Array(samples.length * 2); const v = new DataView(b.buffer); samples.forEach((x, i) => v.setInt16(i * 2, x, true)); return b; };
test('base64 PCM decoding, joining and loudness', () => {
  const bytes = pcm([0, 16384, -16384, 32767]);
  assert.deepEqual(base64ToBytes(Buffer.from(bytes).toString('base64')), bytes);
  assert.equal(new Uint8Array(joinChunks([bytes.subarray(0, 3), bytes.subarray(3)])).length, 8);
  assert.equal(level(pcm([0, 0, 0])), 0);
  assert.ok(Math.abs(level(pcm([16384, -16384])) - 0.5) < 1e-6);
  assert.equal(durationMs(32000), 1000);
});

test('end-of-speech waits for real speech, ignores short pauses and steady noise', () => {
  const e = new Endpointer({ silenceMs: 1800, minSpeechMs: 600, maxMs: 120000, ratio: 3 });
  for (let i = 0; i < 40; i++) assert.equal(e.push(0.008, 100), false, 'quiet room before speaking never ends the turn');
  for (let i = 0; i < 10; i++) e.push(0.2, 100);       // 1 s of speech
  for (let i = 0; i < 10; i++) assert.equal(e.push(0.01, 100), false, 'a 1 s pause mid-answer is fine');
  for (let i = 0; i < 5; i++) e.push(0.2, 100);
  let ended = false;
  for (let i = 0; i < 20 && !ended; i++) ended = e.push(0.01, 100);
  assert.ok(ended && e.heardSpeech, 'ends after ~1.8 s of quiet following speech');
});

test('Whisper silence hallucinations are dropped; replies are cleaned for speech', () => {
  assert.equal(cleanTranscript(' [BLANK_AUDIO] '), '');
  assert.equal(cleanTranscript('Thank you.'), '');
  assert.equal(cleanTranscript('I worked at Acme (music) for two years'), 'I worked at Acme for two years');
  assert.equal(speakable('**Great.**\n- Tell me about React 🙂\nSee https://x.y/z'), 'Great.. Tell me about React. See the link'.replace('..', '.'));
});

// ---- integrity ----
test('SHA-256 matches standard vectors and Node across chunk boundaries', () => {
  assert.equal(new Sha256().update(new Uint8Array()).hex(), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(new Sha256().update(new TextEncoder().encode('abc')).hex(), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const big = new Uint8Array(3 * 1048576 + 77).map((_, i) => (i * 31 + 7) & 255);
  const h = new Sha256();
  for (let i = 0; i < big.length; i += 1048576) h.update(big.subarray(i, i + 1048576));
  assert.equal(h.hex(), createHash('sha256').update(big).digest('hex'));
  for (const m of [...STT_MODELS, VAD_MODEL]) { assert.match(m.sha256, /^[0-9a-f]{64}$/); assert.match(m.url, /\/resolve\/[0-9a-f]{40}\//, 'pinned revision'); }
});

// ---- voices ----
const v = (identifier, language, quality = 'Default', name = identifier) => ({ identifier, name, language, quality });
test('offline voice choice: iOS voices are on-device; Android needs a "-local" voice', () => {
  const ios = chooseVoice([v('com.apple.voice.compact.en-US.Samantha', 'en-US'), v('com.apple.voice.enhanced.en-GB.Daniel', 'en-GB', 'Enhanced'), v('Zarvox', 'en-US', 'Default', 'Zarvox')], 'ios');
  assert.deepEqual([ios.voice.identifier, ios.offline], ['com.apple.voice.enhanced.en-GB.Daniel', 'verified']);
  const and = chooseVoice([v('en-us-x-iom-network', 'en-US', 'Enhanced'), v('en-us-x-tpf-local', 'en-US'), v('fil-ph-x-fie-local', 'fil-PH')], 'android');
  assert.deepEqual([and.voice.identifier, and.offline], ['en-us-x-tpf-local', 'verified']);
  assert.equal(chooseVoice([v('en-US-SMTl01', 'en-US')], 'android').offline, 'unverified', 'other engines are never assumed offline');
  assert.equal(chooseVoice([v('en-us-x-iom-network', 'en-US')], 'android').offline, 'none');
  assert.equal(chooseVoice([v('en-us-x-a-local', 'en-US'), v('en-us-x-b-local', 'en-US')], 'android', 'en-us-x-b-local').voice.identifier, 'en-us-x-b-local');
});

// ---- sessions ----
const msg = (thread, role, content, minute, meta) => ({ id: `${thread}-${minute}`, thread, role, content, createdAt: `2026-10-10T10:${String(minute).padStart(2, '0')}:00.000Z`, ...(meta ? { meta } : {}) });
test('sessions are summarised from saved turns: progress, voice use, duration, feedback', () => {
  const t = 'mock:job1:1700';
  const ms = [msg(t, 'user', MOCK_BEGIN, 0, { mode: 'behavioral' }), msg(t, 'assistant', 'Q1?', 1), msg(t, 'user', 'A1', 3, { via: 'voice' }), msg(t, 'assistant', 'Q2?', 4), msg(t, 'user', 'A2', 6), msg(t, 'user', MOCK_FINISH, 7), msg(t, 'assistant', 'Feedback text', 8)];
  const [s] = summarizeSessions([...ms, msg('general', 'user', 'hi', 1)]);
  assert.deepEqual([s.kind, s.applicationId, s.current, s.mode, s.voice, s.questions, s.answers, s.finished, s.durationMs, s.feedback.content], ['interview', 'job1', false, 'behavioral', true, 2, 2, true, 8 * 60000, 'Feedback text']);
  assert.deepEqual(parseThread('practice:job2'), { kind: 'practice', applicationId: 'job2', current: true });
  assert.equal(questionsAsked(ms), 2);
});

test('a full interview wraps up after the target number of answers; practice does not', () => {
  const t = 'mock:j', ms = [msg(t, 'user', MOCK_BEGIN, 0)];
  for (let i = 1; i <= TARGET_QUESTIONS; i++) ms.push(msg(t, 'assistant', `Q${i}`, i * 2), msg(t, 'user', `A${i}`, i * 2 + 1));
  assert.equal(shouldWrapUp(ms, false), true);
  assert.equal(shouldWrapUp(ms, true), false);
  assert.equal(shouldWrapUp(ms.slice(0, -2), false), false);
});

// ---- prompts ----
const job = { id: 'j', company: 'Acme', title: 'React Developer', status: 'applied', location: '', salary: '', employmentType: '', description: 'React, TypeScript', sourceUrl: '', createdAt: '', appliedAt: null, notes: '' };
const profile = { name: '', skills: 'React', education: '', experience: 'Built a booking app', goals: '', resumeUri: '', resumeText: '', useResumeForAI: false };
test('full interviews defer evaluation; practice evaluates; voice replies are plain sentences', () => {
  const full = mockSystem(profile, job, false, 'technical', undefined, 2, true);
  assert.match(full, /Do NOT evaluate/);
  assert.match(full, /question 3 of about 5/);
  assert.match(full, /say aloud/);
  assert.match(mockSystem(profile, job, false, 'job', 'Tell me about yourself.'), /try again/);
  assert.match(mockSystem(profile, job, false, 'resume'), /resume deep-dive/);
  assert.match(mockSystem(profile, job, false, 'job'), /harder follow-up/);
});

test('feedback JSON is validated (scores in range) and has a readable text form', () => {
  const ok = parseFeedback('{"summary":"Clear answers.","relevance":4,"clarity":3,"completeness":3,"examples":2,"technical":0,"strengths":["Specific project"],"improvements":["Add results"],"betterAnswer":"I built a booking app...","nextSteps":["Practice STAR"]}');
  assert.equal(ok.relevance, 4);
  assert.doesNotMatch(feedbackText(ok), /Technical/, 'technical 0 = not assessed, not shown');
  assert.match(feedbackText(ok), /Relevance 4\/5/);
  assert.equal(parseFeedback('{"summary":"x","relevance":9,"clarity":3,"completeness":3,"examples":2,"technical":0,"strengths":[],"improvements":[]}'), null);
  assert.equal(parseFeedback('not json'), null);
});

test('resume read from an image keeps only what is written', () => {
  const r = parseVisionResume('{"is_resume":true,"name":"Ana","skills":["React","Figma"],"experience":["Developer, Acme, 2023–2025"],"education":[],"goals":"","salary":"₱1M"}');
  assert.deepEqual(r, { isResume: true, name: 'Ana', skills: 'React, Figma', experience: 'Developer, Acme, 2023–2025', education: '', goals: '' });
  assert.equal(parseVisionResume('{"is_resume":false,"name":"","skills":[],"experience":[],"education":[],"goals":""}').isResume, false);
});

test('failures from any live phase, retrying the failed reply, continuing and wrapping up', () => {
  const listening = run([{ type: 'PREPARED' }, { type: 'LISTEN' }]);
  assert.equal(voiceReducer(listening, { type: 'FAILED', error: 'mic' }).phase, 'error');
  const err = run([{ type: 'STOP_LISTENING' }, { type: 'HEARD', text: 'x' }, { type: 'SEND' }, { type: 'FAILED', error: 'model' }], listening);
  assert.equal(voiceReducer(err, { type: 'RETRY', to: 'thinking' }).phase, 'thinking');
  assert.equal(voiceReducer(initialVoiceState(), { type: 'FAILED', error: 'x' }).phase, 'error');
  const ready = run([{ type: 'PREPARED' }]);
  assert.equal(voiceReducer(ready, { type: 'CONTINUE' }).phase, 'thinking');
  const thinking = run([{ type: 'SEND', text: 'last answer' }], ready);
  const wrap = voiceReducer(thinking, { type: 'END' });
  assert.equal(wrap.finishing, true);
  assert.equal(voiceReducer(wrap, { type: 'DONE' }).phase, 'completed');
  const done = voiceReducer(wrap, { type: 'DONE' });
  assert.equal(voiceReducer(done, { type: 'FAILED', error: 'late' }), done, 'nothing changes a completed interview');
});

test('interview requests from Ask Brief: continue, last time, resume deep-dive, topics, image prep', async () => {
  const { ruleIntent } = await import('../src/lib/agent/intent.ts');
  assert.deepEqual(ruleIntent('Continue my previous interview'), { kind: 'resume_interview' });
  assert.deepEqual(ruleIntent('What did I struggle with last time?'), { kind: 'interview_history' });
  assert.equal(ruleIntent('Ask questions based on my resume').mode, 'resume');
  assert.deepEqual(ruleIntent('Ask me technical questions about React.'), { kind: 'practice', mode: 'technical', question: undefined, topic: 'React' });
  assert.equal(ruleIntent('I want to do a mock interview for my Notion application.').kind, 'practice');
  assert.equal(ruleIntent('Practice my Spotify interview.').kind, 'practice');
  assert.equal(ruleIntent('I have an interview for this job.', true).kind, 'import_job');
  assert.equal(ruleIntent('Help me prepare for this job screenshot.', true).kind, 'import_job');
  assert.equal(ruleIntent('I received this message from HR. Help me prepare.', true), null, 'advice from the image');
  assert.equal(ruleIntent('When is my interview?', true).kind, 'image_event');
  assert.equal(ruleIntent('Here is my resume. Interview me based on it.', true).kind, 'import_resume');
  assert.equal(ruleIntent('Does this match my resume?', true), null);
});
