// Phone notifications (Web Push). Free: the phone makers deliver them.
// The server never knows what anyone saved, so notifications only carry names, counts and prompts.
import webpush from "web-push";
import { db, HttpError } from "./store";
import { auth, type FamilyDoc } from "./family";
import { pushText } from "../pushText";
import { questionFor } from "../questions";
import type { SpaceKind } from "../types";

export type Prefs = { rem: boolean; diary: boolean; q: boolean; family: boolean; week: boolean };
type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushDoc = {
  fam: string; member: string; sub: Sub; prefs: Prefs; diaryAt: string; tz: string; lang: string; kind?: SpaceKind;
  /** reminder times (ms) for this person's notes in this space, sent by the phone */
  rems: number[];
  sent: { diary?: string; q?: string; week?: string };
  at: number;
};
const key = (fam: string, member: string) => `p:${fam}:${member}`;
const LANGS = ["en", "te", "hi", "ta", "es", "fr", "ar", "zh"];

let keys: { publicKey: string; privateKey: string } | null = null;
/** Our sending keys: from settings if given, otherwise made once and kept in the database. */
async function vapid() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  else {
    const row = await db.get<{ publicKey: string; privateKey: string }>("vapid");
    if (row) keys = row.data;
    else { const k = webpush.generateVAPIDKeys(); keys = (await db.insert("vapid", k)) ? k : (await db.get<{ publicKey: string; privateKey: string }>("vapid"))!.data; }
  }
  return keys;
}
export async function publicKey() { return { key: (await vapid()).publicKey }; }

const clean = (s: unknown, re: RegExp, d: string) => (typeof s === "string" && re.test(s) ? s : d);
function checkSub(s: unknown): Sub {
  const v = s as Sub;
  if (!v || typeof v.endpoint !== "string" || !v.endpoint.startsWith("https://") || v.endpoint.length > 1000 || !v.keys || typeof v.keys.p256dh !== "string" || typeof v.keys.auth !== "string" || v.keys.p256dh.length > 200 || v.keys.auth.length > 100) throw new HttpError(400, "Bad subscription.");
  return { endpoint: v.endpoint, keys: { p256dh: v.keys.p256dh, auth: v.keys.auth } };
}

/** The phone tells us how to reach it, what it wants, and when its reminders are. */
export async function savePush(req: Request, b: Record<string, unknown>) {
  const { d, me } = await auth(req);
  const p = (b.prefs ?? {}) as Partial<Prefs>;
  const now = Date.now();
  const k = key(d.id, me.id);
  const old = await db.get<PushDoc>(k);
  // Reminder times: replaced when the phone sends them, otherwise kept.
  const rems = Array.isArray(b.rems) ? [...new Set(b.rems.filter((x): x is number => typeof x === "number" && x > now - 3600e3 && x < now + 15 * 86400e3))].sort((x, y) => x - y).slice(0, 200) : old?.data.rems ?? [];
  const doc: PushDoc = {
    fam: d.id, member: me.id, sub: checkSub(b.sub),
    prefs: { rem: p.rem !== false, diary: p.diary !== false, q: p.q !== false, family: p.family !== false, week: !!p.week },
    diaryAt: clean(b.diaryAt, /^([01]\d|2[0-3]):[0-5]\d$/, "20:00"),
    tz: clean(b.tz, /^[A-Za-z0-9_+\-/]{1,60}$/, "UTC"),
    lang: LANGS.includes(String(b.lang)) ? String(b.lang) : "en",
    kind: d.kind, rems, sent: old?.data.sent ?? {}, at: now,
  };
  try { new Intl.DateTimeFormat("en", { timeZone: doc.tz }); } catch { doc.tz = "UTC"; }
  if (!old) { if (!(await db.insert(k, doc))) { const r = await db.get<PushDoc>(k); if (r) await db.update(k, doc, r.v); } }
  else await db.update(k, doc, old.v);
  return { ok: true };
}
export async function offPush(req: Request) {
  const { d, me } = await auth(req);
  await db.remove(key(d.id, me.id));
  return { ok: true };
}

