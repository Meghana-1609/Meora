"use client";
// The app's brain on the phone: keeps keys, locks/unlocks notes, talks to the server, works offline.
import { standardSpeech } from "./i18n";
import { useSyncExternalStore } from "react";
import * as C from "@/lib/crypto";
import * as L from "@/lib/local";
import { PICTURES, RECOVERY_LENGTH } from "@/lib/pictures";
import type { BlobRef, Member, NoteData, Payload, ProfileData, PublicFamily, QuestionData, Sealed, SpaceKind, WireItem } from "@/lib/types";

export type UiLang = "en" | "te" | "hi" | "ta" | "es" | "fr" | "ar" | "zh";
export type Settings = {
  lang: UiLang; speech: string; text: 1 | 2 | 3; readAloud: boolean; rate: number; simple: boolean; dark: boolean;
  defaultVis: "all"; smartOn: boolean; emergency: string; chosen: boolean; toured: boolean;
  /** phone notifications: on/off, what to get, and the diary time */
  notify?: NotifySettings;
};
export type FamRef = { fam: string; member: string; token: string };
type Keys = { fk: CryptoKey; priv: CryptoKey; pub: JsonWebKey };
type Lock = { kind: "bio" | "pics" | "none"; cred?: string; hash?: string; salt?: string };
type Pending = { fam: string; req: string; token: string; name: string; priv: CryptoKey; pub: JsonWebKey; denied?: boolean };
export type Rec<T> = { id: string; by: string; updated: number; vis: string[] | null; data: T; nk?: CryptoKey };
export type Stage = "loading" | "lang" | "welcome" | "waiting" | "setlock" | "recovery" | "locked" | "app";

export type State = {
  stage: Stage; settings: Settings; fams: FamRef[]; cur?: FamRef; family?: PublicFamily; me?: Member;
  notes: Record<string, Rec<NoteData>>; questions: Record<string, Rec<QuestionData>>; profiles: Record<string, Rec<ProfileData>>;
  online: boolean; ai: boolean; pending?: { name: string; denied?: boolean }; lock: Lock; seen: number; outbox: number;
  removed?: boolean; bioAvailable: boolean; recoveryPicks?: number[]; lockChosen: boolean;
  /** Where the welcome screens start: the intro, the begin choice, or straight to start / join. */
  welcomeStep?: WelcomeStep;
  /** A small summary of each family on this phone, so the families page can show them all. */
  sums: Record<string, FamSum>;
};
export type WelcomeStep = "intro" | "home" | "kind" | "start" | "join";
export type FamSum = { nick?: string; first: string; people: number; notes: number; who: { n: string; c: string }[]; at: number; kind?: SpaceKind };
export type NotifySettings = { on: boolean; prefs: { rem: boolean; diary: boolean; q: boolean; family: boolean; week: boolean }; diaryAt: string };

const region = () => {
  if (typeof navigator === "undefined") return "";
  for (const l of [navigator.language, ...(navigator.languages ?? [])]) { const m = /[-_]([A-Za-z]{2})\b/.exec(l ?? ""); if (m) return m[1].toUpperCase(); }
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz.startsWith("America/")) return "US"; if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN"; } catch { /* */ }
  return "";
};
const defaultEmergency = () => ({ IN: "108", US: "911", CA: "911", GB: "999", AU: "000", NZ: "111", PK: "1122", BD: "999", LK: "1990" } as Record<string, string>)[region()] ?? "112";
export const SPEECH_DEFAULT: Record<UiLang, string> = { en: "en-US", te: "te-IN", hi: "hi-IN", ta: "ta-IN", es: "es-ES", fr: "fr-FR", ar: "ar-SA", zh: "zh-CN" };
/** The phone's own language, if Meora speaks it. Used until the person picks one. */
const phoneLang = (): UiLang | null => {
  if (typeof navigator === "undefined") return null;
  for (const l of [...(navigator.languages ?? []), navigator.language]) {
    const b = (l ?? "").split("-")[0].toLowerCase();
    if ((Object.keys(SPEECH_DEFAULT) as UiLang[]).includes(b as UiLang)) return b as UiLang;
  }
  return null;
};
const DEFAULT_SETTINGS = (): Settings => ({
  lang: "en", speech: "en-US",
  text: 2, readAloud: true, rate: 1, simple: false, dark: false, defaultVis: "all", smartOn: true, emergency: defaultEmergency(), chosen: false, toured: false,
});

