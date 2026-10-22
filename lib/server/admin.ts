// The owner's dashboard. It only counts things. Notes are locked, so nobody (not even the owner) can read them.
import { timingSafeEqual } from "node:crypto";
import { db, HttpError } from "./store";
import type { FamilyDoc } from "./family";
import { lastDays } from "./events";

export function checkAdmin(req: Request) {
  const want = process.env.ADMIN_KEY ?? "";
  if (want.length < 8) throw new HttpError(503, "Add an ADMIN_KEY (8+ characters) in Vercel → Settings → Environment Variables, then redeploy.");
  const got = req.headers.get("x-admin-key") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "Wrong admin key.");
}

const DAY = 86400e3;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export async function stats() {
  const fams = (await db.families()) as FamilyDoc[];
  const items = await db.itemMeta();
  const now = Date.now();
  const live = items.filter((i) => !i.deleted);
  const members = fams.flatMap((f) => f.members.filter((m) => !m.removed).map((m) => ({ fam: f.id, joined: m.joined, canApprove: m.canApprove })));
  const activeFams = (days: number) => new Set(items.filter((i) => i.updated > now - days * DAY).map((i) => i.fam)).size;
  const activePeople = (days: number) => new Set(items.filter((i) => i.updated > now - days * DAY).map((i) => i.fam + ":" + i.by)).size;

  // last 30 days
  const days: { day: string; people: number; families: number; saves: number }[] = [];
  for (let k = 29; k >= 0; k--) {
    const d = dayKey(now - k * DAY);
    days.push({
      day: d,
      people: members.filter((m) => dayKey(m.joined) === d).length,
      families: fams.filter((f) => dayKey(f.created) === d).length,
      saves: items.filter((i) => i.kind === "note" && dayKey(i.updated) === d).length,
    });
  }
  const sizes: Record<string, number> = {};
  for (const f of fams) { const n = f.members.filter((m) => !m.removed).length; const k = n >= 6 ? "6+" : String(n); sizes[k] = (sizes[k] ?? 0) + 1; }

  // recent activity, with families shown as numbers (no names)
  const order = [...fams].sort((a, b) => a.created - b.created).map((f) => f.id);
  const famNo = (id: string) => order.indexOf(id) + 1;
  const events = [
    ...fams.map((f) => ({ at: f.created, text: `Family #${famNo(f.id)} started` })),
    ...fams.flatMap((f) => f.members.filter((m) => m.joined > f.created + 1000).map((m) => ({ at: m.joined, text: `Someone joined family #${famNo(f.id)}` }))),
    ...items.filter((i) => i.updated > now - 7 * DAY).map((i) => ({ at: i.updated, text: `Family #${famNo(i.fam)} ${i.deleted ? "deleted" : i.kind === "question" ? "asked" : "saved"} ${i.kind === "question" ? "a question" : i.kind === "profile" ? "an emergency card" : "a note"}` })),
  ].sort((a, b) => b.at - a.at).slice(0, 40);

  const usage = await lastDays(30);
  const sum = (from: number) => {
    const t: Record<string, number> = {};
    for (const d of usage.slice(from)) for (const [k, v] of Object.entries(d.counts)) t[k] = (t[k] ?? 0) + v;
    return t;
  };
  const activity = {
    today: sum(29), week: sum(23), month: sum(0),
    devices: { today: usage[29].devices, week: Math.max(...usage.slice(23).map((d) => d.devices)), perDay: usage.map((d) => d.devices) },
    errors: groupErrors(usage.flatMap((d) => d.errors)),
  };
  return {
    activity,
    at: now,
    totals: {
      families: fams.length, people: members.length,
      notes: live.filter((i) => i.kind === "note").length, questions: live.filter((i) => i.kind === "question").length, cards: live.filter((i) => i.kind === "profile").length,
      waiting: fams.reduce((s, f) => s + f.requests.length, 0), withRecovery: fams.filter((f) => f.recovery).length,
    },
    active: { families7: activeFams(7), families30: activeFams(30), people7: activePeople(7), people1: activePeople(1) },
    week: { families: fams.filter((f) => f.created > now - 7 * DAY).length, people: members.filter((m) => m.joined > now - 7 * DAY).length },
    days, sizes, events,
  };
}

/** Same problem many times → one line: "message (×12)", newest first. */
function groupErrors(list: { at: number; msg: string }[]) {
  const m = new Map<string, { at: number; msg: string; n: number }>();
  for (const e of list) { const g = m.get(e.msg); if (g) { g.n++; g.at = Math.max(g.at, e.at); } else m.set(e.msg, { ...e, n: 1 }); }
  return [...m.values()].sort((a, b) => b.at - a.at).slice(0, 20).map((g) => ({ at: g.at, msg: g.n > 1 ? `${g.msg} (×${g.n})` : g.msg }));
}
