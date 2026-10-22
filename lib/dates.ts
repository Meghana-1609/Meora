import type { Remind } from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  జనవరి: 1, ఫిబ్రవరి: 2, మార్చి: 3, ఏప్రిల్: 4, మే: 5, జూన్: 6, జూలై: 7, ఆగస్టు: 8, సెప్టెంబర్: 9, అక్టోబర్: 10, నవంబర్: 11, డిసెంబర్: 12,
  जनवरी: 1, फरवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, अक्टूबर: 10, नवंबर: 11, दिसंबर: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const valid = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();

/** Finds a date in what someone said: "24 October", "Oct 24th", "24/10", "2026-12-15". */
export function parseDate(text: string, now = new Date(), monthFirst = false): string | null {
  const t = text.toLowerCase();
  let m = t.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (m && valid(+m[1], +m[2], +m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  const names = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  const yearOf = (mo: number, d: number, y?: string) => {
    if (y) return +y;
    const cand = new Date(now.getFullYear(), mo - 1, d);
    return cand < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? now.getFullYear() + 1 : now.getFullYear();
  };
  m = t.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s*(?:de\\s+)?(${names})\\.?(?:,?\\s+(20\\d\\d))?`, "u"));
  if (m) { const d = +m[1], mo = MONTHS[m[2]]; const y = yearOf(mo, d, m[3]); if (valid(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`; }
  m = t.match(new RegExp(`(${names})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d\\d))?`, "u"));
  if (m) { const mo = MONTHS[m[1]], d = +m[2]; const y = yearOf(mo, d, m[3]); if (valid(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`; }
  m = t.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](20\d\d|\d\d))?\b/);
  if (m) {
    let d = +m[1], mo = +m[2]; if (monthFirst) [d, mo] = [mo, d];
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : yearOf(mo, d);
    if (valid(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

/** Finds a time: "8 am", "8:30 pm", "morning", "రాత్రి", "सुबह". */
export function parseTime(text: string): string | null {
  const t = text.toLowerCase();
  const m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/);
  if (m) { let h = +m[1] % 12; if (m[3].startsWith("p")) h += 12; return `${pad(h)}:${m[2] ?? "00"}`; }
  // "ఉదయం 8 గంటలకు", "रात 9 बजे", "இரவு 9 மணி"
  const local = t.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:గంటలకు|గంటలు|గంటకు|బజే|बजे|மணிக்கு|மணி|o'?clock)/);
  if (local) {
    let h = +local[1] % 24;
    if (h < 12 && /సాయంత్రం|రాత్రి|మధ్యాహ్నం|शाम|रात|दोपहर|மாலை|இரவு|மதியம்|evening|night|afternoon/.test(t)) h += 12;
    return `${pad(h)}:${local[2] ?? "00"}`;
  }
  const h24 = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (h24) return `${pad(+h24[1])}:${h24[2]}`;
  if (/morning|breakfast|ఉదయం|పొద్దున|सुबह|காலை|mañana|matin/.test(t)) return "08:00";
  if (/afternoon|lunch|మధ్యాహ్నం|दोपहर|மதியம்|tarde|midi/.test(t)) return "13:00";
  if (/evening|సాయంత్రం|शाम|மாலை|soir/.test(t)) return "18:00";
  if (/night|dinner|bed ?time|రాత్రి|रात|இரவு|noche|nuit/.test(t)) return "21:00";
  return null;
}

/** When this reminder happens next (or today if it's later today). */
export function nextTime(r: Remind, now = new Date()): Date | null {
  const [hh, mm] = (r.time ?? "09:00").split(":").map(Number);
  const at = (d: Date) => { const x = new Date(d); x.setHours(hh, mm, 0, 0); return x; };
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (r.repeat === "daily") { const t = at(today0); return t >= now ? t : at(new Date(today0.getTime() + 86400e3)); }
  if (!r.date) return null;
  const [y, mo, d] = r.date.split("-").map(Number);
  if (r.repeat === "once") { const t = at(new Date(y, mo - 1, d)); return t >= today0 ? t : null; }
  if (r.repeat === "weekly") { const base = new Date(y, mo - 1, d); let t = at(base); while (t < today0) t = new Date(t.getTime() + 7 * 86400e3); return t; }
  if (r.repeat === "monthly") {
    for (let k = 0; k < 14; k++) {
      const yy = now.getFullYear(), mi = now.getMonth() + k;
      const last = new Date(yy, mi + 1, 0).getDate();
      const t = at(new Date(yy, mi, Math.min(d, last)));
      if (t >= today0 && t >= at(new Date(y, mo - 1, d))) return t;
    }
    return null;
  }
  // yearly
  for (let k = 0; k < 2; k++) { const t = at(new Date(now.getFullYear() + k, mo - 1, d)); if (t >= today0) return t; }
  return null;
}
export const daysUntil = (t: Date, now = new Date()) =>
  Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400e3);

/** A calendar file your phone understands, so its own alarm reminds you. */
export function icsFor(title: string, r: Remind, now = new Date()): string {
  const start = nextTime(r, now) ?? now;
  const f = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const end = new Date(start.getTime() + 15 * 60e3);
  const rule = { daily: "FREQ=DAILY", weekly: "FREQ=WEEKLY", monthly: "FREQ=MONTHLY", yearly: "FREQ=YEARLY", once: "" }[r.repeat];
  const esc = (s: string) => s.replace(/[\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Meora//EN", "BEGIN:VEVENT",
    `UID:${Math.random().toString(36).slice(2)}@meora`, `DTSTAMP:${f(now)}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${esc(title.slice(0, 120))}`, rule ? `RRULE:${rule}` : "",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title.slice(0, 120))}`, r.repeat === "daily" ? "TRIGGER:PT0M" : "TRIGGER:-P1D", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
