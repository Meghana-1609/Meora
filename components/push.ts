"use client";
// Phone notifications: asking permission, and keeping the server up to date
// (what this person wants, and when their reminders are). Never sends what a note says.
import { apiAs, getState, saveSettings, type NotifySettings } from "./store";
import { nextTime } from "@/lib/dates";

export const DEFAULT_NOTIFY: NotifySettings = { on: false, prefs: { rem: true, diary: true, q: true, family: true, week: false }, diaryAt: "20:00" };

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
/** iPhones only allow notifications once Meora is added to the Home Screen. */
export function iosNeedsInstall() {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !installed;
}
export const permission = () => (pushSupported() ? Notification.permission : "denied");

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };

async function subscription(create: boolean) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) {
    const { key } = await (await fetch("/api/push", { cache: "no-store" })).json() as { key: string };
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  }
  return sub;
}

/** The next reminder times for the open space (two weeks ahead), so the phone rings even when Meora is closed. */
function reminderTimes() {
  const now = Date.now(), end = now + 14 * 86400e3, out: number[] = [];
  for (const n of Object.values(getState().notes)) {
    const r = n.data.remind; if (!r) continue;
    let cursor = new Date(now);
    for (let i = 0; i < 20; i++) {
      const t = nextTime(r, cursor); if (!t || t.getTime() > end) break;
      if (t.getTime() > now) out.push(t.getTime());
      if (r.repeat === "once") break;
      cursor = new Date(t.getTime() + 60e3);
    }
  }
  return out.sort((a, b) => a - b).slice(0, 200);
}

const base = (n: NotifySettings) => ({ prefs: n.prefs, diaryAt: n.diaryAt, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang: getState().settings.lang });

/** Turn notifications on. Returns "on", "denied" or "unsupported". */
export async function enablePush(n: NotifySettings): Promise<"on" | "denied" | "unsupported"> {
  if (!pushSupported() || iosNeedsInstall()) return "unsupported";
  const p = await Notification.requestPermission();
  if (p !== "granted") return "denied";
  const sub = await subscription(true);
  if (!sub) return "unsupported";
  const next = { ...n, on: true };
  await saveSettings({ notify: next });
  await sendAll(next, sub);
  return "on";
}
export async function disablePush() {
  const n = getState().settings.notify ?? DEFAULT_NOTIFY;
  await saveSettings({ notify: { ...n, on: false } });
  for (const f of getState().fams) await apiAs(f, "/api/push", { action: "off" }).catch(() => {});
}
/** Change what to get (applies to every space on this phone). */
export async function updatePush(n: NotifySettings) {
  await saveSettings({ notify: n });
  if (!n.on || permission() !== "granted") return;
  const sub = await subscription(false).catch(() => null);
  if (sub) await sendAll(n, sub);
}
async function sendAll(n: NotifySettings, sub: PushSubscription) {
  const st = getState();
  for (const f of st.fams) {
    const extra = f.fam === st.cur?.fam ? { rems: reminderTimes() } : {};
    await apiAs(f, "/api/push", { action: "save", sub: sub.toJSON(), ...base(n), ...extra }).catch(() => {});
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** After opening a space or when notes change: send the latest reminder times (quietly, at most every few seconds). */
export function refreshPush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const st = getState(), n = st.settings.notify;
    if (!n?.on || !st.cur || permission() !== "granted") return;
    const sub = await subscription(false).catch(() => null);
    if (!sub) return;
    await apiAs(st.cur, "/api/push", { action: "save", sub: sub.toJSON(), ...base(n), rems: reminderTimes() }).catch(() => {});
  }, 2500);
}
