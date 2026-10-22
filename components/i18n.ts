"use client";
import { getState, type UiLang } from "./store";
import { en, type Strings } from "@/lib/strings/en";
import { te } from "@/lib/strings/te";
import { hi } from "@/lib/strings/hi";
import { ta } from "@/lib/strings/ta";
import { es } from "@/lib/strings/es";
import { fr } from "@/lib/strings/fr";
import { ar } from "@/lib/strings/ar";
import { zh } from "@/lib/strings/zh";

const DICT: Record<UiLang, Partial<Strings>> = { en, te, hi, ta, es, fr, ar, zh };
export const LANGS: { code: UiLang; name: string; en: string; speech: string }[] = [
  { code: "en", name: "English", en: "English", speech: "en-US" }, { code: "te", name: "తెలుగు", en: "Telugu", speech: "te-IN" },
  { code: "hi", name: "हिन्दी", en: "Hindi", speech: "hi-IN" }, { code: "ta", name: "தமிழ்", en: "Tamil", speech: "ta-IN" },
  { code: "es", name: "Español", en: "Spanish", speech: "es-ES" }, { code: "fr", name: "Français", en: "French", speech: "fr-FR" },
  { code: "ar", name: "العربية", en: "Arabic", speech: "ar-SA" }, { code: "zh", name: "中文", en: "Chinese", speech: "zh-CN" },
];
// Phones can listen in many more languages. The app's words stay in English for these.
export const MORE_SPEECH: [string, string][] = [
  ["en-IN", "English (India)"], ["en-GB", "English (UK)"], ["kn-IN", "ಕನ್ನಡ"], ["ml-IN", "മലയാളം"], ["mr-IN", "मराठी"], ["bn-IN", "বাংলা"], ["gu-IN", "ગુજરાતી"],
  ["pa-IN", "ਪੰਜਾਬੀ"], ["ur-PK", "اردو"], ["or-IN", "ଓଡ଼ିଆ"], ["ne-NP", "नेपाली"], ["si-LK", "සිංහල"], ["de-DE", "Deutsch"], ["it-IT", "Italiano"],
  ["pt-BR", "Português"], ["ru-RU", "Русский"], ["uk-UA", "Українська"], ["pl-PL", "Polski"], ["nl-NL", "Nederlands"], ["tr-TR", "Türkçe"], ["el-GR", "Ελληνικά"],
  ["he-IL", "עברית"], ["fa-IR", "فارسی"], ["sw-KE", "Kiswahili"], ["am-ET", "አማርኛ"], ["zu-ZA", "isiZulu"], ["af-ZA", "Afrikaans"], ["id-ID", "Bahasa Indonesia"],
  ["ms-MY", "Bahasa Melayu"], ["fil-PH", "Filipino"], ["vi-VN", "Tiếng Việt"], ["th-TH", "ไทย"], ["ja-JP", "日本語"], ["ko-KR", "한국어"], ["zh-TW", "繁體中文"],
  ["km-KH", "ខ្មែរ"], ["my-MM", "မြန်မာ"], ["ro-RO", "Română"], ["hu-HU", "Magyar"], ["cs-CZ", "Čeština"], ["sv-SE", "Svenska"], ["da-DK", "Dansk"],
  ["fi-FI", "Suomi"], ["nb-NO", "Norsk"], ["es-MX", "Español (México)"], ["fr-CA", "Français (Canada)"], ["pt-PT", "Português (Portugal)"], ["ar-EG", "العربية (مصر)"],
];

export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = getState().settings.lang;
  let s = (DICT[lang] as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export const LOCALE = () => ({ en: undefined, te: "te-IN", hi: "hi-IN", ta: "ta-IN", es: "es", fr: "fr", ar: "ar", zh: "zh-CN" } as Record<UiLang, string | undefined>)[getState().settings.lang];
