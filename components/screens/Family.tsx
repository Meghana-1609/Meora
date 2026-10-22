"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Avatar, Btn, Confirm, Group, Header, Icon, Label, Page, Row, Toggle, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { addFamily, decide, invite, memberAction, syncNow, useApp } from "../store";
import { famName, NameFamily } from "./Families";
import { JOIN_PICTURES } from "@/lib/pictures";
import type { Member } from "@/lib/types";
import { track } from "../track";

export function Family() {
  const st = useApp((s) => s);
  const me = st.me;
  const members = (st.family?.members ?? []).filter((m) => !m.removed);
  const [inv, setInv] = useState<{ code: number[]; link: string; qr: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<null | { text: string; yes: string; run: () => Promise<void> }>(null);
  const [renaming, setRenaming] = useState(false);
  const [naming, setNaming] = useState(false);
  // check for new join requests often while this page is open
  useEffect(() => { void syncNow(); const id = setInterval(() => void syncNow(), 5000); return () => clearInterval(id); }, []);

  const show = async () => {
    setBusy(true);
    try {
      const r = await invite(); track("invite_shown");
      const url = `${location.origin}/?join=${r.link}`;
      setInv({ ...r, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#1D2742", light: "#FFFFFF" } }) });
    } catch { toast(t("need_internet")); } finally { setBusy(false); }
  };
  const share = async () => {
    if (!inv) return;
    const text = t("share_text", { pics: inv.code.map((i) => JOIN_PICTURES[i][0]).join(" ") });
    try { if (navigator.share) await navigator.share({ title: "Meora", text, url: inv.url }); else { await navigator.clipboard.writeText(`${text}\n${inv.url}`); toast(t("copied")); } } catch { /* cancelled */ }
  };
  const answer = async (id: string, allow: boolean) => { try { await decide(id, allow); track(allow ? "join_allowed" : "join_denied"); toast(allow ? t("allowed") : t("not_allowed")); } catch { toast(t("error")); } };

  return (
    <Page>
      <Header title={t("family")} onBack={() => nav.back()} />
      <p className="px-1 text-[0.9rem] text-soft">{members.length === 1 ? t("family_sub_1") : t("family_sub", { n: members.length })}</p>

      <Label>{t("add_someone")}</Label>
      {!inv ? (
        <Group><Row icon="users" tint="#E4E8F2" fg="#1D2742" title={busy ? t("checking") : t("invite_member")} sub={t("invite_sub")} onClick={busy ? undefined : show} /></Group>
      ) : (
        <div className="fade card !rounded-[1.1rem] p-4 text-center">
          <div className="flex justify-center gap-2">{inv.code.map((i) => <span key={i} className="grid h-16 w-16 place-items-center rounded-[.9rem] bg-paper text-[2.1rem]">{JOIN_PICTURES[i][0]}</span>)}</div>
          <p className="mt-2 text-[.88rem] text-soft">{inv.code.map((i) => JOIN_PICTURES[i][1]).join(" · ")}</p>
          <img src={inv.qr} alt={t("qr_alt")} className="mx-auto mt-3 w-44 rounded-[.8rem] bg-white p-2 shadow-[0_0_0_1px_var(--color-line)]" />
          <p className="mt-2 text-[0.82rem] text-soft">{t("valid_day")}</p>
          <Btn className="mt-3" onClick={share}>{t("share_invite")}</Btn>
        </div>
      )}

      {(st.family?.requests ?? []).length > 0 && (
        <>
          <Label>{t("waiting_label")}</Label>
          <Group>
            {(st.family?.requests ?? []).map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3"><Avatar name={r.name} color="#8FAE8D" size={36} /><span className="flex-1 font-medium">{t("wants_join", { name: r.name })}</span></div>
                <p className="mt-1 ps-12 text-[0.82rem] text-soft">{t("only_known")}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 ps-12">
                  <button onClick={() => answer(r.id, true)} className="tap rounded-[.7rem] bg-leaf py-2.5 text-[0.92rem] font-semibold text-white">{t("allow")}</button>
                  <button onClick={() => answer(r.id, false)} className="tap rounded-[.7rem] py-2.5 text-[0.92rem] font-semibold shadow-[0_0_0_1px_var(--color-line)]">{t("dont_allow")}</button>
                </div>
              </div>
            ))}
          </Group>
        </>
      )}

      <Label>{t("members")} · {members.length}</Label>
      <Group>
        {members.map((m) => (
          <Row key={m.id} avatar={<Avatar name={m.name} color={m.color} size={36} />} title={<>{m.name}{m.id === me?.id && <span className="text-soft"> ({t("you")})</span>}</>} sub={m.canApprove ? t("can_approve") : t("member")} onClick={() => setSel(m)} />
        ))}
      </Group>

      <Label>{t("your_families")}</Label>
      <Group><Row icon="home" title={famName(st.cur ? st.sums[st.cur.fam] : undefined, Math.max(0, st.fams.findIndex((f) => f.fam === st.cur?.fam)))} sub={st.fams.length === 1 ? t("fams_sub_1") : t("fams_sub", { n: st.fams.length })} onClick={() => nav.push({ s: "families" })} /></Group>

      <Label>{t("settings")}</Label>
      <Group>
        <Row icon="edit" title={t("rename")} onClick={() => setRenaming(true)} />
        {st.cur && st.sums[st.cur.fam] && <Row icon="home" title={t("name_family")} onClick={() => setNaming(true)} />}
        <Row icon="plus" title={t("another_family")} onClick={() => addFamily("home")} />
        <Row icon="door" title={t("leave_family")} danger onClick={() => setConfirm({ text: t("leave_q"), yes: t("leave_family"), run: () => memberAction({ action: "leave" }) })} />
      </Group>
      <div className="h-6" />

      {sel && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-black/40 p-3 sm:place-items-center" onClick={() => setSel(null)}>
          <div className="fade card w-full max-w-[30rem] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3"><Avatar name={sel.name} color={sel.color} size={52} /><b className="text-[1.13rem]">{sel.name}</b></div>
            <p className="mt-2 text-soft">{t("joined")} {new Date(sel.joined).toLocaleDateString()}</p>
            {me?.canApprove && sel.id !== me.id && (
              <>
                <div className="mt-4 flex items-center justify-between gap-3"><span><b className="block">{t("can_approve")}</b><span className="text-[0.9rem] text-soft">{t("can_approve_sub")}</span></span>
                  <Toggle on={sel.canApprove} label={t("can_approve")} onChange={async (v) => { await memberAction({ action: "approver", id: sel.id, value: v }); setSel({ ...sel, canApprove: v }); }} /></div>
                <Btn kind="light" className="mt-4 !text-brick" onClick={() => { setSel(null); setConfirm({ text: t("remove_q", { name: sel.name }), yes: t("remove"), run: () => memberAction({ action: "remove", id: sel.id }) }); }}><Icon name="trash" /> {t("remove_lost")}</Btn>
              </>
            )}
            <Btn kind="light" className="mt-3" onClick={() => setSel(null)}>{t("close")}</Btn>
          </div>
        </div>
      )}
      {renaming && <Rename current={me?.name ?? ""} onClose={() => setRenaming(false)} />}
      {naming && st.cur && <NameFamily fam={st.cur.fam} current={st.sums[st.cur.fam]?.nick ?? ""} onClose={() => setNaming(false)} />}
      {confirm && <Confirm text={confirm.text} yes={confirm.yes} no={t("cancel")} danger onNo={() => setConfirm(null)} onYes={async () => { const c = confirm; setConfirm(null); try { await c.run(); } catch { toast(t("error")); } }} />}
    </Page>
  );
}

function Rename({ current, onClose }: { current: string; onClose: () => void }) {
  const [v, setV] = useState(current);
  useEffect(() => setV(current), [current]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/40 p-3 sm:place-items-center" onClick={onClose}>
      <form className="fade card w-full max-w-[30rem] p-5" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); if (!v.trim()) return; try { await memberAction({ action: "rename", name: v.trim() }); onClose(); } catch { toast(t("error")); } }}>
        <b className="text-[1.04rem]">{t("rename")}</b>
        <input className="field mt-3 !text-[1.04rem]" value={v} onChange={(e) => setV(e.target.value)} autoFocus maxLength={40} aria-label={t("name_ph")} />
        <Btn className="mt-4" type="submit">{t("save")}</Btn>
      </form>
    </div>
  );
}