let state: State = {
  stage: "loading", settings: DEFAULT_SETTINGS(), fams: [], notes: {}, questions: {}, profiles: {}, sums: {}, online: true, ai: false,
  lock: { kind: "none" }, seen: 0, outbox: 0, bioAvailable: false, lockChosen: false,
};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const setState = (p: Partial<State>) => { state = { ...state, ...p }; emit(); };
export const getState = () => state;
export function useApp<T>(sel: (s: State) => T): T {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => sel(state), () => sel(state));
}

let keys: Keys | null = null;
let wire: Record<string, WireItem> = {};
let since = 0;
let outbox: WireItem[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let hiddenAt = 0;

// ---------------- talking to the server ----------------
export class ApiError extends Error { constructor(public status: number, m: string) { super(m); } }
async function api<T>(path: string, init?: { method?: string; body?: unknown; auth?: boolean }): Promise<T> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (init?.auth !== false && state.cur) Object.assign(h, { "x-fam": state.cur.fam, "x-member": state.cur.member, "x-token": state.cur.token });
  let r: Response;
  try { r = await fetch(path, { method: init?.method ?? (init?.body ? "POST" : "GET"), headers: h, body: init?.body ? JSON.stringify(init.body) : undefined, cache: "no-store" }); }
  catch { setState({ online: false }); throw new ApiError(0, "offline"); }
  if (!state.online) setState({ online: true });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && init?.auth !== false) await removedFromFamily();
    throw new ApiError(r.status, j.error ?? "error");
  }
  return j as T;
}
/** Same as api(), but signed in as another space on this phone (for notification settings). */
export async function apiAs<T>(ref: FamRef, path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-fam": ref.fam, "x-member": ref.member, "x-token": ref.token }, body: JSON.stringify(body), cache: "no-store" });
  if (!r.ok) throw new ApiError(r.status, "error");
  return r.json() as Promise<T>;
}
const fam = (action: string, b: Record<string, unknown> = {}, auth = true) => api<Record<string, unknown>>("/api/family", { body: { action, ...b }, auth });

// ---------------- start-up ----------------
export async function boot() {
  try { await bootInner(); }
  catch { setState({ stage: "welcome" }); }
}
async function bootInner() {
  const settings = { ...DEFAULT_SETTINGS(), ...((await L.get<Settings>("settings")) ?? {}) };
  if (!settings.chosen) { const l = phoneLang(); if (l) { settings.lang = l; settings.speech = SPEECH_DEFAULT[l]; } }
  settings.speech = standardSpeech(settings.speech);
  const fams = (await L.get<FamRef[]>("fams")) ?? [];
  const savedLock = await L.get<Lock>("lock");
  const lock = savedLock ?? { kind: "none" as const };
  const pending = await L.get<Pending>("pending");
  let bioAvailable = false;
  try { bioAvailable = !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { /* */ }
  // Remember whether smart voice is available, so voice screens know it straight away next time.
  const sums: Record<string, FamSum> = {};
  for (const f of fams) { const x = await L.get<FamSum>(`sum:${f.fam}`); if (x) sums[f.fam] = x; }
  setState({ settings, fams, sums, lock, bioAvailable, lockChosen: !!savedLock, ai: !!(await L.get<boolean>("ai")) });
  fetch("/api/config").then((r) => r.json()).then((j) => { setState({ ai: !!j.ai }); void L.set("ai", !!j.ai).catch(() => {}); }).catch(() => {});
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", () => void syncNow());

  const curId = await L.get<string>("cur");
  const cur = fams.find((f) => f.fam === curId) ?? fams[0];
  if (pending) { setState({ stage: "waiting", pending: { name: pending.name, denied: pending.denied } }); pollJoin(); return; }
  if (!cur) { setState({ stage: "welcome" }); return; }
  await openFamily(cur);
  const joining = new URLSearchParams(location.search).get("join");
  setState({ stage: joining ? "welcome" : lock.kind === "none" ? "app" : "locked" });
}

function onVisibility() {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (state.stage === "app" && state.lock.kind !== "none" && hiddenAt && Date.now() - hiddenAt > 3 * 60e3) setState({ stage: "locked" });
  void syncNow();
}

export async function saveSettings(p: Partial<Settings>) {
  const settings = { ...state.settings, ...p };
  setState({ settings });
  await L.set("settings", settings);
}

// ---------------- opening a family ----------------
async function openFamily(ref: FamRef) {
  const k = await L.get<Keys>(`keys:${ref.fam}`);
  if (!k) { await forgetFamily(ref.fam); return; }
  keys = k;
  const cache = await L.get<{ since: number; wire: Record<string, WireItem>; family: PublicFamily }>(`cache:${ref.fam}`);
  wire = cache?.wire ?? {}; since = cache?.since ?? 0;
  outbox = (await L.get<WireItem[]>(`outbox:${ref.fam}`)) ?? [];
  const seen = (await L.get<number>(`seen:${ref.fam}`)) ?? Date.now();
  const recoveryPicks = await L.get<number[]>(`rpicks:${ref.fam}`);
  setState({ cur: ref, family: cache?.family, me: cache?.family?.members.find((m) => m.id === ref.member), notes: {}, questions: {}, profiles: {}, seen, outbox: outbox.length, removed: false, recoveryPicks });
  await L.set("cur", ref.fam);
  await decryptAll(Object.values(wire));
  for (const w of outbox) await applyWire(w);
  if (timer) clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden && state.stage === "app") void syncNow(); }, 20000);
  void saveSum();
  void syncNow();
  void import("./push").then((m) => m.refreshPush()).catch(() => {});
}

