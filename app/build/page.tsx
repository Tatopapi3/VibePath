"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import LearningPanel from "@/components/learning/LearningPanel";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { EXAMPLE_PROMPTS } from "@/lib/prompts";
import { PREVIEW_STORAGE_SHIM, addCrossOriginToExternalScripts } from "@/lib/previewShim";
import { TRUNCATION_MARKER } from "@/lib/truncationMarker";

type Phase = "prd" | "generating" | "done" | "error";
type Tab = "preview" | "code";

const PRD_QUESTIONS = [
  { q: "What does your app do?", placeholder: "e.g. Helps people track daily expenses and see monthly summaries" },
  { q: "Who is it for?", placeholder: "e.g. Freelancers and small business owners" },
  { q: "What are the core features?", placeholder: "e.g. Log expenses, show charts, export CSV" },
];

function compilePRD(answers: string[]) {
  return `Build an app that: ${answers[0]}.
Target users: ${answers[1]}.
Core features: ${answers[2]}.`;
}

export default function BuildPage() {
  const [phase, setPhase] = useState<Phase>("prd");
  const [prdStep, setPrdStep] = useState(0);
  const [prdAnswers, setPrdAnswers] = useState<string[]>([]);
  const [prdInput, setPrdInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prdInputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generatingCodeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    prdInputRef.current?.focus();
  }, [prdStep]);

  useEffect(() => {
    generatingCodeRef.current?.scrollTo({ top: generatingCodeRef.current.scrollHeight });
  }, [generatedCode]);

  const generate = useCallback(async (finalPrompt: string) => {
    setPhase("generating");
    setGeneratedCode("");
    setError(null);
    abortRef.current = new AbortController();

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
        throw new Error(
          "The generated app was too large and got cut off before finishing. Try a simpler request, or ask for fewer features."
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

  function handleExample(ex: string) {
    setPrompt(ex);
    generate(ex);
  }

  function handleNewApp() {
    abortRef.current?.abort();
    setPhase("prd");
    setPrdStep(0);
    setPrdAnswers([]);
    setPrdInput("");
    setGeneratedCode("");
    setPrompt("");
    setShowLearningPanel(false);
    setError(null);
  }

  const progress = ((prdStep + 1) / 3) * 100;

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold">V</div>
            <span className="font-bold text-white text-sm">VibePath</span>
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 text-sm">Builder</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/learn" className="text-xs text-gray-400 hover:text-white transition-colors font-medium">Go to Learning →</Link>
          {phase === "done" && (
            <button onClick={handleNewApp} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">+ New App</button>
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 flex flex-col p-4 gap-4 overflow-y-auto hidden lg:flex">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Examples</p>
            <div className="space-y-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 transition-colors leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* PRD Builder */}
          {phase === "prd" && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
              <div className="w-full max-w-lg">
                {/* Progress */}
                <div className="flex items-center gap-2 mb-8">
                  <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums">{prdStep + 1}/3</span>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Step {prdStep + 1}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6">{PRD_QUESTIONS[prdStep].q}</h2>

                <textarea
                  ref={prdInputRef}
                  value={prdInput}
                  onChange={(e) => setPrdInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePrdNext(); }}
                  placeholder={PRD_QUESTIONS[prdStep].placeholder}
                  rows={3}
                  className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors mb-4"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">⌘ + Enter to continue</span>
                  <button
                    onClick={handlePrdNext}
                    disabled={!prdInput.trim()}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all"
                  >
                    {prdStep < 2 ? "Next →" : "Generate App ✨"}
                  </button>
                </div>

                {/* Previous answers */}
                {prdAnswers.length > 0 && (
                  <div className="mt-8 space-y-3">
                    {prdAnswers.map((ans, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
                        <span className="text-gray-500">{ans}</span>
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
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-gray-900/50 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-semibold text-white">Generating your app…</span>
                    <span className="text-xs text-gray-500 ml-auto tabular-nums">{generatedCode.length.toLocaleString()} chars</span>
                  </div>
                  <pre ref={generatingCodeRef} className="flex-1 overflow-auto p-4 text-xs text-gray-300 font-mono leading-relaxed bg-gray-950">
                    <code>{generatedCode}</code>
                  </pre>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-2xl animate-pulse">⚡</div>
                  <p className="text-white font-semibold">Generating your app…</p>
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
              <p className="text-white font-semibold">Generation failed</p>
              <p className="text-gray-500 text-sm max-w-sm">{error}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleNewApp}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors font-medium"
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
              <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-gray-900/50">
                {(["preview", "code"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors capitalize ${
                      activeTab === t ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >{t}</button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  {copied ? "Copied!" : "Copy code"}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "preview" && (
                  <iframe
                    srcDoc={PREVIEW_STORAGE_SHIM + addCrossOriginToExternalScripts(generatedCode)}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title="Generated App Preview"
                  />
                )}
                {activeTab === "code" && (
                  <pre className="h-full overflow-auto p-4 text-xs text-gray-300 font-mono leading-relaxed bg-gray-950">
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
    </div>
  );
}
