"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { useTutorStore } from "@/lib/tutor/store";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Convo {
  id: string;
  title: string;
  context_label: string | null;
  updated_at: string;
}

const CONTEXT_LABEL: Record<string, string> = {
  build: "App Builder",
  lesson: "Lesson",
  learn: "Curriculum",
  practice: "Practice",
  journey: "Journey",
  generic: "",
};

const SUGGESTIONS: Record<string, string[]> = {
  build: ["Explain the code in my preview", "What does this JavaScript do?", "How would I add a dark mode toggle?"],
  lesson: ["Explain this a different way", "Give me another example", "Quiz me on this"],
  practice: ["I'm stuck — give me a hint", "Why is my answer wrong?", "Explain the concept behind this"],
  learn: ["What should I learn first?", "What's the difference between HTML and CSS?", "How long until I can build my own app?"],
  journey: ["What should I focus on next?", "Explain where I am in the journey"],
  generic: ["How do I start learning to code?", "What's a variable?", "Explain functions simply"],
};

/** Split assistant text into prose / fenced-code segments for light rendering. */
function renderContent(text: string) {
  const parts = text.split(/```/);
  return parts.map((seg, i) => {
    if (i % 2 === 1) {
      const body = seg.replace(/^[a-zA-Z0-9]*\n/, "");
      return (
        <pre key={i} className="my-1.5 overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-950 border border-black/10 dark:border-white/10 p-2.5 text-[11px] leading-relaxed font-mono text-gray-800 dark:text-gray-200">
          <code>{body}</code>
        </pre>
      );
    }
    const withCode = seg.split(/(`[^`]+`)/).map((piece, j) =>
      piece.startsWith("`") && piece.endsWith("`") ? (
        <code key={j} className="rounded bg-black/5 dark:bg-white/10 px-1 py-0.5 text-[0.85em] font-mono">{piece.slice(1, -1)}</code>
      ) : (
        <span key={j}>{piece}</span>
      )
    );
    return (
      <span key={i} className="whitespace-pre-wrap">{withCode}</span>
    );
  });
}

export default function TutorWidget() {
  const open = useTutorStore((s) => s.open);
  const setOpen = useTutorStore((s) => s.setOpen);
  const context = useTutorStore((s) => s.context);

  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const supabase = useCallback(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  // Load history when the panel opens.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const sb = supabase();
    if (!sb) return;
    sb.from("tutor_conversations")
      .select("id, title, context_label, updated_at")
      .eq("device_id", getDeviceId())
      .order("updated_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setConvos(data as Convo[]);
      }, () => {});
  }, [open, supabase, convoId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  async function persist(next: Msg[], idOverride?: string | null) {
    const sb = supabase();
    if (!sb) return;
    const id = idOverride ?? convoId;
    const title = next.find((m) => m.role === "user")?.content.slice(0, 60) || "New chat";
    if (id) {
      await sb.from("tutor_conversations")
        .update({ messages: next, updated_at: new Date().toISOString() })
        .eq("id", id);
    } else {
      const { data } = await sb.from("tutor_conversations")
        .insert({ device_id: getDeviceId(), title, context_label: CONTEXT_LABEL[context.kind] || null, messages: next })
        .select("id")
        .single();
      if (data?.id) setConvoId(data.id as string);
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || streaming) return;
    setInput("");
    const base = [...messages, { role: "user" as const, content: clean }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: base, context }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "The tutor is unavailable right now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setMessages([...base, { role: "assistant", content: acc }]);
      }
      const final = [...base, { role: "assistant" as const, content: acc || "…" }];
      setMessages(final);
      persist(final);
    } catch (err) {
      setMessages([
        ...base,
        { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function newChat() {
    setMessages([]);
    setConvoId(null);
    setView("chat");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function loadConvo(id: string) {
    const sb = supabase();
    if (!sb) return;
    const { data } = await sb.from("tutor_conversations").select("messages").eq("id", id).single();
    if (data) {
      setMessages((data.messages as Msg[]) ?? []);
      setConvoId(id);
      setView("chat");
    }
  }

  const label = CONTEXT_LABEL[context.kind];
  const suggestions = SUGGESTIONS[context.kind] ?? SUGGESTIONS.generic;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open the tutor"
        data-tour="tutor"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 hover:scale-[1.03] active:scale-95 transition-all px-4 py-3 text-sm font-bold"
      >
        <span className="text-base leading-none">🎓</span>
        Tutor
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-0 sm:right-0 sm:top-0 flex">
      <button
        aria-label="Close the tutor"
        onClick={() => setOpen(false)}
        className="hidden sm:block flex-1 bg-black/20 backdrop-blur-[1px]"
      />
      <div className="flex h-full w-full sm:w-[400px] flex-col bg-white dark:bg-gray-950 border-l border-black/10 dark:border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/5">
          <span className="text-base">🎓</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Tutor</p>
            {label && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{context.title ? `${label} · ${context.title}` : label}</p>}
          </div>
          <button
            onClick={() => setView(view === "history" ? "chat" : "history")}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >{view === "history" ? "Back" : "History"}</button>
          <button
            onClick={newChat}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >New</button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-lg leading-none"
          >×</button>
        </div>

        {view === "history" ? (
          <div className="flex-1 overflow-y-auto p-2">
            {convos.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-10">No saved conversations yet.</p>
            ) : (
              convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConvo(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    c.id === convoId ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.title}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                    {c.context_label ? `${c.context_label} · ` : ""}
                    {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="pt-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">Hi! I&apos;m your tutor.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Ask me anything about {label ? label.toLowerCase() : "what you're learning"} — concepts, errors, or where to go next.
                  </p>
                  <div className="space-y-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="w-full text-left text-xs text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] rounded-lg px-3 py-2 transition-colors"
                      >{s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                          : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                      }`}
                    >
                      {m.content === "" && streaming && i === messages.length - 1 ? (
                        <span className="inline-flex gap-1 py-1">
                          {[0, 1, 2].map((d) => (
                            <span key={d} className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                          ))}
                        </span>
                      ) : m.role === "assistant" ? (
                        renderContent(m.content)
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-black/5 dark:border-white/5 p-3">
              <div className="flex items-end gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-900 px-3 py-2 focus-within:border-violet-500/50 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask the tutor…"
                  className="flex-1 resize-none bg-transparent text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none max-h-28"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className="text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 disabled:opacity-40 rounded-lg px-3 py-1.5 transition-opacity flex-shrink-0"
                >Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
