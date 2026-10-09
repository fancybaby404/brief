// Pure-logic tests. Node 24 strips TS types, so these import src modules directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapJobicyJob, jobsUrl, filterByType, DEFAULT_FILTERS } from '../src/lib/jobs.ts';
import { progressBuckets, filterSortApplications, niceAxis, normalizeApplication } from '../src/lib/tracker.ts';
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

test('keeps the provider company logo and tidies multi-region locations', () => {
  const j = mapJobicyJob({ ...jobicy, jobGeo: 'APAC,  EMEA,  USA' });
  assert.equal(j.logo, 'https://x/logo.png');
  assert.equal(j.location, 'APAC, EMEA, USA');
  assert.equal(mapJobicyJob({ ...jobicy, companyLogo: undefined }).logo, '');
});

test('job search defaults to the Philippines and adds keywords', () => {
  assert.equal(DEFAULT_FILTERS.geo, 'philippines');
  assert.equal(jobsUrl('', DEFAULT_FILTERS), 'https://jobicy.com/api/v2/remote-jobs?count=50&geo=philippines');
  assert.equal(jobsUrl(' ux design ', DEFAULT_FILTERS), 'https://jobicy.com/api/v2/remote-jobs?count=50&geo=philippines&tag=ux%20design');
  assert.equal(jobsUrl('', { ...DEFAULT_FILTERS, geo: '' }), 'https://jobicy.com/api/v2/remote-jobs?count=50');
});

test('job type filter matches any listed type, empty means all', () => {
  const jobs = [mapJobicyJob(jobicy), mapJobicyJob({ ...jobicy, id: 2, jobType: ['Part-Time'] })];
  assert.equal(filterByType(jobs, '').length, 2);
  assert.deepEqual(filterByType(jobs, 'Contract').map(j => j.id), ['152819']);
  assert.deepEqual(filterByType(jobs, 'Part-Time').map(j => j.id), ['2']);
});

const app = (over) => ({ id: 'a', company: 'Acme', title: 'Dev', status: 'interested', location: '', salary: '', employmentType: '', description: '', sourceUrl: '', createdAt: '2026-10-01T00:00:00.000Z', appliedAt: null, notes: '', ...over });

test('progress buckets count applied-or-later apps per rolling week, oldest first', () => {
  const now = new Date('2026-10-29T12:00:00Z').getTime();
  const apps = [
    app({ id: '1', status: 'applied', appliedAt: '2026-10-28T00:00:00Z' }), // this week
    app({ id: '2', status: 'interview', appliedAt: '2026-10-27T00:00:00Z' }), // this week
    app({ id: '3', status: 'applied', appliedAt: '2026-10-10T00:00:00Z' }), // 2-3 weeks ago
    app({ id: '5', status: 'interested', createdAt: '2026-10-28T00:00:00Z' }), // not applied: excluded
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
    app({ id: '1', company: 'Zeta', title: 'Designer', status: 'interested', createdAt: '2026-10-03T00:00:00Z' }),
    app({ id: '2', company: 'Acme', title: 'Engineer', status: 'applied', createdAt: '2026-10-01T00:00:00Z' }),
    app({ id: '3', company: 'Mid', title: 'Engineer II', status: 'interview', createdAt: '2026-10-02T00:00:00Z' }),
  ];
  assert.deepEqual(filterSortApplications(apps, '', 'newest').map(a => a.id), ['1', '3', '2']);
  assert.deepEqual(filterSortApplications(apps, '', 'oldest').map(a => a.id), ['2', '3', '1']);
  assert.deepEqual(filterSortApplications(apps, '', 'company').map(a => a.id), ['2', '3', '1']);
  assert.deepEqual(filterSortApplications(apps, 'engineer', 'newest').map(a => a.id), ['3', '2']);
  // status sorts by pipeline order, not alphabetically
  assert.deepEqual(filterSortApplications(apps, '', 'status').map(a => a.status), ['interested', 'applied', 'interview']);
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

test('8-week range gives 8 weekly buckets', () => {
  const now = new Date('2026-10-29T12:00:00Z').getTime();
  const b = progressBuckets([app({ status: 'applied', appliedAt: '2026-09-11T00:00:00Z' })], now, '8w');
  assert.equal(b.length, 8);
  assert.deepEqual(b.map(x => x.count), [0, 1, 0, 0, 0, 0, 0, 0]);
});

test('6-month range buckets by calendar month, oldest first', () => {
  const now = new Date(2026, 9, 29, 12).getTime(); // local Oct 29
  const apps = [
    app({ id: '1', status: 'applied', appliedAt: new Date(2026, 9, 3).toISOString() }),
    app({ id: '2', status: 'offer', appliedAt: new Date(2026, 9, 20).toISOString() }),
    app({ id: '3', status: 'applied', appliedAt: new Date(2026, 4, 15).toISOString() }), // May
    app({ id: '4', status: 'applied', appliedAt: new Date(2026, 3, 15).toISOString() }), // April: out of range
  ];
  const b = progressBuckets(apps, now, '6m');
  assert.deepEqual(b.map(x => x.label), ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
  assert.deepEqual(b.map(x => x.count), [1, 0, 0, 0, 0, 2]);
});

test('niceAxis picks round gridlines with the top at or above the max', () => {
  assert.deepEqual(niceAxis(28), [0, 10, 20, 30]);
  assert.deepEqual(niceAxis(8), [0, 5, 10]);
  assert.deepEqual(niceAxis(2), [0, 1, 2]);
  assert.deepEqual(niceAxis(0), [0, 1, 2, 3]);
  assert.deepEqual(niceAxis(120), [0, 50, 100, 150]);
});

test('Jobicy industry and seniority become tags; "Any" level is skipped', () => {
  assert.deepEqual(mapJobicyJob({ ...jobicy, jobIndustry: ['Customer Support & Success'], jobLevel: 'Midweight' }).tags, ['Customer Support & Success', 'Mid-level']);
  assert.deepEqual(mapJobicyJob({ ...jobicy, jobLevel: 'Entry-Level, Junior' }).tags, ['Engineering', 'Entry-level']);
  assert.deepEqual(mapJobicyJob({ ...jobicy, jobLevel: 'Any' }).tags, ['Engineering']);
  assert.deepEqual(mapJobicyJob({ ...jobicy, jobIndustry: undefined, jobLevel: undefined }).tags, []);
});

test('legacy "saved" applications load as "interested" (the two were merged)', () => {
  assert.equal(normalizeApplication(app({ status: 'saved' })).status, 'interested');
  assert.equal(normalizeApplication(app({ status: 'applied' })).status, 'applied');
});
