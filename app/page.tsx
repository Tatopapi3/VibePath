"use client";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-sm font-bold text-white">V</div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight">VibePath</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/build" className="hover:text-gray-900 dark:hover:text-white transition-colors">Builder</Link>
          <Link href="/learn" className="hover:text-gray-900 dark:hover:text-white transition-colors">Learn</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Build it. Learn it. Master it.
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight max-w-3xl leading-tight mb-6">
          Turn ideas into apps.
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Then master the code.
          </span>
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed mb-14">
          Generate any app with AI in seconds, get a lesson on exactly what was built,
          then dive into structured coding fundamentals at your own pace.
        </p>

        {/* Three paths */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          {/* Full Journey */}
          <Link href="/build" className="group relative col-span-1 sm:col-span-1 flex flex-col items-start p-6 rounded-2xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-500/60 transition-all text-left ring-1 ring-violet-500/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-lg mb-4">🚀</div>
            <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Full Journey</div>
            <h3 className="text-base font-bold text-white mb-2">Build + Learn</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Build your app with AI, understand what was created, then master the fundamentals behind it.</p>
            <div className="mt-4 text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">Start building →</div>
          </Link>

          {/* Build only */}
          <Link href="/build" className="group flex flex-col items-start p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-lg mb-4">⚡</div>
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Build Only</div>
            <h3 className="text-base font-bold text-white mb-2">App Builder</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Describe any app and watch Claude generate it instantly. Preview, copy, and ship.</p>
            <div className="mt-4 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">Open builder →</div>
          </Link>

          {/* Learn only */}
          <Link href="/learn" className="group flex flex-col items-start p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg mb-4">🎓</div>
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Learn Only</div>
            <h3 className="text-base font-bold text-white mb-2">Coding Fundamentals</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Structured lessons in JavaScript, Python, and more. Quizzes, challenges, and a full learning path.</p>
            <div className="mt-4 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">Start learning →</div>
          </Link>
        </div>

        {/* Bottom stats */}
        <div className="flex items-center gap-8 mt-14 text-center">
          {[["16", "JS Modules"], ["11", "Python Units"], ["100+", "Lessons & Quizzes"]].map(([num, label]) => (
            <div key={label}>
              <div className="text-2xl font-black text-white">{num}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
