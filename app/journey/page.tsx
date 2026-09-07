"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTutorContext } from "@/lib/tutor/useTutorContext";
import type { Language, Unit, Lesson } from "@/lib/content/types";

const LANG_ICONS: Record<string, string> = {
  python: "🐍", javascript: "⚡", typescript: "🔷", html: "🌐",
  css: "🎨", sql: "🗄️", react: "⚛️", git: "🌿", product: "🧭",
};

// The recommended order to learn things in — Foundations first, then the
// web basics, then the deeper tracks. Anything not listed falls to the end
// in display_order.
const TRACK_ORDER = ["product", "html", "css", "javascript", "typescript", "react", "python", "sql", "git"];

interface Track {
  slug: string;
  name: string;
  color: string;
  description: string;
  units: (Unit & { lessons: Lesson[] })[];
  total: number;
  done: number;
  firstIncompleteLessonId: string | null;
}

export default function JourneyPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useTutorContext("journey", "Learning Journey");

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoadError("The journey isn't available — the database connection isn't configured.");
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const deviceId = getDeviceId();
        const [langsRes, unitsRes, progressRes] = await Promise.all([
          supabase.from("languages").select("*").order("display_order"),
          supabase.from("units").select("*, lessons(*)").order("display_order"),
          supabase.from("user_progress").select("lesson_id").eq("device_id", deviceId),
        ]);
        if (langsRes.error || unitsRes.error) throw new Error("query failed");

        const done = new Set<string>((progressRes.data ?? []).map((r) => r.lesson_id));
        setCompletedIds(done);
        const unitsByLang = new Map<string, (Unit & { lessons: Lesson[] })[]>();
        for (const u of (unitsRes.data ?? []) as (Unit & { lessons: Lesson[] })[]) {
          const list = unitsByLang.get(u.language_id) ?? [];
          list.push({ ...u, lessons: [...(u.lessons ?? [])].sort((a, b) => a.display_order - b.display_order) });
          unitsByLang.set(u.language_id, list);
        }

        const built: Track[] = ((langsRes.data ?? []) as Language[]).map((l) => {
          const units = (unitsByLang.get(l.id) ?? []).sort((a, b) => a.display_order - b.display_order);
          const allLessons = units.flatMap((u) => u.lessons);
          const firstIncomplete = allLessons.find((ls) => !done.has(ls.id));
          return {
            slug: l.slug,
            name: l.name,
            color: l.color,
            description: l.description,
            units,
            total: allLessons.length,
            done: allLessons.filter((ls) => done.has(ls.id)).length,
            firstIncompleteLessonId: firstIncomplete?.id ?? null,
          };
        });

        built.sort((a, b) => {
          const ai = TRACK_ORDER.indexOf(a.slug);
          const bi = TRACK_ORDER.indexOf(b.slug);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        setTracks(built.filter((t) => t.total > 0));
        const current = built.find((t) => t.done < t.total);
        if (current) setExpanded(current.slug);
        setLoading(false);
      } catch {
        setLoadError("Couldn't load the journey. The learning database may be offline — try again shortly.");
        setLoading(false);
      }
    };
    run();
  }, []);

  const totals = useMemo(() => {
    const total = tracks.reduce((s, t) => s + t.total, 0);
    const done = tracks.reduce((s, t) => s + t.done, 0);
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tracks]);

  const currentTrack = tracks.find((t) => t.done < t.total) ?? null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-black/5 dark:border-white/5 sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">VibePath</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Journey</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/learn" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Curriculum</Link>
          <Link href="/practice" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Practice</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {loadError ? (
          <div className="text-center py-20 max-w-sm mx-auto">
            <div className="text-4xl mb-4">📡</div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Journey unavailable</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{loadError}</p>
            <button onClick={() => window.location.reload()} className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-lg transition-all">Retry</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-200/60 dark:bg-gray-800/40 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Overview */}
            <div className="mb-8">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Your learning journey</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Everything on VibePath, in the order we&apos;d teach it. Work top to bottom, or jump around.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700" style={{ width: `${totals.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">{totals.pct}%</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1.5">{totals.done} of {totals.total} lessons complete</p>

              {currentTrack?.firstIncompleteLessonId && (
                <Link
                  href={`/lesson/${currentTrack.firstIncompleteLessonId}`}
                  className="inline-flex items-center gap-2 mt-4 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl transition-all"
                >
                  Continue: {currentTrack.name} →
                </Link>
              )}
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-black/10 dark:bg-white/10" />
              <div className="space-y-2">
                {tracks.map((t) => {
                  const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
                  const state =
                    t.done >= t.total ? "done" : t.slug === currentTrack?.slug ? "current" : "todo";
                  const isOpen = expanded === t.slug;
                  return (
                    <div key={t.slug} className="relative pl-10">
                      {/* Node */}
                      <div
                        className={`absolute left-0 top-3 w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                          state === "done" ? "text-white" : "bg-white dark:bg-gray-950 border-2"
                        }`}
                        style={
                          state === "done"
                            ? { background: t.color }
                            : { borderColor: state === "current" ? t.color : "rgba(120,120,120,0.3)" }
                        }
                      >
                        {state === "done" ? "✓" : LANG_ICONS[t.slug] ?? "•"}
                      </div>

                      <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                        <button
                          onClick={() => setExpanded(isOpen ? null : t.slug)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.name}</h3>
                              {state === "current" && (
                                <span className="text-[9px] font-black uppercase tracking-widest rounded-full px-1.5 py-0.5" style={{ background: t.color + "22", color: t.color }}>
                                  You are here
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden max-w-[160px]">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.color }} />
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 tabular-nums">
                                {state === "done" ? "done" : `${t.done}/${t.total}`}
                              </span>
                            </div>
                          </div>
                          <span className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </button>

                        {isOpen && (
                          <div className="border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
                            {t.units.map((u) => {
                              const uTotal = u.lessons.length;
                              const uDone = u.lessons.filter((ls) => completedIds.has(ls.id)).length;
                              return (
                                <div key={u.id} className="px-4 py-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{u.title}</p>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-600 tabular-nums flex-shrink-0">{uDone}/{uTotal}</span>
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {u.lessons.map((ls) => {
                                      const isDone = completedIds.has(ls.id);
                                      return (
                                        <Link
                                          key={ls.id}
                                          href={`/lesson/${ls.id}`}
                                          title={ls.title}
                                          className={`text-[10px] px-2 py-1 rounded-md transition-colors truncate max-w-[160px] ${
                                            isDone
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                              : "bg-black/[0.04] dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                          }`}
                                        >
                                          {isDone ? "✓ " : ""}{ls.title}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                            {t.firstIncompleteLessonId && (
                              <div className="px-4 py-2.5">
                                <Link
                                  href={`/lesson/${t.firstIncompleteLessonId}`}
                                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                                >
                                  {t.done === 0 ? "Start this track →" : "Resume this track →"}
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
