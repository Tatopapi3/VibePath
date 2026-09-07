-- Run once in the Supabase SQL editor. Backs the tutoring chatbot's saved
-- history. One row per conversation; messages are a JSONB array of
-- { role, content } objects. Keyed on device_id (no auth — see
-- lib/deviceId.ts and user_progress.sql for the same tradeoff).

create extension if not exists pgcrypto;

create table if not exists tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  title text not null default 'New chat',
  context_label text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_conversations_device_idx
  on tutor_conversations (device_id, updated_at desc);

alter table tutor_conversations enable row level security;

create policy "anon rw tutor conversations"
  on tutor_conversations for all to anon
  using (true) with check (true);
