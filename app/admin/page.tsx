"use client";
import { useCallback, useEffect, useState } from "react";

type Stats = {
  at: number;
  totals: { families: number; people: number; notes: number; questions: number; cards: number; waiting: number; withRecovery: number };
  active: { families7: number; families30: number; people7: number; people1: number };
  week: { families: number; people: number };
  days: { day: string; people: number; families: number; saves: number }[];
  sizes: Record<string, number>;
  events: { at: number; text: string }[];
  activity: { today: Record<string, number>; week: Record<string, number>; month: Record<string, number>; devices: { today: number; week: number; perDay: number[] }; errors: { at: number; msg: string }[] };
};

const ROWS: [string, string][] = [
  ["open", "App opened"], ["installed_open", "Opened from home-screen app"], ["family_started", "Families started"], ["join_request:pics", "Join requests (3 pictures)"],
  ["join_request:qr", "Join requests (QR / link)"], ["join_allowed", "Join requests allowed"], ["join_denied", "Join requests refused"], ["invite_shown", "Invites shown"],
  ["saved", "Notes saved"], ["edited", "Notes edited"], ["with_photo", "…with a photo"], ["with_voice", "…with a voice clip"], ["with_reminder", "…with a reminder"], ["private_note", "…private (only some)"],
  ["mic_save", "Mic opened to save"], ["ask", "Questions asked"], ["ask_found", "…answered"], ["ask_found_smart", "…answered by smart answers"], ["ask_not_found", "…not found"],
  ["ask_family", "Asked the family"], ["answered", "Family questions answered"], ["listen", "Listen pressed"], ["translate", "Translate pressed"],
  ["emergency_open", "Emergency card opened"], ["emergency_call", "Emergency call pressed"], ["card_saved", "Emergency cards saved"], ["recovery_used", "Families recovered"],
  ["no_voice", "Opened on a browser without voice"],
];
const group = (o: Record<string, number>, prefix: string) => Object.entries(o).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v] as [string, number]).sort((a, b) => b[1] - a[1]);

