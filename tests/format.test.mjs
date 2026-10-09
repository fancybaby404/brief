import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, textToBlocks, splitBold } from '../src/lib/format.ts';

// Patterns captured from live Jobicy descriptions (2026-10-09).
const jobicyHtml = `<h3><strong>About us</strong></h3>
<p>We build&nbsp;tools &#038; things &#8217;n stuff.<br>Second line.</p>
<p><strong>Responsibilities</strong>:</p>
<p>·         Answer inbound calls in a timely manner </p>
<p>·         Provide superior customer service </p>
<h2>What you'll bring</h2>
<ul><li><strong>Experience:</strong> 2+ years in <a href="https://x">support</a></li><li><p>Clear <em>written</em> English</p></li></ul>
<p><strong></strong></p><div>Apply via the listing.</div>`;

test('htmlToText produces clean headings, bullets, paragraphs and bold labels', () => {
  assert.equal(htmlToText(jobicyHtml), [
    '## About us',
    'We build tools & things ’n stuff.\nSecond line.',
    '## Responsibilities',
    '• Answer inbound calls in a timely manner\n• Provide superior customer service',
    "## What you'll bring",
    '• **Experience:** 2+ years in support\n• Clear written English',
    'Apply via the listing.',
  ].join('\n\n'));
});

test('textToBlocks types each block for rendering', () => {
  assert.deepEqual(textToBlocks(htmlToText(jobicyHtml)).map(b => b.type), ['heading', 'paragraph', 'heading', 'bullet', 'bullet', 'heading', 'bullet', 'bullet', 'paragraph']);
});

test('textToBlocks also tidies plain OCR or typed descriptions', () => {
  const ocr = 'Customer Support Agent\nRequirements:\n- English fluency\n- Night shift\n2) Own laptop\n\nSend your CV today.';
  assert.deepEqual(textToBlocks(ocr), [
    { type: 'paragraph', text: 'Customer Support Agent' },
    { type: 'heading', text: 'Requirements' },
    { type: 'bullet', marker: '•', text: 'English fluency' },
    { type: 'bullet', marker: '•', text: 'Night shift' },
    { type: 'bullet', marker: '2.', text: 'Own laptop' },
    { type: 'paragraph', text: 'Send your CV today.' },
  ]);
});

test('a sentence ending in a colon is not mistaken for a heading', () => {
  assert.equal(textToBlocks('Please send the following documents to our office before Friday:')[0].type, 'paragraph');
});

test('splitBold returns bold and plain runs', () => {
  assert.deepEqual(splitBold('**Experience:** 2+ years'), [{ text: 'Experience:', bold: true }, { text: ' 2+ years', bold: false }]);
  assert.deepEqual(splitBold('no bold'), [{ text: 'no bold', bold: false }]);
});

test('collapses unusual Unicode spaces between words', () => {
  assert.equal(htmlToText('<p>settings.  Language  Services</p>'), 'settings. Language Services');
});

test('no stray space before punctuation after a removed link', () => {
  assert.equal(htmlToText('<p>Hiring in the APAC region <a href="x"></a>. Apply now , today!</p>'), 'Hiring in the APAC region. Apply now, today!');
});