/** Remember this family's name, people and count, so the families page can show it while another family is open. */
async function saveSum() {
  const ref = state.cur, fam = state.family; if (!ref || !fam) return;
  const people = fam.members.filter((m) => !m.removed).sort((a, b) => a.joined - b.joined);
  const old = state.sums[ref.fam];
  const sum: FamSum = { nick: old?.nick, first: people[0]?.name ?? "", people: people.length, notes: Object.keys(state.notes).length, who: people.slice(0, 5).map((m) => ({ n: m.name, c: m.color })), at: old?.at ?? 0, ...(fam.kind ? { kind: fam.kind } : {}) };
  sum.at = JSON.stringify({ ...sum, at: 0 }) === JSON.stringify({ ...old, at: 0 }) ? sum.at : Date.now();
  if (old && sum.at === old.at) return;
  setState({ sums: { ...state.sums, [ref.fam]: sum } });
  try { await L.set(`sum:${ref.fam}`, sum); } catch { /* not important */ }
}
/** A name for a family, chosen on this phone only. Empty clears it. */
export async function nameFamily(f: string, nick: string) {
  const old = state.sums[f]; if (!old) return;
  const sum = { ...old, nick: nick.trim().slice(0, 40) || undefined };
  setState({ sums: { ...state.sums, [f]: sum } });
  await L.set(`sum:${f}`, sum);
}

async function decryptAll(list: WireItem[]) {
  const notes = { ...state.notes }, questions = { ...state.questions }, profiles = { ...state.profiles };
  for (const w of list) {
    delete notes[w.id]; delete questions[w.id]; delete profiles[w.id];
    if (w.deleted || !w.box || !keys) continue;
    try {
      let key = keys.fk, nk: CryptoKey | undefined;
      if (w.keys) {
        const mine = w.keys[state.cur!.member]; if (!mine) continue;
        const author = state.family?.members.find((m) => m.id === w.by); if (!author) continue;
        nk = await C.openKeyFrom(mine, keys.priv, author.pub, true); key = nk;
      }
      const data = await C.openJSON<Payload>(key, w.box);
      const rec = { id: w.id, by: w.by, updated: w.updated, vis: w.vis ?? null, data, nk };
      if (data.kind === "note") notes[w.id] = rec as Rec<NoteData>;
      else if (data.kind === "question") questions[w.id] = rec as Rec<QuestionData>;
      else if (data.kind === "profile") profiles[w.id] = rec as Rec<ProfileData>;
    } catch { /* can't open: not for us, or damaged */ }
  }
  setState({ notes, questions, profiles });
}
const applyWire = (w: WireItem) => decryptAll([w]);

