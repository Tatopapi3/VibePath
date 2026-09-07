"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import LearningPanel from "@/components/learning/LearningPanel";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EXAMPLE_PROMPTS } from "@/lib/prompts";
import { PREVIEW_STORAGE_SHIM, addCrossOriginToExternalScripts } from "@/lib/previewShim";
import { TRUNCATION_MARKER } from "@/lib/truncationMarker";
import { useTutorContext } from "@/lib/tutor/useTutorContext";
import Tour from "@/components/tour/Tour";
import TourButton from "@/components/tour/TourButton";
import { BUILD_TOUR } from "@/components/tour/tours";

type Phase = "choose" | "simple" | "prd" | "generating" | "done" | "error";
type Tab = "preview" | "code";

const PRD_QUESTIONS = [
  {
    q: "What does your app do?",
    hint: "The problem it solves, in one sentence — not a feature list.",
    placeholder: "e.g. Helps freelancers see at a glance which invoices are overdue",
  },
  {
    q: "Who is it for?",
    hint: "A specific type of user. \"Everyone\" tells you nothing about what to prioritize.",
    placeholder: "e.g. Solo freelancers juggling 5–10 clients",
  },
  {
    q: "What are the 2–3 core features for v1?",
    hint: "Only what's needed on day one to deliver the value above. Everything else is later.",
    placeholder: "e.g. Add an invoice with due date, list them sorted by urgency, mark as paid",
  },
];

function compilePRD(answers: string[]) {
  return `Build an app that: ${answers[0]}.
Target users: ${answers[1]}.
Core features: ${answers[2]}.`;
}

