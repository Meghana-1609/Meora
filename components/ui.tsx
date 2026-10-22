"use client";
import { useEffect, useState, type ReactNode } from "react";
import { t } from "./i18n";

const P: Record<string, string> = {
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  ask: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.2a5 5 0 0 1 6 5.8"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  trans: '<path d="M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 3-2 6-6 8M13 21l4-9 4 9M14.5 18h5"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17v.5"/>',
  finger: '<path d="M12 11v4M8 9a4 4 0 0 1 8 0v6a8 8 0 0 1-1 4M6 12v-2a6 6 0 0 1 12 0M9 13v2a6 6 0 0 0 1 4M4 9a8 8 0 0 1 16 0v2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  health: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
  phone: '<path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  recipe: '<path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  car: '<path d="M3 16v-4l2-5h14l2 5v4z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/><path d="M3 12h18"/>',
  story: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5"/>',
  dots: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  text: '<path d="M4 7V5h12v2M10 5v14M8 19h4M14 12v-1h6v1M17 11v8M16 19h2"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>',
  cloud: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  leaf: '<path d="M12 21c-5-3-6-8-3-13 4 1 8 5 3 13z"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.5M14 20h.5M18 18h3v3"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  door: '<path d="M14 4H5v16h9M10 12h11M17 8l4 4-4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 24, className = "", stroke = 2, style }: { name: IconName | string; size?: number; className?: string; stroke?: number; style?: React.CSSProperties }) {
  return <svg style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 ${className}`} dangerouslySetInnerHTML={{ __html: P[name] ?? P.dots }} />;
}

/** The Meora mark: a brass roof keeping the family safe. */
export function Logo({ size = 40, flat }: { size?: number; flat?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="shrink-0">
      <rect width="100" height="100" rx="24" fill={flat ? "#26304F" : "#1D2742"} />
      <path d="M22 50 L50 26 L78 50" fill="none" stroke="#B08D57" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="66" r="7" fill="#C48E7E" /><circle cx="45" cy="62" r="7" fill="#8FAE8D" /><circle cx="57" cy="62" r="7" fill="#7F96C2" /><circle cx="69" cy="66" r="7" fill="#E6E3DD" />
    </svg>
  );
}
export function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Logo size={small ? 36 : 48} />
      <span className="leading-none">
        <span className={`block font-bold tracking-[0.08em] ${small ? "text-[1.15rem]" : "text-[1.5rem]"}`}>MEORA</span>
        <span className={`mt-1 block text-soft ${small ? "text-[.72rem]" : "text-[.85rem]"}`}>{t("tag")}</span>
      </span>
    </span>
  );
}

export function Btn({ children, kind = "dark", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "dark" | "light" | "green" | "red" | "brass" | "ghost" }) {
  const k = {
    dark: "bg-navy text-paper", light: "bg-card shadow-[0_0_0_1px_var(--color-line)]", green: "bg-leaf text-white", red: "bg-brick text-white",
    brass: "bg-navy text-paper", ghost: "text-soft underline underline-offset-4",
  }[kind];
  return <button {...p} className={`tap flex min-h-[3.2rem] w-full items-center justify-center gap-2 rounded-[.95rem] px-5 text-[1rem] font-semibold disabled:opacity-40 ${k} ${className}`}>{children}</button>;
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-1 pt-1">
      {onBack && <button onClick={onBack} aria-label={t("back")} className="tap card grid h-10 w-10 shrink-0 place-items-center !rounded-[.8rem]"><Icon name="back" size={20} className="rtl:rotate-180" /></button>}
      <h1 className="min-w-0 flex-1 text-[1.3rem] font-semibold leading-tight tracking-[-.01em]">{title}</h1>
      {right}
    </div>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return <span aria-hidden className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>{(name.trim()[0] ?? "?").toUpperCase()}</span>;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-[3.3rem] shrink-0 rounded-full transition ${on ? "bg-leaf" : "bg-[#C9C5BE]"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.55rem] rtl:left-1" : "left-1 rtl:left-[1.55rem]"}`} />
    </button>
  );
}

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`fade mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] safe-b ${className}`}>{children}</main>;
}

/** A gentle "are you sure?" box. Never a scary browser popup. */
export function Confirm({ text, yes, no, danger, onYes, onNo }: { text: string; yes: string; no: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" onClick={onNo} role="dialog" aria-modal>
      <div className="fade card w-full max-w-[30rem] p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[1.15rem] font-semibold leading-snug">{text}</p>
        <div className="mt-5 grid gap-2.5">
          <Btn kind={danger ? "red" : "dark"} onClick={onYes} autoFocus>{yes}</Btn>
          <Btn kind="light" onClick={onNo}>{no}</Btn>
        </div>
      </div>
    </div>
  );
}

let toastSet: ((s: string | null) => void) | null = null;
export const toast = (s: string) => toastSet?.(s);
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSet = setMsg; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(id); }, [msg]);
  if (!msg) return null;
  return <div role="status" className="fade fixed inset-x-3 bottom-4 z-50 mx-auto max-w-[30rem] rounded-[1rem] bg-navy px-5 py-4 text-center font-semibold text-paper shadow-xl">{msg}</div>;
}

export function Spinner() { return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />; }

/** Design A: a quiet section label, like "TODAY". */
export function Label({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mt-6 mb-2 flex items-baseline justify-between gap-3 px-1">
      <span className="sec">{children}</span>
      {action && <button onClick={onAction} className="tap text-[.86rem] text-soft">{action}</button>}
    </div>
  );
}
/** Design A: one white box with neat rows separated by thin lines. */
export function Group({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card overflow-hidden !rounded-[1.1rem] divide-y divide-line ${className}`}>{children}</div>;
}
export function Row({ icon, tint, fg, avatar, title, sub, right, onClick, danger }: {
  icon?: string; tint?: string; fg?: string; avatar?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; danger?: boolean;
}) {
  const inner = (
    <>
      {avatar}
      {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: tint ?? "var(--color-paper)", color: fg }}><Icon name={icon} size={18} /></span>}
      <span className="min-w-0 flex-1">
        <span className={`block font-medium leading-snug ${danger ? "text-brick" : ""}`}>{title}</span>
        {sub && <span className="block text-[.85rem] leading-snug text-soft">{sub}</span>}
      </span>
      {right ?? (onClick ? <Icon name="chev" size={16} className="shrink-0 opacity-40 rtl:rotate-180" /> : null)}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-start";
  return onClick ? <button onClick={onClick} className={`tap ${cls}`}>{inner}</button> : <div className={cls}>{inner}</div>;
}
