"use client";
import { useMemo, useState } from "react";
import { Avatar, Btn, Confirm, Header, Icon, Page, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { deleteItem, saveItem, useApp } from "../store";
import { findSecret } from "@/lib/secret";
import { track } from "../track";
import { useEffect } from "react";
import type { ProfileData } from "@/lib/types";

const COLORS = ["#B08D57", "#7F96C2", "#8FAE8D", "#C48E7E", "#9C88B8", "#6FA3A0"];
export function Emergency({ person: p0 }: { person?: string }) {
  const st = useApp((s) => s);
  const profiles = Object.values(st.profiles);
  const people = useMemo(() => [...new Set([...profiles.map((p) => p.data.person), ...(st.family?.members ?? []).filter((m) => !m.removed).map((m) => m.name)])], [profiles, st.family]);
  const [who, setWho] = useState<string>(p0 ?? profiles[0]?.data.person ?? people[0] ?? "");
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const prof = profiles.find((p) => p.data.person === who);
  const medsFromNotes = Object.values(st.notes).filter((n) => n.data.topic === "health" && n.data.about.some((a) => a.toLowerCase() === who.toLowerCase())).map((n) => n.data.text);
  const num = st.settings.emergency;
  useEffect(() => { track("emergency_open"); }, []);
  if (editing) return <ProfileForm person={who} id={prof?.id} data={prof?.data} onDone={() => setEditing(false)} />;

  return (
    <Page>
      <Header title={t("emergency_info")} onBack={() => nav.back()} />
      <p className="no-print mt-1 text-[0.98rem] leading-relaxed text-soft">{t("emergency_explain")}</p>
      <div className="no-print mt-2 flex flex-wrap gap-2">
        {people.map((p) => <button key={p} className="chip tap" aria-pressed={who === p} onClick={() => setWho(p)}>{p}</button>)}
        {adding ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("n") ?? "").trim(); if (v) { setWho(v); setEditing(true); } setAdding(false); }}>
            <input name="n" autoFocus className="field !w-36 !py-2" placeholder={t("person_name")} maxLength={30} />
            <button className="chip tap" aria-label={t("add_person")}><Icon name="check" size={17} /></button>
          </form>
        ) : <button className="chip tap" onClick={() => setAdding(true)}><Icon name="plus" size={17} /> {t("add_person")}</button>}
      </div>

      {who && (
        <div className="print-card card mt-3 p-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={who} color={COLORS[people.indexOf(who) % COLORS.length]} size={56} />
            <div><b className="block text-[1.3rem] leading-tight">{who}</b>{prof?.data.age && <span className="text-soft">{t("age")}: {prof.data.age}</span>}</div>
          </div>
          {prof ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Box label={t("blood")} value={prof.data.blood} big />
                <Box label={t("allergies")} value={prof.data.allergies} />
              </div>
              <Line label={t("conditions")} value={prof.data.conditions} />
              <Line label={t("meds")} value={prof.data.meds || medsFromNotes.join(" · ")} />
              <Line label={t("hospital")} value={prof.data.hospital} />
              <Line label={t("doctor")} value={[prof.data.doctor, prof.data.doctorPhone].filter(Boolean).join(" · ")} />
              {prof.data.contacts.filter((c) => c.name || c.phone).map((c, i) => <Line key={i} label={t("contacts_em")} value={`${c.name} · ${c.phone}`} />)}
            </>
          ) : (
            <div className="mt-4">
              {medsFromNotes.length > 0 && <Line label={t("meds")} value={medsFromNotes.join(" · ")} />}
              <p className="mt-3 text-soft">{t("card_empty")}</p>
              <Btn className="mt-3" onClick={() => setEditing(true)}><Icon name="edit" /> {t("fill_btn", { name: who })}</Btn>
            </div>
          )}
        </div>
      )}

      <div className="no-print mt-4 grid gap-2.5">
        <a href={`tel:${num}`} onClick={() => track("emergency_call")} className="tap flex min-h-[3.6rem] items-center justify-center gap-2.5 rounded-[1.1rem] bg-brick text-[1.04rem] font-bold text-white"><Icon name="phone" /> {t("call_emergency", { n: num })}</a>
        {prof?.data.doctorPhone && <a href={`tel:${prof.data.doctorPhone.replace(/[^\d+]/g, "")}`} className="tap card flex min-h-[3.5rem] items-center justify-center gap-2 text-[1.08rem] font-bold"><Icon name="phone" /> {t("call")} {prof.data.doctor || t("doctor")}</a>}
        {prof?.data.contacts.filter((c) => c.phone).map((c, i) => <a key={i} href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="tap card flex min-h-[3.5rem] items-center justify-center gap-2 text-[1.08rem] font-bold"><Icon name="phone" /> {t("call")} {c.name}</a>)}
        {prof && <div className="grid grid-cols-2 gap-2.5"><Btn kind="light" onClick={() => setEditing(true)}><Icon name="edit" /> {t("edit_card")}</Btn><Btn kind="light" onClick={() => window.print()}><Icon name="print" /> {t("print")}</Btn></div>}
      </div>
    </Page>
  );
}
const Box = ({ label, value, big }: { label: string; value?: string; big?: boolean }) => (
  <div className="rounded-[.9rem] bg-brick-soft p-3"><p className="text-[0.8rem] text-soft">{label}</p><b className={`text-brick ${big ? "text-[1.39rem]" : "text-[1rem]"}`}>{value || "—"}</b></div>
);
const Line = ({ label, value }: { label: string; value?: string }) => (value ? <div className="mt-3"><p className="text-[0.8rem] text-soft">{label}</p><p className="text-[1.08rem]">{value}</p></div> : null);

