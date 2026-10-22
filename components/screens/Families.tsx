"use client";
// "Your families": every family on this phone. The open one is the navy card; tap another to switch.
import { useState } from "react";
import { Avatar, Btn, Header, Icon, Page, Spinner, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { addFamily, nameFamily, switchFamily, useApp, type FamSum } from "../store";
import { track } from "../track";

/** The name shown for a family: the one picked on this phone, or "Meghana's family". */
export function famName(sum: FamSum | undefined, i: number) {
  return sum?.nick || (sum?.first ? t("fam_of", { name: sum.first }) : t("family_n", { n: i + 1 }));
}

export function Families() {
  const fams = useApp((s) => s.fams);
  const cur = useApp((s) => s.cur);
  const sums = useApp((s) => s.sums);
  const family = useApp((s) => s.family);
  const notes = useApp((s) => s.notes);
  const [busy, setBusy] = useState("");

  const open = async (f: string) => {
    if (busy) return;
    if (f === cur?.fam) { nav.push({ s: "family" }); return; }
    setBusy(f);
    try { await switchFamily(f); track("family_switched"); nav.home(); }
    catch { toast(t("error")); }
    finally { setBusy(""); }
  };

  return (
    <Page>
      <Header title={t("your_families")} onBack={() => nav.back()} />
      <p className="px-1 text-[0.9rem] text-soft">{fams.length === 1 ? t("fams_sub_1") : t("fams_sub", { n: fams.length })}</p>

      <div className="mt-5 grid gap-2.5">
        {fams.map((f, i) => {
          const on = f.fam === cur?.fam;
          const sum = sums[f.fam];
          // The open family shows live numbers; the others show what we remembered last time.
          const people = on && family ? family.members.filter((m) => !m.removed) : null;
          const who = people ? people.slice(0, 5).map((m) => ({ n: m.name, c: m.color })) : sum?.who ?? [];
          const count = on ? Object.keys(notes).length : sum?.notes;
          const n = people ? people.length : sum?.people;
          return (
            <button key={f.fam} onClick={() => open(f.fam)} aria-current={on ? "true" : undefined}
              className={`tap w-full rounded-[1.25rem] p-[1.1rem] text-start ${on ? "bg-[#1D2742] text-[#F3F1EC]" : "card"}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <b className="block truncate text-[1.06rem] font-semibold">{famName(sum, i)}</b>
                  {n !== undefined && <span className={`mt-0.5 block text-[0.85rem] ${on ? "text-[#F3F1EC]/65" : "text-soft"}`}>{n === 1 ? t("people_1") : t("people_n", { n })} · {count === 1 ? t("mem_1") : t("mem_n", { n: count ?? 0 })}</span>}
                </span>
                {busy === f.fam ? <Spinner /> : on
                  ? <span className="shrink-0 pt-0.5 text-[0.72rem] font-semibold tracking-[0.1em] text-[#D4B98A]">{t("open_now").toUpperCase()}</span>
                  : <Icon name="chev" size={18} className="shrink-0 text-soft rtl:rotate-180" />}
              </span>
              {who.length > 0 && (
                <span className="mt-3.5 flex">
                  {who.map((w, j) => (
                    <span key={j} className={`-ms-1.5 rounded-full first:ms-0 ${on ? "ring-2 ring-[#1D2742]" : "ring-2 ring-[var(--color-card)]"}`}><Avatar name={w.n} color={w.c} size={28} /></span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 text-[0.98rem] font-semibold">
        <button onClick={() => { track("tap_start"); addFamily("start"); }} className="tap flex items-center gap-1.5 px-2 py-2"><Icon name="plus" size={18} />{t("start_a_family")}</button>
        <span className="h-5 w-px bg-line" aria-hidden />
        <button onClick={() => { track("tap_join"); addFamily("join"); }} className="tap flex items-center gap-1.5 px-2 py-2"><Icon name="users" size={18} />{t("join_a_family")}</button>
      </div>
      <div className="h-8" />
    </Page>
  );
}

/** Give a family a name on this phone (only you see it). */
export function NameFamily({ fam, current, onClose }: { fam: string; current: string; onClose: () => void }) {
  const [v, setV] = useState(current);
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/40 p-3 sm:place-items-center" onClick={onClose}>
      <form className="fade card w-full max-w-[30rem] p-5" onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => { e.preventDefault(); try { await nameFamily(fam, v); onClose(); } catch { toast(t("error")); } }}>
        <b className="text-[1.04rem]">{t("name_family")}</b>
        <p className="mt-1 text-[0.88rem] text-soft">{t("name_family_sub")}</p>
        <input className="field mt-3" value={v} onChange={(e) => setV(e.target.value)} maxLength={40} placeholder={t("name_family_ph")} aria-label={t("name_family")} autoFocus />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Btn kind="light" type="button" onClick={onClose}>{t("cancel")}</Btn>
          <Btn type="submit">{t("save")}</Btn>
        </div>
      </form>
    </div>
  );
}
