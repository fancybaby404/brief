// Performance helpers: metrics ring buffer, streaming throttle, job-listing cache policy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { record, summary, resetPerf, formatValue, timer } from '../src/lib/perf.ts';
import { throttle } from '../src/lib/throttle.ts';
import { freshness, jobsCacheKey, JOBS_FRESH_MS, DEFAULT_FILTERS } from '../src/lib/jobs.ts';

test('metrics keep the last 30 samples with median and p90; bad values are ignored', () => {
  resetPerf();
  for (let i = 1; i <= 40; i++) record('llm.ttft', i * 10);
  record('llm.ttft', NaN); record('llm.ttft', -5);
  const [s] = summary();
  assert.deepEqual([s.name, s.count, s.last, s.median, s.p90], ['llm.ttft', 30, 400, 250, 370]);
  assert.equal(formatValue(1530, 'ms'), '1.5 s');
  assert.equal(formatValue(12.345, 'tok/s'), '12.3 tok/s');
  const done = timer('db.load'); done();
  assert.equal(summary().find(x => x.name === 'db.load').count, 1);
  resetPerf();
  assert.deepEqual(summary(), []);
});

test('throttle applies the first update at once, coalesces bursts and never drops the last value', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let clock = 0; const tick = ms => { clock += ms; t.mock.timers.tick(ms); };
  const seen = [];
  const th = throttle(v => seen.push(v), 30, () => clock);
  th('a'); th('b'); th('c'); th('d');
  assert.deepEqual(seen, ['a']);
  tick(30);
  assert.deepEqual(seen, ['a', 'd'], 'only the latest pending value is delivered');
  tick(40);
  th('e'); th('f'); th.cancel(); // 'e' applies immediately (window elapsed); 'f' was pending
  tick(60);
  assert.deepEqual(seen, ['a', 'd', 'e'], 'cancel drops the pending update');
});

test('job listings: freshness window and cache keys follow server-side parameters only', () => {
  const now = 1_000_000_000;
  assert.equal(freshness(undefined, now), 'none');
  assert.equal(freshness(now - 60_000, now), 'fresh');
  assert.equal(freshness(now - JOBS_FRESH_MS - 1, now), 'stale');
  const base = jobsCacheKey('react', DEFAULT_FILTERS);
  assert.equal(jobsCacheKey('react', { ...DEFAULT_FILTERS, type: 'Full-Time', salaryOnly: true, posted: 7, level: 'Senior' }), base, 'on-device filters reuse the same cached response');
  assert.notEqual(jobsCacheKey('react', { ...DEFAULT_FILTERS, geo: 'apac' }), base);
  assert.notEqual(jobsCacheKey('vue', DEFAULT_FILTERS), base);
});
