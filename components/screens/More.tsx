"use client";
import { Group, Header, Label, Page, Row } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { useApp } from "../store";

/** "More": everything else, in plain words, one tap each. */
export function More() {
  const openQs = useApp((s) => Object.values(s.questions).filter((q) => !q.data.answer).length);
  const badge = (n: number) => (n ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brick px-1.5 text-[0.78rem] text-white">{n}</span> : undefined);
  return (
    <Page>
      <Header title={t("more_title")} />
      <Label>{t("family")}</Label>
      <Group>
        <Row icon="pulse" tint="#F6E3DF" fg="#B5443A" title={t("emergency_info")} sub={t("emergency_info_sub")} onClick={() => nav.push({ s: "emergency" })} />
        <Row icon="cal" tint="#E6EEE2" fg="#4F7A47" title={t("dates_rem")} sub={t("dates_rem_sub")} onClick={() => nav.push({ s: "topic", id: "dates" })} />
        <Row icon="help" tint="#F3EBDC" fg="#8F6A2E" title={t("family_asked")} sub={t("questions_sub")} right={badge(openQs)} onClick={() => nav.push({ s: "questions" })} />
        <Row icon="spark" tint="#E4E8F2" fg="#1D2742" title={t("whats_new")} sub={t("news_sub")} onClick={() => nav.push({ s: "news" })} />
        <Row icon="grid" tint="#ECE8F3" fg="#5E5390" title={t("all_topics")} onClick={() => nav.push({ s: "topics" })} />
      </Group>
      <Label>{t("app_label")}</Label>
      <Group>
        <Row icon="gear" title={t("settings")} sub={t("settings_sub")} onClick={() => nav.push({ s: "settings" })} />
        <Row icon="shield" title={t("privacy_words")} sub={t("safety_sub")} onClick={() => nav.push({ s: "privacy" })} />
        <Row icon="help" title={t("show_how")} sub={t("help_sub")} onClick={() => nav.push({ s: "tour" })} />
      </Group>
      <div className="h-6" />
    </Page>
  );
}
