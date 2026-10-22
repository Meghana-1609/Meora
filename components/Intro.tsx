"use client";
// The first time Meora opens: the logo builds itself, then fades into the welcome page. Silent, about 3.5 seconds.
import { useEffect, useRef, useState } from "react";

const KEY = "meora_intro_seen";
/** True only the very first time on this phone. */
export function firstOpen(): boolean {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    try { localStorage.setItem(KEY, "1"); } catch { /* private mode: it will just play again */ }
    const quick = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = setTimeout(() => setOut(true), quick ? 900 : 3400);
    const b = setTimeout(() => done.current(), quick ? 1400 : 3950);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div className={`intro ${out ? "out" : ""}`} role="img" aria-label="Meora" onClick={() => { setOut(true); setTimeout(() => done.current(), 550); }}>
      <div className="glow absolute h-[17rem] w-[17rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(127,150,194,.22), rgba(127,150,194,0) 70%)", top: "calc(50% - 10.5rem)" }} />
      <div className="relative flex -translate-y-5 flex-col items-center">
        <svg className="tile" width="128" height="128" viewBox="0 0 100 100" aria-hidden>
          <rect width="100" height="100" rx="24" fill="#26304F" />
          <path className="roof" d="M22 50 L50 26 L78 50" fill="none" stroke="#B08D57" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="dot d1" cx="32" cy="66" r="7" fill="#C48E7E" /><circle className="dot d2" cx="45" cy="62" r="7" fill="#8FAE8D" />
          <circle className="dot d3" cx="57" cy="62" r="7" fill="#7F96C2" /><circle className="dot d4" cx="69" cy="66" r="7" fill="#E6E3DD" />
        </svg>
        <div className="word mt-7 ps-[.42em] text-[1.45rem] font-semibold tracking-[.42em]">MEORA</div>
        <div className="itag mt-3 text-[.93rem] tracking-[.06em] text-[#D4B98A]">Your family&apos;s brain.</div>
      </div>
    </div>
  );
}
