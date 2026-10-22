// Anonymous activity counts for the owner, e.g. "12 questions answered today".
// Never stores anyone's words: only event names, a language code, and a random device number.
import { db, mutate } from "./store";

type Day = { counts: Record<string, number>; devices: string[]; errors: { at: number; msg: string }[] };
const key = (t: number) => `c:${new Date(t).toISOString().slice(0, 10)}`;
const NAME = /^[a-z_]{2,24}(?::[A-Za-z0-9-]{2,12})?$/;

async function update(fn: (d: Day) => void) {
  const k = key(Date.now());
  await db.insert<Day>(k, { counts: {}, devices: [], errors: [] });
  await mutate<Day>(k, (d) => { d.counts ??= {}; d.devices ??= []; d.errors ??= []; fn(d); });
}

export async function record(b: { d?: unknown; e?: unknown; err?: unknown }) {
  const events = (b.e && typeof b.e === "object" ? b.e : {}) as Record<string, unknown>;
  const ok = Object.entries(events).filter(([n, c]) => NAME.test(n) && Number.isInteger(c) && (c as number) > 0 && (c as number) <= 200).slice(0, 40);
  const device = typeof b.d === "string" && /^[A-Za-z0-9]{8,24}$/.test(b.d) ? b.d : null;
  const errs = Array.isArray(b.err) ? b.err.filter((x) => typeof x === "string").slice(0, 5).map((x) => (x as string).slice(0, 200)) : [];
  if (!ok.length && !device && !errs.length) return { ok: true };
  await update((d) => {
    for (const [n, c] of ok) d.counts[n] = (d.counts[n] ?? 0) + (c as number);
    if (device && !d.devices.includes(device) && d.devices.length < 20000) d.devices.push(device);
    for (const m of errs) d.errors = [...d.errors, { at: Date.now(), msg: "app: " + m }].slice(-30);
  });
  return { ok: true };
}

export async function serverError(e: unknown) {
  try { await update((d) => { d.errors = [...d.errors, { at: Date.now(), msg: "server: " + String((e as Error)?.message ?? e).slice(0, 200) }].slice(-30); }); } catch { /* never fail the request */ }
}

export async function lastDays(n: number) {
  const out: { day: string; counts: Record<string, number>; devices: number; errors: { at: number; msg: string }[] }[] = [];
  const keys = Array.from({ length: n }, (_, i) => key(Date.now() - (n - 1 - i) * 86400e3));
  const rows = await Promise.all(keys.map((k) => db.get<Day>(k).catch(() => null)));
  rows.forEach((r, i) => out.push({ day: keys[i].slice(2), counts: r?.data.counts ?? {}, devices: r?.data.devices?.length ?? 0, errors: r?.data.errors ?? [] }));
  return out;
}
