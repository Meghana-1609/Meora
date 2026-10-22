"use client";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Btn, Header, Icon, Page } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { markSeen, saveItem, useApp, type Rec } from "../store";
import { topic as topicOf } from "@/lib/topics";
import { nextTime, daysUntil, icsFor } from "@/lib/dates";
import { colorOf, download, fmtDate, fmtDay, nameOf } from "../helpers";
import type { NoteData, TopicId } from "@/lib/types";

const STALE = 90 * 86400e3;
export function TopicScreen({ id }: { id: TopicId }) {
  const notes = useApp((s) => s.notes);
  const tp = topicOf(id);
  const list = useMemo(() => Object.values(notes).filter((n) => n.data.topic === id).sort((a, b) => b.updated - a.updated), [notes, id]);
  const people = useMemo(() => [...new Set(list.flatMap((n) => n.data.about))], [list]);
  const [who, setWho] = useState<string | null>(null);
  const shown = who ? list.filter((n) => n.data.about.includes(who)) : list;
  const stale = (id === "health" || id === "contacts") ? list.find((n) => Date.now() - n.data.confirmedAt > STALE) : undefined;

  const mic = <button onClick={() => nav.push({ s: "save", topic: id, about: who ?? undefined })} aria-label={t("save")} className="tap grid h-12 w-12 place-items-center rounded-[1rem] bg-navy text-paper"><Icon name="mic" /></button>;
  if (id === "dates") return <Dates list={list} mic={mic} />;
  return (
    <Page>
      <Header title={t("t_" + id)} onBack={() => nav.back()} right={mic} />
      {people.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="chip tap" aria-pressed={!who} onClick={() => setWho(null)}>{t("all")}</button>
          {people.map((p) => <button key={p} className="chip tap" aria-pressed={who === p} onClick={() => setWho(p)}>{p}</button>)}
        </div>
      )}
      {stale && <StaleCard n={stale} />}
      <div className="mt-3 grid gap-2.5">
        {shown.map((n) => <NoteRow key={n.id} n={n} />)}
      </div>
      {!shown.length && (
        <div className="mt-10 grid place-items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-[1.4rem]" style={{ background: tp.bg, color: tp.fg }}><Icon name={tp.icon} size={40} /></span>
          <p className="mt-4 max-w-[20rem] text-[1.05rem] text-soft">{t("nothing_here")}</p>
          <p className="mt-2 max-w-[22rem] text-[0.95rem] italic text-soft">{t("ex_" + id)}</p>
          <Btn className="mt-6 !w-auto px-8" onClick={() => nav.push({ s: "save", topic: id })}><Icon name="mic" /> {t("save")}</Btn>
        </div>
      )}
    </Page>
  );
}

export function NoteRow({ n }: { n: Rec<NoteData> }) {
  return (
    <button onClick={() => nav.push({ s: "note", id: n.id })} className="tap card block w-full !rounded-[1.1rem] px-4 py-3.5 text-start">
      <div className="flex gap-3">
        <p className="line-clamp-3 min-w-0 flex-1 text-[1rem] leading-snug">{n.data.text}{n.data.en && n.data.en !== n.data.text && <span className="mt-1 block text-[0.88rem] text-soft">{n.data.en}</span>}</p>
        <Icon name="chev" size={20} className="mt-1 opacity-40 rtl:rotate-180" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] text-soft">
        <Avatar name={nameOf(n.by)} color={colorOf(n.by)} size={22} /> {nameOf(n.by)} · {fmtDate(n.updated)}
        {n.data.about.length > 0 && <span>· {n.data.about.join(", ")}</span>}
        {n.data.remind && <span className="inline-flex items-center gap-1">· <Icon name="bell" size={14} /> {n.data.remind.time}</span>}
        {n.data.photo && <span className="inline-flex items-center gap-1">· <Icon name="cam" size={14} /></span>}
        {n.data.audio && <span className="inline-flex items-center gap-1">· <Icon name="wave" size={14} /></span>}
        {n.vis && <span className="inline-flex items-center gap-1">· <Icon name="lock" size={14} /></span>}
      </div>
    </button>
  );
}