let syncing: Promise<void> | null = null;
export function syncNow(): Promise<void> {
  if (!state.cur || !keys) return Promise.resolve();
  return (syncing ??= (async () => {
    try {
      if (outbox.length) {
        const batch = outbox.slice(0, 40);
        const r = await api<{ items: WireItem[] }>("/api/items", { body: { items: batch } });
        outbox = outbox.slice(batch.length);
        await L.set(`outbox:${state.cur!.fam}`, outbox);
        for (const w of r.items) wire[w.id] = w;
        setState({ outbox: outbox.length });
      }
      const r = await api<{ family: PublicFamily; items: WireItem[]; now: number; me: string }>(`/api/sync?since=${since}`);
      const famChanged = JSON.stringify(r.family.members) !== JSON.stringify(state.family?.members);
      setState({ family: r.family, me: r.family.members.find((m) => m.id === r.me) });
      const fresh = r.items.filter((w) => !wire[w.id] || wire[w.id].updated !== w.updated);
      for (const w of r.items) wire[w.id] = w;
      since = Math.max(since, r.now - 1000);
      if (famChanged) await decryptAll(Object.values(wire)); else if (fresh.length) await decryptAll(fresh);
      await L.set(`cache:${state.cur!.fam}`, { since, wire, family: r.family });
      void saveSum();
      if (fresh.length) void import("./push").then((m) => m.refreshPush()).catch(() => {});
    } catch { /* offline: keep what we have */ }
    finally { syncing = null; }
  })());
}

async function removedFromFamily() {
  if (!state.cur) return;
  const f = state.cur.fam;
  await forgetFamily(f);
  setState({ removed: true });
}
async function forgetFamily(f: string) {
  await L.delPrefix(`cache:${f}`); await L.delPrefix(`outbox:${f}`); await L.delPrefix(`keys:${f}`); await L.delPrefix(`blob:${f}`); await L.delPrefix(`seen:${f}`); await L.delPrefix(`rpicks:${f}`); await L.delPrefix(`sum:${f}`);
  const fams = state.fams.filter((x) => x.fam !== f);
  await L.set("fams", fams);
  keys = null; wire = {}; outbox = []; since = 0;
  if (timer) clearInterval(timer);
  const sums = { ...state.sums }; delete sums[f];
  setState({ fams, sums, cur: undefined, family: undefined, me: undefined, notes: {}, questions: {}, profiles: {} });
  if (fams[0]) await openFamily(fams[0]); else setState({ stage: "welcome" });
}

// ---------------- starting, joining, recovering ----------------
const newToken = () => C.randomId(32);
async function adopt(ref: FamRef, k: Keys, family: PublicFamily) {
  await L.set(`keys:${ref.fam}`, k);
  const fams = [...state.fams.filter((f) => f.fam !== ref.fam), ref];
  await L.set("fams", fams);
  await L.set(`cache:${ref.fam}`, { since: 0, wire: {}, family });
  await L.set(`seen:${ref.fam}`, Date.now());
  setState({ fams });
  await openFamily(ref);
}

export async function startFamily(name: string, kind: SpaceKind = "family") {
  const fk = await C.newFamilyKey(); const dk = await C.newDeviceKeys(); const token = newToken();
  const r = await fam("create", { name, pub: dk.pub, token, kind }, false) as { fam: string; member: string; family: PublicFamily };
  await adopt({ fam: r.fam, member: r.member, token }, { fk, priv: dk.priv, pub: dk.pub }, r.family);
  await makeRecovery();
  setState({ stage: "recovery" });
}

export async function requestJoin(by: { code?: number[]; link?: string }, name: string) {
  const dk = await C.newDeviceKeys(); const token = newToken();
  const r = await fam("join", { ...by, name, pub: dk.pub, token }, false) as { fam: string; req: string };
  const p: Pending = { fam: r.fam, req: r.req, token, name, priv: dk.priv, pub: dk.pub };
  await L.set("pending", p);
  setState({ stage: "waiting", pending: { name } });
  pollJoin();
}
let polling = false;
async function pollJoin() {
  if (polling) return; polling = true;
  try {
    for (;;) {
      const p = await L.get<Pending>("pending");
      if (!p || state.stage !== "waiting") return;
      let r: Record<string, unknown> | null = null;
      try { r = await fam("status", { fam: p.fam, req: p.req, token: p.token }, false); } catch { /* retry */ }
      if (r?.status === "allowed") {
        const family = r.family as PublicFamily;
        const by = family.members.find((m) => m.id === r!.by);
        const fk = await C.openKeyFrom(r.sealed as Sealed, p.priv, by!.pub, true);
        await L.del("pending");
        await adopt({ fam: p.fam, member: r.member as string, token: p.token }, { fk, priv: p.priv, pub: p.pub }, family);
        setState({ pending: undefined, stage: state.lockChosen ? "app" : "setlock" });
        return;
      }
      if (r?.status === "denied" || r?.status === "gone") { await L.set("pending", { ...p, denied: true }); setState({ pending: { name: p.name, denied: true } }); return; }
      await new Promise((res) => setTimeout(res, 3000));
    }
  } finally { polling = false; }
}
export async function cancelJoin() {
  await L.del("pending");
  setState({ pending: undefined, stage: state.cur ? "app" : "welcome" });
}

