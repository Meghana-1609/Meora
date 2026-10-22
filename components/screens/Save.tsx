"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Header, Icon, Page, Spinner, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { deleteItem, getState, saveItem, uploadBlob, useApp } from "../store";
import { canListen, listen } from "@/lib/speech";
import { canRecord, record } from "@/lib/recorder";
import { stopSpeaking, understand } from "../voice";
import { findSecret } from "@/lib/secret";
import { guessAbout, guessTopic, topic as topicOf, TOPICS } from "@/lib/topics";
import { parseDate, parseTime, iso } from "@/lib/dates";
import { speak } from "../helpers";
import { track } from "../track";
import { SpeechLang, speechName as langName } from "../SpeechLang";
import type { BlobRef, NoteData, Remind, Repeat, TopicId } from "@/lib/types";

type Phase = "capture" | "check" | "blocked" | "saved";

export function Save({ topic: topic0, about: about0, answers, edit, mode }: { topic?: TopicId; about?: string; answers?: string; edit?: string; mode?: "type" | "photo" | "voice" }) {
  const st = useApp((s) => s);
  const old = edit ? st.notes[edit] : undefined;
  const question = answers ? st.questions[answers] : undefined;
  const smart = st.ai && st.settings.smartOn && canRecord();
  const canSpeak = smart || canListen();
  const [phase, setPhase] = useState<Phase>(old ? "check" : "capture");
  const [text, setText] = useState(old?.data.text ?? "");
  const [en, setEn] = useState(old?.data.en ?? "");
  const [srcLang, setSrcLang] = useState(old?.data.lang ?? "");
  const [interim, setInterim] = useState("");
  const [rec, setRec] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [level, setLevel] = useState(0);
  const [typing, setTyping] = useState(mode === "type" || !canSpeak);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [voice, setVoice] = useState<{ blob: Blob; url: string } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [secretKind, setSecretKind] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { stopRef.current(); stopSpeaking(); }, []);
  const start = () => {
    stopSpeaking(); setRec(true); setInterim(""); track("mic_save");
    const base = text;
    if (smart) {
      const r = record({ onLevel: setLevel });
      stopRef.current = r.stop;
      r.done.then(async (blob) => {
        setRec(false); setLevel(0);
        if (!blob) { toast(t("mic_denied")); setTyping(true); return; }
        if (!blob.size) { toast(t("mic_trouble")); return; }
        setThinking(true);
        try {
          const u = await understand(blob);
          if (!u.text) { toast(t("mic_trouble")); return; }
          setText((base ? base + " " : "") + u.text);
          setEn((prev) => (u.english && u.english !== u.text ? (base && prev ? prev + " " : "") + u.english : prev));
          setSrcLang(u.lang);
          track("smart_heard:" + (u.lang || "x").slice(0, 5));
        } catch {
          track("smart_failed"); toast(t("smart_fallback"));
          // fall back to the phone's own voice typing
          if (canListen()) startPhone(base); else setTyping(true);
        } finally { setThinking(false); }
      });
      return;
    }
    startPhone(base);
  };
  const startPhone = (base: string) => {
    setRec(true);
    stopRef.current = listen(getState().settings.speech, {
      text: (f, i) => { setText((base ? base + " " : "") + f); setInterim(i); },
      end: () => { setRec(false); setInterim(""); },
      error: (e) => { track("mic_error:" + e.replace(/[^a-z-]/g, "").slice(0, 12)); setRec(false); setTyping(true); toast(e === "not-allowed" ? t("mic_denied") : e === "unsupported" || e === "service-not-allowed" ? t("no_mic") : e === "network" ? t("need_internet") : t("mic_trouble")); },
    });
  };
  const stop = () => { stopRef.current(); if (!smart) { setRec(false); setInterim(""); } };
  useEffect(() => { if (phase === "capture" && !typing && mode !== "photo" && mode !== "voice" && canSpeak) start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mode === "photo") fileRef.current?.click(); }, [mode]);

  const toCheck = () => { stop(); if (!text.trim() && !photo && !voice) return; setPhase("check"); };

  if (phase === "blocked") return <Blocked kind={secretKind} onFix={() => { setText(""); setEn(""); setPhase("capture"); setTyping(true); }} />;
  if (phase === "saved" && savedId) return <Saved id={savedId} onAnother={() => { setText(""); setEn(""); setPhoto(null); setVoice(null); setSavedId(null); setPhase("capture"); }} />;
  if (phase === "check") return (
    <Check old={old?.data} oldVis={old?.vis ?? null} id={edit} text={text} setText={setText} en={en} setEn={setEn} srcLang={srcLang} topic0={topic0} about0={about0} photo={photo} voice={voice} question={question?.data.text}
      onBack={() => (old ? nav.back() : setPhase("capture"))}
      onBlocked={(k) => { setSecretKind(k); setText(""); setEn(""); setPhase("blocked"); }}
      onSaved={(id) => { setSavedId(id); setPhase("saved"); }}
      answers={answers} />
  );
  const bars = [0.5, 0.8, 1, 0.7, 0.9, 0.6, 0.85, 0.55, 0.75];

  return (
    <Page>
      <Header title={question ? t("answer") : t("save")} onBack={() => nav.back()} />
      {question && <div className="card mt-2 !rounded-[1.1rem] p-4"><p className="sec">{t("family_asked")}</p><p className="mt-1 font-medium">“{question.data.text}”</p></div>}
      {topic0 && <p className="mt-1 px-1 text-[0.9rem] text-soft">{t("saving_in", { topic: t("t_" + topic0) })}</p>}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const blob = await shrink(f); setPhoto({ blob, url: URL.createObjectURL(blob) }); setTyping(!canSpeak);
      }} />

      {photo && <div className="relative mt-3"><img src={photo.url} alt="" className="max-h-52 w-full rounded-[1rem] object-cover" /><button onClick={() => setPhoto(null)} aria-label={t("delete")} className="absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"><Icon name="close" size={18} /></button></div>}
      {voice && <div className="card mt-3 flex items-center gap-3 !rounded-[1rem] p-2.5"><audio src={voice.url} controls className="h-10 flex-1" /><button onClick={() => setVoice(null)} aria-label={t("delete")} className="grid h-9 w-9 place-items-center"><Icon name="close" size={18} /></button></div>}

      {typing ? (
        <div className="mt-4">
          <label className="sec px-1" htmlFor="say">{photo || voice ? t("say_what") : t("type_here")}</label>
          <textarea id="say" className="field mt-2" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t("type_example")} />
          {canSpeak && <Btn kind="light" className="mt-3" onClick={() => { setTyping(false); start(); }}><Icon name="mic" size={20} /> {t("speak_instead")}</Btn>}
        </div>
      ) : (
        <div className="mt-5 text-center">
          {smart ? <p className="mx-auto w-fit rounded-[.7rem] bg-card px-3 py-1.5 text-[0.85rem] text-soft shadow-[0_0_0_1px_var(--color-line)]"><Icon name="spark" size={14} className="inline -mt-0.5" /> {t("any_language")}</p>
            : <SpeechLang onChange={() => { stop(); setTimeout(start, 250); }} />}
          <button onClick={rec ? stop : start} disabled={thinking} aria-label={rec ? t("stop") : t("speak_now")}
            className={`tap mx-auto mt-8 grid h-28 w-28 place-items-center rounded-full bg-navy text-paper ${rec ? "pulse" : ""}`}>
            {thinking ? <Spinner /> : <Icon name={rec ? "stop" : "mic"} size={42} />}
          </button>
          <p className="mt-9 text-[0.92rem] text-soft">{thinking ? t("understanding") : rec ? t("tap_stop") : t("tap_to_speak")}</p>
          {rec && (smart
            ? <div className="mt-4 flex h-10 items-center justify-center gap-1.5" aria-hidden>{bars.map((b, i) => <span key={i} className="w-[4px] rounded-full bg-navy transition-all duration-100" style={{ height: 6 + level * 34 * b }} />)}</div>
            : <div className="wave mt-4 flex h-10 items-center justify-center gap-1.5" aria-hidden>{[14, 26, 38, 20, 34, 24, 14, 30, 20].map((h, i) => <b key={i} style={{ height: h, animationDelay: `${i * 0.09}s` }} />)}</div>)}
          {(text || interim) && (
            <div className="card mt-5 !rounded-[1.1rem] p-4 text-start" aria-live="polite">
              <p className="sec">{t("you_said")}</p>
              <p className="mt-1 text-[1.05rem] leading-snug">{text}<span className="text-soft"> {interim}</span></p>
              {en && en !== text && <><p className="sec mt-3">{t("in_english")}</p><p className="mt-1 font-medium leading-snug">{en}</p></>}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto grid gap-2 pt-6">
        {(text.trim() || photo || voice) && !rec && !thinking && <Btn onClick={toCheck}>{t("next")}</Btn>}
        <div className="grid grid-cols-3 gap-2">
          <Btn kind="light" className="!min-h-[2.8rem] !px-2 !text-[0.9rem]" onClick={() => fileRef.current?.click()}><Icon name="cam" size={18} /> {t("photo")}</Btn>
          <Btn kind="light" className="!min-h-[2.8rem] !px-2 !text-[0.9rem]" onClick={() => { stop(); setTyping(true); }}><Icon name="edit" size={18} /> {t("type")}</Btn>
          <VoiceRecorder onDone={(b) => { setVoice({ blob: b, url: URL.createObjectURL(b) }); setTyping(!canSpeak); }} onStart={stop} />
        </div>
      </div>
    </Page>
  );
}

function VoiceRecorder({ onDone, onStart }: { onDone: (b: Blob) => void; onStart: () => void }) {
  const [on, setOn] = useState(false);
  const r = useRef<MediaRecorder | null>(null);
  const begin = async () => {
    onStart();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : undefined);
      const parts: Blob[] = [];
      mr.ondataavailable = (e) => parts.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach((x) => x.stop()); setOn(false); onDone(new Blob(parts, { type: mr.mimeType || "audio/webm" })); };
      mr.start(); r.current = mr; setOn(true);
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 120_000);
    } catch { toast(t("mic_denied")); }
  };
  return <Btn kind={on ? "dark" : "light"} className="!min-h-[2.8rem] !px-2 !text-[0.9rem]" onClick={() => (on ? r.current?.stop() : begin())}><Icon name={on ? "stop" : "wave"} size={18} /> {on ? t("stop") : t("record_voice")}</Btn>;
}

