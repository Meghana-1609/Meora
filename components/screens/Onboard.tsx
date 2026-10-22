"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Btn, Confirm, Icon, Logo, Page, Spinner, Wordmark, toast } from "../ui";
import { t, LANGS, MORE_SPEECH } from "../i18n";
import { afterRecovery, ApiError, backToApp, cancelJoin, getState, go, requestJoin, saveSettings, setLock, startFamily, unlockBio, unlockPics, useApp, useRecovery, SPEECH_DEFAULT, type UiLang } from "../store";
import { JOIN_PICTURES, PICTURES, RECOVERY_LENGTH } from "@/lib/pictures";
import { canListen, listen } from "@/lib/speech";
import { track } from "../track";

export function LangScreen({ onDone }: { onDone?: () => void }) {
  const s = useApp((x) => x.settings);
  const [more, setMore] = useState(false);
  const pick = async (lang: UiLang, speech?: string) => {
    await saveSettings({ lang, speech: speech ?? SPEECH_DEFAULT[lang], chosen: true });
    if (onDone) onDone(); else go("welcome");
  };
  return (
    <Page>
      {onDone ? <button onClick={onDone} className="tap card mb-2 grid h-12 w-12 place-items-center !rounded-[1rem]" aria-label={t("back")}><Icon name="back" className="rtl:rotate-180" /></button> : <div className="h-6" />}
      <span className="grid h-16 w-16 place-items-center rounded-[1.2rem] bg-navy text-paper"><Icon name="globe" size={34} /></span>
      <h1 className="mt-5 text-[1.5rem] font-semibold leading-tight">{t("choose_lang")}</h1>
      {!more ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => pick(l.code)} lang={l.code}
                className={`tap card px-4 py-4 text-start ${s.chosen && s.lang === l.code ? "!shadow-[0_0_0_3px_var(--color-navy)]" : ""}`}>
                <span className="block text-[1.17rem] font-semibold">{l.name}</span>
                <span className="text-[0.85rem] text-soft">{l.en}</span>
              </button>
            ))}
          </div>
          <Btn kind="light" className="mt-4" onClick={() => setMore(true)}><Icon name="plus" /> {t("more_langs")}</Btn>
        </>
      ) : (
        <>
          <p className="mt-3 text-soft">{t("more_langs_note")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 pb-6">
            {MORE_SPEECH.map(([code, name]) => (
              <button key={code} onClick={() => pick("en", code)} className="tap card px-4 py-3.5 text-start text-[1rem] font-semibold" lang={code}>{name}</button>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}

type Step = "intro" | "home" | "start" | "join" | "joinName" | "scan" | "recover" | "recoverName";
export function Welcome() {
  const [step, setStep] = useState<Step>(() => {
    if (typeof location !== "undefined" && new URLSearchParams(location.search).get("join")) return "joinName";
    const st = getState();
    return st.welcomeStep ?? (st.fams.length ? "home" : "intro");
  });
  const [code, setCode] = useState<number[]>([]);
  const [rec, setRec] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const link = typeof location !== "undefined" ? new URLSearchParams(location.search).get("join") ?? "" : "";
  const fams = useApp((s) => s.fams);
  useEffect(() => { track("welcome_view"); }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); if (link) history.replaceState(history.state, "", "/"); }
    catch (e) { setErr(e instanceof ApiError && e.status === 0 ? t("need_internet") : (e as Error).message || t("error")); }
    finally { setBusy(false); }
  };

  if (step === "start") return <NameStep title={t("your_name")} busy={busy} err={err} onBack={() => setStep("home")} onDone={(n) => run(async () => { await startFamily(n); track("family_started"); })} />;
  if (step === "joinName") return <NameStep title={t("your_name")} busy={busy} err={err} onBack={() => { setErr(""); setStep(link ? "home" : "join"); }}
    onDone={(n) => run(async () => { await requestJoin(link ? { link } : { code }, n); track(link ? "join_request:qr" : "join_request:pics"); })} />;
  if (step === "recoverName") return <NameStep title={t("your_name")} busy={busy} err={err} onBack={() => setStep("recover")} onDone={(n) => run(async () => { await useRecovery(rec, n); track("recovery_used"); })} />;

  if (step === "join") return (
    <Page>
      <TopBar onBack={() => { setCode([]); setStep("home"); }} />
      <h1 className="mt-4 text-[1.42rem] font-semibold">{t("join_title")}</h1>
      <p className="mt-1 text-[1.05rem] text-soft">{t("join_sub")}</p>
      <div className="mt-4 flex justify-center gap-2.5" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`grid h-[4.6rem] w-[4.6rem] place-items-center rounded-[1.1rem] text-[2.4rem] ${code[i] !== undefined ? "bg-navy" : "border-2 border-dashed border-line"}`}>
            {code[i] !== undefined ? JOIN_PICTURES[code[i]][0] : ""}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {JOIN_PICTURES.map(([e, n], i) => (
          <button key={n} aria-label={n} disabled={code.includes(i) || code.length >= 3} onClick={() => setCode([...code, i])}
            className={`tap card grid h-[4.4rem] place-items-center text-[2.1rem] disabled:opacity-35 ${code.includes(i) ? "!bg-[#E4E8F2]" : ""}`}>{e}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Btn kind="light" onClick={() => setCode(code.slice(0, -1))} disabled={!code.length}><Icon name="undo" size={20} /> {t("undo")}</Btn>
        <Btn onClick={() => setStep("joinName")} disabled={code.length < 3}>{t("continue")}</Btn>
      </div>
      <p className="my-3 text-center font-semibold text-soft">{t("or")}</p>
      <Btn kind="light" onClick={() => setStep("scan")}><Icon name="qr" /> {t("scan_qr")}</Btn>
    </Page>
  );

  if (step === "scan") return (
    <Page>
      <TopBar onBack={() => setStep("join")} />
      <div className="mt-10 grid place-items-center text-center">
        <span className="grid h-28 w-28 place-items-center rounded-[1.6rem] bg-card shadow-[0_0_0_1px_var(--color-line)]"><Icon name="cam" size={56} /></span>
        <h1 className="mt-6 text-[1.35rem] font-semibold">{t("scan_qr")}</h1>
        <ol className="mt-5 grid max-w-[24rem] gap-3 text-start text-[1rem]">
          <li className="card p-4">1. {t("scan_1")}</li>
          <li className="card p-4">2. {t("scan_2")}</li>
          <li className="card p-4">3. {t("scan_3")}</li>
        </ol>
      </div>
    </Page>
  );

  if (step === "recover") return (
    <Page>
      <TopBar onBack={() => { setRec([]); setStep("home"); }} />
      <h1 className="mt-4 text-[1.35rem] font-semibold">{t("recover_title")}</h1>
      <p className="mt-1 text-soft">{t("recover_sub")}</p>
      <div className="mt-3 grid grid-cols-6 gap-1.5 rounded-[1rem] bg-card p-2 shadow-[0_0_0_1px_var(--color-line)]" aria-live="polite">
        {Array.from({ length: RECOVERY_LENGTH }, (_, i) => (
          <span key={i} className="grid aspect-square place-items-center rounded-[.6rem] bg-paper text-[1.5rem]">{rec[i] !== undefined ? PICTURES[rec[i]][0] : <span className="text-[.75rem] text-soft">{i + 1}</span>}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1">
        {PICTURES.map(([e, n], i) => (
          <button key={n} aria-label={n} disabled={rec.length >= RECOVERY_LENGTH} onClick={() => setRec([...rec, i])} className="tap grid aspect-square place-items-center rounded-[.6rem] bg-card text-[1.45rem] shadow-[0_0_0_1px_var(--color-line)]">{e}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5 pb-4">
        <Btn kind="light" onClick={() => setRec(rec.slice(0, -1))} disabled={!rec.length}><Icon name="undo" size={20} /> {t("undo")}</Btn>
        <Btn onClick={() => setStep("recoverName")} disabled={rec.length < RECOVERY_LENGTH}>{t("continue")}</Btn>
      </div>
    </Page>
  );

  if (step === "intro") return (
    <Dark>
      <div className="flex flex-1 flex-col items-center justify-center px-3 text-center">
        <Wave big />
        <h1 className="mt-11 text-[1.87rem] font-medium leading-[1.2] tracking-[-.015em]">{t("intro_1")}<br /><span className="text-[#D4B98A]">{t("intro_2")}</span></h1>
        <p className="mt-4 max-w-[21rem] text-[1.03rem] leading-[1.6] text-[#F3F1EC]/65">{t("intro_body")}</p>
      </div>
      <Dots at={0} />
      <button onClick={() => { track("tap_continue"); setStep("home"); }} className="tap mt-5 flex min-h-[3.6rem] w-full items-center justify-center rounded-[1.1rem] bg-[#F3F1EC] text-[1.1rem] font-semibold text-[#1D2742]">{t("continue")}</button>
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[.84rem] text-[#F3F1EC]/50"><Icon name="lock" size={13} />{t("private_free")}</p>
    </Dark>
  );

  return (
    <Dark>
      <div className="mt-12 opacity-90"><Wave /></div>
      <h1 className="mt-7 text-center text-[1.73rem] font-medium leading-[1.25] tracking-[-.01em]">{t("begin_title")}</h1>
      <p className="mt-2 text-center text-[1rem] text-[#F3F1EC]/60">{t("begin_sub")}</p>
      <div className="mt-8 grid gap-3">
        {err && <p className="text-center font-semibold text-[#F0A79F]" role="alert">{err}</p>}
        <Choice primary icon="plus" title={t("start_family")} sub={t("begin_start_sub")} onClick={() => { track("tap_start"); setStep("start"); }} />
        <Choice icon="users" title={t("join_family")} sub={t("begin_join_sub")} onClick={() => { track("tap_join"); setStep("join"); }} />
      </div>
      <div className="mt-auto pt-8">
        {fams.length === 0 && <Dots at={1} />}
        <p className="mt-5 text-center text-[.95rem] text-[#F3F1EC]/60">{t("lost_q")} <button onClick={() => setStep("recover")} className="tap font-semibold text-[#F3F1EC] underline underline-offset-4">{t("recover_link")}</button></p>
        {fams.length > 0 && <button onClick={backToApp} className="tap mx-auto mt-3 block px-3 py-2 text-[.95rem] font-semibold text-[#F3F1EC]/80">{t("back")}</button>}
      </div>
    </Dark>
  );
}

/** The navy welcome pages: Meora mark and the language button on top. */
function Dark({ children }: { children: ReactNode }) {
  return (
    <main className="fade flex min-h-dvh flex-col bg-[#1D2742] text-[#F3F1EC]">
      <div className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col px-5 pb-[max(1.6rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:max-w-[40rem] md:pb-10 md:pt-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5"><Logo size={32} flat /><span className="text-[.9rem] font-semibold tracking-[.22em]">MEORA</span></span>
          <LangPill dark />
        </div>
        {children}
      </div>
    </main>
  );
}
const WAVE = ["#C48E7E", "#8FAE8D", "#7F96C2", "#E6E3DD", "#D4B98A"];
/** Family-coloured sound wave. Big: with the microphone in the middle. */
function Wave({ big }: { big?: boolean }) {
  const side = big ? [14, 26, 40, 24, 56, 80, 52] : [6, 10, 16, 10, 22, 30, 20, 14, 26, 34];
  const bars = (hs: number[], off: number) => hs.map((h, i) => <i key={i} style={{ height: `${h / 16}rem`, background: WAVE[(i + off) % 5], animationDelay: `${((i * 37) % 11) / 10}s`, width: big ? undefined : ".33rem" }} />);
  if (!big) return <div className="mwave flex h-10 items-center justify-center gap-[.28rem]" aria-hidden>{bars(side, 0)}{bars([...side].reverse(), 2)}</div>;
  return (
    <div className="mwave flex h-[7.5rem] items-center justify-center gap-[.33rem]" aria-hidden>
      {bars(side, 0)}
      <span className="mx-3.5 grid h-[4.75rem] w-[4.75rem] shrink-0 place-items-center rounded-full bg-[#F3F1EC] text-[#1D2742]"><Icon name="mic" size={30} /></span>
      {bars([...side].reverse(), 2)}
    </div>
  );
}
function Dots({ at }: { at: number }) {
  return <div className="flex justify-center gap-1.5" aria-hidden>{[0, 1].map((i) => <i key={i} className={`block h-1.5 rounded-full ${i === at ? "w-5 bg-[#F3F1EC]" : "w-1.5 bg-[#F3F1EC]/30"}`} />)}</div>;
}
function Choice({ icon, title, sub, primary, onClick }: { icon: string; title: string; sub: string; primary?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`tap flex w-full items-center gap-3.5 rounded-[1.25rem] p-[1.1rem] text-start ${primary ? "bg-[#F3F1EC] text-[#1D2742]" : "border border-white/15 bg-white/5"}`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[.95rem] ${primary ? "bg-[#1D2742] text-[#F3F1EC]" : "bg-white/10 text-[#D4B98A]"}`}><Icon name={icon} size={22} /></span>
      <span className="min-w-0 flex-1"><b className="block text-[1.1rem] font-semibold">{title}</b><span className="mt-0.5 block text-[.9rem] leading-[1.45] opacity-70">{sub}</span></span>
      <Icon name="chev" size={18} className="shrink-0 rtl:rotate-180" />
    </button>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} aria-label={t("back")} className="tap card grid h-12 w-12 place-items-center !rounded-[1rem]"><Icon name="back" className="rtl:rotate-180" /></button>
      <LangPill />
    </div>
  );
}
export function LangPill({ dark }: { dark?: boolean }) {
  const lang = useApp((s) => s.settings.lang);
  const [open, setOpen] = useState(false);
  if (open) return <div className="fixed inset-0 z-40 overflow-auto bg-paper text-ink"><LangScreen onDone={() => setOpen(false)} /></div>;
  if (dark) return <button onClick={() => setOpen(true)} className="tap flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[.9rem] font-medium"><Icon name="globe" size={16} />{LANGS.find((l) => l.code === lang)?.name}<Icon name="down" size={14} /></button>;
  return <button onClick={() => setOpen(true)} className="tap card flex items-center gap-1.5 !rounded-[.8rem] px-3 py-2 text-[0.95rem] font-semibold"><Icon name="globe" size={18} />{LANGS.find((l) => l.code === lang)?.name}</button>;
}

function NameStep({ title, busy, err, onBack, onDone }: { title: string; busy: boolean; err: string; onBack: () => void; onDone: (n: string) => void }) {
  const [name, setName] = useState("");
  const [rec, setRec] = useState(false);
  const speech = useApp((s) => s.settings.speech);
  useEffect(() => {
    if (!rec) return;
    const stop = listen(speech, { text: (f, i) => setName((f + " " + i).trim().replace(/[.!?]$/, "").slice(0, 40)), end: () => setRec(false), error: () => setRec(false) });
    const id = setTimeout(() => { stop(); setRec(false); }, 6000);
    return () => { clearTimeout(id); stop(); };
  }, [rec, speech]);
  return (
    <Page>
      <TopBar onBack={onBack} />
      <h1 className="mt-8 text-[1.42rem] font-semibold">{title}</h1>
      <p className="mt-1 text-soft">{t("your_name_sub")}</p>
      <form className="mt-6 grid gap-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onDone(name.trim()); }}>
        <div className="flex gap-2">
          <input className="field !text-[1.13rem]" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name_ph")} autoComplete="given-name" maxLength={40} aria-label={t("name_ph")} />
          {canListen() && <button type="button" onClick={() => setRec(!rec)} aria-label={t("say_name")} className={`tap grid w-16 shrink-0 place-items-center rounded-[1rem] ${rec ? "pulse bg-navy text-paper" : "bg-navy text-paper"}`}><Icon name={rec ? "stop" : "mic"} /></button>}
        </div>
        {err && <p className="font-semibold text-brick" role="alert">{err}</p>}
        <Btn type="submit" disabled={!name.trim() || busy} className="mt-4">{busy ? <Spinner /> : t("continue")}</Btn>
      </form>
    </Page>
  );
}

export function Waiting() {
  const p = useApp((s) => s.pending);
  const [ask, setAsk] = useState(false);
  return (
    <Page>
      <div className="mt-20 grid place-items-center text-center">
        <span className="grid h-28 w-28 place-items-center rounded-full bg-card shadow-[0_0_0_1px_var(--color-line)]">{p?.denied ? <Icon name="close" size={52} /> : <Icon name="users" size={52} />}</span>
        <h1 className="mt-7 text-[1.42rem] font-semibold">{p?.denied ? t("denied_title") : t("waiting_title")}</h1>
        <p className="mt-3 max-w-[22rem] text-[1rem] leading-relaxed text-soft">{p?.denied ? t("denied") : t("waiting_sub", { name: p?.name ?? "" })}</p>
        {!p?.denied && <div className="card mt-8 w-full p-4 text-start"><b>{t("nobody")}</b><p className="mt-1 text-soft">{t("nobody_sub")}</p></div>}
        {!p?.denied && <div className="mt-6 flex items-center gap-2 text-soft"><Spinner /> {t("checking")}</div>}
      </div>
      <div className="mt-auto pt-8"><Btn kind="light" onClick={() => (p?.denied ? cancelJoin() : setAsk(true))}>{p?.denied ? t("try_again") : t("cancel")}</Btn></div>
      {ask && <Confirm text={t("cancel_join_q")} yes={t("cancel")} no={t("keep_waiting")} onYes={() => { setAsk(false); void cancelJoin(); }} onNo={() => setAsk(false)} />}
    </Page>
  );
}

export function SetLock({ onDone }: { onDone?: () => void }) {
  const bio = useApp((s) => s.bioAvailable);
  const [mode, setMode] = useState<"choose" | "pics" | "pics2">("choose");
  const [first, setFirst] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const done = () => (onDone ? onDone() : go("app"));
  const chooseBio = async () => {
    setBusy(true);
    try { await setLock("bio"); track("lock:bio"); done(); } catch { toast(t("bio_failed")); } finally { setBusy(false); }
  };
  if (mode !== "choose") return (
    <PicturePad key={mode} title={mode === "pics" ? t("pick_3_lock") : t("pick_again")} onBack={() => setMode("choose")}
      onDone={async (p) => {
        if (mode === "pics") { setFirst(p); setMode("pics2"); return true; }
        if (p.join() !== first.join()) { toast(t("not_match")); setMode("pics"); return false; }
        await setLock("pics", p); track("lock:pics"); done(); return true;
      }} />
  );
  return (
    <Page>
      <div className="flex items-center justify-between">{onDone ? <button onClick={onDone} aria-label={t("back")} className="tap card grid h-12 w-12 place-items-center !rounded-[1rem]"><Icon name="back" className="rtl:rotate-180" /></button> : <span className="font-bold tracking-[0.08em]">MEORA</span>}</div>
      <h1 className="mt-8 text-[1.42rem] font-semibold">{t("last_step")}</h1>
      <p className="mt-1 text-[1.05rem] text-soft">{t("open_how")}</p>
      <div className="mt-6 grid gap-3">
        {bio && <LockOption icon="finger" title={t("bio")} sub={t("bio_sub")} onClick={chooseBio} busy={busy} best />}
        <LockOption icon="pics" title={t("pics_lock")} sub={t("pics_lock_sub")} onClick={() => setMode("pics")} />
        <LockOption icon="none" title={t("no_lock")} sub={t("no_lock_sub")} onClick={async () => { await setLock("none"); track("lock:none"); done(); }} />
      </div>
    </Page>
  );
}
function LockOption({ icon, title, sub, onClick, busy, best }: { icon: string; title: string; sub: string; onClick: () => void; busy?: boolean; best?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className={`tap card flex items-center gap-4 p-4 text-start ${best ? "!shadow-[0_0_0_3px_var(--color-navy)]" : ""}`}>
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-[1rem] ${icon === "pics" ? "bg-brass-soft text-[1.6rem]" : "bg-[#E4E8F2] text-[#1D2742]"}`}>
        {icon === "pics" ? "🐘" : icon === "none" ? <Icon name="lock" /> : busy ? <Spinner /> : <Icon name="finger" size={30} />}
      </span>
      <span><b className="block text-[1rem]">{title}</b><span className="text-[0.92rem] text-soft">{sub}</span></span>
    </button>
  );
}

export function PicturePad({ title, onDone, onBack, extra }: { title: string; onDone: (p: number[]) => Promise<boolean>; onBack?: () => void; extra?: React.ReactNode }) {
  const [p, setP] = useState<number[]>([]);
  useEffect(() => {
    if (p.length !== 3) return;
    void onDone(p).then((ok) => { if (!ok) setP([]); });
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page>
      {onBack && <button onClick={onBack} aria-label={t("back")} className="tap card grid h-12 w-12 place-items-center !rounded-[1rem]"><Icon name="back" className="rtl:rotate-180" /></button>}
      <h1 className="mt-6 text-center text-[1.35rem] font-semibold">{title}</h1>
      <div className="mt-5 flex justify-center gap-2.5">{[0, 1, 2].map((i) => <span key={i} className={`h-4 w-4 rounded-full ${p[i] !== undefined ? "bg-navy" : "bg-line"}`} />)}</div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {JOIN_PICTURES.map(([e, n], i) => <button key={n} aria-label={n} onClick={() => p.length < 3 && setP([...p, i])} className="tap card grid h-[4.4rem] place-items-center text-[2.1rem]">{e}</button>)}
      </div>
      <Btn kind="light" className="mt-4" onClick={() => setP(p.slice(0, -1))} disabled={!p.length}><Icon name="undo" size={20} /> {t("undo")}</Btn>
      {extra}
    </Page>
  );
}

export function Locked() {
  const lock = useApp((s) => s.lock);
  const pics = lock.kind === "pics";
  useEffect(() => { if (lock.kind === "bio") void unlockBio(); }, [lock.kind]);
  if (pics && lock.kind === "pics") return <PicturePad title={t("tap_your_3")} onDone={async (p) => { const ok = await unlockPics(p); if (!ok) toast(t("not_match")); return ok; }} />;
  return (
    <main className="fade grid min-h-dvh place-items-center bg-[#1D2742] px-6 text-center text-white">
      <div>
        <div className="flex justify-center"><Logo size={72} flat /></div>
        <button onClick={() => void unlockBio()} className="tap mx-auto mt-12 grid h-36 w-36 place-items-center rounded-full bg-white/[.08] shadow-[0_0_0_16px_rgba(255,255,255,.04)]" aria-label={t("touch_open")}>
          <Icon name="finger" size={70} stroke={1.6} />
        </button>
        <h1 className="mt-9 text-[1.5rem] font-semibold">{t("touch_open")}</h1>
        <p className="mt-2 text-[1.05rem] text-white/70">{t("touch_open_sub")}</p>
        {lock.kind === "bio" && <p className="mt-10 text-[0.95rem] text-white/60">{t("bio_trouble")}</p>}
      </div>
    </main>
  );
}

export function RecoveryShow({ onDone }: { onDone?: () => void }) {
  const picks = useApp((s) => s.recoveryPicks);
  return (
    <Page>
      {onDone && <button onClick={onDone} aria-label={t("back")} className="tap card grid h-12 w-12 place-items-center !rounded-[1rem]"><Icon name="back" className="rtl:rotate-180" /></button>}
      <span className="mt-6 grid h-14 w-14 place-items-center rounded-[1rem] bg-brass-soft text-brass"><Icon name="key" size={30} /></span>
      <h1 className="mt-4 text-[1.35rem] font-semibold">{t("recovery_title")}</h1>
      <p className="mt-2 text-[1.02rem] leading-relaxed text-soft">{t("recovery_sub")}</p>
      {picks ? (
        <ol className="mt-5 grid grid-cols-3 gap-2">
          {picks.map((p, i) => (
            <li key={i} className="card flex flex-col items-center py-2.5">
              <span className="text-[0.75rem] text-soft">{i + 1}</span>
              <span className="text-[2rem] leading-tight">{PICTURES[p][0]}</span>
              <span className="text-[.85rem] font-semibold">{PICTURES[p][1]}</span>
            </li>
          ))}
        </ol>
      ) : <div className="mt-6 grid place-items-center"><Spinner /></div>}
      <div className="mt-auto pt-6"><Btn onClick={onDone ?? afterRecovery}>{t("wrote_down")}</Btn></div>
    </Page>
  );
}

export function Wordtop() { return <Wordmark small />; }
