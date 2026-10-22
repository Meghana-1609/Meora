// Voice in and voice out, using what's built into the phone. Free and unlimited.
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
const Ctor = () => (typeof window === "undefined" ? null : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Rec) | null);
export const canListen = () => !!Ctor();

/**
 * Joins what the phone heard into one clean sentence.
 * Android Chrome repeats itself: each new result often contains the whole phrase again
 * ("Amma", "Amma you", "Amma you every day"...). We keep only the newest, longest version.
 */
export function joinResults(parts: string[]): string {
  const out: string[] = [];
  for (const raw of parts) {
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t) continue;
    const last = out[out.length - 1];
    if (last !== undefined && (t.startsWith(last) || t.toLowerCase().startsWith(last.toLowerCase()))) out[out.length - 1] = t;
    else if (last !== undefined && (last.startsWith(t) || last.endsWith(t) || last.toLowerCase().includes(t.toLowerCase()) && t.split(" ").length > 2)) continue;
    else out.push(t);
  }
  return cleanRepeats(out.join(" "));
}

/** Removes a phrase said twice in a row: "take tablet take tablet" -> "take tablet". */
export function cleanRepeats(text: string): string {
  let w = text.split(/\s+/).filter(Boolean);
  for (let n = Math.min(12, Math.floor(w.length / 2)); n >= 1; n--) {
    const res: string[] = [];
    for (let i = 0; i < w.length; ) {
      const a = w.slice(i, i + n).join(" "), b = w.slice(i + n, i + 2 * n).join(" ");
      if (n > 1 && a && a === b) { i += n; continue; }
      if (n === 1 && w[i] === w[i + 1]) { i += 1; continue; }
      res.push(w[i]); i++;
    }
    w = res;
  }
  return w.join(" ");
}

const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

export function listen(lang: string, on: { text: (finalText: string, interim: string) => void; end: () => void; error: (e: string) => void }) {
  const C = Ctor();
  if (!C) { on.error("unsupported"); return () => {}; }
  let committed = "", stopped = false, sessionFinal = "", r: Rec | null = null, quiet = 0;
  const begin = () => {
    r = new C();
    r.lang = lang;
    // Android repeats words in "continuous" mode, so there we listen one phrase at a time and join phrases ourselves.
    r.continuous = !isAndroid();
    r.interimResults = true; r.maxAlternatives = 1;
    sessionFinal = "";
    r.onresult = (e) => {
      const finals: string[] = []; let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals.push(res[0].transcript); else interim = res[0].transcript;
      }
      sessionFinal = joinResults(finals);
      // on Android the "interim" often already includes the final words: show only what's new
      let shown = interim.trim();
      if (sessionFinal && shown.startsWith(sessionFinal)) shown = shown.slice(sessionFinal.length).trim();
      on.text(joinResults([committed, sessionFinal]), shown);
    };
    r.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") { stopped = true; on.error(e.error); } };
    r.onend = () => {
      // stop by itself after two silent turns, so the phone doesn't keep beeping
      quiet = sessionFinal ? 0 : quiet + 1;
      if (quiet >= 2) stopped = true;
      committed = joinResults([committed, sessionFinal]); sessionFinal = "";
      if (!stopped) { try { begin(); return; } catch { /* ended */ } }
      on.end();
    };
    try { r.start(); } catch { stopped = true; on.error("busy"); }
  };
  begin();
  return () => { stopped = true; try { r?.stop(); } catch { /* */ } };
}

/** Guess the language of some text from its alphabet. */
export function scriptLang(text: string, fallback: string) {
  if (/[ఀ-౿]/.test(text)) return "te-IN";
  if (/[஀-௿]/.test(text)) return "ta-IN";
  if (/[ಀ-೿]/.test(text)) return "kn-IN";
  if (/[ഀ-ൿ]/.test(text)) return "ml-IN";
  if (/[ঀ-৿]/.test(text)) return "bn-IN";
  if (/[઀-૿]/.test(text)) return "gu-IN";
  if (/[਀-੿]/.test(text)) return "pa-IN";
  if (/[ऀ-ॿ]/.test(text)) return fallback.startsWith("mr") || fallback.startsWith("ne") ? fallback : "hi-IN";
  if (/[؀-ۿ]/.test(text)) return fallback.startsWith("ur") || fallback.startsWith("fa") ? fallback : "ar-SA";
  if (/[぀-ヿ]/.test(text)) return "ja-JP";
  if (/[가-힯]/.test(text)) return "ko-KR";
  if (/[一-鿿]/.test(text)) return "zh-CN";
  if (/[Ѐ-ӿ]/.test(text)) return "ru-RU";
  if (/[฀-๿]/.test(text)) return "th-TH";
  return /^[\x00-\x7F\s]*$/.test(text) && !fallback.startsWith("en") && /[a-z]{3}/i.test(text) ? fallback : fallback;
}

let speaking: SpeechSynthesisUtterance | null = null;
/** Picks the most human-sounding voice the phone has for this language. */
function bestVoice(lang: string) {
  const voices = speechSynthesis.getVoices();
  const base = lang.split("-")[0].toLowerCase();
  const same = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === lang.toLowerCase());
  const close = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online|enhanced|premium|wavenet/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (!v.localService ? 1 : 0) + (same.includes(v) ? 1 : 0);
  return [...(same.length ? same : close)].sort((a, b) => score(b) - score(a))[0];
}
export function say(text: string, lang: string, rate = 1, onEnd?: () => void) {
  if (typeof speechSynthesis === "undefined") return false;
  speechSynthesis.cancel();
  // speak calmly, sentence by sentence, like a person
  const parts = cleanRepeats(text).split(/(?<=[.!?।])\s+/).filter(Boolean).slice(0, 8);
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = lang; u.rate = rate; u.pitch = 1;
    const v = bestVoice(lang); if (v) u.voice = v;
    if (i === parts.length - 1) u.onend = () => { speaking = null; onEnd?.(); };
    speaking = u;
    speechSynthesis.speak(u);
  });
  return true;
}
if (typeof window !== "undefined" && typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { /* load voices early */ };
export const hush = () => { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); speaking = null; };
