"use client";
// Anonymous counts so the owner knows how Meora is used ("a question was answered").
// Sends only event names. Never the words you save or ask.
const q: Record<string, number> = {};
const errs: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let device = "";
function deviceId() {
  if (device) return device;
  try { device = localStorage.getItem("meora-d") ?? ""; if (!device) { device = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join(""); localStorage.setItem("meora-d", device); } }
  catch { device = "anon000000"; }
  return device;
}
function flush() {
  timer = null;
  if (!Object.keys(q).length && !errs.length) return;
  const body = JSON.stringify({ d: deviceId(), e: { ...q }, err: errs.splice(0) });
  for (const k of Object.keys(q)) delete q[k];
  try { fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {}); } catch { /* offline */ }
}
export function track(name: string, n = 1) {
  if (typeof window === "undefined") return;
  q[name] = (q[name] ?? 0) + n;
  if (!timer) timer = setTimeout(flush, 4000);
}
const seenErr = new Set<string>();
export function trackError(msg: string) {
  const m = msg.slice(0, 200);
  if (seenErr.has(m) || seenErr.size >= 10) return;
  seenErr.add(m);
  if (errs.length < 5) errs.push(m);
  if (!timer) timer = setTimeout(flush, 4000);
}
let started = false;
export function startTracking(lang: string, speech: string) {
  if (started || typeof window === "undefined") return;
  started = true;
  const ua = navigator.userAgent;
  track("open");
  track("os:" + (/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : /windows/i.test(ua) ? "windows" : /mac/i.test(ua) ? "mac" : "other"));
  if (matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone) track("installed_open");
  track("lang:" + lang); track("speech:" + speech);
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) track("no_voice");
  window.addEventListener("error", (e) => trackError(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => trackError(String((e.reason as Error)?.message ?? e.reason)));
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
}
