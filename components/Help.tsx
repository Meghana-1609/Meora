"use client";
// The "?" help chat. Lives on every page (bottom right). Answers questions about using Meora.
import { useEffect, useRef, useState } from "react";
import { FAQ } from "@/lib/faq";
import { search } from "@/lib/search";
import { aiCall, getState, useApp } from "./store";
import { t } from "./i18n";
import { Icon, Spinner } from "./ui";
import { track } from "./track";

type Msg = { me: boolean; text: string };
const docs = FAQ.map((f, i) => ({ id: String(i), text: `${f.q} ${f.q} ${f.k}`, about: [], topic: "other" as const, updated: 0 }));

/** Local answer from the FAQ list (works offline, no AI needed). */
export function faqAnswer(q: string): string | null {
  const hits = search(q, docs);
  return hits.length ? FAQ[Number(hits[0].id)].a : null;
}

export function Help({ nav }: { nav: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const ai = useApp((s) => s.ai && s.settings.smartOn);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [open]);

  const ask = async (text: string) => {
    const s = text.trim(); if (!s || busy) return;
    setQ(""); setMsgs((m) => [...m, { me: true, text: s }]); setBusy(true);
    track("help_ask");
    let a: string | null = null;
    if (ai) { try { a = (await aiCall<{ answer: string }>({ task: "help", question: s, lang: getState().settings.lang })).answer || null; } catch { /* use FAQ */ } }
    a ??= faqAnswer(s) ?? t("help_not_sure");
    setMsgs((m) => [...m, { me: false, text: a }]); setBusy(false);
  };

  const chips = [t("help_c1"), t("help_c2"), t("help_c3"), t("help_c4")];
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t("help_title")} data-help
        className="tap fixed right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-navy shadow-[0_4px_14px_rgba(29,39,66,.14)]"
        style={{ bottom: nav ? "calc(5.6rem + env(safe-area-inset-bottom))" : "calc(1.1rem + env(safe-area-inset-bottom))" }}>
        <Icon name="help" size={21} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label={t("help_title")} onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82dvh] w-full max-w-[34rem] flex-col rounded-t-[1.4rem] bg-paper pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-paper"><Icon name="help" size={18} /></span>
              <div className="min-w-0 flex-1"><p className="text-[1rem] font-semibold">{t("help_title")}</p><p className="text-[.8rem] text-soft">{t("help_sub")}</p></div>
              <button onClick={() => setOpen(false)} aria-label={t("close")} className="tap grid h-9 w-9 place-items-center rounded-full text-soft"><Icon name="close" size={20} /></button>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              <div className="max-w-[85%] rounded-[1rem] rounded-tl-[.3rem] bg-card px-3.5 py-2.5 text-[.92rem]">{t("help_hi")}</div>
              {msgs.length === 0 && <div className="flex flex-wrap gap-2 pt-1">{chips.map((c) => <button key={c} onClick={() => ask(c)} className="tap rounded-full border border-line bg-card px-3 py-1.5 text-[.85rem] text-navy">{c}</button>)}</div>}
              {msgs.map((m, i) => <div key={i} className={`max-w-[85%] whitespace-pre-line rounded-[1rem] px-3.5 py-2.5 text-[.92rem] ${m.me ? "ml-auto rounded-tr-[.3rem] bg-navy text-paper" : "rounded-tl-[.3rem] bg-card"}`}>{m.text}</div>)}
              {busy && <div className="w-fit rounded-[1rem] bg-card px-3.5 py-2.5 text-soft"><Spinner /></div>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="flex gap-2 border-t border-line px-4 py-3">
              <input className="field !min-h-[2.9rem]" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("help_ph")} aria-label={t("help_ph")} enterKeyHint="send" />
              <button type="submit" disabled={!q.trim() || busy} aria-label={t("help_send")} className="tap grid w-12 shrink-0 place-items-center rounded-[.9rem] bg-navy text-paper disabled:opacity-40"><Icon name="chev" size={20} /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
