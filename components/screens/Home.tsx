"use client";
import { track } from "../track";
import { useMemo } from "react";
import { Avatar, Group, Icon, Label, Logo, Row } from "../ui";
import { t, LOCALE } from "../i18n";
import { nav } from "../nav";
import { useApp } from "../store";
import { TOPICS } from "@/lib/topics";
import { nextTime, daysUntil } from "@/lib/dates";
import { LangPill } from "./Onboard";
import type { TopicId } from "@/lib/types";

export function useUpcoming(days = 7) {
  const notes = useApp((s) => s.notes);
  return useMemo(() => {
    const now = new Date();
    return Object.values(notes).flatMap((n) => {
      if (!n.data.remind) return [];
      const at = nextTime(n.data.remind, now);
      if (!at) return [];
      const d = daysUntil(at, now);
      return d <= days ? [{ n, at, d }] : [];
    }).sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [notes, days]);
}
export const whenText = (d: number, at: Date) => (d === 0 ? t("today_at", { time: at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }) : d === 1 ? t("tomorrow") : t("in_days", { n: d }));
const short = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function Home() {
  const s = useApp((x) => x.settings);
  const me = useApp((x) => x.me);
  const notes = useApp((x) => x.notes);
  const questions = useApp((x) => x.questions);
  const family = useApp((x) => x.family);
  const online = useApp((x) => x.online);
  const outbox = useApp((x) => x.outbox);
  const upcoming = useUpcoming(7);
  const open = Object.values(questions).filter((q) => !q.data.answer && q.data.by !== me?.id);
  const counts = useMemo(() => { const c: Record<string, number> = {}; Object.values(notes).forEach((n) => (c[n.data.topic] = (c[n.data.topic] ?? 0) + 1)); return c; }, [notes]);
  const now = new Date();
  const h = now.getHours();
  const hello = t(h < 12 ? "morning" : h < 17 ? "afternoon" : "evening", { name: me?.name ?? "" });
  const today = now.toLocaleDateString(LOCALE(), { weekday: "long", day: "numeric", month: "long" });
  const requests = family?.requests ?? [];
  const empty = Object.keys(notes).length === 0;
  const alone = (family?.members.length ?? 1) <= 1;
  const starters: [string, string, TopicId][] = [["s_med", "health", "health"], ["s_doc", "phone", "contacts"], ["s_where", "key", "where"], ["s_bday", "cal", "dates"]];
  const tiles = TOPICS.filter((tp) => tp.id !== "other").slice(0, 6);

  return (
    <main className="fade mx-auto w-full max-w-[32rem] px-5 pt-[max(1.1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5"><Logo size={32} /><span className="min-w-0 leading-none"><b className="block truncate text-[.95rem] font-semibold tracking-[0.14em]">MEORA</b><span className="mt-1 block truncate text-[.74rem] text-soft">{t("tag")}</span></span></span>
        <LangPill />
      </header>
      {(!online || outbox > 0) && <p className="mt-3 rounded-[.8rem] bg-brass-soft px-3.5 py-2 text-[.88rem] font-medium">{!online ? t("offline") : t("sending", { n: outbox })}</p>}

      <p className="mt-6 text-[0.86rem] text-soft">{today}</p>
      <h1 className="mt-0.5 text-[1.35rem] font-semibold leading-tight tracking-[-.01em]">{hello}</h1>

      <button onClick={() => nav.push({ s: "ask" })} className="tap mt-4 flex w-full items-center gap-3 rounded-[1rem] bg-navy py-1.5 pe-1.5 ps-4 text-start text-paper shadow-[0_12px_26px_-18px_rgb(19_26_48/.9)]">
        <Icon name="ask" size={18} className="opacity-70" />
        <span className="flex-1 text-[1rem] opacity-80">{t("ask_bar")}</span>
        <span className="grid h-10 w-10 place-items-center rounded-[.75rem] bg-white/12"><Icon name="mic" size={19} /></span>
      </button>

      {requests.length > 0 && (
        <>
          <Label>{t("waiting_label")}</Label>
          <Group>{requests.map((r) => <Row key={r.id} avatar={<Avatar name={r.name} color="#8FAE8D" size={36} />} title={t("wants_join", { name: r.name })} onClick={() => nav.tab({ s: "family" })} right={<span className="rounded-[.6rem] bg-leaf px-3 py-1.5 text-[0.85rem] font-semibold text-white">{t("allow")}</span>} />)}</Group>
        </>
      )}
      {open.length > 0 && (
        <>
          <Label>{t("family_asked")}</Label>
          <Group><Row icon="help" tint="#F3EBDC" fg="#8F6A2E" title={open.length === 1 ? `“${open[0].data.text}”` : t("questions_waiting", { n: open.length })} sub={t("answer_it")} onClick={() => nav.push(open.length === 1 ? { s: "save", answers: open[0].id } : { s: "questions" })} /></Group>
        </>
      )}

      {alone && !empty && requests.length === 0 && (
        <Group className="mt-4"><Row icon="users" tint="#E4E8F2" fg="#1D2742" title={t("invite_member")} sub={t("invite_nudge")} onClick={() => { track("invite_nudge"); nav.tab({ s: "family" }); }} /></Group>
      )}

      {empty && !s.simple ? (
        <>
          <Label>{t("start_title")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {starters.map(([k, icon, topic]) => {
              const tp = TOPICS.find((x) => x.id === topic)!;
              return (
                <button key={k} onClick={() => nav.push({ s: "save", topic })} className="tile tap flex h-[4.6rem] flex-col justify-between rounded-[1rem] p-3 text-start" style={{ background: tp.bg }}>
                  <Icon name={icon} size={18} style={{ color: tp.fg }} />
                  <span className="text-[0.95rem] font-medium leading-tight">{t(k)}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <Label action={t("see_all")} onAction={() => nav.push({ s: "topic", id: "dates" })}>{t("today")}</Label>
          {upcoming.length ? (
            <Group>
              {upcoming.slice(0, 3).map((u) => (
                <Row key={u.n.id} icon={u.n.data.topic === "health" ? "health" : "bell"} tint={u.n.data.topic === "health" ? "#E6EEE2" : "#F3EBDC"} fg={u.n.data.topic === "health" ? "#4F7A47" : "#8F6A2E"}
                  title={<span className="line-clamp-1">{short(u.n.data.en || u.n.data.text, 46)}</span>} sub={whenText(u.d, u.at)} onClick={() => nav.push({ s: "note", id: u.n.id })} />
              ))}
            </Group>
          ) : <p className="px-1 text-[0.9rem] text-soft">{t("nothing_today")}</p>}
        </>
      )}

      {!s.simple && (
        <>
          <Label action={t("all")} onAction={() => nav.push({ s: "topics" })}>{t("topics")}</Label>
          <div className="topics grid grid-cols-2 gap-2">
            {tiles.map((tp) => (
              <button key={tp.id} onClick={() => nav.push({ s: "topic", id: tp.id })} className="tile tap flex h-[4.4rem] flex-col justify-between rounded-[1rem] p-3 text-start" style={{ background: tp.bg }}>
                <span className="flex items-center justify-between"><Icon name={tp.icon} size={17} style={{ color: tp.fg }} />{counts[tp.id] ? <span className="text-[0.78rem] opacity-60">{counts[tp.id]}</span> : null}</span>
                <span className="text-[0.93rem] font-medium leading-tight">{t("t_" + tp.id)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="h-8" />
    </main>
  );
}
