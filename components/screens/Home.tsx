"use client";
import { track } from "../track";
import { useMemo, useState } from "react";
import { Avatar, Group, Icon, Label, Logo, Row } from "../ui";
import { t, LOCALE } from "../i18n";
import { nav } from "../nav";
import { useApp } from "../store";
import { TOPICS } from "@/lib/topics";
import { nextTime, daysUntil, iso } from "@/lib/dates";
import { questionFor } from "@/lib/questions";
import { pushSupported } from "../push";
import type { Rec } from "../store";
import type { NoteData } from "@/lib/types";
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
  const tiles = TOPICS.filter((tp) => tp.id !== "other").slice(0, 8);
  const ymd = iso(now);
  const myId = me?.id;
  const todayQ = questionFor(family?.kind, ymd, s.lang);
  const [skip, setSkip] = useState(() => read("meora_qskip"));
  const [noNotify, setNoNotify] = useState(() => read("meora_notify_card") === "1");
  const showQ = !s.simple && skip !== ymd && !Object.values(notes).some((n) => n.data.q === todayQ && iso(new Date(n.data.createdAt)) === ymd);
  const diaryToday = Object.values(notes).some((n) => n.data.topic === "diary" && n.data.createdBy === myId && iso(new Date(n.data.createdAt)) === ymd);
  const notifyCard = !empty && !noNotify && !s.notify?.on && pushSupported();
  const memory = useMemo(() => pickMemory(Object.values(notes), now), [notes, ymd]); // eslint-disable-line react-hooks/exhaustive-deps
  const streak = useMemo(() => {
    const days = new Set(Object.values(notes).filter((n) => n.data.createdBy === myId).map((n) => iso(new Date(n.data.createdAt))));
    const d = new Date(now); if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
    let k = 0; while (days.has(iso(d)) && k < 999) { k++; d.setDate(d.getDate() - 1); }
    return k;
  }, [notes, ymd, myId]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = useMemo(() => Object.values(notes).sort((a, b) => b.updated - a.updated).slice(0, 3), [notes]);

  return (
    <main className="fade mx-auto w-full max-w-[32rem] px-5 pt-[max(1.1rem,env(safe-area-inset-top))] md:max-w-[64rem] md:px-8 md:pt-8 lg:px-11">
      {/* Phone: logo + language on top, greeting below. Tablet/computer: greeting on the left, language on the right. */}
      <header className="grid grid-cols-[1fr_auto] items-center gap-x-3">
        <span className="flex min-w-0 items-center gap-2.5 md:hidden"><Logo size={32} /><span className="min-w-0 leading-none"><b className="block truncate text-[.95rem] font-semibold tracking-[0.14em]">MEORA</b><span className="mt-1 block truncate text-[.74rem] text-soft">{t("tag")}</span></span></span>
        <span className="col-start-2 row-start-1 md:row-span-2 md:self-center"><LangPill /></span>
        <p className="col-span-2 mt-6 text-[0.86rem] text-soft md:col-span-1 md:col-start-1 md:row-start-1 md:mt-0 md:text-[.95rem]">{today}</p>
        <h1 className="col-span-2 mt-0.5 text-[1.35rem] font-semibold leading-tight tracking-[-.01em] md:col-span-1 md:col-start-1 md:row-start-2 md:text-[1.9rem]">{hello}</h1>
      </header>
      {streak >= 2 && <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-[.85rem] font-semibold text-leaf"><Icon name="sprout" size={15} />{t("streak", { n: streak })}</span>}
      {(!online || outbox > 0) && <p className="mt-3 rounded-[.8rem] bg-brass-soft px-3.5 py-2 text-[.88rem] font-medium">{!online ? t("offline") : t("sending", { n: outbox })}</p>}

      <button onClick={() => nav.push({ s: "ask" })} className="tap mt-4 flex w-full items-center gap-3 rounded-[1rem] bg-navy py-1.5 pe-1.5 ps-4 text-start text-paper shadow-[0_12px_26px_-18px_rgb(19_26_48/.9)] md:mt-5 md:rounded-[1.15rem] md:py-2 md:pe-2 md:ps-5">
        <Icon name="ask" size={18} className="opacity-70" />
        <span className="flex-1 text-[1rem] opacity-80">{t("ask_bar")}</span>
        <span className="grid h-10 w-10 place-items-center rounded-[.75rem] bg-white/12"><Icon name="mic" size={19} /></span>
      </button>

      <div className={s.simple ? "" : "md:grid md:grid-cols-2 md:items-start md:gap-x-8"}>
      <div className="min-w-0">

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

      {/* Today's question: one gentle question a day, the same for everyone in the space. */}
      {showQ && (
        <div className="mt-4 rounded-[1.2rem] bg-[linear-gradient(160deg,#26304F,#1D2742)] p-4 text-[#F3F1EC] md:p-5">
          <p className="text-[.72rem] font-bold uppercase tracking-[.12em] text-[#D4B98A]">{t("today_q")}</p>
          <p className="mt-1.5 text-[1.1rem] font-medium leading-snug">{todayQ}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { track("daily_q_open"); nav.push({ s: "save", prompt: todayQ }); }} className="tap flex items-center gap-1.5 rounded-[.8rem] bg-[#F3F1EC] px-3.5 py-2 text-[.92rem] font-semibold text-[#1D2742]"><Icon name="mic" size={16} />{t("answer_voice")}</button>
            <button onClick={() => { setSkip(ymd); store("meora_qskip", ymd); track("daily_q_skip"); }} className="tap rounded-[.8rem] border border-white/20 px-3.5 py-2 text-[.92rem]">{t("skip")}</button>
          </div>
        </div>
      )}

      {/* A memory from the past, to bring people back to what they saved. */}
      {memory && (
        <Group className="mt-2.5"><Row icon="clock" tint="#F3EBDC" fg="#8F6A2E" title={<span className="line-clamp-2">{short(memory.n.data.text, 80)}</span>}
          sub={`${memory.when} · ${t("saved_by", { name: family?.members.find((m) => m.id === memory.n.by)?.name ?? "" })}`} onClick={() => { track("memory_open"); nav.push({ s: "note", id: memory.n.id }); }} /></Group>
      )}

      {/* The private diary: once a day. */}
      {!s.simple && !diaryToday && (
        <Group className="mt-2.5"><Row icon="person" tint="#E1EAF4" fg="#3F6696" title={t("diary_card")} sub={t("diary_card_sub")} onClick={() => { track("diary_open"); nav.push({ s: "save", diary: true }); }} /></Group>
      )}

      {notifyCard && (
        <div className="card mt-2.5 flex items-center gap-3 !rounded-[1.1rem] py-3 pe-2 ps-4">
          <Icon name="bell" size={20} className="text-brass" />
          <button onClick={() => nav.push({ s: "notify" })} className="tap min-w-0 flex-1 text-start"><b className="block text-[.98rem] font-semibold">{t("notify_card")}</b><span className="block text-[.84rem] text-soft">{t("notify_card_sub")}</span></button>
          <button onClick={() => { setNoNotify(true); store("meora_notify_card", "1"); }} aria-label={t("close")} className="tap grid h-9 w-9 place-items-center text-soft"><Icon name="close" size={18} /></button>
        </div>
      )}

      {alone && !empty && requests.length === 0 && family?.kind !== "me" && (
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

      {/* Bigger screens have room for the latest notes too. */}
      {!empty && recent.length > 0 && (
        <div className="hidden md:block">
          <Label>{t("recent")}</Label>
          <Group>{recent.map((n) => {
            const tp = TOPICS.find((x) => x.id === n.data.topic) ?? TOPICS[TOPICS.length - 1];
            return <Row key={n.id} icon={tp.icon} tint={tp.bg} fg={tp.fg} title={<span className="line-clamp-1">{short(n.data.en || n.data.text, 60)}</span>} sub={family?.members.find((m) => m.id === n.by)?.name} onClick={() => nav.push({ s: "note", id: n.id })} />;
          })}</Group>
        </div>
      )}
      </div>

      {!s.simple && (
        <div className="min-w-0">
          <Label action={t("all")} onAction={() => nav.push({ s: "topics" })}>{t("topics")}</Label>
          <div className="topics grid grid-cols-2 gap-2 md:gap-2.5">
            {tiles.map((tp, i) => (
              <button key={tp.id} onClick={() => nav.push({ s: "topic", id: tp.id })} className={`tile tap h-[4.4rem] flex-col justify-between rounded-[1rem] p-3 text-start md:h-[5.4rem] md:p-3.5 ${i >= 6 ? "hidden md:flex" : "flex"}`} style={{ background: tp.bg }}>
                <span className="flex items-center justify-between"><Icon name={tp.icon} size={17} style={{ color: tp.fg }} />{counts[tp.id] ? <span className="text-[0.78rem] opacity-60">{counts[tp.id]}</span> : null}</span>
                <span className="text-[0.93rem] font-medium leading-tight">{t("t_" + tp.id)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
      <div className="h-8" />
    </main>
  );
}

const read = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

/** One memory a day from the past: the same day in an earlier year if there is one, otherwise an older note. */
function pickMemory(list: Rec<NoteData>[], now: Date): { n: Rec<NoteData>; when: string } | null {
  const old = list.filter((n) => n.data.createdAt < now.getTime() - 7 * 86400e3).sort((a, b) => a.data.createdAt - b.data.createdAt);
  if (!old.length) return null;
  const md = (d: Date) => `${d.getMonth()}-${d.getDate()}`;
  const same = old.filter((n) => md(new Date(n.data.createdAt)) === md(now) && new Date(n.data.createdAt).getFullYear() < now.getFullYear());
  const day = Math.floor(now.getTime() / 86400e3);
  const n = same.length ? same[day % same.length] : old[day % old.length];
  const days = Math.floor((now.getTime() - n.data.createdAt) / 86400e3);
  const years = now.getFullYear() - new Date(n.data.createdAt).getFullYear();
  const when = same.includes(n) ? (years === 1 ? t("ago_year") : t("ago_years", { n: years }))
    : days < 14 ? t("ago_days", { n: days }) : days < 60 ? t("ago_weeks", { n: Math.floor(days / 7) }) : days < 365 ? t("ago_months", { n: Math.floor(days / 30) }) : t("ago_years", { n: Math.floor(days / 365) });
  return { n, when };
}
