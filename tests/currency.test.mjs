import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, formatPay, parseRates } from '../src/lib/currency.ts';

// ECB reference rates are quoted per 1 EUR (shape from api.frankfurter.dev, 2026-10-08).
const rates = parseRates({ base: 'EUR', date: '2026-10-08', rates: { PHP: 70.475, USD: 1.1186, SGD: 1.45 } });

test('parseRates adds the EUR base and keeps the date', () => {
  assert.equal(rates.rates.EUR, 1);
  assert.equal(rates.date, '2026-10-08');
  assert.throws(() => parseRates({ base: 'USD', rates: {} }), /rates/);
});

test('convert goes through EUR and returns null for unknown currencies', () => {
  assert.equal(Math.round(convert(100, 'USD', 'PHP', rates)), 6300); // 100 / 1.1186 * 70.475
  assert.equal(convert(50, 'EUR', 'EUR', rates), 50);
  assert.equal(convert(10, 'XYZ', 'PHP', rates), null);
});

test('formatPay shows the listed currency when conversion is off or impossible', () => {
  const pay = { min: 120000, max: 160000, currency: 'USD', period: 'year' };
  assert.deepEqual(formatPay(pay, 'original', rates), { text: '$120,000–160,000 / yr', converted: false });
  assert.deepEqual(formatPay(pay, 'PHP', null), { text: '$120,000–160,000 / yr', converted: false });
});

test('formatPay converts, marks it approximate, and compacts millions', () => {
  const pay = { min: 120000, max: 160000, currency: 'USD', period: 'year' };
  assert.deepEqual(formatPay(pay, 'PHP', rates), { text: '≈ ₱7.6M–10.1M / yr', converted: true });
  assert.deepEqual(formatPay({ min: 60000, max: 0, currency: 'PHP', period: 'month' }, 'PHP', rates), { text: '₱60,000 / mo', converted: false });
  assert.deepEqual(formatPay({ min: 25, max: 40, currency: 'USD', period: 'hour' }, 'PHP', rates), { text: '≈ ₱1,575–2,520 / hr', converted: true });
});
