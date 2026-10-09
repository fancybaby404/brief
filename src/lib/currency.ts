// Salary conversion with European Central Bank reference rates (via api.frankfurter.dev, quoted per 1 EUR).
// Pure and unit-tested; fetching/caching lives in rates.ts.

export type Period = 'year' | 'month' | 'week' | 'day' | 'hour' | '';
export type Pay = { min: number; max: number; currency: string; period: Period };
export type Rates = { base: 'EUR'; date: string; rates: Record<string, number> };

/** 'original' shows salaries exactly as the employer listed them. */
export const CURRENCIES: { value: string; label: string }[] = [
  { value: 'PHP', label: 'Philippine peso (₱)' }, { value: 'USD', label: 'US dollar ($)' }, { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British pound (£)' }, { value: 'SGD', label: 'Singapore dollar (S$)' }, { value: 'AUD', label: 'Australian dollar (A$)' },
  { value: 'JPY', label: 'Japanese yen (¥)' }, { value: 'original', label: 'As listed' },
];
const SYMBOLS: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', SGD: 'S$', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', HKD: 'HK$', CNY: 'CN¥', KRW: '₩' };
const PER: Record<Period, string> = { year: ' / yr', month: ' / mo', week: ' / wk', day: ' / day', hour: ' / hr', '': '' };

export function parseRates(json: any): Rates {
  if (!json || json.base !== 'EUR' || typeof json.rates !== 'object') throw new Error('Unexpected exchange rates response');
  return { base: 'EUR', date: String(json.date || ''), rates: { ...json.rates, EUR: 1 } };
}

export function convert(amount: number, from: string, to: string, r: Rates): number | null {
  if (from === to) return amount;
  const a = r.rates[from], b = r.rates[to];
  return a && b ? (amount / a) * b : null;
}

const num = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : Math.round(n).toLocaleString('en-US'));
const symbol = (c: string) => SYMBOLS[c] ?? `${c} `;

/** Display text for a salary in the chosen currency. Conversions are marked "≈"; unconvertible pay stays as listed. */
export function formatPay(p: Pay, target: string, r: Rates | null): { text: string; converted: boolean } {
  const show = (min: number, max: number, cur: string, converted: boolean) => {
    const range = max && max !== min && min ? `${num(min)}–${num(max)}` : num(min || max);
    return { text: `${converted ? '≈ ' : ''}${symbol(cur)}${range}${PER[p.period] ?? ''}`, converted };
  };
  if (target === 'original' || target === p.currency || !r) return show(p.min, p.max, p.currency, false);
  const min = p.min ? convert(p.min, p.currency, target, r) : 0, max = p.max ? convert(p.max, p.currency, target, r) : 0;
  if (min === null || max === null) return show(p.min, p.max, p.currency, false);
  return show(min, max, target, true);
}
