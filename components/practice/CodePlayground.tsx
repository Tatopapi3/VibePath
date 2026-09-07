"use client";

import { useMemo, useRef, useState } from "react";
import type { ChallengeContent } from "@/lib/content/types";
import { canAutoGrade, detectEntry, grade, run, type GradedCase, type PracticeLang } from "@/lib/practice/grade";
import { pythonRuntimeReady, type RunResult } from "@/lib/practice/runners";

export interface PlaygroundChallenge {
  id: string;
  title: string;
  langSlug: string;
  langName: string;
  langColor: string;
  language: PracticeLang;
  content: ChallengeContent;
}

export default function CodePlayground({ challenges, onExit }: { challenges: PlaygroundChallenge[]; onExit: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(challenges[0]?.id ?? null);
  const active = useMemo(() => challenges.find((c) => c.id === activeId) ?? null, [challenges, activeId]);

  const [code, setCode] = useState(active?.content.starterCode ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [graded, setGraded] = useState<GradedCase[] | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function select(c: PlaygroundChallenge) {
    setActiveId(c.id);
    setCode(c.content.starterCode);
    setResult(null);
    setGraded(null);
    setAllPassed(false);
    setShowHints(false);
  }

  function reset() {
    if (!active) return;
    setCode(active.content.starterCode);
    setResult(null);
    setGraded(null);
    setAllPassed(false);
  }

  const needsPyLoad = (lang: PracticeLang) => lang === "python" && !pythonRuntimeReady();

  async function handleRun() {
    if (!active || running) return;
    setRunning(true);
    setGraded(null);
    setAllPassed(false);
    if (needsPyLoad(active.language)) {
      setPyLoading(true);
      // Let the "loading runtime" notice paint before Pyodide blocks the thread.
      await new Promise((r) => setTimeout(r, 50));
    }
    const r = await run(active.language, code, { entry: detectEntry(active.content.starterCode) ?? undefined });
    setPyLoading(false);
    setResult(r);
    setRunning(false);
  }

  async function handleCheck() {
    if (!active || running) return;
    setRunning(true);
    if (needsPyLoad(active.language)) {
      setPyLoading(true);
      await new Promise((r) => setTimeout(r, 50));
    }
    const { result: r, graded: g, allPassed: passed } = await grade(
      active.content as ChallengeContent & { language: PracticeLang },
      code
    );
    setPyLoading(false);
    setResult(r);
    setGraded(g);
    setAllPassed(passed);
    setRunning(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = ta;
      const next = code.slice(0, s) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🧩</div>
        <p className="text-gray-500 dark:text-gray-400">No runnable challenges for this filter.</p>
        <button onClick={onExit} className="mt-4 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">← Choose another</button>
      </div>
    );
  }

  const autoGrade = active ? canAutoGrade(active.content) : false;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-13rem)]">
      {/* Challenge list */}
      <aside className="lg:w-60 flex-shrink-0 lg:overflow-y-auto rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/5 dark:border-white/5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Challenges</span>
          <button onClick={onExit} className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Exit</button>
        </div>
        <div className="p-1.5 space-y-0.5 max-h-52 lg:max-h-none overflow-y-auto">
          {challenges.map((c) => (
            <button
              key={c.id}
              onClick={() => select(c)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                c.id === activeId
                  ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.langColor }} />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor + output */}
      {active && (
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{active.title}</h2>
              <span
                className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                style={{ background: active.langColor + "22", color: active.langColor }}
              >{active.language}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">{active.content.instructions}</p>
          </div>

          <textarea
            ref={taRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            className="w-full flex-1 min-h-[220px] bg-gray-100 dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl p-4 font-mono text-[12px] leading-relaxed text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg transition-opacity"
            >{pyLoading ? "Loading Python…" : running ? "Running…" : "▶ Run"}</button>
            {autoGrade && (
              <button
                onClick={handleCheck}
                disabled={running}
                className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all"
              >Check solution</button>
            )}
            <button
              onClick={reset}
              disabled={running}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >Reset</button>
            {active.content.hints?.length ? (
              <button
                onClick={() => setShowHints((v) => !v)}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-auto"
              >{showHints ? "Hide hints" : "Hints"}</button>
            ) : null}
          </div>

          {showHints && active.content.hints?.length ? (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3.5">
              <ul className="space-y-1">
                {active.content.hints.map((h, i) => (
                  <li key={i} className="text-xs text-violet-700 dark:text-violet-300 flex gap-2"><span className="opacity-50">→</span>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {pyLoading && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3.5 py-2.5 text-xs text-violet-700 dark:text-violet-300">
              Downloading the Python runtime (~10&nbsp;MB, first run only) — the page may pause for a few seconds.
            </div>
          )}

          {graded && graded.length > 0 && (
            <div className={`rounded-xl border p-3 text-xs ${allPassed ? "border-emerald-500/30 bg-emerald-500/10" : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50"}`}>
              <p className={`font-bold mb-2 ${allPassed ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-300"}`}>
                {allPassed ? "✓ All tests passed" : `${graded.filter((g) => g.passed).length}/${graded.length} tests passed`}
              </p>
              <div className="space-y-1.5">
                {graded.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={g.passed ? "text-emerald-500" : "text-red-500"}>{g.passed ? "✓" : "✕"}</span>
                    <div className="min-w-0">
                      <span className="text-gray-700 dark:text-gray-300">{g.description}</span>
                      {!g.passed && (
                        <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          <div>in: {g.input}</div>
                          <div>expected: {g.expected}</div>
                          <div>got: {g.error ? `error — ${g.error}` : g.actual}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-gray-100 dark:bg-gray-950 p-3 font-mono text-[11px] leading-relaxed max-h-40 overflow-auto">
              {result.error ? (
                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap">{result.error}</pre>
              ) : result.stdout.length ? (
                <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result.stdout.join("\n")}</pre>
              ) : (
                <span className="text-gray-400 dark:text-gray-600">No output. ({result.durationMs}ms)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
