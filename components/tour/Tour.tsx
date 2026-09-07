"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export interface TourStep {
  /** CSS selector for the element to highlight. */
  selector: string;
  title: string;
  body: string;
}

interface Props {
  steps: TourStep[];
  /** localStorage key; once set, the tour won't auto-run again. */
  storageKey: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

export default function Tour({ steps, storageKey }: Props) {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const start = useCallback(() => {
    setI(0);
    setActive(true);
  }, []);

  // Decide whether to run: first visit, or ?tour=1 in the URL.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "1";
    } catch {
      /* ignore */
    }
    const forced = new URLSearchParams(window.location.search).get("tour") === "1";
    if (!seen || forced) {
      const t = setTimeout(start, 400); // let the target page paint first
      return () => clearTimeout(t);
    }
  }, [storageKey, start]);

  // Replayable from anywhere on the page via a "?" button.
  useEffect(() => {
    const onStart = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (!key || key === storageKey) start();
    };
    window.addEventListener("vp:start-tour", onStart as EventListener);
    return () => window.removeEventListener("vp:start-tour", onStart as EventListener);
  }, [storageKey, start]);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setBox(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [steps, i]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    const iv = setInterval(measure, 400); // catch late layout shifts
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      clearInterval(iv);
    };
  }, [active, measure]);

  function finish() {
    setActive(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    // drop ?tour=1 so a refresh doesn't restart it
    const url = new URL(window.location.href);
    if (url.searchParams.has("tour")) {
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.toString());
    }
  }

  function next() {
    if (i >= steps.length - 1) finish();
    else setI((n) => n + 1);
  }

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i, steps.length]);

  if (!active || !steps[i]) return null;

  const step = steps[i];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Tooltip: below the target if there's room, otherwise above, otherwise centered.
  let tipTop = 0;
  let tipLeft = 0;
  let centered = false;
  if (box) {
    const belowRoom = vh - (box.top + box.height) > 190;
    tipTop = belowRoom ? box.top + box.height + PAD + 6 : box.top - PAD - 6 - 170;
    if (tipTop < 12) tipTop = 12;
    tipLeft = Math.min(Math.max(box.left, 12), vw - 332);
  } else {
    centered = true;
  }

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {/* Dimmer with a spotlight hole (via a big ring shadow) */}
      {box ? (
        <div
          className="absolute rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            outline: "2px solid rgba(139,92,246,0.9)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}
      {/* Click-catcher to advance */}
      <button aria-label="Next step" onClick={next} className="absolute inset-0 w-full h-full cursor-default" />

      {/* Tooltip */}
      <div
        className={`absolute w-80 rounded-2xl border border-violet-500/30 bg-white dark:bg-gray-900 shadow-2xl p-4 ${
          centered ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : ""
        }`}
        style={centered ? undefined : { top: tipTop, left: tipLeft }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
            Step {i + 1} of {steps.length}
          </span>
          <button onClick={finish} className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Skip</button>
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{step.title}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">{step.body}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:text-gray-900 dark:hover:text-white px-2 py-1.5 rounded-lg transition-colors"
          >← Back</button>
          <button
            onClick={next}
            className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-1.5 rounded-lg transition-all"
          >{i >= steps.length - 1 ? "Done" : "Next →"}</button>
        </div>
      </div>
    </div>
  );
}
