"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTutorContext } from "@/lib/tutor/useTutorContext";
import Tour from "@/components/tour/Tour";
import TourButton from "@/components/tour/TourButton";
import { LEARN_TOUR } from "@/components/tour/tours";
import type { Language, Unit, Lesson } from "@/lib/content/types";

const LANG_ICONS: Record<string, string> = {
  python: "🐍", javascript: "⚡", typescript: "🔷", html: "🌐",
  css: "🎨", sql: "🗄️", react: "⚛️", git: "🌿", product: "🧭",
};

const TYPE_ICONS: Record<string, string> = {
  lesson: "📖", quiz: "🧠", challenge: "⚡", review: "✅",
};

// The "Product" track (writing a PRD, scoping an MVP) isn't a programming
// language — it gets its own top-level section instead of a language tab.
const FOUNDATIONS_SLUG = "product";

type Section = "languages" | "foundations";

export default function LearnPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeSlug, setActiveSlug] = useState("");
  const [units, setUnits] = useState<(Unit & { lessons: Lesson[] })[]>([]);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [languagesLoaded, setLanguagesLoaded] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("languages");

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoadError("The learning content isn't available right now — the database connection isn't configured.");
      setLanguagesLoaded(true);
      return;
    }

    supabase
      .from("languages")
      .select("*")
      .order("display_order")
      .then(
        ({ data, error }) => {
          if (error) {
            setLoadError("Couldn't load the curriculum. The learning database may be offline — try again shortly.");
          } else if (data) {
            setLanguages(data);
            setActiveSlug(
              (cur) => cur || data.find((l) => l.slug !== FOUNDATIONS_SLUG)?.slug || ""
            );
          }
          setLanguagesLoaded(true);
        },
        () => {
          setLoadError("Couldn't reach the learning database. Check your connection and try again.");
          setLanguagesLoaded(true);
        }
      );

    supabase
      .from("user_progress")
      .select("lesson_id")
      .eq("device_id", getDeviceId())
      .then(
        ({ data }) => {
          if (data) setCompletedIds(new Set(data.map((r) => r.lesson_id)));
        },
        () => {
          /* progress is non-critical — silently skip if it fails */
        }
      );
  }, []);

  const effectiveSlug = section === "foundations" ? FOUNDATIONS_SLUG : activeSlug;

  useEffect(() => {
    if (!languagesLoaded) return;
    const lang = languages.find((l) => l.slug === effectiveSlug);
    if (!lang) {
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoadError("The learning content isn't available right now — the database connection isn't configured.");
      setLoading(false);
      return;
    }

    supabase
      .from("units")
      .select("*, lessons(*)")
      .eq("language_id", lang.id)
      .order("display_order")
      .then(
        ({ data, error }) => {
          if (error) {
            setLoadError("Couldn't load these lessons. The learning database may be offline — try again shortly.");
          } else {
            const sorted = (data ?? []).map((u) => ({
              ...u,
              lessons: (u.lessons as Lesson[]).sort((a, b) => a.display_order - b.display_order),
            }));
            setUnits(sorted);
            if (sorted.length > 0) setExpandedUnit(sorted[0].id);
          }
          setLoading(false);
        },
        () => {
          setLoadError("Couldn't reach the learning database. Check your connection and try again.");
          setLoading(false);
        }
      );
  }, [effectiveSlug, languages, languagesLoaded]);

  const activeLang = languages.find((l) => l.slug === effectiveSlug);
  const langTabs = languages.filter((l) => l.slug !== FOUNDATIONS_SLUG);
  const hasFoundations = languages.some((l) => l.slug === FOUNDATIONS_SLUG);

  useTutorContext("learn", section === "foundations" ? "Foundations" : activeLang?.name);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-black/5 dark:border-white/5 sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">VibePath</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Learn</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/journey" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Journey</Link>
          <Link href="/practice" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Practice</Link>
          <Link href="/build" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">← Builder</Link>
          <TourButton tourKey="vp-tour-learn" />
          <ThemeToggle />
        </div>
      </nav>

      {/* Section switch + language tabs */}
      <div className="border-b border-black/5 dark:border-white/5 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm sticky top-[53px] z-10">
        <div className="max-w-3xl mx-auto px-4">
          {hasFoundations && (
            <div data-tour="section-switch" className="flex items-center gap-1 pt-2.5">
              {(["languages", "foundations"] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`text-xs font-bold rounded-lg px-3 py-1.5 transition-colors capitalize ${
                    section === s
                      ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {s === "foundations" ? "🧭 Foundations" : "💻 Languages"}
                </button>
              ))}
            </div>
          )}
          {section === "languages" && (
            <div data-tour="lang-tabs" className="overflow-x-auto">
              <div className="flex items-center gap-1 py-2" style={{ minWidth: "max-content" }}>
                {langTabs.map((lang) => (
                  <button
                    key={lang.slug}
                    onClick={() => setActiveSlug(lang.slug)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      activeSlug === lang.slug ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                    style={activeSlug === lang.slug ? { background: lang.color + "33", color: lang.color } : {}}
                  >
                    <span>{LANG_ICONS[lang.slug] ?? "💻"}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {section === "foundations" && <div className="py-2.5" />}
        </div>
      </div>

      {/* Content */}
      <main data-tour="curriculum" className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* Header */}
        {section === "foundations" ? (
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <span>🧭</span>
              Foundations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeLang?.description ??
                "What a PRD is, how to write one, and how to scope an MVP before you build."}
            </p>
          </div>
        ) : activeLang ? (
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <span>{LANG_ICONS[activeLang.slug] ?? "💻"}</span>
              {activeLang.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activeLang.description}</p>
          </div>
        ) : null}

        {loadError ? (
          <div className="text-center py-20 max-w-sm mx-auto">
            <div className="text-4xl mb-4">📡</div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Learning content unavailable</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-lg transition-all"
            >Retry</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-200/60 dark:bg-gray-800/40 animate-pulse" />
            ))}
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🚧</div>
            <p className="text-gray-500 dark:text-gray-400">Curriculum coming soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {units.map((unit, idx) => {
              const isOpen = expandedUnit === unit.id;
              return (
                <div
                  key={unit.id}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{ borderColor: unit.color + "44" }}
                >
                  {/* Unit header */}
                  <button
                    onClick={() => setExpandedUnit(isOpen ? null : unit.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    style={{ background: unit.color + "11" }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                      style={{ background: unit.color }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{unit.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{unit.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{unit.lessons.length} lessons</span>
                      <span className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </button>

                  {/* Lessons */}
                  {isOpen && (
                    <div className="border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
                      {unit.lessons.map((lesson) => (
                        <Link
                          key={lesson.id}
                          href={`/lesson/${lesson.id}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group"
                        >
                          <span className="text-base w-6 text-center flex-shrink-0">{TYPE_ICONS[lesson.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate">{lesson.title}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-600 capitalize mt-0.5">{lesson.type}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {completedIds.has(lesson.id) && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold" title="Completed">✓</span>
                            )}
                            <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold">+{lesson.xp_reward} XP</span>
                            <span className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors text-sm">→</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Tour steps={LEARN_TOUR} storageKey="vp-tour-learn" />
    </div>
  );
}
