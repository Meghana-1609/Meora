"use client";
import { useMemo } from "react";
import { Group, Header, Page, Row } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { useApp } from "../store";
import { TOPICS } from "@/lib/topics";

export function AllTopics() {
  const notes = useApp((s) => s.notes);
  const counts = useMemo(() => { const c: Record<string, number> = {}; Object.values(notes).forEach((n) => (c[n.data.topic] = (c[n.data.topic] ?? 0) + 1)); return c; }, [notes]);
  return (
    <Page>
      <Header title={t("all_topics")} onBack={() => nav.back()} />
      <Group className="mt-3">
        {TOPICS.map((tp) => (
          <Row key={tp.id} icon={tp.icon} tint={tp.bg} fg={tp.fg} title={t("t_" + tp.id)} right={<span className="flex items-center gap-2 text-[0.85rem] text-soft">{counts[tp.id] ?? 0}</span>} onClick={() => nav.push({ s: "topic", id: tp.id })} />
        ))}
      </Group>
    </Page>
  );
}
