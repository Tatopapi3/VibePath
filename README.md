# VibePath — Cycle 1

**Live: [vibepath-olive.vercel.app](https://vibepath-olive.vercel.app)**

![VibePath home page](docs/screenshot.png)

## Problem

AI app builders (v0, bolt.new, Lovable, etc.) can generate a working app from a
prompt in seconds — but they create a learning gap. You get code that works
without understanding *why* it works, which is exactly backwards for anyone
trying to actually get better at building software. There wasn't a tool that
let you use AI generation *and* close that gap in the same sitting.

## What I built

VibePath is a two-sided platform: an instant AI app builder, and a structured
coding curriculum — connected by a feature that turns whatever you just
generated into a lesson on the real concepts behind it.

## Key features

- **Instant AI app generation** — describe an app in plain language; Claude
  (`claude-sonnet-4-6`) streams back a complete, runnable HTML file (React +
  Tailwind, no build step) live in the browser.
- **Concept-linked lessons** — an "Explain" flow takes the app that was just
  generated and produces a lesson on the specific concepts it used, so the
  builder and the curriculum aren't two disconnected products.
- **Structured curriculum independent of the builder** — 16 JavaScript
  modules and 11 Python units, each with lessons, quizzes, and coding
  challenges, for anyone who wants to learn fundamentals without generating
  anything first.
- **Progress and rewards** — XP and coin rewards per completed lesson, with
  per-user progress persisted in Supabase.
- **Three entry points, one journey** — Build + Learn (the full loop), Build
  only, or Learn only, depending on what the user actually came to do.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Anthropic Claude API](https://www.npmjs.com/package/@anthropic-ai/sdk) (streaming)
- [Supabase](https://supabase.com/) (`@supabase/ssr`) — auth, lesson content, progress
- [Zustand](https://zustand.docs.pmnd.rs/) for client state
- [lucide-react](https://lucide.dev/) for icons

## Getting started

Install dependencies and set the required environment variables:

```bash
npm install
```

Create a `.env.local` with:

```bash
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  page.tsx              # Landing page
  build/page.tsx         # AI app builder
  learn/page.tsx         # Curriculum overview
  lesson/[id]/page.tsx    # Individual lesson/quiz/challenge
  api/generate/route.ts   # Streams a generated app from Claude
  api/explain/route.ts    # Turns a generated app into a lesson
components/
  learning/               # Lesson/quiz/challenge UI
  ui/                     # Shared UI (theme toggle, etc.)
lib/
  prompts.ts              # System prompt + example prompts for the builder
  content/types.ts        # Lesson/quiz/challenge/review content types
  supabase/client.ts       # Supabase browser client
```

> Note: `AGENTS.md` in this repo documents that this project pins a
> pre-release Next.js version with breaking API changes from what's in most
> training data — check `node_modules/next/dist/docs/` before assuming
> familiar Next.js conventions apply.
