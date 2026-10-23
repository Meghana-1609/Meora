"use client";
// Real pages with real web addresses (/ask, /family, /topic/health …), and the phone's Back button works.
import { useSyncExternalStore } from "react";
import type { TopicId } from "@/lib/types";

export type Route =
  | { s: "home" } | { s: "save"; topic?: TopicId; about?: string; answers?: string; edit?: string; mode?: "type" | "photo" | "voice"; diary?: boolean; prompt?: string }
  | { s: "ask"; q?: string } | { s: "topic"; id: TopicId } | { s: "topics" } | { s: "note"; id: string } | { s: "emergency"; person?: string }
  | { s: "family" } | { s: "families" } | { s: "settings" } | { s: "lang" } | { s: "privacy" } | { s: "questions" } | { s: "news" } | { s: "recovery" } | { s: "tour" } | { s: "more" } | { s: "notify" };

const TOPIC_IDS = ["health", "contacts", "where", "dates", "recipes", "home", "money", "kids", "vehicles", "stories", "diary", "other"];
export function pathOf(r: Route): string {
  switch (r.s) {
    case "home": return "/";
    case "topic": return `/topic/${r.id}`;
    case "note": return `/note/${r.id}`;
    case "lang": return "/settings/language";
    case "recovery": return "/settings/recovery";
    case "tour": return "/help";
    case "notify": return "/settings/notifications";
    case "save": return r.diary ? "/diary" : "/save";
    default: return `/${r.s}`;
  }
}
export function routeOf(path: string): Route {
  const [a, b] = path.replace(/^\/+|\/+$/g, "").split("/");
  if (!a) return { s: "home" };
  if (a === "topic" && b && TOPIC_IDS.includes(b)) return { s: "topic", id: b as TopicId };
  if (a === "note" && b && /^[A-Za-z0-9_-]{8,40}$/.test(b)) return { s: "note", id: b };
  if (a === "settings" && b === "language") return { s: "lang" };
  if (a === "settings" && b === "recovery") return { s: "recovery" };
  if (a === "help") return { s: "tour" };
  if (a === "diary") return { s: "save", diary: true };
  if (a === "settings" && b === "notifications") return { s: "notify" };
  const simple = ["save", "ask", "topics", "emergency", "family", "families", "settings", "privacy", "questions", "news", "more"];
  return simple.includes(a) ? ({ s: a } as Route) : { s: "home" };
}

let stack: Route[] = [{ s: "home" }];
let pendingTab: Route | null = null;
const subs = new Set<() => void>();
const emit = () => { subs.forEach((f) => f()); if (typeof window !== "undefined") window.scrollTo(0, 0); };
let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const first = routeOf(location.pathname);
  const q = location.search;
  history.replaceState({ d: 0 }, "", "/" + (first.s === "home" ? q : ""));
  if (first.s !== "home") { stack = [{ s: "home" }, first]; history.pushState({ d: 1 }, "", pathOf(first)); }
  window.addEventListener("popstate", (e) => {
    const d = (e.state?.d as number) ?? 0;
    if (d < stack.length - 1) stack = stack.slice(0, d + 1);
    if (pendingTab) { const r = pendingTab; pendingTab = null; stack = [{ s: "home" }, r]; history.pushState({ d: 1 }, "", pathOf(r)); }
    emit();
  });
}
export const nav = {
  push(r: Route) { start(); stack = [...stack, r]; history.pushState({ d: stack.length - 1 }, "", pathOf(r)); emit(); },
  replace(r: Route) { start(); stack = [...stack.slice(0, -1), r]; history.replaceState({ d: stack.length - 1 }, "", pathOf(r)); emit(); },
  back() { start(); if (stack.length > 1) history.back(); },
  home() { start(); const n = stack.length - 1; if (n > 0) history.go(-n); },
  /** Bottom tabs: always Home → that page, so Back returns Home. */
  tab(r: Route) {
    start();
    const depth = stack.length - 1;
    if (r.s === "home") return nav.home();
    if (depth === 0) return nav.push(r);
    if (depth === 1) { stack = [{ s: "home" }, r]; history.replaceState({ d: 1 }, "", pathOf(r)); emit(); return; }
    pendingTab = r; history.go(-depth);
  },
};
export function useRoute() {
  start();
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => stack[stack.length - 1], () => stack[0]);
}
