// Application detail logic: status history, activity, next actions, events and the description summary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { trackStatus, buildActivity, nextActions, isApplied, statusSince, STATUS_ORDER, STATUS_LABEL } from '../src/lib/tracker.ts';
import { suggestTitle, defaultKind, findDuplicate, reminderAt, toLocalIso, upcomingFor, kindOf } from '../src/lib/events.ts';
import { jobSummary } from '../src/lib/format.ts';

const app = (over) => ({ id: 'a', company: 'Acme', title: 'Dev', status: 'interested', location: '', salary: '', employmentType: '', description: '', sourceUrl: '', createdAt: '2026-10-01T00:00:00.000Z', appliedAt: null, notes: '', ...over });
const ev = (over) => ({ id: 'e', applicationId: 'a', title: 'Interview', date: '2026-10-14T10:00:00', notes: '', ...over });

test('every status has a label, including withdrawn', () => {
  assert.deepEqual(STATUS_ORDER.map(s => STATUS_LABEL[s]), ['Interested', 'Applied', 'In review', 'Interview', 'Offer', 'Not selected', 'Withdrawn']);
});

test('trackStatus records the move and sets the applied date once', () => {
  const prev = app();
  const next = trackStatus(prev, { ...prev, status: 'applied' }, '2026-10-02T09:00:00.000Z');
  assert.equal(next.appliedAt, '2026-10-02T09:00:00.000Z');
  assert.deepEqual(next.activity, [{ at: '2026-10-02T09:00:00.000Z', from: 'interested', to: 'applied' }]);
  const later = trackStatus(next, { ...next, status: 'interview' }, '2026-10-09T09:00:00.000Z');
  assert.equal(later.appliedAt, '2026-10-02T09:00:00.000Z');
  assert.equal(later.activity.length, 2);
});

test('trackStatus ignores unchanged status and brand-new applications', () => {
  const a = app({ notes: 'x' });
  assert.equal(trackStatus(a, { ...a, notes: 'y' }).activity, undefined);
  assert.equal(trackStatus(undefined, a).activity, undefined);
});

test('a quick change of mind rewrites the last entry instead of piling up', () => {
  const a = trackStatus(app(), { ...app(), status: 'applied' }, '2026-10-02T09:00:00.000Z');
  const fixed = trackStatus(a, { ...a, status: 'under_review' }, '2026-10-02T09:00:20.000Z');
  assert.deepEqual(fixed.activity, [{ at: '2026-10-02T09:00:20.000Z', from: 'interested', to: 'under_review' }]);
  const undone = trackStatus(a, { ...a, status: 'interested' }, '2026-10-02T09:00:20.000Z');
  assert.deepEqual(undone.activity, []);
  assert.equal(undone.appliedAt, null);
  assert.equal(isApplied(undone), false);
  assert.deepEqual(buildActivity(undone, []).map(i => i.kind), ['saved']);
});

test('withdrawing or not-selected from Interested does not invent an applied date', () => {
  const w = trackStatus(app(), { ...app(), status: 'withdrawn' }, '2026-10-02T09:00:00.000Z');
  assert.equal(w.appliedAt, null);
  assert.equal(isApplied(w), false);
  assert.equal(isApplied(app({ status: 'withdrawn', appliedAt: '2026-10-01T00:00:00Z' })), true);
  assert.equal(isApplied(app({ status: 'rejected' })), true);
});

test('activity is newest first and includes saved, status moves, legacy applied date and linked events', () => {
  const a = app({ activity: [{ at: '2026-10-03T00:00:00.000Z', from: 'interested', to: 'applied' }] });
  const items = buildActivity(a, [ev({ createdAt: '2026-10-05T00:00:00.000Z' }), ev({ id: 'other', applicationId: 'b' })]);
  assert.deepEqual(items.map(i => i.kind), ['event', 'status', 'saved']);
  const legacy = buildActivity(app({ status: 'interview', appliedAt: '2026-10-04T00:00:00.000Z' }), []);
  assert.deepEqual(legacy.map(i => [i.kind, i.status]), [['status', 'applied'], ['saved', undefined]]);
});

