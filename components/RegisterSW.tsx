"use client";
import { useEffect } from "react";

/** Offline support + automatic updates: when a new version of Meora goes live, phones refresh themselves. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    let mine = "";
    const check = async () => {
      try {
        const j = await (await fetch("/api/config", { cache: "no-store" })).json();
        if (!j?.v) return;
        if (!mine) { mine = j.v; return; }
        // Never interrupt someone who is saving or typing.
        const busy = /^\/(save|note)/.test(location.pathname) || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT";
        if (j.v !== mine && !busy) location.reload();
      } catch { /* offline */ }
    };
    void check();
    const onShow = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onShow);
    const id = setInterval(check, 5 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onShow); clearInterval(id); };
  }, []);
  return null;
}