export function StaleCard({ n }: { n: Rec<NoteData> }) {
  const months = Math.round((Date.now() - n.data.confirmedAt) / (30 * 86400e3));
  return (
    <div className="mt-3 rounded-[1rem] bg-brass-soft p-4">
      <p><b>{t("still_right")}</b> {t("months_old", { text: n.data.text.slice(0, 40), n: months })}</p>
      <div className="mt-2.5 flex gap-2">
        <button className="chip tap" onClick={() => saveItem({ ...n.data, confirmedAt: Date.now() }, { id: n.id })}><Icon name="check" size={17} /> {t("yes")}</button>
        <button className="chip tap" onClick={() => nav.push({ s: "save", edit: n.id })}><Icon name="edit" size={17} /> {t("change_it")}</button>
      </div>
    </div>
  );
}

function Dates({ list, mic }: { list: Rec<NoteData>[]; mic: React.ReactNode }) {
  const now = new Date();
  const withNext = list.map((n) => ({ n, at: n.data.remind ? nextTime(n.data.remind, now) : null })).sort((a, b) => (a.at?.getTime() ?? 9e15) - (b.at?.getTime() ?? 9e15));
  const week = withNext.filter((x) => x.at && daysUntil(x.at, now) <= 7);
  const later = withNext.filter((x) => !(x.at && daysUntil(x.at, now) <= 7));
  const Row = ({ n, at }: { n: Rec<NoteData>; at: Date | null }) => {
    const d = at ? fmtDay(at) : null;
    return (
      <div className="card flex items-center gap-3 p-3">
        <button onClick={() => nav.push({ s: "note", id: n.id })} className="tap flex min-w-0 flex-1 items-center gap-3 text-start">
          <span className="grid w-[3.6rem] shrink-0 place-items-center rounded-[.9rem] bg-[#E6EEE2] py-1.5 text-[#2E4A29]">
            {d ? <><b className="text-[1.17rem] leading-tight">{d.day}</b><span className="text-[0.7rem] font-bold">{d.mon}</span></> : <Icon name="cal" />}
          </span>
          <span className="min-w-0">
            <b className="line-clamp-2 block text-[1.05rem] leading-snug">{n.data.text}</b>
            <span className="text-[0.85rem] text-soft">{n.data.remind ? t("rep_" + n.data.remind.repeat) : t("no_date")}</span>
          </span>
        </button>
        {n.data.remind && <button onClick={() => download("meora-reminder.ics", icsFor(n.data.text, n.data.remind!), "text/calendar")} aria-label={t("add_calendar")} className="tap grid h-11 w-11 shrink-0 place-items-center rounded-[.8rem] text-brass"><Icon name="bell" /></button>}
      </div>
    );
  };
  return (
    <Page>
      <Header title={t("t_dates")} onBack={() => nav.back()} right={mic} />
      {!list.length && <p className="mt-6 text-center text-soft">{t("no_dates")}</p>}
      {week.length > 0 && <><p className="sec mt-3">{t("this_week")}</p><div className="mt-2 grid gap-2">{week.map((x) => <Row key={x.n.id} {...x} />)}</div></>}
      {later.length > 0 && <><p className="sec mt-5">{t("later")}</p><div className="mt-2 grid gap-2">{later.map((x) => <Row key={x.n.id} {...x} />)}</div></>}
      {list.length > 0 && <p className="mt-5 text-center text-[0.9rem] text-soft"><Icon name="bell" size={15} className="inline" /> {t("bell_hint")}</p>}
    </Page>
  );
}

export function News() {
  const notes = useApp((s) => s.notes);
  const me = useApp((s) => s.me?.id);
  const list = Object.values(notes).filter((n) => n.by !== me).sort((a, b) => b.updated - a.updated).slice(0, 30);
  useEffect(() => { void markSeen(); }, []);
  return (
    <Page>
      <Header title={t("whats_new")} onBack={() => nav.back()} />
      <div className="mt-3 grid gap-2.5">{list.map((n) => <NoteRow key={n.id} n={n} />)}</div>
      {!list.length && <p className="mt-8 text-center text-soft">{t("nothing_new")}</p>}
    </Page>
  );
}
