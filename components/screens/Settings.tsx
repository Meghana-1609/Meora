"use client";
import { useState } from "react";
import { Btn, Confirm, Group, Header, Icon, Label, Page, Row, Toggle, toast } from "../ui";
import { t, LANGS, MORE_SPEECH } from "../i18n";
import { nav } from "../nav";
import { exportNotes, lockNow, makeRecovery, memberAction, saveSettings, useApp, wipePhone } from "../store";
import { download } from "../helpers";
import { SetLock } from "./Onboard";
import { speechName as speechNameOf } from "../SpeechLang";

export function Settings() {
  const st = useApp((s) => s);
  const s = st.settings;
  const [ask, setAsk] = useState<null | "family" | "phone" | "recovery">(null);
  const [lockOpen, setLockOpen] = useState(false);
  if (lockOpen) return <SetLock onDone={() => setLockOpen(false)} />;
  const speechName = speechNameOf(s.speech);
  const sizeBtn = (n: 1 | 2 | 3) => <button key={n} className="chip tap !min-h-[2.2rem] !px-3" aria-pressed={s.text === n} onClick={() => saveSettings({ text: n })} aria-label={t("size_" + n)}><span style={{ fontSize: 11 + n * 2 }}>A</span></button>;
  return (
    <Page>
      <Header title={t("settings")} onBack={() => nav.back()} />
      <Label>{t("easy_use")}</Label>
      <Group>
        <Row icon="globe" title={t("language")} sub={`${LANGS.find((l) => l.code === s.lang)?.name} · ${t("speaking")}: ${speechName}`} onClick={() => nav.push({ s: "lang" })} />
        <Row icon="text" title={t("text_size")} right={<span className="flex gap-1.5">{([1, 2, 3] as const).map(sizeBtn)}</span>} />
        <Row icon="moon" title={t("dark")} right={<Toggle on={s.dark} label={t("dark")} onChange={(v) => saveSettings({ dark: v })} />} />
        <Row icon="leaf" title={t("simple_mode")} sub={t("simple_sub")} right={<Toggle on={s.simple} label={t("simple_mode")} onChange={(v) => saveSettings({ simple: v })} />} />
      </Group>

      <Label>{t("voice_label")}</Label>
      <Group>
        <Row icon="spark" title={t("smart")} sub={st.ai ? t("smart_sub") : t("smart_na")} right={<Toggle on={s.smartOn && st.ai} label={t("smart")} onChange={(v) => st.ai && saveSettings({ smartOn: v })} />} />
        <Row icon="speak" title={t("read_aloud")} right={<Toggle on={s.readAloud} label={t("read_aloud")} onChange={(v) => saveSettings({ readAloud: v })} />} />
        <Row icon="clock" title={t("speech_speed")} right={<span className="flex gap-1.5">{[[0.8, "slow"], [1, "normal"]].map(([v, k]) => <button key={k} className="chip tap !min-h-[2.2rem]" aria-pressed={s.rate === v} onClick={() => saveSettings({ rate: v as number })}>{t(k as string)}</button>)}</span>} />
      </Group>

      <Label>{t("privacy_rem")}</Label>
      <Group>
        <Row icon="bell" title={t("reminders")} sub={t("n_settings_sub")} onClick={() => nav.push({ s: "notify" })} />
        <Row icon={st.lock.kind === "bio" ? "finger" : "lock"} title={t("lock_setting")} sub={t("lock_" + st.lock.kind)} onClick={() => setLockOpen(true)} />
        {st.lock.kind !== "none" && <Row icon="lock" title={t("lock_now")} onClick={lockNow} />}
        <Row icon="phone" title={t("emergency_number")} right={<input className="field !w-20 !rounded-[.6rem] !py-1.5 text-center" inputMode="tel" value={s.emergency} onChange={(e) => saveSettings({ emergency: e.target.value.replace(/[^\d+]/g, "").slice(0, 6) })} aria-label={t("emergency_number")} />} />
      </Group>

      <Label>{t("safety")}</Label>
      <Group>
        <Row icon="key" title={t("recovery_pics")} sub={st.recoveryPicks ? t("recovery_see") : t("recovery_make")} onClick={() => (st.recoveryPicks ? nav.push({ s: "recovery" }) : setAsk("recovery"))} />
        <Row icon="cloud" title={t("download")} onClick={async () => download(`meora-notes-${new Date().toISOString().slice(0, 10)}.txt`, await exportNotes())} />
        <Row icon="shield" title={t("privacy_words")} onClick={() => nav.push({ s: "privacy" })} />
        <Row icon="help" title={t("show_how")} onClick={() => nav.push({ s: "tour" })} />
      </Group>
      <Label>{t("danger_zone")}</Label>
      <Group>
        <Row icon="door" title={t("delete_phone")} danger onClick={() => setAsk("phone")} />
        {st.me?.canApprove && <Row icon="trash" title={t("delete_all")} danger onClick={() => setAsk("family")} />}
      </Group>
      <p className="py-6 text-center text-[0.8rem] text-soft">Meora · {t("open_source")}</p>

      {ask === "family" && <Confirm text={t("delete_all_q")} yes={t("delete_all")} no={t("cancel")} danger onNo={() => setAsk(null)} onYes={async () => { setAsk(null); try { await memberAction({ action: "delete-family" }); } catch { toast(t("error")); } }} />}
      {ask === "phone" && <Confirm text={t("delete_phone_q")} yes={t("delete_phone")} no={t("cancel")} danger onNo={() => setAsk(null)} onYes={async () => { setAsk(null); try { await memberAction({ action: "leave" }); } catch { /* offline */ } await wipePhone(); }} />}
      {ask === "recovery" && <Confirm text={t("recovery_new_q")} yes={t("recovery_make")} no={t("cancel")} onNo={() => setAsk(null)} onYes={async () => { setAsk(null); try { await makeRecovery(); nav.push({ s: "recovery" }); } catch { toast(t("need_internet")); } }} />}
    </Page>
  );
}

