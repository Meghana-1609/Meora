"use client";
import { Icon } from "./ui";
import { t } from "./i18n";
import { nav, type Route } from "./nav";
import { useApp } from "./store";

/** Always-visible tabs at the bottom, like every phone app: Home · Ask · Save · Family · More. */
export function BottomNav({ at }: { at: Route["s"] }) {
  const requests = useApp((s) => s.family?.requests.length ?? 0);
  const openQs = useApp((s) => Object.values(s.questions).filter((q) => !q.data.answer && q.data.by !== s.me?.id).length);
  const tab = (s: Route["s"], icon: string, label: string, badge = 0) => {
    const on = at === s || (s === "more" && ["more", "settings", "lang", "privacy", "questions", "news", "recovery", "emergency"].includes(at)) || (s === "home" && ["topic", "topics", "note"].includes(at)) || (s === "family" && at === "families");
    return (
      <button onClick={() => nav.tab({ s } as Route)} aria-current={on ? "page" : undefined} aria-label={label}
        className={`tap relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[.72rem] font-semibold ${on ? "text-ink" : "text-soft"}`}>
        <Icon name={icon} size={24} stroke={on ? 2.3 : 1.8} />
        <span className="max-w-full truncate px-0.5">{label}</span>
        {on && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-navy" />}
        {badge > 0 && <span className="absolute end-[22%] top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brick px-1 text-[.7rem] text-white">{badge}</span>}
      </button>
    );
  };
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main">
      <div className="mx-auto flex max-w-[34rem] items-stretch">
        {tab("home", "home", t("tab_home"))}
        {tab("ask", "ask", t("ask"))}
        <button onClick={() => nav.push({ s: "save" })} aria-label={t("save")} className="tap flex flex-1 flex-col items-center gap-0.5 pb-2 text-[.72rem] font-bold text-ink">
          <span className="-mt-5 grid h-[3.6rem] w-[3.6rem] place-items-center rounded-full bg-navy text-paper shadow-[0_10px_24px_-10px_rgb(19_26_48/.8)] ring-4 ring-paper"><Icon name="mic" size={26} /></span>
          {t("save")}
        </button>
        {tab("family", "users", t("family"), requests)}
        {tab("more", "dots", t("tab_more"), openQs)}
      </div>
    </nav>
  );
}