async function shrink(f: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? f), "image/jpeg", 0.8));
  } catch { return f; }
}

function Check(p: {
  old?: NoteData; oldVis: string[] | null; id?: string; text: string; setText: (s: string) => void; en: string; setEn: (s: string) => void; srcLang: string; topic0?: TopicId; about0?: string;
  photo: { blob: Blob } | null; voice: { blob: Blob } | null; question?: string; answers?: string;
  onBack: () => void; onBlocked: (k: string) => void; onSaved: (id: string) => void;
}) {
  const st = useApp((s) => s);
  const members = (st.family?.members ?? []).filter((m) => !m.removed);
  const others = members.filter((m) => m.id !== st.me?.id);
  const names = members.map((m) => m.name);
  const [topic, setTopic] = useState<TopicId>(p.old?.topic ?? p.topic0 ?? guessTopic(p.text));
  const [topicOpen, setTopicOpen] = useState(false);
  const guessedAbout = useMemo(() => guessAbout(p.text, names), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [about, setAbout] = useState<string[]>(p.old?.about ?? (p.about0 ? [p.about0] : guessedAbout));
  const [extraPeople, setExtraPeople] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [vis, setVis] = useState<"all" | "some" | "hide">(p.oldVis ? "some" : "all");
  const [picked, setPicked] = useState<string[]>(p.oldVis?.filter((x) => x !== st.me?.id) ?? []);
  const suggest = useMemo(() => suggestRemind(p.text, topic), [p.text, topic]);
  const [remind, setRemind] = useState<Remind | null>(p.old ? p.old.remind ?? null : suggest);
  const [busy, setBusy] = useState(false);
  const peopleChips = [...new Set([...members.map((m) => m.name), ...guessedAbout, ...(p.old?.about ?? []), ...extraPeople, ...(p.about0 ? [p.about0] : [])])];

  const save = async () => {
    const text = p.text.trim();
    const english = p.en.trim();
    const k = findSecret(text) ?? (english ? findSecret(english) : null);
    if (k) { track("blocked:" + k); p.onBlocked(k); return; }
    if (!text && !p.photo && !p.voice) return;
    setBusy(true);
    try {
      let photo: BlobRef | undefined = p.old?.photo, audio: BlobRef | undefined = p.old?.audio;
      if (p.photo) photo = await uploadBlob(new Uint8Array(await p.photo.blob.arrayBuffer()), p.photo.blob.type || "image/jpeg");
      if (p.voice) audio = await uploadBlob(new Uint8Array(await p.voice.blob.arrayBuffer()), p.voice.blob.type || "audio/webm");
      const now = Date.now(), me = st.me!.id;
      const history = p.old ? [...p.old.history, { text: p.old.text, by: getState().notes[p.id!]?.by ?? me, at: getState().notes[p.id!]?.updated ?? now }].slice(-10) : [];
      const data: NoteData = {
        kind: "note", text: text || (p.photo ? t("photo") : t("voice_note")), ...(english && english !== text ? { en: english } : {}), lang: p.srcLang || st.settings.speech, topic, about,
        ...(remind ? { remind } : {}), ...(photo ? { photo } : {}), ...(audio ? { audio } : {}),
        history, confirmedAt: now, createdAt: p.old?.createdAt ?? now, createdBy: p.old?.createdBy ?? me,
      };
      const visList = vis === "all" ? null : vis === "some" ? [...picked, me] : members.filter((m) => !picked.includes(m.id)).map((m) => m.id);
      const id = await saveItem(data, { id: p.id, vis: visList });
      if (p.answers) {
        const q = getState().questions[p.answers];
        if (q) await saveItem({ ...q.data, answer: { noteId: id, by: me, at: now } }, { id: p.answers });
      }
      track(p.old ? "edited" : p.answers ? "answered" : "saved"); track("topic:" + topic);
      if (p.photo) track("with_photo"); if (p.voice) track("with_voice"); if (remind) track("with_reminder"); if (vis !== "all") track("private_note");
      p.onSaved(id);
    } catch (e) { toast((e as Error).message === "offline" ? t("need_internet_media") : t("error")); }
    finally { setBusy(false); }
  };
  const tp = topicOf(topic);

  return (
    <Page>
      <Header title={p.old ? t("edit") : t("check_save")} onBack={p.onBack} />
      {p.question && <p className="mt-1 text-soft">“{p.question}”</p>}
      <div className="card mt-3 !rounded-[1.1rem] p-4">
        <p className="sec">{t("you_said")}{p.srcLang && !p.srcLang.startsWith("en") ? ` · ${langName(p.srcLang)}` : ""}</p>
        <textarea rows={2} className="mt-1.5 min-h-[3.5rem] w-full resize-none bg-transparent text-[1.05rem] leading-snug outline-none [field-sizing:content]" value={p.text} onChange={(e) => p.setText(e.target.value)} aria-label={t("you_said")} id="said" />
        {(p.en || (p.srcLang && !p.srcLang.startsWith("en"))) && (
          <>
            <div className="my-2 h-px bg-line" />
            <p className="sec">{t("in_english")}</p>
            <textarea rows={2} className="mt-1.5 min-h-[3rem] w-full resize-none bg-transparent font-medium leading-snug outline-none [field-sizing:content]" value={p.en} onChange={(e) => p.setEn(e.target.value)} aria-label={t("in_english")} />
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="chip tap" onClick={() => document.getElementById("said")?.focus()}><Icon name="edit" size={17} /> {t("fix_words")}</button>
          <button className="chip tap" onClick={() => speak(p.text)}><Icon name="speak" size={17} /> {t("hear_it")}</button>
        </div>
      </div>

      <p className="sec mt-5">{t("topic")} {!p.old && !p.topic0 && <span className="normal-case tracking-normal">· {t("we_guessed")}</span>}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(topicOpen ? TOPICS : [tp]).map((x) => (
          <button key={x.id} className="chip tap" aria-pressed={x.id === topic} onClick={() => { setTopic(x.id); setTopicOpen(false); if (!p.old) setRemind(suggestRemind(p.text, x.id)); }}>
            <Icon name={x.icon} size={17} /> {t("t_" + x.id)}
          </button>
        ))}
        {!topicOpen && <button className="chip tap" onClick={() => setTopicOpen(true)}>{t("change")}</button>}
      </div>

      <p className="sec mt-5">{t("about")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {peopleChips.map((n) => (
          <button key={n} className="chip tap" aria-pressed={about.includes(n)} onClick={() => setAbout(about.includes(n) ? about.filter((x) => x !== n) : [...about, n])}>{n}</button>
        ))}
        {adding ? (
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("n") as string).trim(); if (v) { setExtraPeople([...extraPeople, v]); setAbout([...about, v]); } setAdding(false); }} className="flex gap-2">
            <input name="n" autoFocus className="field !w-36 !py-2" placeholder={t("person_name")} maxLength={30} />
            <button className="chip tap" aria-label={t("add_name")}><Icon name="check" size={17} /></button>
          </form>
        ) : <button className="chip tap" onClick={() => setAdding(true)} aria-label={t("add_name")}><Icon name="plus" size={17} /> {t("add_name")}</button>}
      </div>

      {others.length > 0 && (
        <>
          <p className="sec mt-5">{t("who_can_see")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="chip tap" aria-pressed={vis === "all"} onClick={() => setVis("all")}>{t("everyone")}</button>
            <button className="chip tap" aria-pressed={vis === "some"} onClick={() => setVis("some")}>{t("only_some")}</button>
            <button className="chip tap" aria-pressed={vis === "hide"} onClick={() => setVis("hide")}>{t("hide_from")}</button>
          </div>
          {vis !== "all" && (
            <div className="card mt-2 p-3">
              <p className="text-[0.92rem] text-soft">{vis === "some" ? t("pick_who_sees") : t("pick_who_not")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {others.map((m) => <button key={m.id} className="chip tap" aria-pressed={picked.includes(m.id)} onClick={() => setPicked(picked.includes(m.id) ? picked.filter((x) => x !== m.id) : [...picked, m.id])}>{m.name}</button>)}
              </div>
            </div>
          )}
        </>
      )}

      <p className="sec mt-5">{t("remind")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="chip tap" aria-pressed={!remind} onClick={() => setRemind(null)}>{t("no")}</button>
        <button className="chip tap" aria-pressed={!!remind} onClick={() => setRemind(remind ?? suggest ?? { repeat: "once", date: iso(new Date(Date.now() + 86400e3)), time: "09:00" })}><Icon name="bell" size={17} /> {t("yes")}</button>
      </div>
      {remind && <RemindEditor r={remind} onChange={setRemind} />}

      <div className="mt-auto pt-6">
        <Btn kind="green" onClick={save} disabled={busy || (!p.text.trim() && !p.photo && !p.voice) || (vis === "some" && !picked.length)} className="!text-[1.04rem]">
          {busy ? <Spinner /> : <><Icon name="check" /> {t("save")}</>}
        </Btn>
      </div>
    </Page>
  );
}

export function RemindEditor({ r, onChange }: { r: Remind; onChange: (r: Remind) => void }) {
  const reps: Repeat[] = ["once", "daily", "weekly", "monthly", "yearly"];
  return (
    <div className="card mt-2 grid gap-3 p-3">
      <div className="flex flex-wrap gap-2">
        {reps.map((x) => <button key={x} className="chip tap" aria-pressed={r.repeat === x} onClick={() => onChange({ ...r, repeat: x, date: x === "daily" ? undefined : r.date ?? iso(new Date()) })}>{t("rep_" + x)}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {r.repeat !== "daily" && <label className="grid gap-1 text-[0.85rem] font-semibold text-soft">{t("date")}<input type="date" className="field !py-2.5" value={r.date ?? ""} onChange={(e) => onChange({ ...r, date: e.target.value })} /></label>}
        <label className="grid gap-1 text-[0.85rem] font-semibold text-soft">{t("time")}<input type="time" className="field !py-2.5" value={r.time ?? "09:00"} onChange={(e) => onChange({ ...r, time: e.target.value })} /></label>
      </div>
    </div>
  );
}

function suggestRemind(text: string, topic: TopicId): Remind | null {
  const date = parseDate(text);
  const time = parseTime(text);
  if (topic === "dates" || date) {
    if (!date) return null;
    const yearly = /birthday|anniversary|tithi|bday|పుట్టినరోజు|పెళ్లిరోజు|తిథి|जन्मदिन|सालगिरह|बरसी|பிறந்தநாள்|cumpleaños|anniversaire|aniversario/i.test(text);
    const monthly = /every month|monthly|ప్రతి నెల|हर महीने|bill/i.test(text);
    return { repeat: yearly ? "yearly" : monthly ? "monthly" : "once", date, time: time ?? "09:00" };
  }
  if (topic === "health" && time && /tablet|medicine|pill|dose|insulin|syrup|మాత్ర|మందు|టాబ్లెట్|మెడిసిన్|दवा|गोली|टैबलेट|மாத்திரை/i.test(text)) return { repeat: "daily", time };
  return null;
}

function Blocked({ kind, onFix }: { kind: string | null; onFix: () => void }) {
  return (
    <Page>
      <Header title={t("save")} onBack={() => nav.back()} />
      <div className="mt-6 rounded-[1.2rem] bg-brick-soft p-5 shadow-[0_0_0_1px_#E8C3BC]" role="alert">
        <div className="flex items-center gap-3 text-brick"><Icon name="shield" size={30} /><b className="text-[1.13rem]">{t("not_saved_secret")}</b></div>
        <p className="mt-3 text-[1.08rem] leading-relaxed">{t("secret_body")}</p>
        {kind && <p className="mt-2 text-[0.95rem] text-soft">{t("looks_like")}: {t("sk_" + kind)}</p>}
        <p className="mt-4 text-[1.08rem]"><b>{t("try_instead")}</b> {t("secret_example")}</p>
      </div>
      <p className="mt-4 text-center text-soft">{t("secret_gone")}</p>
      <div className="mt-auto grid gap-2.5 pt-6">
        <Btn onClick={onFix}><Icon name="edit" /> {t("edit_it")}</Btn>
        <Btn kind="light" onClick={() => nav.home()}>{t("home")}</Btn>
      </div>
    </Page>
  );
}

function Saved({ id, onAnother }: { id: string; onAnother: () => void }) {
  const n = useApp((s) => s.notes[id]);
  const [undone, setUndone] = useState(false);
  const tp = n ? topicOf(n.data.topic) : null;
  return (
    <Page>
      <div className="mt-16 grid place-items-center text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-leaf-soft text-leaf"><Icon name={undone ? "undo" : "check"} size={50} /></span>
        <h1 className="mt-5 text-[1.35rem] font-semibold">{undone ? t("deleted") : t("saved_in", { topic: tp ? t("t_" + tp.id) : "" })}</h1>
        {!undone && <p className="mt-2 text-[1.05rem] text-soft">{n?.vis ? t("some_see_saved") : t("family_sees")}</p>}
        {!undone && <button className="chip tap mt-4" onClick={async () => { await deleteItem(id); setUndone(true); }}><Icon name="undo" size={17} /> {t("undo")}</button>}
      </div>
      <div className="mt-auto grid gap-2.5 pt-8">
        <Btn onClick={() => nav.home()}>{t("done")}</Btn>
        <Btn kind="light" onClick={onAnother}><Icon name="mic" /> {t("save_another")}</Btn>
      </div>
    </Page>
  );
}
