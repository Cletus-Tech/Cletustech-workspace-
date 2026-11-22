-- Syntax Studio core learning schema
-- First applied to the linked Supabase project on 2026-11-22.
create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Learner',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$')
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  language text not null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  estimated_hours numeric(6,1),
  thumbnail_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  unique(course_id, slug),
  unique(course_id, sort_order)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  mastery_threshold integer not null default 80 check (mastery_threshold between 1 and 100),
  unique(module_id, slug),
  unique(module_id, sort_order)
);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_type text not null check (block_type in ('text','code','image','diagram','callout','video','worked_example','reflection')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(lesson_id, sort_order)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  instructions text not null,
  starter_code text,
  language text not null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  points integer not null default 100 check (points > 0),
  sort_order integer not null default 0,
  is_published boolean not null default false
);

create table public.exercise_test_cases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  input_data jsonb not null default '{}'::jsonb,
  expected_output text not null,
  is_hidden boolean not null default true,
  sort_order integer not null default 0
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  source_code text not null,
  language text not null,
  status text not null default 'queued' check (status in ('queued','running','passed','failed','error')),
  score integer check (score is null or score between 0 and 100),
  passed_tests integer not null default 0,
  total_tests integer not null default 0,
  execution_ms integer,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','mastered')),
  best_score integer check (best_score is null or best_score between 0 and 100),
  attempts integer not null default 0,
  started_at timestamptz,
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, source_type, source_id, reason)
);

create table public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','platinum','diamond')),
  icon_key text,
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  primary key(user_id, achievement_id)
);

create index submissions_user_created_idx on public.submissions(user_id, created_at desc);
create index xp_ledger_user_created_idx on public.xp_ledger(user_id, created_at desc);
create index lessons_module_sort_idx on public.lessons(module_id, sort_order);
create index modules_course_sort_idx on public.course_modules(course_id, sort_order);

create or replace function app_private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Learner'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function app_private.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_test_cases enable row level security;
alter table public.submissions enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

create policy "Profiles are viewable by authenticated learners" on public.profiles
for select to authenticated using (true);
create policy "Learners can update their own profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Published courses are readable" on public.courses
for select to anon, authenticated using (is_published = true);
create policy "Published modules are readable" on public.course_modules
for select to anon, authenticated using (
  is_published = true and exists (select 1 from public.courses c where c.id = course_id and c.is_published = true)
);
create policy "Published lessons are readable" on public.lessons
for select to anon, authenticated using (
  is_published = true and exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = module_id and m.is_published = true and c.is_published = true
  )
);
create policy "Published lesson blocks are readable" on public.lesson_blocks
for select to anon, authenticated using (
  exists (
    select 1 from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = lesson_id and l.is_published = true and m.is_published = true and c.is_published = true
  )
);
create policy "Published exercises are readable" on public.exercises
for select to authenticated using (
  is_published = true and exists (
    select 1 from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = lesson_id and l.is_published = true and m.is_published = true and c.is_published = true
  )
);
create policy "Learners can read their own submissions" on public.submissions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Learners can create their own submissions" on public.submissions
for insert to authenticated with check (
  (select auth.uid()) = user_id and status = 'queued' and score is null and passed_tests = 0 and total_tests = 0
);
create policy "Learners can read their own progress" on public.lesson_progress
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Learners can read their own XP ledger" on public.xp_ledger
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Active achievements are visible" on public.achievement_definitions
for select to authenticated using (is_active = true);
create policy "Learners can read their own awards" on public.user_achievements
for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.courses, public.course_modules, public.lessons, public.lesson_blocks to anon, authenticated;
grant select on public.profiles, public.exercises, public.submissions, public.lesson_progress, public.xp_ledger, public.achievement_definitions, public.user_achievements to authenticated;
grant insert on public.submissions to authenticated;
grant update (display_name, username, avatar_url, bio, updated_at) on public.profiles to authenticated;
