-- Run this once in the Supabase SQL editor for this project.
-- Adds the table VibePath needs to persist lesson/quiz/challenge completion.
--
-- There is no login flow in VibePath yet: "the user" is a random UUID
-- generated client-side and stored in localStorage (see lib/deviceId.ts).
-- Because of that, RLS here can't verify who owns a device_id the way it
-- could with Supabase Auth + auth.uid() -- it only checks that the anon
-- key is being used. Anyone holding a device_id could read/write that
-- device's rows. That's an accepted tradeoff for skipping a login UI:
-- device_id is an unguessable random UUID, not a private-by-construction
-- identity. Revisit if progress data ever needs to be treated as sensitive
-- or synced across devices/accounts.

create extension if not exists pgcrypto;

create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default true,
  score int,
  completed_at timestamptz not null default now(),
  unique (device_id, lesson_id)
);

create index if not exists user_progress_device_id_idx on user_progress (device_id);

alter table user_progress enable row level security;

create policy "anon can read/write progress"
  on user_progress
  for all
  to anon
  using (true)
  with check (true);
