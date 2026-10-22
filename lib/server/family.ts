import { createHash, randomBytes, randomInt } from "node:crypto";
import { db, mutate, HttpError } from "./store";
import type { Member, PublicFamily, Sealed, WireItem } from "../types";

type MemberRec = Member & { tokenHash: string };
type ReqRec = { id: string; name: string; pub: JsonWebKey; tokenHash: string; created: number };
type Grant = { memberId: string; sealed: Sealed; by: string; at: number };
export type FamilyDoc = {
  id: string; created: number; members: MemberRec[]; requests: ReqRec[];
  grants: Record<string, Grant>; denied: string[];
  invite?: { code: number[]; token: string; expires: number };
  recovery?: string;
};

export const COLORS = ["#B08D57", "#7F96C2", "#8FAE8D", "#C48E7E", "#9C88B8", "#6FA3A0", "#C9A24A", "#8C9AAB", "#B87A8F", "#7E9B6B"];
export const PICTURE_COUNT = 16;
const INVITE_MS = 24 * 3600e3;
const id = (n = 12) => randomBytes(n).toString("base64url").slice(0, n);
const hash = (t: string) => createHash("sha256").update("meora|" + t).digest("hex");
const famKey = (f: string) => `f:${f}`;
const codeKey = (c: number[]) => `i:${c.join("-")}`;

const cleanName = (s: unknown) => {
  const n = String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!n) throw new HttpError(400, "Please tell us your name.");
  return n;
};
const checkToken = (t: unknown) => { if (typeof t !== "string" || t.length < 20 || t.length > 100) throw new HttpError(400, "Bad device."); return t; };
const checkPub = (p: unknown) => {
  const k = p as JsonWebKey;
  if (!k || k.kty !== "EC" || k.crv !== "P-256" || typeof k.x !== "string" || typeof k.y !== "string") throw new HttpError(400, "Bad key.");
  return { kty: "EC", crv: "P-256", x: k.x, y: k.y, ext: true } as JsonWebKey;
};
const checkSealed = (s: unknown, max = 400_000): Sealed => {
  const v = s as Sealed;
  if (!v || typeof v.iv !== "string" || typeof v.ct !== "string" || v.iv.length > 40 || v.ct.length > max) throw new HttpError(400, "Bad data.");
  return { iv: v.iv, ct: v.ct };
};
const strip = (m: MemberRec): Member => { const { tokenHash: _t, ...rest } = m; void _t; return rest; };
const nextColor = (d: FamilyDoc) => COLORS.find((c) => !d.members.some((m) => !m.removed && m.color === c)) ?? COLORS[d.members.length % COLORS.length];

export function publicView(d: FamilyDoc, me?: MemberRec): PublicFamily {
  return {
    id: d.id, created: d.created, members: d.members.map(strip),
    requests: me?.canApprove ? d.requests.map((r) => ({ id: r.id, name: r.name, created: r.created, pub: r.pub })) : [],
  };
}

export async function getFamily(fam: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(fam)) throw new HttpError(404, "Family not found.");
  const row = await db.get<FamilyDoc>(famKey(fam));
  if (!row) throw new HttpError(404, "This family no longer exists.");
  return row.data;
}

/** Every request from a phone carries who it is. We check it here. */
export async function auth(req: Request) {
  const fam = req.headers.get("x-fam") ?? "", mid = req.headers.get("x-member") ?? "", tok = req.headers.get("x-token") ?? "";
  const d = await getFamily(fam);
  const me = d.members.find((m) => m.id === mid && !m.removed);
  if (!me || me.tokenHash !== hash(tok)) throw new HttpError(401, "This phone is no longer part of the family.");
  return { d, me };
}

