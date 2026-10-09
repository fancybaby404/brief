import * as SQLite from 'expo-sqlite';
import type { Application, Event, Message, Profile } from '../types';
import { normalizeApplication } from './tracker';
let db: SQLite.SQLiteDatabase;
export async function initializeDb() {
  db = await SQLite.openDatabaseAsync('brief.db');
  // Additive only: IF NOT EXISTS tables/indexes, no rewrites of existing rows.
  // synchronous=NORMAL is the recommended pairing with WAL (durable across app crashes; fewer fsyncs per write).
  await db.execAsync(`PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, payload TEXT NOT NULL, thread TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS messages_by_thread ON messages(thread);
    CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL);`);
}
function instance() { if (!db) throw new Error('Database not initialized'); return db; }
async function getRows<T>(table: 'applications'|'events') {
  const rows = await instance().getAllAsync<{payload:string}>(`SELECT payload FROM ${table} ORDER BY rowid DESC`);
  return rows.map(r=>JSON.parse(r.payload) as T);
}
export const listApplications = async () => (await getRows<Application>('applications')).map(normalizeApplication);
export const listEvents = () => getRows<Event>('events');
/** One thread, oldest first, via the thread index (previously every message was loaded and filtered in JS).
 *  `limit` returns only the newest N (chat history pages in as you scroll up); `offset` skips the newest ones. */
export async function listMessages(thread: string, limit = -1, offset = 0) {
  const rows = await instance().getAllAsync<{payload:string}>('SELECT payload FROM messages WHERE thread=? ORDER BY rowid DESC LIMIT ? OFFSET ?', thread, limit, offset);
  return rows.map(r=>JSON.parse(r.payload) as Message).reverse();
}
/** Every message in threads starting with `prefix` (a job's current and archived mock sessions), oldest first.
 *  A range on the indexed column, so it never scans unrelated chats. */
export async function listThreadMessages(prefix: string) {
  const rows = prefix
    ? await instance().getAllAsync<{payload:string}>('SELECT payload FROM messages WHERE thread>=? AND thread<? ORDER BY rowid', prefix, prefix + '￿')
    // All interview sessions: two index ranges (':' < ';'), not a LIKE scan.
    : await instance().getAllAsync<{payload:string}>("SELECT payload FROM messages WHERE (thread>='mock:' AND thread<'mock;') OR (thread>='practice:' AND thread<'practice;') ORDER BY rowid");
  return rows.map(r=>JSON.parse(r.payload) as Message);
}
export async function saveApplication(a: Application) {
  // REPLACE (new rowid) is deliberate here: the list is "most recently touched first", in memory and after restart.
  await instance().runAsync('INSERT OR REPLACE INTO applications (id,payload,updated_at) VALUES (?,?,?)', a.id,JSON.stringify(a),new Date().toISOString());
}
export async function deleteApplication(id: string) { await instance().runAsync('DELETE FROM applications WHERE id=?',id); }
/** A job and its events go together or not at all. */
export async function deleteApplicationWithEvents(id: string, eventIds: string[]) {
  await instance().withTransactionAsync(async () => {
    for (const e of eventIds) await instance().runAsync('DELETE FROM events WHERE id=?', e);
    await instance().runAsync('DELETE FROM applications WHERE id=?', id);
  });
}
export async function saveEvent(e: Event) { await instance().runAsync('INSERT OR REPLACE INTO events (id,payload) VALUES (?,?)',e.id,JSON.stringify(e)); }
export async function deleteEvent(id: string) { await instance().runAsync('DELETE FROM events WHERE id=?',id); }
/** Moves a finished/abandoned mock session aside so a new one can start; it stays readable as history. One transaction. */
export async function archiveThread(thread: string, archived: string) {
  const ms = await listMessages(thread);
  await instance().withTransactionAsync(async () => {
    for (const m of ms) await instance().runAsync('UPDATE messages SET thread=?, payload=? WHERE id=?', archived, JSON.stringify({ ...m, thread: archived }), m.id);
  });
}
/** Upsert keeps the row (and its position in the conversation) when a message's card is updated.
 *  INSERT OR REPLACE used to delete and re-insert it, moving an updated card to the end after a restart. */
export async function saveMessage(m: Message) {
  await instance().runAsync('INSERT INTO messages (id,payload,thread) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, thread=excluded.thread', m.id, JSON.stringify(m), m.thread);
}
const defaultProfile: Profile = {name:'',skills:'',education:'',experience:'',goals:'',resumeUri:'',resumeText:'',useResumeForAI:false};
export async function getProfile(): Promise<Profile> {
  const x=await instance().getFirstAsync<{value:string}>('SELECT value FROM preferences WHERE key=?','profile');
  return x ? { ...defaultProfile, ...JSON.parse(x.value) } : defaultProfile;
}
export async function saveProfile(p: Profile) { await setPref('profile',JSON.stringify(p)); }
export async function getPref(key:string) { const x=await instance().getFirstAsync<{value:string}>('SELECT value FROM preferences WHERE key=?',key); return x?.value ?? ''; }
export async function setPref(key:string,value:string) { await instance().runAsync('INSERT OR REPLACE INTO preferences(key,value) VALUES (?,?)',key,value); }
/** Small response cache (job listings). Keeps the newest `keep` entries. */
export async function cacheGet<T>(key: string) {
  const x = await instance().getFirstAsync<{payload:string,fetched_at:number}>('SELECT payload, fetched_at FROM cache WHERE key=?', key);
  return x ? { value: JSON.parse(x.payload) as T, fetchedAt: x.fetched_at } : null;
}
export async function cacheSet(key: string, value: unknown, fetchedAt: number, keep = 12) {
  await instance().withTransactionAsync(async () => {
    await instance().runAsync('INSERT OR REPLACE INTO cache (key,payload,fetched_at) VALUES (?,?,?)', key, JSON.stringify(value), fetchedAt);
    await instance().runAsync('DELETE FROM cache WHERE key NOT IN (SELECT key FROM cache ORDER BY fetched_at DESC LIMIT ?)', keep);
  });
}
export function uid(prefix='id') {return prefix+'_'+Date.now()+'_'+Math.floor(Math.random()*999999).toString(36);}
