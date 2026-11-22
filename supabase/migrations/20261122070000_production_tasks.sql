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

-- Keep this migration safe when an earlier partial version of the table exists.
alter table public.production_tasks
  add column if not exists manifest_id uuid not null default gen_random_uuid();

create index if not exists production_tasks_owner_project_idx
  on public.production_tasks(owner_id, project_id, created_at);
create index if not exists production_tasks_worker_queue_idx
  on public.production_tasks(status, available_at, created_at)
  where status in ('ready_for_worker','queued','failed');
create index if not exists production_tasks_job_idx
  on public.production_tasks(job_id, status);
create index if not exists production_tasks_manifest_idx
  on public.production_tasks(project_id, manifest_id, created_at);
create index if not exists production_tasks_result_asset_idx
  on public.production_tasks(result_asset_id)
  where result_asset_id is not null;

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
    and status = 'blocked_by_adapter'
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

-- Queue state is system-controlled. Browser clients may read and create
-- blocked planning records, but cannot claim, complete, retry, or erase work.
drop policy if exists "Owners can update their production tasks" on public.production_tasks;
drop policy if exists "Owners can delete their production tasks" on public.production_tasks;
revoke all privileges on public.production_tasks from authenticated;
grant select, insert on public.production_tasks to authenticated;


-- Trusted worker lease protocol. Browser clients cannot call these functions;
-- only the server-side service_role may claim or mutate execution state.
alter table public.production_tasks
  add column if not exists worker_id text,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

create index if not exists production_tasks_lease_idx
  on public.production_tasks(status, lease_expires_at)
  where status = 'running';

create or replace function public.claim_production_tasks(
  p_worker_id text,
  p_limit integer default 1,
  p_lease_seconds integer default 120
)
returns setof public.production_tasks
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 or length(p_worker_id) > 120 then
    raise exception 'A valid worker identifier is required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10 then
    raise exception 'Claim limit must be between 1 and 10';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 300 then
    raise exception 'Lease duration must be between 30 and 300 seconds';
  end if;

  update public.production_tasks
  set status = 'failed',
      last_error = coalesce(last_error, 'Worker lease expired after the final allowed attempt.'),
      worker_id = null,
      lease_expires_at = null,
      heartbeat_at = null,
      updated_at = now()
  where status = 'running'
    and lease_expires_at <= now()
    and attempts >= max_attempts;

  return query
  with candidates as (
    select id
    from public.production_tasks
    where available_at <= now()
      and (
        status in ('ready_for_worker', 'queued')
        or (status = 'running' and lease_expires_at <= now() and attempts < max_attempts)
      )
    order by available_at asc, created_at asc
    for update skip locked
    limit p_limit
  )
  update public.production_tasks as task
  set status = 'running',
      worker_id = p_worker_id,
      claimed_at = now(),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempts = task.attempts + 1,
      updated_at = now()
  from candidates
  where task.id = candidates.id
  returning task.*;
end;
$$;

create or replace function public.heartbeat_production_task(
  p_task_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 300 then
    raise exception 'Lease duration must be between 30 and 300 seconds';
  end if;
  update public.production_tasks
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  where id = p_task_id
    and worker_id = p_worker_id
    and status = 'running'
    and lease_expires_at > now();
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.complete_production_task(
  p_task_id uuid,
  p_worker_id text,
  p_provider_job_id text default null,
  p_result_asset_id uuid default null
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  update public.production_tasks
  set status = 'succeeded',
      provider_job_id = p_provider_job_id,
      result_asset_id = p_result_asset_id,
      completed_at = now(),
      worker_id = null,
      heartbeat_at = null,
      lease_expires_at = null,
      last_error = null,
      updated_at = now()
  where id = p_task_id
    and worker_id = p_worker_id
    and status = 'running'
    and lease_expires_at > now();
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.fail_production_task(
  p_task_id uuid,
  p_worker_id text,
  p_error text,
  p_retry_delay_seconds integer default 30
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  update public.production_tasks
  set status = case when attempts < max_attempts then 'queued' else 'failed' end,
      last_error = left(coalesce(nullif(trim(p_error), ''), 'Worker reported an unspecified task failure.'), 2000),
      available_at = case
        when attempts < max_attempts
          then now() + make_interval(secs => greatest(5, least(coalesce(p_retry_delay_seconds, 30), 3600)))
        else available_at
      end,
      worker_id = null,
      heartbeat_at = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_task_id
    and worker_id = p_worker_id
    and status = 'running'
    and lease_expires_at > now();
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.claim_production_tasks(text, integer, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_production_task(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_production_task(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.fail_production_task(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_production_tasks(text, integer, integer) to service_role;
grant execute on function public.heartbeat_production_task(uuid, text, integer) to service_role;
grant execute on function public.complete_production_task(uuid, text, text, uuid) to service_role;
grant execute on function public.fail_production_task(uuid, text, text, integer) to service_role;
