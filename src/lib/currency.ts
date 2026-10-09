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
  if (!json || json.base !== 'EUR' || !json.rates || typeof json.rates !== 'object' || Array.isArray(json.rates)) throw new Error('Unexpected exchange rates response');
  const rates=Object.fromEntries(Object.entries(json.rates).filter(([code,value])=>/^[A-Z]{3}$/.test(code)&&typeof value==='number'&&Number.isFinite(value)&&value>0));
  return { base: 'EUR', date: String(json.date || ''), rates: { ...rates, EUR: 1 } };
}

export function convert(amount: number, from: string, to: string, r: Rates): number | null {
  if(!Number.isFinite(amount)||amount<0)return null;
  const source=from.trim().toUpperCase(),target=to.trim().toUpperCase();
  if(!source||!target)return null;
  if(source===target)return amount;
  const a=r.rates[source],b=r.rates[target];
  return Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0?(amount/a)*b:null;
}

const num = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : Math.round(n).toLocaleString('en-US'));
const symbol = (c: string) => SYMBOLS[c] ?? `${c} `;
const range = (min:number,max:number) => max&&max!==min&&min?`${num(min)}–${num(max)}`:num(min||max);

/** Display text for a salary in the chosen currency. Conversions are marked "≈"; unconvertible pay stays as listed. */
export function formatPay(p: Pay, target: string, r: Rates | null): { text: string; converted: boolean } {
  const show = (min: number, max: number, cur: string, converted: boolean) => {
    return { text: `${converted ? '≈ ' : ''}${symbol(cur)}${range(min,max)}${PER[p.period] ?? ''}`, converted };
  };
  const source=p.currency.trim().toUpperCase(),destination=target.trim().toUpperCase();
  if(!source)return {text:`${range(p.min,p.max)}${PER[p.period]??''} · currency not listed`,converted:false};
  if (target === 'original' || destination === source || !r) return show(p.min, p.max, source, false);
  const min = p.min ? convert(p.min, source, destination, r) : 0, max = p.max ? convert(p.max, source, destination, r) : 0;
  if (min === null || max === null) return show(p.min, p.max, source, false);
  return show(min, max, destination, true);
}
