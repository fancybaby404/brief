import * as SQLite from 'expo-sqlite';
import type { Application, Event, Message, Profile } from '../types';
let db: SQLite.SQLiteDatabase;
export async function initializeDb() {
  db = await SQLite.openDatabaseAsync('brief.db');
  await db.execAsync(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, payload TEXT NOT NULL, thread TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
}
function instance() { if (!db) throw new Error('Database not initialized'); return db; }
async function getRows<T>(table: 'applications'|'events'|'messages') {
  const rows = await instance().getAllAsync<{payload:string}>(`SELECT payload FROM ${table} ORDER BY rowid DESC`);
  return rows.map(r=>JSON.parse(r.payload) as T);
}
export const listApplications = () => getRows<Application>('applications');
export const listEvents = () => getRows<Event>('events');
export const listMessages = async (thread: string) => (await getRows<Message>('messages')).filter(m=>m.thread===thread).reverse();
export async function saveApplication(a: Application) {
  await instance().runAsync('INSERT OR REPLACE INTO applications (id,payload,updated_at) VALUES (?,?,?)', a.id,JSON.stringify(a),new Date().toISOString());
}
export async function deleteApplication(id: string) { await instance().runAsync('DELETE FROM applications WHERE id=?',id); }
export async function saveEvent(e: Event) { await instance().runAsync('INSERT OR REPLACE INTO events (id,payload) VALUES (?,?)',e.id,JSON.stringify(e)); }
export async function deleteEvent(id: string) { await instance().runAsync('DELETE FROM events WHERE id=?',id); }
export async function saveMessage(m: Message) { await instance().runAsync('INSERT OR REPLACE INTO messages (id,payload,thread) VALUES (?,?,?)',m.id,JSON.stringify(m),m.thread); }
const defaultProfile: Profile = {name:'',skills:'',education:'',experience:'',goals:'',resumeUri:'',resumeText:'',useResumeForAI:false};
export async function getProfile(): Promise<Profile> {
  const x=await instance().getFirstAsync<{value:string}>('SELECT value FROM preferences WHERE key=?','profile');
  return x ? { ...defaultProfile, ...JSON.parse(x.value) } : defaultProfile;
}
export async function saveProfile(p: Profile) { await setPref('profile',JSON.stringify(p)); }
export async function getPref(key:string) { const x=await instance().getFirstAsync<{value:string}>('SELECT value FROM preferences WHERE key=?',key); return x?.value ?? ''; }
export async function setPref(key:string,value:string) { await instance().runAsync('INSERT OR REPLACE INTO preferences(key,value) VALUES (?,?)',key,value); }
export function uid(prefix='id') {return prefix+'_'+Date.now()+'_'+Math.floor(Math.random()*999999).toString(36);}