export async function createFamily(b: { name: unknown; pub: unknown; token: unknown }) {
  const name = cleanName(b.name), pub = checkPub(b.pub), token = checkToken(b.token);
  const fam = id(16), mid = id(8);
  const d: FamilyDoc = { id: fam, created: Date.now(), members: [{ id: mid, name, color: COLORS[0], pub, canApprove: true, joined: Date.now(), tokenHash: hash(token) }], requests: [], grants: {}, denied: [] };
  if (!(await db.insert(famKey(fam), d))) throw new HttpError(500, "Try again.");
  return { fam, member: mid, family: publicView(d, d.members[0]) };
}

/** A 3-picture code (and a QR link) that is valid for a day. */
export async function invite(req: Request) {
  const { d } = await auth(req);
  if (d.invite && d.invite.expires > Date.now() + 3600e3) return { code: d.invite.code, link: `${d.id}.${d.invite.token}`, expires: d.invite.expires };
  for (let attempt = 0; attempt < 40; attempt++) {
    const pool = Array.from({ length: PICTURE_COUNT }, (_, i) => i);
    const code = [0, 1, 2].map(() => pool.splice(randomInt(pool.length), 1)[0]);
    const expires = Date.now() + INVITE_MS;
    let ok = await db.insert(codeKey(code), { fam: d.id, expires });
    if (!ok) {
      const cur = await db.get<{ fam: string; expires: number }>(codeKey(code));
      if (cur && cur.data.expires < Date.now()) ok = await db.update(codeKey(code), { fam: d.id, expires }, cur.v);
    }
    if (!ok) continue;
    const token = id(16);
    await mutate<FamilyDoc>(famKey(d.id), (x) => { x.invite = { code, token, expires }; });
    return { code, link: `${d.id}.${token}`, expires };
  }
  throw new HttpError(503, "Busy. Please try again.");
}

export async function join(b: { code?: unknown; link?: unknown; name: unknown; pub: unknown; token: unknown }) {
  const name = cleanName(b.name), pub = checkPub(b.pub), token = checkToken(b.token);
  let fam = "";
  const wrong = new HttpError(404, "Those pictures don't match. Ask your family to show them again.");
  if (Array.isArray(b.code) && b.code.length === 3 && b.code.every((n) => Number.isInteger(n) && n >= 0 && n < PICTURE_COUNT)) {
    const row = await db.get<{ fam: string; expires: number }>(codeKey(b.code as number[]));
    if (!row || row.data.expires < Date.now()) throw wrong;
    fam = row.data.fam;
    const d = await getFamily(fam);
    if (!d.invite || d.invite.code.join() !== (b.code as number[]).join() || d.invite.expires < Date.now()) throw wrong;
  } else if (typeof b.link === "string" && b.link.includes(".")) {
    const [f, t] = b.link.split(".");
    const d = await getFamily(f);
    if (!d.invite || d.invite.token !== t || d.invite.expires < Date.now()) throw new HttpError(404, "This invite has expired. Ask your family for a new one.");
    fam = f;
  } else throw wrong;
  const rid = id(10);
  await mutate<FamilyDoc>(famKey(fam), (d) => {
    d.requests = d.requests.filter((r) => r.created > Date.now() - 3 * 86400e3);
    if (d.requests.length >= 20) throw new HttpError(429, "Too many people are waiting. Ask your family to answer first.");
    d.requests.push({ id: rid, name, pub, tokenHash: hash(token), created: Date.now() });
  });
  return { fam, req: rid };
}

export async function joinStatus(b: { fam: unknown; req: unknown; token: unknown }) {
  const d = await getFamily(String(b.fam));
  const rid = String(b.req), th = hash(String(b.token));
  const g = d.grants[rid];
  if (g) {
    const me = d.members.find((m) => m.id === g.memberId);
    if (!me || me.tokenHash !== th) throw new HttpError(401, "Not yours.");
    return { status: "allowed" as const, member: g.memberId, sealed: g.sealed, by: g.by, family: publicView(d, me) };
  }
  if (d.denied.includes(rid)) return { status: "denied" as const };
  const r = d.requests.find((x) => x.id === rid);
  if (!r || r.tokenHash !== th) return { status: "gone" as const };
  return { status: "waiting" as const };
}

