-- Durable, owner-isolated scene-level production task queue.
-- The queue is populated by production-runner only after all creative and routing approvals.

create table if not exists public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.production_jobs(id) on delete cascade,
  manifest_id uuid not null default gen_random_uuid(),
  task_key text not null,
  task_type text not null,
  department text not null,
  scene_number integer,
  shot_number integer,
  title text not null,
  prompt text not null default '',
  input_payload jsonb not null default '{}'::jsonb,
  status text not null default 'blocked_by_adapter'
    check (status in ('blocked_by_adapter','ready_for_worker','queued','running','succeeded','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 2 check (max_attempts between 1 and 5),
  last_error text,
  provider_job_id text,
  result_asset_id uuid references public.assets(id) on delete set null,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_tasks_project_task_key_unique unique(project_id, task_key)
);

create index if not exists production_tasks_owner_project_idx
  on public.production_tasks(owner_id, project_id, created_at);
create index if not exists production_tasks_worker_queue_idx
  on public.production_tasks(status, available_at, created_at)
  where status in ('ready_for_worker','queued','failed');
create index if not exists production_tasks_job_idx
  on public.production_tasks(job_id, status);
create index if not exists production_tasks_manifest_idx
  on public.production_tasks(project_id, manifest_id, created_at);

alter table public.production_tasks enable row level security;

drop policy if exists "Owners can view their production tasks" on public.production_tasks;
create policy "Owners can view their production tasks"
  on public.production_tasks for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners can create their production tasks" on public.production_tasks;
create policy "Owners can create their production tasks"
  on public.production_tasks for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = production_tasks.project_id and p.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.production_jobs j
      where j.id = production_tasks.job_id
        and j.project_id = production_tasks.project_id
        and j.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can update their production tasks" on public.production_tasks;
create policy "Owners can update their production tasks"
  on public.production_tasks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete their production tasks" on public.production_tasks;
create policy "Owners can delete their production tasks"
  on public.production_tasks for delete to authenticated
  using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.production_tasks to authenticated;