export async function useRecovery(picks: number[], name: string) {
  const { lookup, key } = await C.recoveryKeys(picks);
  const dk = await C.newDeviceKeys(); const token = newToken();
  const r = await fam("recovery-use", { lookup, name, pub: dk.pub, token }, false) as { fam: string; member: string; box: Sealed; family: PublicFamily };
  const fk = await C.keyFromRaw(await C.open(key, r.box), true);
  await adopt({ fam: r.fam, member: r.member, token }, { fk, priv: dk.priv, pub: dk.pub }, r.family);
  setState({ stage: state.lockChosen ? "app" : "setlock" });
}

export async function makeRecovery() {
  if (!keys || !state.cur) return;
  const pool = PICTURES.map((_, i) => i), picks: number[] = [];
  const rnd = crypto.getRandomValues(new Uint32Array(RECOVERY_LENGTH));
  for (let i = 0; i < RECOVERY_LENGTH; i++) picks.push(pool.splice(rnd[i] % pool.length, 1)[0]);
  const { lookup, key } = await C.recoveryKeys(picks);
  const box = await C.seal(key, await C.rawKey(keys.fk));
  await fam("recovery-set", { lookup, box });
  await L.set(`rpicks:${state.cur.fam}`, picks);
  setState({ recoveryPicks: picks });
}

export const go = (stage: Stage) => setState({ stage, welcomeStep: undefined });
/** Open the welcome screens to start or join another family. */
export const addFamily = (step: WelcomeStep) => setState({ stage: "welcome", welcomeStep: step });
export const backToApp = () => setState({ stage: state.lock.kind === "none" ? "app" : "locked" });
export const afterRecovery = () => setState({ stage: state.lockChosen ? "app" : "setlock" });

// ---------------- the lock ----------------
export async function setLock(kind: Lock["kind"], picks?: number[]) {
  let lock: Lock = { kind: "none" };
  if (kind === "bio") {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Meora" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "Meora", displayName: state.me?.name ?? "Meora" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!cred) throw new Error("cancelled");
    lock = { kind: "bio", cred: C.b64(cred.rawId) };
  } else if (kind === "pics" && picks) {
    const salt = C.randomId(16);
    lock = { kind: "pics", salt, hash: await C.sha(salt + picks.join(",")) };
  }
  await L.set("lock", lock);
  setState({ lock, lockChosen: true });
}
export async function unlockBio() {
  const l = state.lock; if (l.kind !== "bio" || !l.cred) return false;
  try {
    const ok = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: C.unb64(l.cred) as BufferSource }], userVerification: "required", timeout: 60000 } });
    if (ok) { setState({ stage: "app" }); void syncNow(); return true; }
  } catch { /* cancelled */ }
  return false;
}
export async function unlockPics(picks: number[]) {
  const l = state.lock; if (l.kind !== "pics") return false;
  if ((await C.sha(l.salt + picks.join(","))) === l.hash) { setState({ stage: "app" }); void syncNow(); return true; }
  return false;
}
export const lockNow = () => { if (state.lock.kind !== "none") setState({ stage: "locked" }); };

// ---------------- saving ----------------
async function sealItem(id: string, data: Payload, vis: string[] | null, nk?: CryptoKey): Promise<WireItem> {
  if (!keys || !state.cur) throw new Error("no family");
  const live = state.family?.members.filter((m) => !m.removed) ?? [];
  if (vis) {
    const ids = [...new Set([...vis, state.cur.member])].filter((x) => live.some((m) => m.id === x));
    nk ??= await C.newNoteKey();
    const k: Record<string, Sealed> = {};
    for (const mid of ids) k[mid] = await C.sealKeyFor(nk, keys.priv, live.find((m) => m.id === mid)!.pub);
    return { id, kind: data.kind, by: state.cur.member, updated: Date.now(), vis: ids, box: await C.sealJSON(nk, data), keys: k };
  }
  return { id, kind: data.kind, by: state.cur.member, updated: Date.now(), vis: null, box: await C.sealJSON(keys.fk, data) };
}
async function push(w: WireItem) {
  outbox = [...outbox.filter((x) => x.id !== w.id), w];
  await L.set(`outbox:${state.cur!.fam}`, outbox);
  setState({ outbox: outbox.length });
  await applyWire(w);
  await syncNow();
}