export async function decide(req: Request, b: { req: unknown; allow: unknown; sealed?: unknown }) {
  const { d, me } = await auth(req);
  if (!me.canApprove) throw new HttpError(403, "Ask someone who can approve.");
  const rid = String(b.req);
  const sealed = b.allow ? checkSealed(b.sealed, 2000) : null;
  const out = await mutate<FamilyDoc>(famKey(d.id), (x) => {
    const r = x.requests.find((q) => q.id === rid);
    if (!r) throw new HttpError(404, "Someone already answered this.");
    x.requests = x.requests.filter((q) => q.id !== rid);
    if (!sealed) { x.denied = [...x.denied.slice(-50), rid]; return; }
    const mid = id(8);
    x.members.push({ id: mid, name: r.name, color: nextColor(x), pub: r.pub, canApprove: false, joined: Date.now(), tokenHash: r.tokenHash });
    x.grants[rid] = { memberId: mid, sealed, by: me.id, at: Date.now() };
    // forget old grants after a week
    for (const [k, g] of Object.entries(x.grants)) if (g.at < Date.now() - 7 * 86400e3) delete x.grants[k];
  });
  return { family: publicView(out, out.members.find((m) => m.id === me.id)) };
}

export async function memberAction(req: Request, b: { action: unknown; id?: unknown; value?: unknown; name?: unknown }) {
  const { d, me } = await auth(req);
  const target = String(b.id ?? me.id);
  if (b.action === "delete-family") {
    if (!me.canApprove) throw new HttpError(403, "Only someone who can approve can delete the family.");
    await db.wipe(d.id);
    if (d.recovery) await db.remove(`r:${d.recovery}`);
    if (d.invite) await db.remove(codeKey(d.invite.code));
    await db.remove(famKey(d.id));
    return { deleted: true };
  }
  const out = await mutate<FamilyDoc>(famKey(d.id), (x) => {
    const live = x.members.filter((m) => !m.removed);
    const t = x.members.find((m) => m.id === target && !m.removed);
    if (!t) throw new HttpError(404, "Not found.");
    if (b.action === "rename") { if (t.id !== me.id) throw new HttpError(403, "You can only change your own name."); t.name = cleanName(b.name); return; }
    if (b.action === "leave") { if (t.id !== me.id) throw new HttpError(403, "No."); t.removed = true; }
    else if (b.action === "remove") { if (!me.canApprove || t.id === me.id) throw new HttpError(403, "Not allowed."); t.removed = true; }
    else if (b.action === "approver") { if (!me.canApprove) throw new HttpError(403, "Not allowed."); t.canApprove = !!b.value; }
    else throw new HttpError(400, "Unknown action.");
    // always keep at least one person who can approve
    const left = x.members.filter((m) => !m.removed);
    if (left.length && !left.some((m) => m.canApprove)) left.sort((a, c) => a.joined - c.joined)[0].canApprove = true;
    void live;
  });
  if (!out.members.some((m) => !m.removed)) { await db.wipe(d.id); await db.remove(famKey(d.id)); }
  return { family: publicView(out, out.members.find((m) => m.id === me.id)) };
}

// ---------- notes (locked boxes) ----------
const ITEM_ID = /^[A-Za-z0-9_-]{8,40}$/;
export async function sync(req: Request, since: number) {
  const { d, me } = await auth(req);
  const now = Date.now();
  const items = (await db.items(d.id, Math.max(0, since - 5000))).filter((i) => !i.vis || i.vis.includes(me.id));
  return { family: publicView(d, me), items, now, me: me.id };
}

