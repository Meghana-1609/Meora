"use client";
import { useEffect, useState } from "react";
import { Avatar, Btn, Confirm, Header, Icon, Page, Spinner, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { deleteItem, loadBlob, useApp } from "../store";
import { topic as topicOf } from "@/lib/topics";
import { icsFor } from "@/lib/dates";
import { colorOf, download, fmtDate, nameOf, phones, speak, translate } from "../helpers";
import type { BlobRef } from "@/lib/types";
import { MOODS } from "./Save";

export function NoteScreen({ id }: { id: string }) {
  const n = useApp((s) => s.notes[id]);
  const me = useApp((s) => s.me?.id);
  const lang = useApp((s) => s.settings.speech);
  const [ask, setAsk] = useState(false);
  const [tr, setTr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!n) return <Page><Header title={t("note")} onBack={() => nav.back()} /><p className="mt-10 text-center text-soft">{t("note_gone")}</p></Page>;
  const tp = topicOf(n.data.topic);
  const nums = phones(n.data.text);
  const visNames = n.vis ? n.vis.map(nameOf).join(", ") : "";
  return (
    <Page>
      <Header title={t("note")} onBack={() => nav.back()} />
      <div className="card mt-3 p-5">
        <span className="inline-flex items-center gap-1.5 rounded-[.6rem] px-2.5 py-1 text-[0.85rem] font-semibold" style={{ background: tp.bg, color: tp.fg }}>
          <Icon name={tp.icon} size={15} /> {t("t_" + tp.id)}{n.data.about.length ? ` · ${n.data.about.join(", ")}` : ""}
        </span>
        {n.data.q && <p className="mt-3 text-[.92rem] text-soft">“{n.data.q}”</p>}
        <p className="mt-3 whitespace-pre-wrap text-[1.12rem] font-semibold leading-snug">{n.data.mood && <span className="me-1.5" aria-label={t("mood_" + n.data.mood)}>{MOODS.find((m) => m[0] === n.data.mood)?.[1]}</span>}{n.data.text}</p>
        {n.data.en && <p className="mt-2 rounded-[.8rem] bg-paper px-3 py-2 text-[.92rem]"><span className="text-[.78rem] font-semibold uppercase tracking-wide text-soft">{t("in_english")}</span><br />{n.data.en}</p>}
        {tr && <p className="mt-3 rounded-[.9rem] bg-paper p-3 text-[1rem]">{tr}</p>}
        {n.data.photo && <Media r={n.data.photo} kind="photo" />}
        {n.data.audio && <Media r={n.data.audio} kind="audio" />}
        <div className="mt-4 grid gap-1.5 text-[0.9rem] text-soft">
          <span className="flex items-center gap-2"><Avatar name={nameOf(n.by)} color={colorOf(n.by)} size={22} /> {t("saved_by", { name: nameOf(n.by), date: fmtDate(n.updated) })}</span>
          <span className="flex items-center gap-2"><Icon name={n.vis ? "lock" : "eye"} size={17} /> {n.vis?.length === 1 && n.vis[0] === me ? t("only_you_see_note") : n.vis ? t("some_see", { names: visNames }) : t("everyone_sees")}</span>
          {n.data.remind && <span className="flex items-center gap-2"><Icon name="bell" size={17} /> {t("rep_" + n.data.remind.repeat)}{n.data.remind.date && n.data.remind.repeat !== "daily" ? ` · ${new Date(n.data.remind.date + "T00:00").toLocaleDateString()}` : ""} · {n.data.remind.time}</span>}
        </div>
      </div>
      {nums.length > 0 && <div className="mt-3 grid gap-2">{nums.map((p) => <a key={p} href={`tel:${p}`} className="tap flex min-h-[3.5rem] items-center justify-center gap-2 rounded-[1.1rem] bg-leaf text-[1rem] font-bold text-white"><Icon name="phone" /> {t("call")} {p}</a>)}</div>}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Btn kind="light" onClick={() => speak(tr ?? n.data.text)}><Icon name="speak" /> {t("listen")}</Btn>
        <Btn kind="light" disabled={busy} onClick={async () => { setBusy(true); const r = await translate(n.data.text, lang); setBusy(false); if (r.text) setTr(r.text); else if (r.openUrl) window.open(r.openUrl, "_blank", "noopener"); }}>{busy ? <Spinner /> : <Icon name="trans" />} {t("translate")}</Btn>
        <Btn kind="light" onClick={() => nav.push({ s: "save", edit: id })}><Icon name="edit" /> {t("edit")}</Btn>
        <Btn kind="light" className="!text-brick" onClick={() => setAsk(true)}><Icon name="trash" /> {t("delete")}</Btn>
      </div>
      {n.data.remind && <Btn kind="light" className="mt-2.5" onClick={() => download("meora-reminder.ics", icsFor(n.data.text, n.data.remind!), "text/calendar")}><Icon name="cal" /> {t("add_calendar")}</Btn>}
      {n.data.history.length > 0 && (
        <>
          <p className="sec mt-6">{t("history")}</p>
          <div className="mt-1">
            {[...n.data.history].reverse().map((h, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-line py-3 text-[0.95rem]">
                <span className="min-w-0">{t("was")}: “{h.text}”</span><span className="shrink-0 text-soft">{nameOf(h.by)} · {fmtDate(h.at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {ask && <Confirm text={t("delete_q")} yes={t("delete")} no={t("cancel")} danger onNo={() => setAsk(false)} onYes={async () => { setAsk(false); await deleteItem(id); toast(t("deleted")); nav.back(); }} />}
    </Page>
  );
}

function Media({ r, kind }: { r: BlobRef; kind: "photo" | "audio" }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { let u = ""; loadBlob(r).then((x) => { u = x; setUrl(x); }).catch(() => setErr(true)); return () => { if (u) URL.revokeObjectURL(u); }; }, [r]);
  if (err) return <p className="mt-3 text-[0.9rem] text-soft">{t("media_offline")}</p>;
  if (!url) return <div className="mt-3 grid h-20 place-items-center"><Spinner /></div>;
  return kind === "photo" ? <a href={url} target="_blank" rel="noopener"><img src={url} alt="" className="mt-3 max-h-80 w-full rounded-[1rem] object-cover" /></a> : <audio src={url} controls className="mt-3 w-full" />;
}
