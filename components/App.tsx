"use client";
import { useEffect } from "react";
import { boot, useApp } from "./store";
import { nav, useRoute } from "./nav";
import { Logo, Toaster, toast } from "./ui";
import { t } from "./i18n";
import { startTracking } from "./track";
import { LangScreen, Locked, RecoveryShow, SetLock, Waiting, Welcome } from "./screens/Onboard";
import { Home } from "./screens/Home";
import { Save } from "./screens/Save";
import { Ask, Questions } from "./screens/Ask";
import { News, TopicScreen } from "./screens/Topic";
import { NoteScreen } from "./screens/Note";
import { Emergency } from "./screens/Emergency";
import { Family } from "./screens/Family";
import { Privacy, Settings, Tour } from "./screens/Settings";
import { More } from "./screens/More";
import { AllTopics } from "./screens/Topics";
import { BottomNav } from "./BottomNav";
import { Help } from "./Help";

export function App() {
  const stage = useApp((s) => s.stage);
  const s = useApp((x) => x.settings);
  const removed = useApp((x) => x.removed);
  useEffect(() => { void boot(); }, []);
  useEffect(() => {
    const h = document.documentElement;
    h.classList.remove("t1", "t2", "t3"); h.classList.add(`t${s.text}`);
    h.classList.toggle("dark", s.dark);
    h.lang = s.lang; h.dir = s.lang === "ar" ? "rtl" : "ltr";
  }, [s.text, s.dark, s.lang]);
  useEffect(() => { if (removed) toast(t("removed")); }, [removed]);
  useEffect(() => { if (stage !== "loading") startTracking(s.lang, s.speech); }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div key={s.lang}>
      {stage === "loading" && <Splash />}
      {stage === "lang" && <LangScreen />}
      {stage === "welcome" && <Welcome />}
      {stage === "waiting" && <Waiting />}
      {stage === "setlock" && <SetLock />}
      {stage === "recovery" && <RecoveryShow />}
      {stage === "locked" && <Locked />}
      {stage === "app" && <Main />}
      <Toaster />
    </div>
  );
}

function Splash() {
  return <main className="grid min-h-dvh place-items-center bg-[#1D2742]"><Logo size={96} flat /></main>;
}

function Main() {
  const r = useRoute();
  const toured = useApp((s) => s.settings.toured);
  useEffect(() => { if (!toured) nav.push({ s: "tour" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const noNav = ["save", "lang", "tour", "recovery"].includes(r.s);
  const help = !["save", "tour", "recovery"].includes(r.s);
  return noNav
    ? <>{<Screen r={r} />}{help && <Help nav={false} />}</>
    : <div className="with-nav"><Screen r={r} /><Help nav /><BottomNav at={r.s} /></div>;
}

function Screen({ r }: { r: ReturnType<typeof useRoute> }) {
  switch (r.s) {
    case "save": return <Save key={JSON.stringify(r)} {...r} />;
    case "more": return <More />;
    case "topics": return <AllTopics />;
    case "ask": return <Ask key={r.q ?? "ask"} q={r.q} />;
    case "topic": return <TopicScreen id={r.id} />;
    case "note": return <NoteScreen id={r.id} />;
    case "emergency": return <Emergency person={r.person} />;
    case "family": return <Family />;
    case "settings": return <Settings />;
    case "lang": return <LangScreen onDone={() => nav.back()} />;
    case "privacy": return <Privacy />;
    case "questions": return <Questions />;
    case "news": return <News />;
    case "recovery": return <RecoveryShow onDone={() => nav.back()} />;
    case "tour": return <Tour />;
    default: return <Home />;
  }
}
