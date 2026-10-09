// Leading + trailing throttle for high-frequency UI updates (streamed tokens). Pure: unit-tested.
// The first call applies at once, later ones at most every `ms`, and the last value is never dropped.
export function throttle<T>(fn: (v: T) => void, ms: number, now: () => number = Date.now) {
  let last = -Infinity, pending: { v: T } | null = null, timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => { timer = null; if (pending) { last = now(); const p = pending; pending = null; fn(p.v); } };
  const call = (v: T) => {
    const wait = ms - (now() - last);
    if (wait <= 0 && !timer) { last = now(); fn(v); return; }
    pending = { v };
    if (!timer) timer = setTimeout(flush, Math.max(0, wait));
  };
  /** Drop a pending update (e.g. when generation ends and the final text is saved). */
  call.cancel = () => { if (timer) clearTimeout(timer); timer = null; pending = null; };
  return call;
}
