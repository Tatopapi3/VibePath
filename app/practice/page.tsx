"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";
import QuizDrill, { type DrillQuestion } from "@/components/practice/QuizDrill";
import CodePlayground, { type PlaygroundChallenge } from "@/components/practice/CodePlayground";
import { isRunnable, type PracticeLang } from "@/lib/practice/grade";
import { useTutorContext } from "@/lib/tutor/useTutorContext";
import type { ChallengeContent, QuizContent } from "@/lib/content/types";

type Mode = "menu" | "drill" | "play";

interface LessonRow {
  id: string;
  title: string;
  type: "quiz" | "challenge";
  content_json: unknown;
  units: { languages: LangRow | LangRow[] } | { languages: LangRow | LangRow[] }[] | null;
}
interface LangRow {
  slug: string;
  name: string;
  color: string;
  icon: string;
}

function langOf(row: LessonRow): LangRow | null {
  const units = Array.isArray(row.units) ? row.units[0] : row.units;
  if (!units) return null;
  return Array.isArray(units.languages) ? units.languages[0] ?? null : units.languages;
}

export default function PracticePage() {
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [langFilter, setLangFilter] = useState("all");

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoadError("Practice content isn't available — the database connection isn't configured.");
      setLoading(false);
      return;
    }
    supabase
      .from("lessons")
      .select("id, title, type, content_json, units(languages(slug, name, color, icon))")
      .in("type", ["quiz", "challenge"])
      .then(
        ({ data, error }) => {
          if (error) setLoadError("Couldn't load practice content. The learning database may be offline — try again shortly.");
          else setRows((data ?? []) as unknown as LessonRow[]);
          setLoading(false);
        },
        () => {
          setLoadError("Couldn't reach the learning database. Check your connection and try again.");
          setLoading(false);
        }
      );
  }, []);

  const languages = useMemo(() => {
    const map = new Map<string, LangRow>();
    for (const r of rows) {
      const l = langOf(r);
      if (l && !map.has(l.slug)) map.set(l.slug, l);
    }
    return [...map.values()];
  }, [rows]);

  const drillPool = useMemo<DrillQuestion[]>(() => {
    const out: DrillQuestion[] = [];
    for (const r of rows) {
      if (r.type !== "quiz") continue;
      const l = langOf(r);
      if (!l || (langFilter !== "all" && l.slug !== langFilter)) continue;
      const qs = (r.content_json as QuizContent)?.questions ?? [];
      for (const q of qs) {
        if (!q?.question || !Array.isArray(q.options)) continue;
        out.push({
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation ?? "",
          lang: l.name,
          langColor: l.color,
        });
      }
    }
    return out;
  }, [rows, langFilter]);

  const playList = useMemo<PlaygroundChallenge[]>(() => {
    const out: PlaygroundChallenge[] = [];
    for (const r of rows) {
      if (r.type !== "challenge") continue;
      const l = langOf(r);
      if (!l || (langFilter !== "all" && l.slug !== langFilter)) continue;
      const content = r.content_json as ChallengeContent;
      if (!content?.starterCode || !isRunnable(content)) continue;
      out.push({
        id: r.id,
        title: r.title,
        langSlug: l.slug,
        langName: l.name,
        langColor: l.color,
        language: content.language as PracticeLang,
        content,
      });
    }
    return out.sort((a, b) => a.langName.localeCompare(b.langName) || a.title.localeCompare(b.title));
  }, [rows, langFilter]);

  useTutorContext("practice", mode === "drill" ? "Quiz Drill" : mode === "play" ? "Code Playground" : "Practice");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-black/5 dark:border-white/5 sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">VibePath</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Practice</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/journey" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Journey</Link>
          <Link href="/learn" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Curriculum</Link>
          <Link href="/build" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Builder</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {loadError ? (
          <div className="text-center py-20 max-w-sm mx-auto">
            <div className="text-4xl mb-4">📡</div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Practice unavailable</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{loadError}</p>
            <button onClick={() => window.location.reload()} className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-lg transition-all">Retry</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-200/60 dark:bg-gray-800/40 animate-pulse" />)}
          </div>
        ) : mode === "drill" ? (
          <QuizDrill pool={drillPool} onExit={() => setMode("menu")} />
        ) : mode === "play" ? (
          <CodePlayground challenges={playList} onExit={() => setMode("menu")} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Practice</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drill the concepts from the curriculum, or open a challenge and actually run your code.
              </p>
            </div>

            {/* Language filter */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              <button
                onClick={() => setLangFilter("all")}
                className={`text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors ${langFilter === "all" ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >All</button>
              {languages.map((l) => (
                <button
                  key={l.slug}
                  onClick={() => setLangFilter(l.slug)}
                  className="text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
                  style={langFilter === l.slug ? { background: l.color + "22", color: l.color } : {}}
                >
                  <span className={langFilter === l.slug ? "" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}>{l.icon} {l.name}</span>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("drill")}
                disabled={drillPool.length === 0}
                className="text-left p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-violet-500/40 disabled:opacity-40 transition-colors group"
              >
                <div className="text-2xl mb-3">🧠</div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Quiz Drill</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  10 random multiple-choice questions with instant feedback.
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">{drillPool.length} questions in pool</p>
              </button>

              <button
                onClick={() => setMode("play")}
                disabled={playList.length === 0}
                className="text-left p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-violet-500/40 disabled:opacity-40 transition-colors group"
              >
                <div className="text-2xl mb-3">⌨️</div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Code Playground</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Open a challenge, edit, and run it for real — JavaScript and Python, with test-case checking.
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">{playList.length} runnable challenges</p>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
