-- Run this once in the Supabase SQL editor for this project.
-- Adds a new standalone "Product" category to the Learn curriculum,
-- separate from the language tracks (JS/Python/etc), covering the two
-- skills the Builder itself exercises: writing a PRD and scoping an MVP.
--
-- Assumes the languages/units/lessons tables already exist with the shape
-- in lib/content/types.ts (this repo doesn't have a migration for them —
-- they were seeded directly, per the README's "16 JS modules / 11 Python
-- units" claim). This only inserts rows, it doesn't create tables.
--
-- display_order for the new language is set to 100 so it's appended after
-- existing tracks without disturbing their ordering. Adjust if you already
-- have something at that order.

do $$
declare
  product_lang_id uuid;
  prd_unit_id uuid;
  mvp_unit_id uuid;
begin
  insert into languages (name, slug, color, icon, display_order, description)
  values (
    'Product',
    'product',
    '#f59e0b',
    '🧭',
    100,
    'How to scope an idea before you build it — from a one-paragraph PRD to a shippable MVP.'
  )
  returning id into product_lang_id;

  insert into units (language_id, title, display_order, color, description)
  values (
    product_lang_id,
    'Writing a PRD',
    1,
    '#f59e0b',
    'Turn a vague idea into a one-paragraph PRD: what it does, who it''s for, and the core features it needs first.'
  )
  returning id into prd_unit_id;

  insert into units (language_id, title, display_order, color, description)
  values (
    product_lang_id,
    'Building an MVP',
    2,
    '#f59e0b',
    'Scope the smallest version of your idea that''s actually worth building — and ship it.'
  )
  returning id into mvp_unit_id;

  insert into lessons (unit_id, title, type, content_json, display_order, xp_reward, coin_reward)
  values
  (
    prd_unit_id,
    'How to Write a PRD',
    'lesson',
    $json$
    {
      "cards": [
        {
          "title": "What is a PRD?",
          "body": "A PRD — Product Requirements Document — answers three questions before you write a line of code: what does this solve, who is it for, and what must it do first. It doesn't need to be long. A single paragraph that answers all three beats a blank page and a vague idea."
        },
        {
          "title": "Start with the problem, not the feature list",
          "body": "\"I want a todo app\" is a feature. \"People lose track of what to do next because sticky notes pile up\" is a problem. Naming the problem first keeps you from building things nobody actually needs — including features that sound cool but don't solve anything."
        },
        {
          "title": "Name a real user",
          "body": "\"Everyone\" is not an audience. \"Freelancers juggling five clients\" is. A specific audience tells you what to prioritize — a freelancer cares about client tags, a student cares about due dates. The same todo app looks different depending on who it's for."
        },
        {
          "title": "Cut ruthlessly to core features",
          "body": "List only what the user needs on day one to get value — not the things that are nice to have. If you can't explain why a feature belongs in v1, it doesn't. Everything else goes on a later-list, not the PRD."
        },
        {
          "title": "This is exactly what the Builder does",
          "body": "VibePath's app builder asks you these same three questions before generating anything: what it does, who it's for, and the core features. That's not a coincidence — it's a PRD, compressed into 3 prompts.",
          "code": "function compilePRD(answers) {\n  return `Build an app that: ${answers[0]}.\nTarget users: ${answers[1]}.\nCore features: ${answers[2]}.`;\n}",
          "language": "javascript"
        }
      ]
    }
    $json$::jsonb,
    1, 15, 5
  ),
  (
    prd_unit_id,
    'PRD Quiz',
    'quiz',
    $json$
    {
      "questions": [
        {
          "question": "What's the first thing a good PRD should identify?",
          "options": ["The tech stack", "The problem being solved", "The app's name", "The launch date"],
          "correct": 1,
          "explanation": "Naming the problem first keeps every later decision — features, priorities, design — anchored to something real."
        },
        {
          "question": "Why does naming a specific audience matter?",
          "options": ["It's required for legal reasons", "It has no real effect on the product", "It determines which features actually matter", "It only matters for marketing"],
          "correct": 2,
          "explanation": "\"Freelancers\" and \"students\" would prioritize completely different features in the same todo app — a vague audience gives you no way to decide what matters."
        },
        {
          "question": "\"A todo app with categories, priorities, recurring tasks, calendar sync, and team sharing\" is an example of:",
          "options": ["A well-scoped PRD", "A feature list without prioritization", "An MVP", "A problem statement"],
          "correct": 1,
          "explanation": "This lists a lot of features but never says what a v1 actually needs — that's a wish list, not a PRD."
        },
        {
          "question": "In VibePath's Builder, which 3 PRD questions get compiled into the generation prompt?",
          "options": ["Budget, timeline, team size", "What it does, who it's for, core features", "Tech stack, hosting, database", "App name, color scheme, logo"],
          "correct": 1,
          "explanation": "Those three answers get compiled directly into the prompt sent to Claude — literally a PRD in miniature."
        },
        {
          "question": "A one-paragraph PRD is:",
          "options": ["Too short to be useful", "Better than a vague idea with no PRD at all", "Only acceptable for hobby projects", "The same thing as a project name"],
          "correct": 1,
          "explanation": "Length isn't the point — clarity is. A short PRD that actually answers what/who/core-features beats a long doc that doesn't."
        }
      ]
    }
    $json$::jsonb,
    2, 20, 8
  ),
  (
    prd_unit_id,
    'Write Your Own PRD',
    'challenge',
    $json$
    {
      "description": "Write a 3-part PRD for an app idea of your own.",
      "instructions": "Using the same structure the Builder uses, write: (1) what the app does, in one sentence, (2) who it's for, specifically, (3) the 3 core features it needs on day one — nothing more. Keep it to a few sentences total.",
      "starterCode": "1. What it does:\n\n\n2. Who it's for:\n\n\n3. Core features:\n- \n- \n- ",
      "language": "text",
      "testCases": [],
      "hints": [
        "Say the problem, not just the feature, in part 1",
        "Name a specific type of user in part 2 — not \"everyone\"",
        "If a feature in part 3 isn't needed for day one, cut it"
      ]
    }
    $json$::jsonb,
    3, 30, 12
  ),
  (
    mvp_unit_id,
    'How to Build an MVP',
    'lesson',
    $json$
    {
      "cards": [
        {
          "title": "MVP doesn't mean 'bad version'",
          "body": "MVP — Minimum Viable Product — is the smallest thing you can build that actually delivers value and lets you learn from real use. \"Minimum\" refers to scope, not quality. A one-feature app that works beats a ten-feature app that's half-broken."
        },
        {
          "title": "Ship the core loop first",
          "body": "Every app has one loop that makes it useful — for a todo app, that's add a task, see it, mark it done. Everything else (categories, themes, reminders) is decoration until that loop works end to end."
        },
        {
          "title": "Real fake data beats empty screens",
          "body": "An MVP with three realistic sample tasks tells you more about whether the idea works than an MVP that opens to a blank list. This is why the Builder's system prompt asks Claude for realistic sample data in every generated app.",
          "code": "- Include realistic sample data",
          "language": "text"
        },
        {
          "title": "Cut scope, not quality",
          "body": "When a feature feels too big to ship now, the answer isn't to build it badly — it's to leave it out of this version entirely and ship the smaller thing well."
        },
        {
          "title": "Generate → Preview → Learn",
          "body": "The Builder's whole loop is an MVP loop compressed to seconds: describe the smallest useful version, get something real and running, look at it, decide what's next. That's the same cycle behind any real product — just faster."
        }
      ]
    }
    $json$::jsonb,
    1, 15, 5
  ),
  (
    mvp_unit_id,
    'MVP Quiz',
    'quiz',
    $json$
    {
      "questions": [
        {
          "question": "What does the \"M\" in MVP actually refer to?",
          "options": ["Modern", "Minimum scope, not minimum quality", "Multiple versions", "Manual testing"],
          "correct": 1,
          "explanation": "MVP means the smallest scope that still delivers real value — not a low-quality first draft."
        },
        {
          "question": "A todo app's \"core loop\" is:",
          "options": ["Categories, tags, and priority levels", "Add a task, see it, mark it done", "Calendar sync and reminders", "Dark mode and themes"],
          "correct": 1,
          "explanation": "The core loop is the minimum cycle that makes the app useful at all — everything else builds on top of it once it works."
        },
        {
          "question": "Why does an MVP benefit from realistic sample data instead of an empty state?",
          "options": ["It's required by app stores", "It makes the file size smaller", "It shows what the app actually feels like in use", "It's faster to code"],
          "correct": 2,
          "explanation": "An empty list tells you nothing about whether the idea works — a few realistic examples let you (and anyone testing it) actually evaluate the experience."
        },
        {
          "question": "You're building an MVP and a feature feels too big to finish today. What's the right move?",
          "options": ["Build a rushed, buggy version of it", "Leave it out of this version and ship the rest well", "Delay the whole launch until it's done", "Add it as a placeholder button that does nothing"],
          "correct": 1,
          "explanation": "Cut scope, not quality — a smaller working version beats a bigger broken one."
        },
        {
          "question": "How does VibePath's Builder mirror the MVP process?",
          "options": ["It only builds mobile apps", "It requires a paid plan for MVPs", "It generates a small, working, realistic version fast, ready to look at and iterate on", "It skips the preview step entirely"],
          "correct": 2,
          "explanation": "Describe the smallest useful version → get something real and running → look at it → decide what's next — the same loop as any MVP process, just compressed to seconds."
        }
      ]
    }
    $json$::jsonb,
    2, 20, 8
  ),
  (
    mvp_unit_id,
    'Scope Your MVP',
    'challenge',
    $json$
    {
      "description": "Scope an MVP for the app idea from your PRD.",
      "instructions": "Take the app idea from the PRD challenge. List the ONE core loop it needs (the minimum cycle that makes it useful), then list 2-3 things you're deliberately leaving OUT of this version — and why.",
      "starterCode": "Core loop:\n\n\nLeaving out for now:\n- (feature) — why:\n- (feature) — why:",
      "language": "text",
      "testCases": [],
      "hints": [
        "The core loop should be a single sentence — if it needs \"and\" three times, it's not minimal yet",
        "\"Leaving out\" isn't a weakness — it's a sign you scoped correctly",
        "A good reason to cut something is \"it's not needed to prove the idea works\""
      ]
    }
    $json$::jsonb,
    3, 30, 12
  );
end $$;