function ProfileForm({ person, id, data, onDone }: { person: string; id?: string; data?: ProfileData; onDone: () => void }) {
  const [d, setD] = useState<ProfileData>(data ?? { kind: "profile", person, contacts: [{ name: "", phone: "" }, { name: "", phone: "" }] });
  const [ask, setAsk] = useState(false);
  const f = (k: keyof ProfileData, label: string, ph = "") => (
    <label className="grid gap-1 text-[0.9rem] font-semibold text-soft">{label}
      <input className="field" value={(d[k] as string) ?? ""} placeholder={ph} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
    </label>
  );
  const save = async () => {
    const all = [d.age, d.blood, d.allergies, d.conditions, d.meds, d.hospital, d.doctor, ...d.contacts.map((c) => c.name)].join(" ");
    if (findSecret(all)) { toast(t("not_saved_secret")); return; }
    await saveItem({ ...d, contacts: d.contacts.filter((c) => c.name || c.phone) }, { id, vis: null });
    track("card_saved");
    onDone();
  };
  const contacts = d.contacts.length ? d.contacts : [{ name: "", phone: "" }];
  return (
    <Page>
      <Header title={t("fill_card", { name: person })} onBack={onDone} />
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-3">{f("age", t("age"))}{f("blood", t("blood"), "B+")}</div>
        {f("allergies", t("allergies"), t("ph_allergy"))}
        {f("conditions", t("conditions"), t("ph_condition"))}
        {f("meds", t("meds"), t("ph_meds"))}
        {f("hospital", t("hospital"))}
        <div className="grid grid-cols-2 gap-3">{f("doctor", t("doctor"))}{f("doctorPhone", t("doctor_phone"))}</div>
        <p className="sec mt-2">{t("contacts_em")}</p>
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input className="field" placeholder={t("person_name")} value={c.name} onChange={(e) => setD({ ...d, contacts: contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label={t("person_name")} />
            <input className="field" placeholder={t("phone")} inputMode="tel" value={c.phone} onChange={(e) => setD({ ...d, contacts: contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)) })} aria-label={t("phone")} />
          </div>
        ))}
        <button className="chip tap w-fit" onClick={() => setD({ ...d, contacts: [...contacts, { name: "", phone: "" }] })}><Icon name="plus" size={17} /> {t("add_contact")}</button>
      </div>
      <div className="mt-auto grid gap-2.5 pt-6">
        <Btn kind="green" onClick={save}><Icon name="check" /> {t("save")}</Btn>
        {id && <Btn kind="ghost" className="!text-brick" onClick={() => setAsk(true)}>{t("delete_card")}</Btn>}
      </div>
      {ask && <Confirm text={t("delete_q")} yes={t("delete")} no={t("cancel")} danger onNo={() => setAsk(false)} onYes={async () => { await deleteItem(id!); onDone(); }} />}
    </Page>
  );
}
