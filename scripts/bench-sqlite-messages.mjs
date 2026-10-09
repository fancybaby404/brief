// Desktop benchmark (Node 22.5+ node:sqlite): old vs new chat-history queries on 20k synthetic messages.
// Run: node scripts/bench-sqlite-messages.mjs  — relative numbers only; phone timings come from Settings → Diagnostics.
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE messages (id TEXT PRIMARY KEY, payload TEXT NOT NULL, thread TEXT NOT NULL);`);
const threads = ['general', ...Array.from({ length: 40 }, (_, i) => `job:app_${i}`), ...Array.from({ length: 60 }, (_, i) => `mock:app_${i % 40}${i >= 40 ? ':17' + i : ''}`)];
const ins = db.prepare('INSERT INTO messages (id,payload,thread) VALUES (?,?,?)');
const body = 'x'.repeat(400);
db.exec('BEGIN'); for (let i = 0; i < 20000; i++) { const t = threads[i % threads.length]; ins.run('m' + i, JSON.stringify({ id: 'm' + i, thread: t, role: i % 2 ? 'user' : 'assistant', content: body, createdAt: new Date(1e12 + i).toISOString() }), t); } db.exec('COMMIT');
const time = (label, fn, n = 30) => { fn(); const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); const ms = (performance.now() - t0) / n; console.log(label.padEnd(58), ms.toFixed(2), 'ms'); return ms; };
// Before: listMessages / listThreadMessages loaded every row, parsed all JSON, filtered in JS.
const old = (t) => db.prepare('SELECT payload FROM messages ORDER BY rowid DESC').all().map(r => JSON.parse(r.payload)).filter(m => m.thread === t).reverse();
const oldPrefix = (p) => db.prepare('SELECT payload FROM messages ORDER BY rowid DESC').all().map(r => JSON.parse(r.payload)).filter(m => m.thread.startsWith(p)).reverse();
const a = time('BEFORE open a chat thread (scan + parse all)', () => old('job:app_7'));
const b = time('BEFORE agent session lookup mock:app_7 (scan + parse all)', () => oldPrefix('mock:app_7'));
db.exec('CREATE INDEX messages_by_thread ON messages(thread)');
const neu = (t, limit = 60) => db.prepare('SELECT payload FROM messages WHERE thread=? ORDER BY rowid DESC LIMIT ?').all(t, limit).map(r => JSON.parse(r.payload)).reverse();
const neuPrefix = (p) => db.prepare('SELECT payload FROM messages WHERE thread>=? AND thread<? ORDER BY rowid').all(p, p + '￿').map(r => JSON.parse(r.payload));
const c = time('AFTER open a chat thread (index, newest 60)', () => neu('job:app_7'));
const d = time('AFTER agent session lookup (index range)', () => neuPrefix('mock:app_7'));
console.log(`speedup: thread ${(a / c).toFixed(0)}x, sessions ${(b / d).toFixed(0)}x; rows ${db.prepare('SELECT count(*) n FROM messages').get().n}, thread size ${old('job:app_7').length}`);
console.log('plan:', JSON.stringify(db.prepare("EXPLAIN QUERY PLAN SELECT payload FROM messages WHERE thread=? ORDER BY rowid DESC LIMIT 60").all('x').map(r => r.detail)));
