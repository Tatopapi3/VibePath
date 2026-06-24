"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { Lesson, LessonContent, QuizContent, ChallengeContent } from "@/lib/content/types";

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("lessons").select("*").eq("id", id).single().then(({ data }) => {
      setLesson(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Lesson not found.</p>
        <Link href="/learn" className="text-violet-400 text-sm hover:underline">← Back to learning</Link>
      </div>
    );
  }

  const content = lesson.content_json;

  // ── LESSON ──
  if (lesson.type === "lesson") {
    const { cards } = content as LessonContent;
    const card = cards[cardIndex];
    const isLast = cardIndex === cards.length - 1;

    if (done) {
      return <CompletionScreen lesson={lesson} onBack={() => router.push("/learn")} />;
    }

    return (
      <PageShell lesson={lesson}>
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {cards.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= cardIndex ? "bg-violet-500" : "bg-gray-700"}`} />
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">{card.title}</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{card.body}</p>
          {card.code && (
            <pre className="bg-gray-950 rounded-xl p-4 text-[11px] font-mono text-violet-300 overflow-x-auto leading-relaxed border border-white/5">
              <code>{card.code}</code>
            </pre>
          )}
        </div>

        <div className="flex justify-between">
          <button onClick={() => setCardIndex((i) => i - 1)} disabled={cardIndex === 0}
            className="text-sm text-gray-400 hover:text-white disabled:opacity-30 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors">← Back</button>
          <button onClick={() => isLast ? setDone(true) : setCardIndex((i) => i + 1)}
            className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl transition-all">
            {isLast ? "Complete ✓" : "Next →"}
          </button>
        </div>
      </PageShell>
    );
  }

  // ── QUIZ ──
  if (lesson.type === "quiz") {
    const { questions } = content as QuizContent;
    const q = questions[cardIndex];
    const isLast = cardIndex === questions.length - 1;

    if (done) {
      return <CompletionScreen lesson={lesson} score={score} total={questions.length} onBack={() => router.push("/learn")} />;
    }

    return (
      <PageShell lesson={lesson}>
        <div className="flex gap-1.5 mb-8">
          {questions.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < cardIndex ? "bg-violet-500" : i === cardIndex ? "bg-violet-400" : "bg-gray-700"}`} />
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-3">Question {cardIndex + 1} of {questions.length}</p>
        <h2 className="text-base font-bold text-white mb-5">{q.question}</h2>

        <div className="space-y-2.5 mb-6">
          {q.options.map((opt, i) => {
            let cls = "border-white/10 bg-gray-900 text-gray-300 hover:border-violet-500/50 hover:text-white";
            if (revealed) {
              if (i === q.correct) cls = "border-emerald-500 bg-emerald-500/10 text-emerald-300";
              else if (i === selected) cls = "border-red-500 bg-red-500/10 text-red-300";
              else cls = "border-white/5 bg-gray-900/50 text-gray-600 opacity-50";
            } else if (selected === i) {
              cls = "border-violet-500 bg-violet-500/10 text-violet-300";
            }
            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => setSelected(i)}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${cls}`}
              >{opt}</button>
            );
          })}
        </div>

        {revealed && (
          <div className={`rounded-xl px-4 py-3 mb-5 text-xs leading-relaxed ${selected === q.correct ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
            <span className="font-bold">{selected === q.correct ? "Correct! " : "Not quite. "}</span>{q.explanation}
          </div>
        )}

        <div className="flex justify-between">
          {!revealed ? (
            <button onClick={() => { setRevealed(true); if (selected === q.correct) setScore((s) => s + 1); }}
              disabled={selected === null}
              className="ml-auto text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl transition-all">
              Check Answer
            </button>
          ) : (
            <button
              onClick={() => { if (isLast) { setDone(true); } else { setCardIndex((i) => i + 1); setSelected(null); setRevealed(false); } }}
              className="ml-auto text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl transition-all">
              {isLast ? "See Results →" : "Next →"}
            </button>
          )}
        </div>
      </PageShell>
    );
  }

  // ── CHALLENGE ──
  if (lesson.type === "challenge") {
    const ch = content as ChallengeContent;
    if (done) return <CompletionScreen lesson={lesson} onBack={() => router.push("/learn")} />;

    return (
      <PageShell lesson={lesson}>
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 mb-4">
          <h2 className="text-base font-bold text-white mb-2">{ch.description}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{ch.instructions}</p>
        </div>

        <pre className="bg-gray-950 rounded-xl p-4 text-[11px] font-mono text-gray-300 overflow-x-auto leading-relaxed border border-white/5 mb-4">
          <code>{ch.starterCode}</code>
        </pre>

        {ch.hints && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">Hints</p>
            <ul className="space-y-1">
              {ch.hints.map((h, i) => (
                <li key={i} className="text-xs text-violet-300 flex gap-2"><span className="opacity-50">→</span>{h}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={() => setDone(true)}
          className="w-full text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 rounded-xl transition-all">
          Mark as Complete ✓
        </button>
      </PageShell>
    );
  }

  return null;
}

function PageShell({ lesson, children }: { lesson: Lesson; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <nav className="flex items-center gap-3 px-6 py-3.5 border-b border-white/5 sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm">
        <Link href="/learn" className="text-gray-500 hover:text-white transition-colors text-sm">← Back</Link>
        <span className="text-gray-700">/</span>
        <span className="text-white text-sm font-semibold truncate">{lesson.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold text-yellow-500">+{lesson.xp_reward} XP</span>
          <span className="text-[10px] font-bold text-amber-400">+{lesson.coin_reward} coins</span>
          <ThemeToggle />
        </div>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}

function CompletionScreen({ lesson, score, total, onBack }: { lesson: Lesson; score?: number; total?: number; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center text-4xl mb-6">🎉</div>
      <h2 className="text-2xl font-black text-white mb-2">
        {score !== undefined ? `${score}/${total} Correct!` : "Lesson Complete!"}
      </h2>
      <p className="text-gray-400 text-sm mb-2">{lesson.title}</p>
      <div className="flex items-center gap-4 mb-8">
        <span className="text-yellow-400 font-bold">+{lesson.xp_reward} XP</span>
        <span className="text-amber-400 font-bold">+{lesson.coin_reward} coins</span>
      </div>
      <button onClick={onBack}
        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold px-8 py-3 rounded-xl transition-all">
        Continue Journey →
      </button>
    </div>
  );
}
