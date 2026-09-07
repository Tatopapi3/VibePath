"use client";

import { useMemo, useState } from "react";

export interface DrillQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  lang: string;
  langColor: string;
}

const SET_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizDrill({ pool, onExit }: { pool: DrillQuestion[]; onExit: () => void }) {
  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => shuffle(pool).slice(0, SET_SIZE), [pool, seed]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  function restart() {
    setSeed((s) => s + 1);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  }

  if (pool.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🗒️</div>
        <p className="text-gray-500 dark:text-gray-400">No quiz questions for this filter yet.</p>
        <button onClick={onExit} className="mt-4 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">← Choose another</button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center text-4xl mx-auto mb-6">
          {pct === 100 ? "🏆" : pct >= 60 ? "🎯" : "📚"}
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{score}/{questions.length} correct</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          {pct === 100 ? "Perfect run." : pct >= 60 ? "Solid — go again to push it higher." : "Worth another pass."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onExit} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">← Back</button>
          <button onClick={restart} className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl transition-all">New set →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {questions.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < index ? "bg-violet-500" : i === index ? "bg-violet-400" : "bg-gray-300 dark:bg-gray-700"}`} />
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Question {index + 1} of {questions.length}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
          style={{ background: q.langColor + "22", color: q.langColor }}
        >{q.lang}</span>
      </div>

      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">{q.question}</h2>

      <div className="space-y-2.5 mb-6">
        {q.options.map((opt, i) => {
          let cls = "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-violet-500/50 hover:text-gray-900 dark:hover:text-white";
          if (revealed) {
            if (i === q.correct) cls = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
            else if (i === selected) cls = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
            else cls = "border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600 opacity-50";
          } else if (selected === i) {
            cls = "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300";
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
        <div className={`rounded-xl px-4 py-3 mb-5 text-xs leading-relaxed ${selected === q.correct ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"}`}>
          <span className="font-bold">{selected === q.correct ? "Correct! " : "Not quite. "}</span>{q.explanation}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onExit} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Exit</button>
        {!revealed ? (
          <button
            onClick={() => { setRevealed(true); if (selected === q.correct) setScore((s) => s + 1); }}
            disabled={selected === null}
            className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl transition-all"
          >Check</button>
        ) : (
          <button
            onClick={() => {
              if (isLast) { setDone(true); return; }
              setIndex((i) => i + 1);
              setSelected(null);
              setRevealed(false);
            }}
            className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl transition-all"
          >{isLast ? "See results →" : "Next →"}</button>
        )}
      </div>
    </div>
  );
}
