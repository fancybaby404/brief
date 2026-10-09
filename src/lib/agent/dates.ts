// Natural-language dates in the phone's local time zone. Deterministic: the model never does date math.
// Anything the parser has to assume is reported, so the event preview can say so.

export type When = {
  date: Date;          // local date (and time when hasTime)
  hasDate: boolean;    // a day was stated (or implied by "at 3pm" = next 3pm)
  hasTime: boolean;
  assumed?: string;    // what was assumed, shown in the preview ("Assumed PM")
  options?: Date[];    // ambiguous day: ask the user to pick (e.g. 3/4 = Mar 4 or Apr 3)
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_RX = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DAY_RX = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const valid = (y: number, m: number, day: number) => { const d = new Date(y, m, day); return d.getMonth() === m && d.getDate() === day ? d : null; };
/** A month/day without a year means the next time it comes round. */
const upcoming = (m: number, day: number, today: Date) => { const d = valid(today.getFullYear(), m, day); return d && d < today ? valid(today.getFullYear() + 1, m, day) : d; };

function parseTime(s: string): { h: number; m: number; assumed?: string } | null {
  if (/\b(noon|midday)\b/.test(s)) return { h: 12, m: 0 };
  let x = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/);
  if (x) {
    const h = Number(x[1]), m = Number(x[2] || 0);
    if (h < 1 || h > 12 || m > 59) return null;
    return { h: (h % 12) + (x[3][0] === 'p' ? 12 : 0), m };
  }
  x = s.match(/\b(\d{1,2}):(\d{2})\b/) || s.match(/\bat (\d{1,2})\b(?!\s*(?:days?|weeks?|[/:-]))/);
  if (!x) return null;
  const h = Number(x[1]), m = Number(x[2] || 0);
  if (h > 23 || m > 59) return null;
  // "at 2" / "2:30" with no am/pm: job events happen in working hours, so 1–7 means afternoon.
  if (h >= 1 && h <= 7) return { h: h + 12, m, assumed: `Assumed ${h}:${String(m).padStart(2, '0')} PM` };
  return { h, m };
}

function parseDay(s: string, today: Date): { date?: Date; options?: Date[]; assumed?: string } | null {
  let x = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (x) { const d = valid(+x[1], +x[2] - 1, +x[3]); return d ? { date: d } : null; }
  x = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (x) {
    const a = +x[1], b = +x[2], y = x[3] ? (x[3].length === 2 ? 2000 + +x[3] : +x[3]) : null;
    const make = (m: number, d: number) => (y ? valid(y, m - 1, d) : upcoming(m - 1, d, today));
    const md = make(a, b), dm = make(b, a);
    if (md && dm && a !== b) return { options: [md, dm] }; // 3/4: March 4 or 3 April?
    return md || dm ? { date: (md || dm)! } : null;
  }
  x = s.match(new RegExp(`\\b${MONTH_RX}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`));
  if (x) { const m = MONTHS.indexOf(x[1].slice(0, 3)); const d = x[3] ? valid(+x[3], m, +x[2]) : upcoming(m, +x[2], today); return d ? { date: d } : null; }
  x = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RX}(?:,?\\s*(\\d{4}))?`));
  if (x) { const m = MONTHS.indexOf(x[2].slice(0, 3)); const d = x[3] ? valid(+x[3], m, +x[1]) : upcoming(m, +x[1], today); return d ? { date: d } : null; }
  if (/\bday after tomorrow\b/.test(s)) return { date: addDays(today, 2) };
  if (/\b(tomorrow|tmrw|tmr)\b/.test(s)) return { date: addDays(today, 1) };
  if (/\b(today|tonight|this (morning|afternoon|evening))\b/.test(s)) return { date: today };
  x = s.match(/\bin (\d{1,2}|a|one|two|three) (day|week)s?\b/);
  if (x) { const n = ({ a: 1, one: 1, two: 2, three: 3 } as Record<string, number>)[x[1]] ?? +x[1]; return { date: addDays(today, x[2] === 'week' ? n * 7 : n) }; }
  x = s.match(new RegExp(`\\b(?:(next|this|on)\\s+)?${DAY_RX}\\b`));
  if (x) {
    const target = DAYS.indexOf(x[2].slice(0, 3)), ahead = (target - today.getDay() + 7) % 7;
    // "Friday" on a Friday means next week's; "this Friday" on a Friday means today.
    return { date: addDays(today, ahead === 0 && x[1] !== 'this' ? 7 : ahead) };
  }
  if (/\bnext week\b/.test(s)) return { date: addDays(today, 7), assumed: 'Next week — check the day' };
  return null;
}

/** Parses the date/time mentioned in a message, or null when none is mentioned. */
export function parseWhen(text: string, now = new Date()): When | null {
  const s = text.toLowerCase(), today = startOfDay(now);
  const time = parseTime(s), day = parseDay(s, today);
  if (!time && !day) return null;
  const at = (d: Date) => (time ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), time.h, time.m) : d);
  const assumed = [day?.assumed, time?.assumed].filter(Boolean).join(' · ') || undefined;
  if (day?.options) return { date: at(day.options[0]), hasDate: true, hasTime: !!time, options: day.options.map(at), assumed };
  if (day?.date) return { date: at(day.date), hasDate: true, hasTime: !!time, assumed };
  // Only a time: the next time it comes round (later today, else tomorrow).
  const t = at(today);
  return { date: t > now ? t : at(addDays(today, 1)), hasDate: false, hasTime: true, assumed };
}

/** Local "YYYY-MM-DD" (or with "THH:mm") strings from the model, validated. */
export function parseIsoParts(date: string, time = ''): Date | null {
  const d = date.match(/^(\d{4})-(\d{2})-(\d{2})$/), t = time ? time.match(/^(\d{1,2}):(\d{2})$/) : null;
  if (!d || (time && !t)) return null;
  const day = valid(+d[1], +d[2] - 1, +d[3]);
  if (!day) return null;
  if (!t) return day;
  const h = +t[1], m = +t[2];
  return h > 23 || m > 59 ? null : new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export const isThisWeek = (d: Date, now = new Date()) => { const t = startOfDay(now); return d >= t && d < addDays(t, 7); };
