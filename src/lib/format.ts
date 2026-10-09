// Job description formatting. Descriptions are stored as a tiny text format —
// "## heading", "• bullet", "**bold**", blank line between blocks — so saved jobs,
// OCR text and typed notes all render the same way and stay readable in AI prompts.

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; marker: string; text: string };

const entities: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', bull: '•' };
const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);

export function htmlToText(html: string) {
  const s = html
    .replace(/<li[^>]*>\s*(?:<p[^>]*>)?/gi, '\n\n• ')
    .replace(/(?:<\/p>\s*)?<\/li>/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n## ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|ul|ol|section|article|table|tr)\b[^>]*>/gi, '\n\n')
    .replace(/<(?!\/?(strong|b)\b)[^>]*>/gi, '') // drop links, em, spans… but keep bold
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, inner: string) => { const t = inner.trim(); return t ? inner.replace(t, `**${t}**`) : inner; })
    .replace(/<[^>]*>/g, '');
  // Collapse every horizontal whitespace (incl. NBSP/em spaces) but keep line breaks; drop empty bold pairs.
  // Removed links can leave "region ." — drop spaces before punctuation.
  return blocksToText(textToBlocks(decode(s).replace(/[^\S\n]+/g, ' ').replace(/\*{4}/g, '').replace(/ +([.,;:!?])/g, '$1')));
}

const MD_HEADING = /^#{1,6}\s+(.+)$/;
const BULLET = /^(?:[•·▪●◦‣∙*–—-]|(\d{1,2})[.)])\s+(.+)$/;
const BOLD_ONLY = /^\*\*([^*]+)\*\*\s*:?$/;      // "**Responsibilities**:"
const LABEL = /^([^.!?:*]{2,40}):$/;             // "Requirements:" (short, no sentence punctuation)
const clean = (s: string) => s.replace(/\*\*/g, '').replace(/:\s*$/, '').trim();

export function textToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    let para: string[] = [];
    const flush = () => { if (para.length) blocks.push({ type: 'paragraph', text: para.join('\n') }); para = []; };
    for (const raw of chunk.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      let m: RegExpMatchArray | null;
      if ((m = line.match(MD_HEADING)) || BOLD_ONLY.test(line) || LABEL.test(line)) { flush(); const t = clean(m ? m[1] : line); if (t) blocks.push({ type: 'heading', text: t }); }
      else if ((m = line.match(BULLET))) { flush(); blocks.push({ type: 'bullet', marker: m[1] ? m[1] + '.' : '•', text: m[2].trim() }); }
      else para.push(line);
    }
    flush();
  }
  return blocks;
}

export function blocksToText(blocks: Block[]) {
  return blocks.map((b, i) => {
    const line = b.type === 'heading' ? '## ' + b.text : b.type === 'bullet' ? `${b.marker} ${b.text}` : b.text;
    return (i === 0 ? '' : b.type === 'bullet' && blocks[i - 1].type === 'bullet' ? '\n' : '\n\n') + line;
  }).join('');
}

/** Splits "**bold** rest" into runs. Unbalanced markers are dropped rather than shown. */
export function splitBold(text: string) {
  const parts = text.split('**');
  if (parts.length % 2 === 0) return [{ text: text.replace(/\*\*/g, ''), bold: false }];
  return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter(r => r.text);
}