test('statusSince uses the last change, then applied date, then saved date', () => {
  assert.equal(statusSince(app()), '2026-10-01T00:00:00.000Z');
  assert.equal(statusSince(app({ status: 'applied', appliedAt: '2026-10-04T00:00:00Z' })), '2026-10-04T00:00:00Z');
  assert.equal(statusSince(app({ activity: [{ at: '2026-10-06T00:00:00Z', from: 'applied', to: 'interview' }] })), '2026-10-06T00:00:00Z');
});

test('next actions fit the stage; closed applications get none', () => {
  const o = { hasPosting: true, hasInterview: false };
  assert.deepEqual(nextActions('interested', o), ['mark_applied', 'deadline', 'open_posting']);
  assert.deepEqual(nextActions('interested', { ...o, hasPosting: false }), ['mark_applied', 'deadline']);
  assert.deepEqual(nextActions('interview', o), ['schedule_interview', 'practice']);
  assert.deepEqual(nextActions('interview', { ...o, hasInterview: true }), ['practice']);
  assert.deepEqual(nextActions('rejected', o), []);
  assert.deepEqual(nextActions('withdrawn', o), []);
});

test('event titles are suggested from the job and the kind follows the stage', () => {
  assert.equal(suggestTitle('interview', app()), 'Interview with Acme');
  assert.equal(suggestTitle('follow_up', app({ company: ' ' })), 'Follow up with Dev');
  assert.equal(suggestTitle('other', null), '');
  assert.equal(defaultKind('applied'), 'follow_up');
  assert.equal(defaultKind('interview'), 'interview');
  assert.equal(kindOf({}), 'other');
});

test('findDuplicate matches same job, kind and minute but not the event being edited', () => {
  const existing = [ev({ kind: 'interview' })];
  assert.ok(findDuplicate(existing, { id: 'new', applicationId: 'a', kind: 'interview', date: '2026-10-14T10:00:00' }));
  assert.equal(findDuplicate(existing, { id: 'e', applicationId: 'a', kind: 'interview', date: '2026-10-14T10:00:00' }), undefined);
  assert.equal(findDuplicate(existing, { id: 'new', applicationId: 'a', kind: 'follow_up', date: '2026-10-14T10:00:00' }), undefined);
  assert.equal(findDuplicate(existing, { id: 'new', applicationId: 'a', kind: 'interview', date: '2026-10-14T11:00:00' }), undefined);
});

test('reminders fire before the event and never in the past', () => {
  const now = new Date(2026, 9, 14, 8, 0).getTime();
  assert.equal(reminderAt({ date: '2026-10-14T10:00:00', reminderMinutes: 60 }, now).getTime(), new Date(2026, 9, 14, 9, 0).getTime());
  assert.equal(reminderAt({ date: '2026-10-14T10:00:00', reminderMinutes: 1440 }, now), null);
  assert.equal(reminderAt({ date: '2026-10-14T10:00:00', reminderMinutes: null }, now), null);
});

test('toLocalIso keeps local wall-clock time and upcomingFor sorts this job only', () => {
  assert.equal(toLocalIso(new Date(2026, 9, 4, 9, 5)), '2026-10-04T09:05:00');
  const now = new Date(2026, 9, 10).getTime();
  const list = [ev({ id: '2', date: '2026-10-20T10:00:00' }), ev({ id: '1', date: '2026-10-12T10:00:00' }), ev({ id: 'past', date: '2026-10-01T10:00:00' }), ev({ id: 'x', applicationId: 'b', date: '2026-10-12T10:00:00' })];
  assert.deepEqual(upcomingFor(list, 'a', now).map(e => e.id), ['1', '2']);
});

test('jobSummary gives an overview and real responsibilities/requirements only', () => {
  const text = '## About us\n\nWe build tools.\n\nSmall team.\n\n## Responsibilities\n\n• One\n• Two\n• Three\n• Four\n• Five\n\n## Requirements\n\n• React\n\n## Benefits\n\n• Remote';
  const s = jobSummary(text);
  assert.equal(s.overview, 'We build tools.\n\nSmall team.');
  assert.deepEqual(s.highlights, [{ title: 'Responsibilities', items: ['One', 'Two', 'Three', 'Four'], more: 1 }, { title: 'Requirements', items: ['React'], more: 0 }]);
  assert.deepEqual(jobSummary('Just one paragraph.'), { overview: 'Just one paragraph.', highlights: [] });
  assert.deepEqual(jobSummary(''), { overview: '', highlights: [] });
});