export async function saveItem(data: Payload, opts: { id?: string; vis?: string[] | null } = {}) {
  const id = opts.id ?? C.randomId(16);
  const old = state.notes[id] ?? state.profiles[id] ?? state.questions[id];
  const vis = opts.vis === undefined ? (old?.vis ?? null) : opts.vis;
  await push(await sealItem(id, data, vis, vis ? old?.nk : undefined));
  return id;
}
export async function deleteItem(id: string) {
  const old = state.notes[id] ?? state.profiles[id] ?? state.questions[id];
  if (!old || !state.cur) return;
  await push({ id, kind: old.data.kind, by: state.cur.member, updated: Date.now(), deleted: true, vis: old.vis });
}

export async function uploadBlob(bytes: Uint8Array, mime: string): Promise<BlobRef> {
  const k = await C.newNoteKey();
  const id = C.randomId(16);
  const sealed = await C.seal(k, bytes);
  const data = JSON.stringify(sealed);
  await api("/api/blob", { body: { id, data } });
  await L.set(`blob:${state.cur!.fam}:${id}`, data);
  return { id, key: C.b64(await C.rawKey(k)), mime };
}
export async function loadBlob(ref: BlobRef): Promise<string> {
  const f = state.cur!.fam;
  let data = await L.get<string>(`blob:${f}:${ref.id}`);
  if (!data) { data = (await api<{ data: string }>(`/api/blob?id=${ref.id}`)).data; await L.set(`blob:${f}:${ref.id}`, data); }
  const bytes = await C.open(await C.keyFromRaw(C.unb64(ref.key), false), JSON.parse(data));
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: ref.mime }));
}

// ---------------- family ----------------
export const invite = () => fam("invite") as Promise<{ code: number[]; link: string; expires: number }>;
export async function decide(req: string, allow: boolean) {
  const full = await api<{ family: PublicFamily }>("/api/family", { body: { action: "decide", req, allow, sealed: allow ? await sealForRequest(req) : undefined } });
  setState({ family: full.family });
  await syncNow();
}
async function sealForRequest(req: string) {
  const pub = state.family?.requests.find((r) => r.id === req)?.pub;
  if (!pub || !keys) throw new Error("missing");
  return C.sealKeyFor(keys.fk, keys.priv, pub);
}
export async function memberAction(m: { action: string; id?: string; value?: boolean; name?: string }) {
  const r = await fam("member", { m });
  if (r.deleted) { await forgetFamily(state.cur!.fam); return; }
  if (m.action === "leave") { await forgetFamily(state.cur!.fam); return; }
  setState({ family: r.family as PublicFamily });
}
export async function switchFamily(f: string) {
  const ref = state.fams.find((x) => x.fam === f); if (ref) await openFamily(ref);
}
export async function wipePhone() { await L.wipeAll(); location.reload(); }
export async function markSeen() { const now = Date.now(); setState({ seen: now }); if (state.cur) await L.set(`seen:${state.cur.fam}`, now); }

export async function exportNotes(): Promise<string> {
  const name = (id: string) => state.family?.members.find((m) => m.id === id)?.name ?? "?";
  const lines = Object.values(state.notes).sort((a, b) => a.data.topic.localeCompare(b.data.topic)).map((n) =>
    `[${n.data.topic}] ${n.data.text}${n.data.about.length ? `  (about: ${n.data.about.join(", ")})` : ""}  — ${name(n.by)}, ${new Date(n.updated).toLocaleDateString()}`);
  const profiles = Object.values(state.profiles).map((p) => `[emergency] ${p.data.person}: blood ${p.data.blood ?? "-"}, allergies ${p.data.allergies ?? "-"}, medicines ${p.data.meds ?? "-"}, doctor ${p.data.doctor ?? "-"} ${p.data.doctorPhone ?? ""}`);
  return `Meora — family notes (${new Date().toLocaleString()})\n\n${[...lines, ...profiles].join("\n")}\n`;
}

export async function aiCall<T>(body: Record<string, unknown>) { return api<T>("/api/ai", { body }); }
