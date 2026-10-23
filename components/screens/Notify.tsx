"use client";
// "Let Meora remind you": phone notifications, and what each person wants to get.
import { useState } from "react";
import { Btn, Header, Icon, Page, Spinner, Toggle, toast } from "../ui";
import { t } from "../i18n";
import { nav } from "../nav";
import { useApp, type NotifySettings } from "../store";
import { DEFAULT_NOTIFY, disablePush, enablePush, iosNeedsInstall, permission, pushSupported, updatePush } from "../push";
import { track } from "../track";

type P = keyof NotifySettings["prefs"];

export function Notify() {
  const saved = useApp((s) => s.settings.notify) ?? DEFAULT_NOTIFY;
  const [n, setN] = useState<NotifySettings>(saved);
  const [busy, setBusy] = useState(false);
  const on = saved.on && permission() === "granted";
  const blocked = !pushSupported() || iosNeedsInstall() ? "unsupported" : permission() === "denied" ? "denied" : null;

  const change = async (next: NotifySettings) => { setN(next); if (on) { try { await updatePush(next); } catch { toast(t("error")); } } };
  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush(n);
      track("notify:" + r);
      if (r === "on") { toast(t("notify_done")); nav.back(); }
      else toast(r === "denied" ? t("notify_denied") : iosNeedsInstall() ? t("notify_ios") : t("notify_unsupported"));
    } catch { toast(t("error")); } finally { setBusy(false); }
  };

  const rows: [P, string, string, string][] = [
    ["rem", "health", t("n_rem"), t("n_rem_sub")],
    ["diary", "person", t("n_diary"), t("n_diary_sub", { time: clock(n.diaryAt) })],
    ["q", "spark", t("n_q"), t("n_q_sub")],
    ["family", "users", t("n_family"), ""],
    ["week", "cal", t("n_weekly"), t("n_weekly_sub")],
  ];

  return (
    <Page>
      <Header title="" onBack={() => nav.back()} />
      <div className="mt-4 grid place-items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-[1.5rem] bg-navy text-paper"><Icon name="bell" size={38} /></span>
        <h1 className="mt-5 text-[1.55rem] font-semibold leading-tight">{t("notify_title")}</h1>
        <p className="mt-2 max-w-[22rem] text-[1rem] leading-relaxed text-soft">{t("notify_sub")}</p>
      </div>

      {blocked && (
        <p className="mt-5 rounded-[1rem] bg-brass-soft px-4 py-3 text-[.95rem] leading-relaxed" role="status">
          {blocked === "denied" ? t("notify_denied") : iosNeedsInstall() ? t("notify_ios") : t("notify_unsupported")}
        </p>
      )}

      <div className="card mt-6 divide-y divide-line overflow-hidden !rounded-[1.1rem]">
        {rows.map(([k, icon, title, sub]) => (
          <div key={k} className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[.7rem] bg-paper"><Icon name={icon} size={18} /></span>
            <span className="min-w-0 flex-1"><b className="block text-[1rem] font-medium">{title}</b>{sub && <span className="block text-[.84rem] text-soft">{sub}</span>}
              {k === "diary" && n.prefs.diary && (
                <input type="time" aria-label={t("time")} value={n.diaryAt} onChange={(e) => e.target.value && change({ ...n, diaryAt: e.target.value })}
                  className="field mt-1.5 !w-[8rem] !min-h-0 !px-2.5 !py-1.5 !text-[.9rem]" />
              )}
            </span>
            <Toggle on={n.prefs[k]} label={title} onChange={(v) => change({ ...n, prefs: { ...n.prefs, [k]: v } })} />
          </div>
        ))}
      </div>

      <div className="mt-auto grid gap-2 pt-6">
        {on ? (
          <Btn kind="ghost" onClick={async () => { setBusy(true); await disablePush(); setBusy(false); toast(t("notify_off_done")); }}>{busy ? <Spinner /> : t("notify_off")}</Btn>
        ) : (
          <>
            <Btn onClick={turnOn} disabled={busy || blocked === "unsupported"}>{busy ? <Spinner /> : <><Icon name="bell" size={20} /> {t("notify_on")}</>}</Btn>
            <Btn kind="ghost" onClick={() => nav.back()}>{t("not_now")}</Btn>
          </>
        )}
      </div>
    </Page>
  );
}

/** "20:00" shown the way this phone shows times (for example 8:00 PM). */
function clock(hm: string) {
  const d = new Date(); d.setHours(+hm.slice(0, 2), +hm.slice(3, 5), 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
