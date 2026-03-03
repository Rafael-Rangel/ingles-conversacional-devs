-- Levels (content global - read by all)
create table if not exists public.levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('A1','A2','B1','B2','C1')),
  name text not null,
  "order" int not null default 0
);

alter table public.levels enable row level security;

create policy "levels_select" on public.levels for select using (true);

-- Modules (content global)
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  title text not null,
  "order" int not null default 0
);

alter table public.modules enable row level security;

create policy "modules_select" on public.modules for select using (true);

-- Lessons (content global)
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  context text not null,
  learning_goals jsonb not null default '[]',
  grammar_focus text,
  vocabulary_tags jsonb default '[]',
  "order" int not null default 0
);

alter table public.lessons enable row level security;

create policy "lessons_select" on public.lessons for select using (true);

-- Profiles (per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  level_cefr text check (level_cefr is null or level_cefr in ('A1','A2','B1','B2','C1')),
  created_at timestamptz not null default now(),
  settings jsonb default '{}'
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Conversations (per user)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  message_count int not null default 0,
  completed boolean not null default false
);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations for update using (auth.uid() = user_id);

-- Messages (via conversation ownership)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('teacher','student')),
  content text not null,
  correction_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select_own" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()));
create policy "messages_insert_own" on public.messages for insert
  with check (exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()));

-- User lesson progress
create table if not exists public.user_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  completed_at timestamptz,
  xp_earned int not null default 0,
  primary key (user_id, lesson_id)
);

alter table public.user_lesson_progress enable row level security;

create policy "progress_select_own" on public.user_lesson_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.user_lesson_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.user_lesson_progress for update using (auth.uid() = user_id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