const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60e3); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function Admin() {
  const [key, setKey] = useState("");
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (k: string) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin", { headers: { "x-admin-key": k }, cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Error"); setS(null); return; }
      setS(j); try { sessionStorage.setItem("meora-admin", k); } catch { /* */ }
    } catch { setErr("No internet."); } finally { setBusy(false); }
  }, []);
  useEffect(() => { try { const k = sessionStorage.getItem("meora-admin"); if (k) { setKey(k); void load(k); } } catch { /* */ } }, [load]);
  useEffect(() => { if (!s) return; const id = setInterval(() => load(key), 30000); return () => clearInterval(id); }, [s, key, load]);

  if (!s) return (
    <main className="mx-auto grid min-h-dvh max-w-[26rem] content-center px-5">
      <h1 className="text-[1.8rem] font-bold">Meora admin</h1>
      <p className="mt-1 text-soft">Only you. Counts only; family notes stay locked.</p>
      <form className="mt-6 grid gap-3" onSubmit={(e) => { e.preventDefault(); void load(key); }}>
        <input className="field" type="password" placeholder="Admin key" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
        <button className="tap min-h-[3.3rem] rounded-[1rem] bg-navy font-bold text-paper" disabled={!key || busy}>{busy ? "Opening…" : "Open"}</button>
        {err && <p className="font-semibold text-brick">{err}</p>}
      </form>
    </main>
  );

  const max = Math.max(1, ...s.days.map((d) => Math.max(d.saves, d.people)));
  const T = s.totals;
  return (
    <main className="mx-auto max-w-[60rem] px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-[1.8rem] font-bold">Meora admin</h1><p className="text-soft">Updated {ago(s.at)} · refreshes every 30 s</p></div>
        <button onClick={() => load(key)} className="chip tap">Refresh</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Big n={T.people} label="People" sub={`+${s.week.people} this week`} />
        <Big n={T.families} label="Families" sub={`+${s.week.families} this week`} />
        <Big n={T.notes} label="Notes saved" />
        <Big n={s.active.people7} label="Active people (7 days)" sub={`${s.active.people1} today`} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Small n={s.active.families7} label="Active families (7 d)" />
        <Small n={T.questions} label="Questions asked" />
        <Small n={T.cards} label="Emergency cards" />
        <Small n={T.waiting} label="Waiting to join" />
      </div>

      <div className="card mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b>Last 30 days</b>
          <span className="flex gap-4 text-[.85rem] text-soft"><span><i className="me-1 inline-block h-2.5 w-2.5 rounded-sm bg-navy" />Notes saved</span><span><i className="me-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#8FAE8D]" />New people</span></span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[3px]">
          {s.days.map((d) => (
            <div key={d.day} className="flex h-full flex-1 items-end gap-[1px]" title={`${d.day}: ${d.saves} notes, ${d.people} new people`}>
              <span className="flex-1 rounded-t-[2px] bg-navy" style={{ height: `${(d.saves / max) * 100}%` }} />
              <span className="flex-1 rounded-t-[2px] bg-[#8FAE8D]" style={{ height: `${(d.people / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[.75rem] text-soft"><span>{s.days[0].day.slice(5)}</span><span>today</span></div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <b>Family sizes</b>
          <div className="mt-3 grid gap-2">
            {Object.entries(s.sizes).sort().map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-[.95rem]">
                <span className="w-24 text-soft">{k} {k === "1" ? "person" : "people"}</span>
                <span className="h-3 rounded bg-navy" style={{ width: `${(v / Math.max(1, T.families)) * 70}%` }} /><b>{v}</b>
              </div>
            ))}
            {!T.families && <p className="text-soft">No families yet.</p>}
          </div>
          <p className="mt-4 text-[.9rem] text-soft">{T.withRecovery} of {T.families} families have recovery pictures.</p>
        </div>
        <div className="card p-4">
          <b>Recent activity</b>
          <ul className="mt-2 max-h-72 overflow-auto">
            {s.events.map((e, i) => <li key={i} className="flex justify-between gap-3 border-b border-line py-2 text-[.92rem]"><span>{e.text}</span><span className="shrink-0 text-soft">{ago(e.at)}</span></li>)}
            {!s.events.length && <li className="py-2 text-soft">Nothing yet.</li>}
          </ul>
        </div>
      </div>
      <Usage a={s.activity} />
      <p className="mt-6 text-center text-[.85rem] text-soft">Privacy: this page shows only counts. Notes are locked on families&apos; phones, so they can&apos;t be read here.</p>
    </main>
  );
}
const Big = ({ n, label, sub }: { n: number; label: string; sub?: string }) => (
  <div className="card p-4"><b className="block text-[2.2rem] leading-none">{n}</b><span className="mt-1 block font-semibold">{label}</span>{sub && <span className="text-[.85rem] text-leaf">{sub}</span>}</div>
);
const Small = ({ n, label }: { n: number; label: string }) => (
  <div className="card flex items-center justify-between p-3.5"><span className="text-[.92rem] text-soft">{label}</span><b className="text-[1.3rem]">{n}</b></div>
);

function Usage({ a }: { a: Stats["activity"] }) {
  const askT = a.week.ask ?? 0, found = (a.week.ask_found ?? 0) + (a.week.ask_found_smart ?? 0);
  const blocked = group(a.month, "blocked:");
  const lists: [string, [string, number][]][] = [
    ["App languages (30 d)", group(a.month, "lang:")], ["Speaking languages (30 d)", group(a.month, "speech:")], ["Phones (30 d)", group(a.month, "os:")],
    ["Topics saved (30 d)", group(a.month, "topic:")], ["Lock chosen (30 d)", group(a.month, "lock:")], ["Voice problems (30 d)", group(a.month, "mic_error:")],
  ];
  const maxD = Math.max(1, ...a.devices.perDay);
  return (
    <>
      <h2 className="mt-8 text-[1.4rem] font-bold">What people are doing</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Big n={a.devices.today} label="Phones that opened Meora today" />
        <Big n={a.today.open ?? 0} label="App opens today" />
        <Big n={askT ? Math.round((found / askT) * 100) : 0} label="% of questions answered (7 d)" sub={`${found} of ${askT}`} />
        <Big n={blocked.reduce((t, [, v]) => t + v, 0)} label="Secrets blocked (30 d)" sub={blocked.map(([k, v]) => `${k} ${v}`).join(" · ")} />
      </div>
      <div className="card mt-3 p-4">
        <b>Phones opening Meora, last 30 days</b>
        <div className="mt-3 flex h-24 items-end gap-[3px]">{a.devices.perDay.map((v, i) => <span key={i} title={String(v)} className="flex-1 rounded-t-[2px] bg-navy" style={{ height: `${(v / maxD) * 100}%`, minHeight: v ? 3 : 0 }} />)}</div>
      </div>
      <div className="card mt-3 overflow-x-auto p-4">
        <table className="w-full text-[.95rem]">
          <thead><tr className="text-start text-soft"><th className="py-1 text-start font-semibold">Action</th><th className="w-20 text-end font-semibold">Today</th><th className="w-20 text-end font-semibold">7 days</th><th className="w-20 text-end font-semibold">30 days</th></tr></thead>
          <tbody>{ROWS.map(([k, label]) => (
            <tr key={k} className="border-t border-line"><td className={`py-2 ${label.startsWith("…") ? "ps-4 text-soft" : ""}`}>{label}</td><td className="text-end">{a.today[k] ?? 0}</td><td className="text-end">{a.week[k] ?? 0}</td><td className="text-end font-semibold">{a.month[k] ?? 0}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {lists.map(([title, rows]) => (
          <div key={title} className="card p-4"><b>{title}</b>
            <ul className="mt-2 grid gap-1 text-[.92rem]">{rows.length ? rows.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></li>) : <li className="text-soft">None yet</li>}</ul>
          </div>
        ))}
      </div>
      <div className="card mt-3 p-4">
        <b>Problems (errors) · last 30 days</b>
        <ul className="mt-2 max-h-64 overflow-auto text-[.88rem]">
          {a.errors.length ? a.errors.map((e, i) => <li key={i} className="flex justify-between gap-3 border-b border-line py-1.5"><span className="break-all">{e.msg}</span><span className="shrink-0 text-soft">{ago(e.at)}</span></li>) : <li className="py-1 text-leaf">No problems. Everything is working.</li>}
        </ul>
      </div>
    </>
  );
}
