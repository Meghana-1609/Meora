"use client";
import { useState } from "react";
import { Icon } from "./ui";
import { t, LANGS, MORE_SPEECH } from "./i18n";
import { saveSettings, useApp } from "./store";

const ALL: [string, string][] = [...LANGS.map((l) => [l.speech, l.name] as [string, string]), ["en-IN", "English (India)"], ...MORE_SPEECH.filter(([c]) => c !== "en-IN")];
export const speechName = (code: string) => ALL.find(([c]) => c === code)?.[1] ?? ALL.find(([c]) => c.split("-")[0] === code.split("-")[0])?.[1] ?? code;

/** "Speaking: తెలుగు" — tap to change the language the phone listens for. */
export function SpeechLang({ onChange }: { onChange?: () => void }) {
  const speech = useApp((s) => s.settings.speech);
  const [open, setOpen] = useState(false);
  const quick: [string, string][] = [["te-IN", "తెలుగు"], ["en-IN", "English (India)"], ["en-US", "English (US)"], ["hi-IN", "हिन्दी"], ["ta-IN", "தமிழ்"]];
  const pick = async (c: string) => { await saveSettings({ speech: c }); setOpen(false); onChange?.(); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="chip tap mx-auto mt-2 flex w-fit" aria-label={t("speaking")}>
        <Icon name="globe" size={17} /> {t("speaking")}: <b>{speechName(speech)}</b> <Icon name="chev" size={15} className="rotate-90" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" onClick={() => setOpen(false)}>
          <div className="fade card max-h-[80dvh] w-full max-w-[30rem] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <b className="text-[1.04rem]">{t("speaking_q")}</b>
            <p className="mt-1 text-[0.92rem] text-soft">{t("speaking_tip")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {quick.map(([c, n]) => <button key={c} onClick={() => pick(c)} className={`tap card px-3 py-3 text-start font-semibold ${c === speech ? "!shadow-[0_0_0_3px_var(--color-navy)]" : ""}`}>{n}</button>)}
            </div>
            <p className="sec mt-4">{t("more_langs")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ALL.filter(([c]) => !quick.some(([q]) => q === c)).map(([c, n]) => <button key={c} onClick={() => pick(c)} className={`tap card px-3 py-2.5 text-start ${c === speech ? "!shadow-[0_0_0_3px_var(--color-navy)]" : ""}`}>{n}</button>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
