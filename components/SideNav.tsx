"use client";
// Tablets and computers: the tabs live in a side menu instead of along the bottom.
// Tablet: a slim rail of icons. Computer: the full menu with names and a big Save button.
import { Avatar, Icon, Logo } from "./ui";
import { t } from "./i18n";
import { nav, type Route } from "./nav";
import { useApp } from "./store";
import { famName, spaceTab } from "./screens/Families";

export function SideNav({ at }: { at: Route["s"] }) {
  const requests = useApp((s) => s.family?.requests.length ?? 0);
  const kind = useApp((s) => s.family?.kind);
  const openQs = useApp((s) => Object.values(s.questions).filter((q) => !q.data.answer && q.data.by !== s.me?.id).length);
  const cur = useApp((s) => s.cur);
  const fams = useApp((s) => s.fams);
  const sums = useApp((s) => s.sums);
  const people = useApp((s) => s.family?.members.filter((m) => !m.removed).length ?? 0);
  const name = famName(cur ? sums[cur.fam] : undefined, Math.max(0, fams.findIndex((f) => f.fam === cur?.fam)));

  const tab = (s: Route["s"], icon: string, label: string, badge = 0) => {
    const on = at === s || (s === "more" && ["more", "settings", "lang", "privacy", "questions", "news", "recovery", "emergency", "notify"].includes(at))
      || (s === "home" && ["topic", "topics", "note"].includes(at)) || (s === "family" && at === "families");
    return (
      <button key={s} onClick={() => nav.tab({ s } as Route)} aria-current={on ? "page" : undefined} aria-label={label}
        className={`tap relative flex items-center rounded-[.9rem] font-semibold max-lg:flex-col max-lg:gap-1 max-lg:py-2.5 max-lg:text-[.72rem] lg:gap-3 lg:px-3 lg:py-2.5 lg:text-[1rem] ${on ? "bg-paper text-ink" : "text-soft"}`}>
        <Icon name={icon} size={22} stroke={on ? 2.3 : 1.8} />
        <span className="max-w-full truncate">{label}</span>
        {badge > 0 && <span className="absolute grid h-5 min-w-5 place-items-center rounded-full bg-brick px-1 text-[.7rem] text-white max-lg:end-3 max-lg:top-1 lg:end-3">{badge}</span>}
      </button>
    );
  };

  return (
    <nav aria-label="Main" className="no-print fixed inset-y-0 start-0 z-30 hidden w-[6rem] flex-col gap-1 border-e border-line bg-card px-2.5 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-[max(1.2rem,env(safe-area-inset-top))] md:flex lg:w-[16rem] lg:px-4">
      <button onClick={() => nav.tab({ s: "home" })} className="tap mb-4 flex items-center gap-2.5 max-lg:justify-center lg:px-1" aria-label="Meora">
        <Logo size={38} />
        <span className="hidden text-start leading-none lg:block"><b className="block text-[.95rem] font-semibold tracking-[.18em]">MEORA</b><span className="mt-1 block text-[.74rem] text-soft">{t("tag")}</span></span>
      </button>

      <button onClick={() => nav.push({ s: "save" })} aria-label={t("save")}
        className="tap mb-3 flex items-center justify-center gap-2 font-semibold max-lg:flex-col max-lg:text-[.72rem] max-lg:text-ink lg:min-h-[3.2rem] lg:rounded-[1rem] lg:bg-navy lg:text-[1rem] lg:text-paper lg:shadow-[0_10px_22px_-12px_rgb(19_26_48/.8)]">
        <span className="grid place-items-center max-lg:h-14 max-lg:w-14 max-lg:rounded-full max-lg:bg-navy max-lg:text-paper"><Icon name="mic" size={22} /></span>
        <span className="lg:hidden">{t("save")}</span><span className="hidden lg:inline">{t("save_big")}</span>
      </button>

      {tab("home", "home", t("tab_home"))}
      {tab("ask", "ask", t("ask"))}
      {tab("family", kind === "me" ? "person" : "users", spaceTab(kind), requests)}
      {tab("more", "dots", t("tab_more"), openQs)}

      {cur && (
        <button onClick={() => nav.push({ s: "families" })} aria-label={t("your_spaces")}
          className="tap mt-auto flex items-center gap-2.5 rounded-[1rem] max-lg:justify-center max-lg:py-2 lg:p-3 lg:shadow-[0_0_0_1px_var(--color-line)]">
          <Avatar name={name} color="#7F96C2" size={32} />
          <span className="hidden min-w-0 flex-1 text-start lg:block">
            <b className="block truncate text-[.92rem] font-semibold">{name}</b>
            <span className="block truncate text-[.78rem] text-soft">{people === 1 ? t("people_1") : t("people_n", { n: people })}{fams.length > 1 ? ` · ${t("fams_sub", { n: fams.length }).split(" · ")[0]}` : ""}</span>
          </span>
          <Icon name="chev" size={16} className="hidden shrink-0 text-soft lg:block rtl:rotate-180" />
        </button>
      )}
    </nav>
  );
}
