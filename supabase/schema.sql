-- Base schema for the Learn curriculum.
--
-- Historically the languages/units/lessons tables were seeded directly in
-- the Supabase dashboard and never committed, so a fresh project (or a
-- restored-from-pause one that lost its data) had no way to recreate them.
-- This file is that missing migration. Run it once, then user_progress.sql,
-- then any curriculum insert scripts (e.g. product_curriculum.sql).
--
-- Shape matches lib/content/types.ts. Content is public read-only via the
-- anon key; there is no write path from the client for these three tables
-- (curriculum is authored via SQL / the dashboard).

create extension if not exists pgcrypto;

create table if not exists languages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default '#8b5cf6',
  icon text not null default '💻',
  display_order int not null default 0,
  description text not null default ''
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  title text not null,
  display_order int not null default 0,
  color text not null default '#8b5cf6',
  description text not null default ''
);

create index if not exists units_language_id_idx on units (language_id);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  title text not null,
  type text not null check (type in ('lesson', 'quiz', 'challenge', 'review')),
  content_json jsonb not null,
  display_order int not null default 0,
  xp_reward int not null default 0,
  coin_reward int not null default 0
);

create index if not exists lessons_unit_id_idx on lessons (unit_id);

alter table languages enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;

create policy "anon can read languages" on languages for select to anon using (true);
create policy "anon can read units" on units for select to anon using (true);
create policy "anon can read lessons" on lessons for select to anon using (true);