export default function BuildPage() {
  const [phase, setPhase] = useState<Phase>("choose");
  const [prdStep, setPrdStep] = useState(0);
  const [prdAnswers, setPrdAnswers] = useState<string[]>([]);
  const [prdInput, setPrdInput] = useState("");
  const [simpleInput, setSimpleInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prdInputRef = useRef<HTMLTextAreaElement>(null);
  const simpleInputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generatingCodeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (phase === "prd") prdInputRef.current?.focus();
    if (phase === "simple") simpleInputRef.current?.focus();
  }, [phase, prdStep]);

  useEffect(() => {
    generatingCodeRef.current?.scrollTo({ top: generatingCodeRef.current.scrollHeight });
  }, [generatedCode]);

  const generate = useCallback(async (finalPrompt: string) => {
    setPhase("generating");
    setGeneratedCode("");
    setError(null);
    abortRef.current = new AbortController();
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Generation failed");
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let html = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value);
        setGeneratedCode(html);
      }
      const markedTruncated = html.includes(TRUNCATION_MARKER);
      if (markedTruncated) html = html.replace(TRUNCATION_MARKER, "");
      // Cause-agnostic safety net: even without an explicit truncation
      // signal from the server (e.g. the platform's own function timeout
      // cutting the connection, not just the model hitting max_tokens), a
      // complete generation always ends with a closing </html> tag. If it
      // doesn't, the stream ended early somewhere we couldn't detect
      // server-side — treat it the same as a known truncation rather than
      // handing the iframe HTML that can never parse.
      const looksComplete = /<\/html\s*>\s*$/i.test(html.trim());
      if (markedTruncated || !looksComplete) {
        setGeneratedCode(html);
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        throw new Error(
          `The generated app was too large and got cut off before finishing (after ${elapsedSec}s, ${html.length.toLocaleString()} chars). Try a simpler request, or ask for fewer features.`
        );
      }
      setPhase("done");
      setActiveTab("preview");
      setTimeout(() => setShowLearningPanel(true), 5000);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, []);

  function handlePrdNext() {
    if (!prdInput.trim()) return;
    const answers = [...prdAnswers, prdInput.trim()];
    setPrdAnswers(answers);
    setPrdInput("");
    if (prdStep < 2) {
      setPrdStep(prdStep + 1);
    } else {
      const finalPrompt = compilePRD(answers);
      setPrompt(finalPrompt);
      generate(finalPrompt);
    }
  }

  function handleSimpleBuild() {
    const text = simpleInput.trim();
    if (!text) return;
    setPrompt(text);
    generate(text);
  }

  function handleExample(ex: string) {
    setPrompt(ex);
    generate(ex);
  }

  function handleNewApp() {
    abortRef.current?.abort();
    setPhase("choose");
    setPrdStep(0);
    setPrdAnswers([]);
    setPrdInput("");
    setSimpleInput("");
    setGeneratedCode("");
    setPrompt("");
    setShowLearningPanel(false);
    setError(null);
  }

  const progress = ((prdStep + 1) / 3) * 100;
  const showSidebar = phase === "choose" || phase === "simple";

  // Give the tutor the finished app code so "explain this" is grounded.
  useTutorContext("build", "App Builder", phase === "done" ? generatedCode : undefined);

  return (
    <div className="h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">VibePath</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/journey" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Journey</Link>
          <Link href="/practice" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Practice</Link>
          <Link href="/learn" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">Go to Learning →</Link>
          <TourButton tourKey="vp-tour-build" />
          {(phase === "done" || phase === "error") && (
            <button onClick={handleNewApp} className="text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg transition-colors font-medium">+ New App</button>
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside data-tour="examples" className="w-64 border-r border-black/5 dark:border-white/5 flex-col p-4 gap-4 overflow-y-auto hidden lg:flex">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Start from an example</p>
              <div className="space-y-1.5">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExample(ex)}
                    className="w-full text-left text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-3 py-2 transition-colors leading-relaxed"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Choose a mode */}
          {phase === "choose" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
              <div className="w-full max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white text-center mb-2">What do you want to build?</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Pick how you want to start. You can switch any time.</p>

                <div data-tour="build-modes" className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPhase("simple")}
                    className="group text-left p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-violet-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all"
                  >
                    <div className="text-2xl mb-3">✏️</div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Just describe it</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      New to this? Type what you want in plain words — a sentence or a paragraph — and we&apos;ll build it. No jargon needed.
                    </p>
                    <span className="inline-block mt-3 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform">Start simple →</span>
                  </button>

                  <button
                    onClick={() => { setPhase("prd"); setPrdStep(0); setPrdAnswers([]); setPrdInput(""); }}
                    className="group text-left p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-violet-500/50 hover:bg-white dark:hover:bg-gray-900 transition-all"
                  >
                    <div className="text-2xl mb-3">🧭</div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Build a PRD first</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Know how to scope? We&apos;ll walk you through a real product spec — problem, user, core features — then build to it.
                    </p>
                    <span className="inline-block mt-3 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform">Scope it properly →</span>
                  </button>
                </div>

                <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center mt-6">
                  Not sure what a PRD is?{" "}
                  <Link href="/learn" className="underline hover:text-gray-600 dark:hover:text-gray-400">Learn it in Foundations →</Link>
                </p>
              </div>
            </div>
          )}

          {/* Simple mode */}
          {phase === "simple" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
              <div className="w-full max-w-lg">
                <button
                  onClick={() => setPhase("choose")}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >← Back</button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Describe your app</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Say what it should do and roughly what it should look like. Don&apos;t overthink it — you can regenerate.
                </p>
                <textarea
                  ref={simpleInputRef}
                  value={simpleInput}
                  onChange={(e) => setSimpleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSimpleBuild(); }}
                  placeholder={"e.g. A grocery list app where I can add items, check them off, and clear the checked ones. Clean and colorful."}
                  rows={5}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors mb-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-600">⌘ + Enter to build</span>
                  <button
                    onClick={handleSimpleBuild}
                    disabled={!simpleInput.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all"
                  >Build it ✨</button>
                </div>
              </div>
            </div>
          )}

          {/* PRD Builder */}
          {phase === "prd" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
              <div className="w-full max-w-lg">
                <button
                  onClick={() => setPhase("choose")}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >← Back</button>
                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                  <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums">{prdStep + 1}/3</span>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Step {prdStep + 1} — PRD</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">{PRD_QUESTIONS[prdStep].q}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{PRD_QUESTIONS[prdStep].hint}</p>

                <textarea
                  ref={prdInputRef}
                  value={prdInput}
                  onChange={(e) => setPrdInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePrdNext(); }}
                  placeholder={PRD_QUESTIONS[prdStep].placeholder}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors mb-4"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-600">⌘ + Enter to continue</span>
                  <button
                    onClick={handlePrdNext}
                    disabled={!prdInput.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all"
                  >
                    {prdStep < 2 ? "Next →" : "Generate App ✨"}
                  </button>
                </div>

                {/* PRD so far */}
                {prdAnswers.length > 0 && (
                  <div className="mt-8 space-y-2 rounded-xl border border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-900/50 p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Your PRD so far</p>
                    {prdAnswers.map((ans, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">{["Problem", "User", "Features"][i]}:</span>
                        <span className="text-gray-600 dark:text-gray-300">{ans}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generating */}
          {phase === "generating" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {generatedCode ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">Generating your app…</span>
                    <span className="text-xs text-gray-500 ml-auto tabular-nums">{generatedCode.length.toLocaleString()} chars</span>
                  </div>
                  <pre ref={generatingCodeRef} className="flex-1 overflow-auto p-4 text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed bg-gray-100 dark:bg-gray-950">
                    <code>{generatedCode}</code>
                  </pre>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-2xl animate-pulse">⚡</div>
                  <p className="text-gray-900 dark:text-white font-semibold">Generating your app…</p>
                  <p className="text-gray-500 text-sm">Claude is writing the code</p>
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">⚠️</div>
              <p className="text-gray-900 dark:text-white font-semibold">Generation failed</p>
              <p className="text-gray-500 text-sm max-w-sm">{error}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleNewApp}
                  className="text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >Start over</button>
                <button
                  onClick={() => generate(prompt)}
                  className="text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >Try again</button>
              </div>
            </div>
          )}

          {/* Done — Preview + Code */}
          {phase === "done" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-900/50">
                {(["preview", "code"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors capitalize ${
                      activeTab === t ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >{t}</button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {copied ? "Copied!" : "Copy code"}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "preview" && (
                  <iframe
                    srcDoc={PREVIEW_STORAGE_SHIM + addCrossOriginToExternalScripts(generatedCode)}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts"
                    title="Generated App Preview"
                  />
                )}
                {activeTab === "code" && (
                  <pre className="h-full overflow-auto p-4 text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed bg-gray-100 dark:bg-gray-950">
                    <code>{generatedCode}</code>
                  </pre>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {showLearningPanel && (
        <LearningPanel
          code={generatedCode}
          prompt={prompt}
          onClose={() => setShowLearningPanel(false)}
        />
      )}

      <Tour steps={BUILD_TOUR} storageKey="vp-tour-build" />
    </div>
  );
}
