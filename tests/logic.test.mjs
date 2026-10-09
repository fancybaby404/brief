// Pure-logic tests. Node 24 strips TS types, so these import src modules directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapJobicyJob, htmlToText } from '../src/lib/jobs.ts';
import { progressBuckets, filterSortApplications } from '../src/lib/tracker.ts';
import { parseJobExtraction, userContext } from '../src/lib/prompts.ts';

// Shape captured from the live Jobicy v2 API on 2026-10-09.
const jobicy = {
  id: 152819, url: 'https://jobicy.com/jobs/152819-software-engineer', jobSlug: 'x',
  jobTitle: 'Software Engineer', companyName: 'Bayesian Health', companyLogo: 'https://x/logo.png',
  jobIndustry: ['Engineering'], jobType: ['Full-Time', 'Contract'], jobGeo: 'USA', jobLevel: 'Any',
  jobExcerpt: 'short', jobDescription: '<h3><strong>About us</strong></h3><p>We build&nbsp;tools &amp; things &#8217;n stuff.</p><ul><li>One</li><li>Two</li></ul>',
  pubDate: '2026-10-09T02:55:10+00:00',
};

test('maps Jobicy job type arrays to a readable string', () => {
  assert.equal(mapJobicyJob(jobicy).employmentType, 'Full-Time, Contract');
});

test('maps Jobicy salary fields with currency and period', () => {
  const j = mapJobicyJob({ ...jobicy, salaryMin: 123000, salaryMax: 142375, salaryCurrency: 'EUR', salaryPeriod: 'yearly' });
  assert.equal(j.salary, '123,000–142,375 EUR / year');
});

test('missing salary stays empty instead of an invented value', () => {
  assert.equal(mapJobicyJob(jobicy).salary, '');
});

test('keeps canonical Jobicy URL, id, title, company and geography', () => {
  const j = mapJobicyJob(jobicy);
  assert.deepEqual([j.id, j.url, j.title, j.company, j.location], ['152819', jobicy.url, 'Software Engineer', 'Bayesian Health', 'USA']);
});

test('htmlToText keeps paragraph/list structure and decodes entities', () => {
  assert.equal(htmlToText(jobicy.jobDescription), 'About us\nWe build tools & things ’n stuff.\n• One\n• Two');
});

const app = (over) => ({ id: 'a', company: 'Acme', title: 'Dev', status: 'saved', location: '', salary: '', employmentType: '', description: '', sourceUrl: '', createdAt: '2026-10-01T00:00:00.000Z', appliedAt: null, notes: '', ...over });

test('progress buckets count applied-or-later apps per rolling week, oldest first', () => {
  const now = new Date('2026-10-29T12:00:00Z').getTime();
  const apps = [
    app({ id: '1', status: 'applied', appliedAt: '2026-10-28T00:00:00Z' }), // this week
    app({ id: '2', status: 'interview', appliedAt: '2026-10-27T00:00:00Z' }), // this week
    app({ id: '3', status: 'applied', appliedAt: '2026-10-10T00:00:00Z' }), // 2-3 weeks ago
    app({ id: '4', status: 'saved', createdAt: '2026-10-28T00:00:00Z' }), // not applied: excluded
    app({ id: '5', status: 'interested', createdAt: '2026-10-28T00:00:00Z' }), // excluded
    app({ id: '6', status: 'applied', appliedAt: '2026-09-01T00:00:00Z' }), // older than 4 weeks
  ];
  assert.deepEqual(progressBuckets(apps, now).map(b => b.count), [0, 1, 0, 2]);
});

test('progress buckets label each week by its start date', () => {
  const now = new Date('2026-10-29T12:00:00Z').getTime();
  assert.deepEqual(progressBuckets([], now).map(b => b.label), ['Oct 1', 'Oct 8', 'Oct 15', 'Oct 22']);
});

test('filterSortApplications searches company+title and sorts', () => {
  const apps = [
    app({ id: '1', company: 'Zeta', title: 'Designer', status: 'saved', createdAt: '2026-10-03T00:00:00Z' }),
    app({ id: '2', company: 'Acme', title: 'Engineer', status: 'applied', createdAt: '2026-10-01T00:00:00Z' }),
    app({ id: '3', company: 'Mid', title: 'Engineer II', status: 'interview', createdAt: '2026-10-02T00:00:00Z' }),
  ];
  assert.deepEqual(filterSortApplications(apps, '', 'newest').map(a => a.id), ['1', '3', '2']);
  assert.deepEqual(filterSortApplications(apps, '', 'oldest').map(a => a.id), ['2', '3', '1']);
  assert.deepEqual(filterSortApplications(apps, '', 'company').map(a => a.id), ['2', '3', '1']);
  assert.deepEqual(filterSortApplications(apps, 'engineer', 'newest').map(a => a.id), ['3', '2']);
  // status sorts by pipeline order, not alphabetically
  assert.deepEqual(filterSortApplications(apps, '', 'status').map(a => a.status), ['saved', 'applied', 'interview']);
});

test('parseJobExtraction reads the JSON object and drops unknown keys', () => {
  const raw = 'Sure!\n{"company":"Acme","title":"Dev","location":"Manila","salary":"","employmentType":"Full-time","description":"Build","status":"applied","url":"http://evil"}';
  assert.deepEqual(parseJobExtraction(raw, 'ocr text'), { company: 'Acme', title: 'Dev', location: 'Manila', salary: '', employmentType: 'Full-time', description: 'Build' });
});

test('parseJobExtraction falls back to OCR text for an empty description', () => {
  assert.equal(parseJobExtraction('{"company":"A","title":"B"}', 'raw ocr').description, 'raw ocr');
});

test('parseJobExtraction rejects malformed output so the user enters fields manually', () => {
  assert.throws(() => parseJobExtraction('no json here', 'x'), /manually/);
  assert.throws(() => parseJobExtraction('{"company": "A",', 'x'), /manually/);
});

const profile = { name: 'N', skills: 'React', education: '', experience: '2y', goals: '', resumeUri: 'file://r.pdf', resumeText: 'RESUME BODY', useResumeForAI: false };

test('userContext only includes resume text when the user allows it', () => {
  assert.ok(!userContext(profile).includes('RESUME BODY'));
  assert.ok(userContext({ ...profile, useResumeForAI: true }).includes('RESUME BODY'));
});

test('userContext clamps long resume text', () => {
  const ctx = userContext({ ...profile, useResumeForAI: true, resumeText: 'x'.repeat(50000) });
  assert.ok(ctx.length < 2000, String(ctx.length));
});
