# VibePath

Build apps with AI, learn what was built, master coding fundamentals.

VibePath pairs an instant AI app builder with a structured coding curriculum, so
generating something with AI and actually understanding it aren't two separate
skills.

## What it does

- **Builder** (`/build`) — describe an app in plain language and Claude
  (`claude-sonnet-4-6`) streams back a complete, self-contained HTML file
  (React + Tailwind + Babel, all via CDN) that renders instantly in the
  browser. Preview it, copy the code, ship it.
- **Learn** (`/learn`) — a structured curriculum of lessons, quizzes,
  challenges, and reviews across JavaScript and Python fundamentals, with
  XP and coin rewards and per-user progress tracking.
- **Explain** — takes what the builder just generated and turns it into a
  lesson on the concepts actually used, connecting the "build" and "learn"
  paths.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) for app
  generation
- [Supabase](https://supabase.com/) (`@supabase/ssr`) for auth, lesson
  content, and progress storage
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
