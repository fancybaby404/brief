// Tiny schema validator for tool arguments and model output. Pure: unit-tested.
// The same schema is turned into JSON Schema so llama.rn can constrain decoding to it.

export type Field =
  | { type: 'string'; max?: number; optional?: boolean; enum?: readonly string[]; pattern?: RegExp }
  | { type: 'number'; min?: number; max?: number; optional?: boolean; integer?: boolean }
  | { type: 'boolean'; optional?: boolean }
  | { type: 'strings'; max?: number; itemMax?: number; optional?: boolean };
export type Schema = Record<string, Field>;

type Value<F extends Field> = F extends { type: 'string'; enum: readonly (infer E)[] } ? E
  : F extends { type: 'string' } ? string : F extends { type: 'number' } ? number
  : F extends { type: 'boolean' } ? boolean : string[];
export type Infer<S extends Schema> =
  { [K in keyof S as S[K] extends { optional: true } ? never : K]: Value<S[K]> } &
  { [K in keyof S as S[K] extends { optional: true } ? K : never]?: Value<S[K]> };

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates and normalises: trims strings, drops unknown keys, treats "" as missing for optional fields. */
export function validate<S extends Schema>(schema: S, input: unknown): Checked<Infer<S>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Expected an object.' };
  const src = input as Record<string, unknown>, out: Record<string, unknown> = {};
  for (const [key, f] of Object.entries(schema)) {
    let v = src[key];
    if (typeof v === 'string') v = v.trim();
    const missing = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (missing) { if (f.optional) continue; return { ok: false, error: `${key} is required.` }; }
    if (f.type === 'string') {
      if (typeof v !== 'string') return { ok: false, error: `${key} must be text.` };
      if (f.enum && !f.enum.includes(v)) return { ok: false, error: `${key} must be one of ${f.enum.join(', ')}.` };
      if (f.pattern && !f.pattern.test(v)) return { ok: false, error: `${key} has an invalid format.` };
      out[key] = f.max ? v.slice(0, f.max) : v;
    } else if (f.type === 'number') {
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n !== 'number' || !Number.isFinite(n) || (f.integer && !Number.isInteger(n))) return { ok: false, error: `${key} must be a number.` };
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) return { ok: false, error: `${key} is out of range.` };
      out[key] = n;
    } else if (f.type === 'boolean') {
      if (typeof v !== 'boolean') return { ok: false, error: `${key} must be true or false.` };
      out[key] = v;
    } else {
      if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) return { ok: false, error: `${key} must be a list of text.` };
      const items = (v as string[]).map(x => x.trim()).filter(Boolean).map(x => (f.itemMax ? x.slice(0, f.itemMax) : x));
      out[key] = f.max ? items.slice(0, f.max) : items;
    }
  }
  return { ok: true, value: out as Infer<S> };
}

/** JSON Schema for constrained decoding. Every key is required there; "" means "not stated". */
export function toJsonSchema(schema: Schema): object {
  const properties: Record<string, object> = {};
  for (const [key, f] of Object.entries(schema)) {
    properties[key] = f.type === 'string' ? (f.enum ? { type: 'string', enum: f.optional ? [...f.enum, ''] : f.enum } : { type: 'string' })
      : f.type === 'number' ? { type: 'number' } : f.type === 'boolean' ? { type: 'boolean' }
      : { type: 'array', items: { type: 'string' } };
  }
  return { type: 'object', properties, required: Object.keys(schema), additionalProperties: false };
}

/** First JSON object in raw model text, or null. Models sometimes wrap JSON in prose or code fences. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try { const v = JSON.parse(raw.slice(start, end + 1)); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
}
