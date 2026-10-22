"use client";
// Voice out: a natural human voice (Google Gemini) when Smart AI is on; otherwise the phone's own voice.
// Voice in: records and lets Gemini understand any language, even Telugu and English mixed.
import { aiCall, getState } from "./store";
import { say, hush, scriptLang } from "@/lib/speech";
import { canRecord, blobToBase64, toWav } from "@/lib/recorder";

export const smartReady = () => { const s = getState(); return s.ai && s.settings.smartOn && canRecord(); };

let audio: HTMLAudioElement | null = null;
const cache = new Map<string, string>();
let token = 0;
export function stopSpeaking() { token++; hush(); if (audio) { audio.pause(); audio = null; } }

export async function speakNatural(text: string, lang?: string) {
  const s = getState();
  stopSpeaking();
  const my = token;
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  if (s.ai && s.settings.smartOn) {
    try {
      let url = cache.get(clean);
      if (!url) {
        const r = await aiCall<{ audio: string; mime: string }>({ task: "speak", text: clean });
        const bytes = Uint8Array.from(atob(r.audio), (c) => c.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: r.mime || "audio/wav" }));
        cache.set(clean, url);
      }
      if (my !== token) return;
      audio = new Audio(url);
      audio.playbackRate = s.settings.rate || 1;
      await audio.play();
      return;
    } catch { /* fall back to the phone's voice */ }
  }
  if (my !== token) return;
  say(clean, scriptLang(clean, lang ?? s.settings.speech), s.settings.rate || 1);
}

export async function understand(blob: Blob): Promise<{ text: string; english: string; lang: string }> {
  const s = getState();
  const wav = await toWav(blob);
  return aiCall({ task: "transcribe", audio: await blobToBase64(wav), mime: wav.type || "audio/webm", lang: `${s.settings.lang}; the person usually speaks ${s.settings.speech}` });
}