export async function putItems(req: Request, list: unknown) {
  const { d, me } = await auth(req);
  if (!Array.isArray(list) || list.length > 50) throw new HttpError(400, "Too many at once.");
  const ids = new Set(d.members.filter((m) => !m.removed).map((m) => m.id));
  const saved: WireItem[] = [];
  for (const raw of list as WireItem[]) {
    if (!raw || !ITEM_ID.test(raw.id) || !["note", "question", "profile"].includes(raw.kind)) throw new HttpError(400, "Bad item.");
    const old = await db.getItem(d.id, raw.id);
    if (old?.vis && !old.vis.includes(me.id)) throw new HttpError(403, "That note is private.");
    const updated = Math.max(Date.now(), (old?.updated ?? 0) + 1);
    let item: WireItem;
    if (raw.deleted) item = { id: raw.id, kind: raw.kind, by: me.id, updated, deleted: true, vis: old?.vis ?? null };
    else {
      let vis: string[] | null = null, keys: Record<string, Sealed> | undefined;
      if (Array.isArray(raw.vis)) {
        vis = [...new Set(raw.vis.map(String))].filter((x) => ids.has(x));
        if (!vis.includes(me.id)) vis.push(me.id);
        keys = {};
        for (const m of vis) { if (!raw.keys?.[m]) throw new HttpError(400, "Missing key."); keys[m] = checkSealed(raw.keys[m], 2000); }
      }
      item = { id: raw.id, kind: raw.kind, by: me.id, updated, vis, box: checkSealed(raw.box), ...(keys ? { keys } : {}) };
    }
    await db.putItem(d.id, item); saved.push(item);
  }
  return { items: saved };
}

const BLOB_ID = /^[A-Za-z0-9_-]{8,40}$/;
export async function putBlob(req: Request, b: { id: unknown; data: unknown }) {
  const { d } = await auth(req);
  if (typeof b.id !== "string" || !BLOB_ID.test(b.id) || typeof b.data !== "string" || b.data.length > 3_000_000) throw new HttpError(400, "That file is too big.");
  await db.putBlob(d.id, b.id, b.data); return { ok: true };
}
export async function getBlob(req: Request, bid: string) {
  const { d } = await auth(req);
  if (!BLOB_ID.test(bid)) throw new HttpError(400, "Bad id.");
  const data = await db.getBlob(d.id, bid);
  if (!data) throw new HttpError(404, "Not found.");
  return { data };
}

// ---------- recovery pictures ----------
const LOOKUP = /^[a-f0-9]{64}$/;
export async function setRecovery(req: Request, b: { lookup: unknown; box: unknown }) {
  const { d } = await auth(req);
  if (typeof b.lookup !== "string" || !LOOKUP.test(b.lookup)) throw new HttpError(400, "Bad.");
  const box = checkSealed(b.box, 4000);
  if (d.recovery && d.recovery !== b.lookup) await db.remove(`r:${d.recovery}`);
  const k = `r:${b.lookup}`;
  if (!(await db.insert(k, { fam: d.id, box }))) { const cur = await db.get(k); if (cur) await db.update(k, { fam: d.id, box }, cur.v); }
  await mutate<FamilyDoc>(famKey(d.id), (x) => { x.recovery = b.lookup as string; });
  return { ok: true };
}
export async function useRecovery(b: { lookup: unknown; name: unknown; pub: unknown; token: unknown }) {
  if (typeof b.lookup !== "string" || !LOOKUP.test(b.lookup)) throw new HttpError(400, "Bad.");
  const row = await db.get<{ fam: string; box: Sealed }>(`r:${b.lookup}`);
  if (!row) throw new HttpError(404, "Those pictures don't match any family. Check the order and try again.");
  const name = cleanName(b.name), pub = checkPub(b.pub), token = checkToken(b.token);
  const mid = id(8);
  const out = await mutate<FamilyDoc>(famKey(row.data.fam), (x) => {
    x.members.push({ id: mid, name, color: nextColor(x), pub, canApprove: true, joined: Date.now(), tokenHash: hash(token) });
  }, "This family no longer exists.");
  return { fam: out.id, member: mid, box: row.data.box, family: publicView(out, out.members.find((m) => m.id === mid)) };
}
