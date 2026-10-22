"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Btn, Header, Icon, Page, Spinner, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { aiCall, getState, saveItem, useApp, deleteItem, type Rec } from "../store";
import { canListen, listen } from "@/lib/speech";
import { canRecord, record } from "@/lib/recorder";
import { stopSpeaking, understand } from "../voice";
import { search } from "@/lib/search";
import { findSecret } from "@/lib/secret";
import { colorOf, fmtDate, nameOf, phones, speak, translate } from "../helpers";
import { track, trackError } from "../track";
import { SpeechLang } from "../SpeechLang";
import type { NoteData, QuestionData } from "@/lib/types";

type Result = { kind: "hit"; ids: string[]; text: string; smart?: boolean } | { kind: "none" } | null;

export function Ask({ q: q0 }: { q?: string }) {
  const st = useApp((s) => s);
  const [q, setQ] = useState(q0 ?? "");
  const [interim, setInterim] = useState("");
  const [rec, setRec] = useState(false);
  const [res, setRes] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const [en, setEn] = useState("");
  const [thinking, setThinking] = useState(false);
  const [level, setLevel] = useState(0);
  const smart = st.ai && st.settings.smartOn && canRecord() && !canListen();
  const canSpeak = smart || canListen();
  const stopRef = useRef<() => void>(() => {});
  const qRef = useRef(""); const lastRun = useRef("");
  useEffect(() => { qRef.current = q; }, [q]);
  const notes = useMemo(() => Object.values(st.notes), [st.notes]);

  const run = async (question: string, english = "") => {
    const text = question.trim(); if (!text || busy) return;
    lastRun.current = text;
    stopSpeaking(); setBusy(true);
    const people = (st.family?.members ?? []).map((m) => m.name);
    const docs = notes.map((n) => ({ id: n.id, text: `${n.data.text} ${n.data.en ?? ""}`, about: n.data.about, topic: n.data.topic, updated: n.updated }));
    const hits = search(`${text} ${english}`, docs, people);
    let out: Result = hits.length ? { kind: "hit", ids: hits.slice(0, 3).filter((h, i) => i === 0 || h.score > hits[0].score * 0.7).map((h) => h.id), text: cleanSnip(hits[0].id, hits[0].snippet) } : { kind: "none" };
    if (out.kind === "none" && st.ai && st.settings.smartOn && notes.length) {
      try {
        const pick = [...notes].sort((a, b) => b.updated - a.updated).slice(0, 60);
        const r = await aiCall<{ found: boolean; answer: string; noteIds: string[] }>({
          task: "ask", question: text, lang: st.settings.speech.split("-")[0],
          notes: pick.map((n) => ({ id: n.id, text: n.data.en ? `${n.data.text} (English: ${n.data.en})` : n.data.text, topic: n.data.topic, about: n.data.about, by: nameOf(n.by), date: new Date(n.updated).toISOString().slice(0, 10) })),
        });
        const ids = r.noteIds.filter((id) => st.notes[id]);
        if (r.found && ids.length) out = { kind: "hit", ids, text: r.answer, smart: true };
      } catch (e) { toast((e as Error).message || t("error")); }
    }
    track("ask"); track(out?.kind === "hit" ? (out.smart ? "ask_found_smart" : "ask_found") : "ask_not_found");
    setRes(out); setBusy(false);
    if (out?.kind === "hit" && st.settings.readAloud) {
      const n = st.notes[out.ids[0]];
      speak(!out.smart && n?.data.en && st.settings.lang === "en" ? n.data.en : out.text);
    }
  };

  const start = () => {
    stopSpeaking(); setRec(true); setRes(null); setQ(""); setEn(""); qRef.current = ""; lastRun.current = "";
    if (smart) {
      const r = record({ onLevel: setLevel, silenceMs: 1500 });
      stopRef.current = r.stop;
      r.done.then(async (blob) => {
        setRec(false); setLevel(0);
        if (!blob) { toast(t("mic_denied")); return; }
        if (!blob.size) { toast(t("mic_trouble")); return; }
        setThinking(true);
        try {
          const u = await understand(blob);
          setThinking(false);
          if (!u.text) { toast(t("mic_trouble")); return; }
          setQ(u.text); setEn(u.english !== u.text ? u.english : "");
          void run(u.text, u.english);
        } catch (e) { setThinking(false); track("smart_failed"); trackError(`smart voice ${(e as { status?: number }).status ?? ""}: ${(e as Error).message}`); toast(t("smart_fallback")); if (canListen()) startPhone(); }
      });
      return;
    }
    startPhone();
  };
  const startPhone = () => {
    setRec(true);
    stopRef.current = listen(getState().settings.speech, {
      text: (f, i) => { setQ(f); qRef.current = f; setInterim(i); },
      end: () => { setRec(false); setInterim(""); const cur = qRef.current.trim(); if (cur && cur !== lastRun.current) void run(cur); },
      error: (e) => { setRec(false); track("mic_error:" + e.replace(/[^a-z-]/g, "").slice(0, 12)); toast(e === "not-allowed" ? t("mic_denied") : e === "unsupported" || e === "service-not-allowed" ? t("no_mic") : e === "network" ? t("need_internet") : t("mic_trouble")); },
    });
    // one question at a time: stop after a pause
  };
  const stop = () => { stopRef.current(); };
  useEffect(() => { if (q0) void run(q0); else if (canSpeak) start(); return () => { stopRef.current(); stopSpeaking(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // stop listening automatically after a short silence
  useEffect(() => { if (smart || !rec || !q) return; const id = setTimeout(stop, 1800); return () => clearTimeout(id); }, [q, interim, rec, smart]);

  const top = res?.kind === "hit" ? st.notes[res.ids[0]] : undefined;
  const more = res?.kind === "hit" ? res.ids.slice(1).map((id) => st.notes[id]).filter(Boolean) : [];

  return (
    <Page>
      <Header title={t("ask")} onBack={() => nav.back()} />
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); lastRun.current = q.trim(); stop(); void run(q); }}>
        <input className="field" value={q + (interim ? " " + interim : "")} onChange={(e) => { setQ(e.target.value); setEn(""); setRes(null); }} placeholder={thinking ? t("understanding") : rec ? t("listening") : t("ask_ph")} aria-label={t("ask_q")} enterKeyHint="search" />
        {canSpeak && <button type="button" onClick={rec ? stop : start} disabled={thinking} aria-label={rec ? t("stop") : t("speak_now")} className={`tap grid w-[3.3rem] shrink-0 place-items-center rounded-[.9rem] bg-navy text-paper ${rec ? "pulse" : ""}`}>{thinking ? <Spinner /> : <Icon name={rec ? "stop" : "mic"} size={22} />}</button>}
      </form>
      {rec && smart && <div className="mt-3 flex h-8 items-center justify-center gap-1.5" aria-hidden>{[0.5, 0.8, 1, 0.7, 0.9, 0.6, 0.8].map((b, i) => <span key={i} className="w-[4px] rounded-full bg-navy transition-all duration-100" style={{ height: 5 + level * 26 * b }} />)}</div>}
      {en && <p className="mt-1.5 px-1 text-[0.85rem] text-soft">{t("understood_as")}: “{en}”</p>}
      {canSpeak && <SpeechLang onChange={() => { if (!smart && rec) { stop(); setTimeout(start, 250); } }} />}
      {smart && !rec && !en && !res && <p className="mt-2 px-1 text-center text-[0.82rem] text-soft"><Icon name="spark" size={13} className="inline -mt-0.5" /> {t("any_language")}</p>}
      {q.trim() && !rec && !res && !busy && <Btn className="mt-3" onClick={() => run(q)}><Icon name="ask" /> {t("ask")}</Btn>}
      {busy && <div className="mt-8 grid place-items-center"><Spinner /></div>}

      {res?.kind === "hit" && top && <AnswerCard rec={top} text={res.text} smart={res.smart} />}
      {more.length > 0 && (
        <div className="mt-3 rounded-[1rem] bg-brass-soft p-4">
          <p className="sec !text-[#8F6A2E]">{t("also_found")}</p>
          {more.map((n) => <button key={n.id} onClick={() => nav.push({ s: "note", id: n.id })} className="mt-1.5 block text-start text-[1rem] underline-offset-4 hover:underline">{n.data.text}</button>)}
        </div>
      )}
      {res?.kind === "hit" && <p className="mt-4 text-center text-[0.88rem] text-soft">{t("not_advice")}</p>}

      {res?.kind === "none" && <NotFound q={q} />}

      {!res && !busy && !rec && <QuestionList />}
      {res && <div className="mt-auto pt-6 pe-14"><Btn onClick={start}><Icon name="mic" /> {t("ask_another")}</Btn></div>}
    </Page>
  );
}

// The search also looks at the English copy; show the note's own words, not both glued together.
function cleanSnip(id: string, snip: string) {
  const d = getState().notes[id]?.data as NoteData | undefined;
  if (!d?.en) return snip;
  const e = d.en.slice(0, 24);
  return snip.includes(e) ? (snip.trim().startsWith(e) && getState().settings.lang === "en" ? d.en : d.text) : snip;
}

export function AnswerCard({ rec, text, smart }: { rec: Rec<NoteData>; text: string; smart?: boolean }) {
  const lang = useApp((s) => s.settings.speech);
  const [tr, setTr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nums = phones(rec.data.text);
  const doTranslate = async () => {
    setBusy(true);
    const r = await translate(text, lang);
    setBusy(false);
    if (r.text) setTr(r.text); else if (r.openUrl) window.open(r.openUrl, "_blank", "noopener");
  };
  return (
    <div className="card fade mt-4 p-5 !shadow-[0_0_0_2px_var(--color-navy)]">
      <p className="sec">{smart ? t("smart_answer") : t("answer")}</p>
      <p className="mt-2 text-[1.12rem] font-semibold leading-snug">{text}</p>
      {!smart && rec.data.en && text !== rec.data.en && <p className="mt-1.5 text-[.92rem] text-soft"><span className="font-semibold">{t("in_english")}:</span> {rec.data.en}</p>}
      {tr && <p className="mt-3 rounded-[.9rem] bg-paper p-3 text-[1rem]">{tr}</p>}
      <div className="mt-3 flex items-center gap-2 text-[0.9rem] text-soft"><Avatar name={nameOf(rec.by)} color={colorOf(rec.by)} size={24} /> {t("from_note", { name: nameOf(rec.by), date: fmtDate(rec.updated) })}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="chip tap" aria-pressed="true" onClick={() => speak(tr ?? text)}><Icon name="speak" size={17} /> {t("listen")}</button>
        <button className="chip tap" onClick={doTranslate} disabled={busy}>{busy ? <Spinner /> : <Icon name="trans" size={17} />} {t("translate")}</button>
        <button className="chip tap" onClick={() => nav.push({ s: "note", id: rec.id })}>{t("open_note")}</button>
        {nums.map((n) => <a key={n} href={`tel:${n}`} className="chip tap !bg-leaf !text-white !shadow-none"><Icon name="phone" size={17} /> {t("call")} {n.slice(-5)}</a>)}
      </div>
    </div>
  );
}

function NotFound({ q }: { q: string }) {
  const st = useApp((s) => s);
  const [sent, setSent] = useState(false);
  const askFamily = async () => {
    if (findSecret(q)) { toast(t("not_saved_secret")); return; }
    await saveItem({ kind: "question", text: q.trim(), lang: st.settings.speech, at: Date.now(), by: st.me!.id });
    track("ask_family");
    setSent(true);
  };
  return (
    <div className="fade">
      <div className="card mt-4 p-5">
        <p className="text-[1.22rem] font-semibold">{t("nobody_saved")}</p>
        <p className="mt-2 text-soft">{t("never_guess")}</p>
      </div>
      {sent ? (
        <p className="mt-4 rounded-[1rem] bg-leaf-soft p-4 text-center font-semibold text-leaf">{t("asked_sent")}</p>
      ) : (
        <>
          <Btn className="mt-4 !text-[1rem]" onClick={askFamily}><Icon name="users" /> {t("ask_my_family")}</Btn>
          <p className="mt-2 text-center text-[0.92rem] text-soft">{t("ask_family_sub")}</p>
        </>
      )}
      {st.ai && !st.settings.smartOn && <Btn kind="ghost" className="mt-2 !text-[0.95rem]" onClick={() => nav.push({ s: "settings" })}>{t("smart_try")}</Btn>}
      <Btn kind="light" className="mt-2" onClick={() => nav.push({ s: "save" })}><Icon name="mic" /> {t("save_it_myself")}</Btn>
    </div>
  );
}

export function QuestionList({ full }: { full?: boolean }) {
  const qs = useApp((s) => s.questions);
  const me = useApp((s) => s.me?.id);
  const list = Object.values(qs).sort((a, b) => Number(!!a.data.answer) - Number(!!b.data.answer) || b.updated - a.updated).slice(0, full ? 50 : 6);
  if (!list.length) return full ? <p className="mt-6 text-center text-soft">{t("no_questions")}</p> : null;
  return (
    <div className="mt-6">
      <p className="sec">{t("asked_before")}</p>
      <div className="mt-2 grid gap-2">{list.map((q) => <QRow key={q.id} q={q} mine={q.data.by === me} />)}</div>
    </div>
  );
}
function QRow({ q, mine }: { q: Rec<QuestionData>; mine: boolean }) {
  const ans = q.data.answer;
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{q.data.text}</p>
        <p className="text-[0.88rem] text-soft">{ans ? t("answered_by", { name: nameOf(ans.by) }) : `${t("asked_by", { name: nameOf(q.data.by) })} · ${t("waiting_answer")}`}</p>
      </div>
      {ans ? <button className="chip tap" onClick={() => nav.push({ s: "note", id: ans.noteId })}><Icon name="check" size={17} className="text-leaf" /> {t("see")}</button>
        : !mine ? <button className="chip tap !bg-navy !text-paper !shadow-none" onClick={() => nav.push({ s: "save", answers: q.id })}><Icon name="mic" size={17} /> {t("answer_it")}</button>
        : <button className="chip tap" onClick={() => deleteItem(q.id)} aria-label={t("delete")}><Icon name="close" size={17} /></button>}
    </div>
  );
}
export function Questions() {
  return <Page><Header title={t("family_asked")} onBack={() => nav.back()} /><QuestionList full /></Page>;
}