async function send(k: string, doc: PushDoc, msg: { title: string; body: string; url: string; tag: string }) {
  const v = await vapid();
  try {
    await webpush.sendNotification(doc.sub, JSON.stringify(msg), { vapidDetails: { subject: "https://meora.vercel.app", publicKey: v.publicKey, privateKey: v.privateKey }, TTL: 6 * 3600, timeout: 5000 });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await db.remove(k); // this phone turned notifications off or uninstalled
    return false;
  }
}
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);

/** Tell others in the space, right away (for example "Mom saved a new memory"). Never waits long. */
export async function notify(d: FamilyDoc, to: string[], what: "new" | "asked" | "join", name: string, url = "/") {
  const jobs = to.map(async (mid) => {
    const k = key(d.id, mid);
    const row = await db.get<PushDoc>(k);
    if (!row || !row.data.prefs.family) return;
    await send(k, row.data, { title: pushText(row.data.lang, what, { name }), body: pushText(row.data.lang, "tap"), url, tag: `${what}-${d.id}` });
  });
  await within(Promise.allSettled(jobs), 4000);
}

function local(tz: string, now: number) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
    .formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, min: +parts.hour * 60 + +parts.minute, sunday: parts.weekday === "Sun" };
}
const mins = (hm: string) => +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
const due = (nowMin: number, at: number) => nowMin >= at && nowMin < at + 180; // a 3-hour window, so a late check still sends

/** Runs every few minutes (an outside timer calls /api/push/tick). Sends what is due, once. */
export async function tick() {
  const now = Date.now();
  const gate = await db.get<{ at: number }>("tick");
  if (gate && now - gate.data.at < 45_000) return { skipped: true };
  if (!gate) await db.insert("tick", { at: now }); else await db.update("tick", { at: now }, gate.v);

  const rows = await db.list<PushDoc>("p:");
  const byPhone = new Map<string, typeof rows>();
  for (const r of rows) { const e = r.data.sub.endpoint; byPhone.set(e, [...(byPhone.get(e) ?? []), r]); }
  let sent = 0;
  for (const group of [...byPhone.values()].slice(0, 2000)) {
    const main = group.reduce((a, b) => (b.data.at > a.data.at ? b : a));
    const p = main.data, L = local(p.tz, now);
    const marks: Partial<PushDoc["sent"]> = {};
    if (p.prefs.diary && p.sent.diary !== L.ymd && due(L.min, mins(p.diaryAt))) {
      if (await send(main.key, p, { title: pushText(p.lang, "diary_t"), body: pushText(p.lang, "diary_b"), url: "/diary", tag: "diary" })) sent++;
      marks.diary = L.ymd;
    }
    if (p.prefs.q && p.sent.q !== L.ymd && due(L.min, 10 * 60)) {
      if (await send(main.key, p, { title: pushText(p.lang, "q_t"), body: questionFor(p.kind, L.ymd, p.lang), url: "/", tag: "question" })) sent++;
      marks.q = L.ymd;
    }
    if (p.prefs.week && L.sunday && p.sent.week !== L.ymd && due(L.min, 10 * 60)) {
      let n = 0;
      for (const g of group) n += (await db.items(g.data.fam, now - 7 * 86400e3)).filter((i) => i.kind === "note" && !i.deleted && (!i.vis || i.vis.includes(g.data.member))).length;
      if (n > 0 && await send(main.key, p, { title: pushText(p.lang, "week_t"), body: pushText(p.lang, "week_b", { n }), url: "/", tag: "week" })) sent++;
      marks.week = L.ymd;
    }
    for (const r of group) {
      const d = r.data;
      const fire = d.prefs.rem && d.rems.some((t) => t <= now && t > now - 2 * 3600e3);
      const left = d.rems.filter((t) => t > now);
      if (fire && await send(r.key, d, { title: pushText(d.lang, "rem_t"), body: pushText(d.lang, "rem_b"), url: "/", tag: `rem-${d.fam}` })) sent++;
      if (left.length !== d.rems.length || Object.keys(marks).length) {
        await db.update(r.key, { ...d, rems: left, sent: { ...d.sent, ...marks } }, r.v);
      }
    }
  }
  return { phones: byPhone.size, sent };
}
