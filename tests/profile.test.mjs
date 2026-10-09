import test from 'node:test';
import assert from 'node:assert/strict';
import { listItems, hasProfileDetails } from '../src/lib/profile.ts';

test('listItems splits lines, semicolons and bullets, trimming list markers', () => {
  assert.deepEqual(listItems('• 3 yrs support at Acme\n- Team lead; QA basics'), ['3 yrs support at Acme', 'Team lead', 'QA basics']);
});

test('listItems splits skills on commas only when asked, and caps the count', () => {
  assert.deepEqual(listItems('React, TypeScript, Figma, SQL', 3, true), ['React', 'TypeScript', 'Figma']);
  assert.deepEqual(listItems('Led 3 teams, shipped 2 apps'), ['Led 3 teams, shipped 2 apps']);
  assert.deepEqual(listItems('   '), []);
});

test('hasProfileDetails is true once any resume detail or file exists', () => {
  const empty = { name: '', skills: '', education: '', experience: '', goals: '', resumeUri: '', resumeText: '', useResumeForAI: false };
  assert.equal(hasProfileDetails(empty), false);
  assert.equal(hasProfileDetails({ ...empty, name: 'Ana' }), false); // a name alone is not resume content
  assert.equal(hasProfileDetails({ ...empty, skills: 'Excel' }), true);
  assert.equal(hasProfileDetails({ ...empty, resumeUri: 'file:///r.pdf' }), true);
});
