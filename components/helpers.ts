"use client";
import { getState, aiCall, useApp } from "./store";
import { scriptLang } from "@/lib/speech";
import { speakNatural } from "./voice";
import { t, LOCALE } from "./i18n";
import { track } from "./track";

export function useMembers() { return useApp((s) => s.family?.members ?? []); }
export const nameOf = (id: string) => getState().family?.members.find((m) => m.id === id)?.name ?? t("someone");
export const colorOf = (id: string) => getState().family?.members.find((m) => m.id === id)?.color ?? "#8C9AAB";
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(LOCALE(), { day: "numeric", month: "short", year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
export const fmtDay = (d: Date) => ({ day: d.getDate(), mon: d.toLocaleDateString(LOCALE(), { month: "short" }).toUpperCase() });

export function speak(text: string, lang?: string) {
  track("listen");
  void speakNatural(text, lang);
  return true;
}

/** Phone numbers in a note become "Call" buttons. */
export function phones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?:\+?\d[\d\s-]{7,15}\d)/g)) {
    const d = m[0].replace(/[^\d+]/g, "");
    if (d.replace("+", "").length >= 6 && d.replace("+", "").length <= 13) out.push(d);
  }
  return [...new Set(out)];
}

/** Translate: on-phone first (Chrome's built-in translator), then smart answers if turned on, else Google Translate. */
export async function translate(text: string, toLang: string): Promise<{ text?: string; openUrl?: string }> {
  const to = toLang.split("-")[0];
  track("translate");
  const from = scriptLang(text, "en-US").split("-")[0];
  const w = window as unknown as { Translator?: { availability(o: object): Promise<string>; create(o: object): Promise<{ translate(s: string): Promise<string> }> } };
  if (w.Translator && from !== to) {
    try {
      const a = await w.Translator.availability({ sourceLanguage: from, targetLanguage: to });
      if (a !== "unavailable") { const tr = await w.Translator.create({ sourceLanguage: from, targetLanguage: to }); return { text: await tr.translate(text) }; }
    } catch { /* fall through */ }
  }
  const s = getState();
  if (s.ai && s.settings.smartOn) {
    try { return { text: (await aiCall<{ text: string }>({ task: "translate", text, to })).text }; } catch { /* fall through */ }
  }
  return { openUrl: `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(to)}&text=${encodeURIComponent(text)}&op=translate` };
}

export function download(name: string, text: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
