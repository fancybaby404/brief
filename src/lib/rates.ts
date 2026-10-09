// Exchange rates for salary display only. Public ECB reference rates (api.frankfurter.dev, no key);
// the request carries no user data. Cached in SQLite so conversion keeps working offline.
import { getPref, setPref } from './db';
import { parseRates, type Rates } from './currency';

export type CachedRates = { rates: Rates; fetchedAt: string };
const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR';
export const STALE_MS = 12 * 3600000;

export async function cachedRates(): Promise<CachedRates | null> {
  try { const v = await getPref('fxRates'); return v ? (JSON.parse(v) as CachedRates) : null; } catch { return null; }
}
export async function refreshRates(): Promise<CachedRates> {
  let r: Response;
  try { r = await fetch(RATES_URL, { headers: { Accept: 'application/json' } }); }
  catch { throw new Error('You’re offline, so exchange rates couldn’t be updated.'); }
  if (!r.ok) throw new Error(`Exchange rates are unavailable right now (HTTP ${r.status}).`);
  const v = { rates: parseRates(await r.json()), fetchedAt: new Date().toISOString() };
  await setPref('fxRates', JSON.stringify(v));
  return v;
}