export function Privacy() {
  const items = ["pv_1", "pv_2", "pv_3", "pv_4", "pv_5", "pv_6", "pv_7", "pv_8"];
  return (
    <Page>
      <Header title={t("privacy_words")} onBack={() => nav.back()} />
      <div className="mt-3 grid gap-2.5 pb-6">
        {items.map((k, i) => <div key={k} className="card flex gap-3 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-soft font-bold text-leaf">{i + 1}</span><p className="text-[1.02rem] leading-relaxed">{t(k)}</p></div>)}
      </div>
    </Page>
  );
}

export function Tour() {
  const steps = [["mic", "help_1"], ["ask", "help_2"], ["users", "help_3"], ["shield", "help_4"], ["alert", "help_5"]] as const;
  const [i, setI] = useState(0);
  const done = async () => { await saveSettings({ toured: true }); nav.home(); };
  return (
    <Page>
      <div className="flex justify-end"><button className="chip tap" onClick={done}>{t("skip")}</button></div>
      <div className="mt-16 grid place-items-center text-center">
        <span className="grid h-28 w-28 place-items-center rounded-[1.8rem] bg-navy text-paper"><Icon name={steps[i][0]} size={56} /></span>
        <p className="mt-8 max-w-[22rem] text-[1.26rem] font-semibold leading-snug">{t(steps[i][1])}</p>
        <div className="mt-8 flex gap-2">{steps.map((_, j) => <span key={j} className={`h-2.5 w-2.5 rounded-full ${j === i ? "bg-navy" : "bg-line"}`} />)}</div>
      </div>
      <div className="mt-auto pt-8"><Btn onClick={() => (i < steps.length - 1 ? setI(i + 1) : done())}>{i < steps.length - 1 ? t("next") : t("got_it")}</Btn></div>
    </Page>
  );
}
