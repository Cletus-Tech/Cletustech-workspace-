# Production Runner — Generation Manifest Planner

This Edge Function prepares a durable scene-and-shot task manifest after all creative and routing approvals are recorded.

## Request

Authenticated POST to `/functions/v1/production-runner`:

```json
{
  "project_id": "project-uuid",
  "action": "prepare"
}
```

The function uses the caller's JWT and caller-scoped Supabase client. It only reads and writes rows visible to that caller through RLS.

## Preconditions

- Approved screenplay
- Approved storyboard
- Approved continuity bible
- Approved audio plan
- Approved Production Director routing plan
- A valid storyboard with 1–40 scenes and 1–8 shots per scene

## Output

The function persists `projects.metadata.generation_manifest`, copies it to the existing `generation` production step, and inserts private, owner-scoped rows into `public.production_tasks` in batches of 100. Every planning pass receives a manifest UUID; each task key is unique within that manifest. Each scene shot gets:
- an image-reference task
- a video-clip task
- stable task key (idempotency key within its manifest)
- durable queue row linked to its project and production job
- retry metadata (attempt count 0, maximum 2)
- a truthful readiness state

Where relevant, narration, dialogue, music, sound-effect and ambience cues are also represented as tasks. Department readiness is derived from an explicit adapter verification signal; a provider account marked connected is not sufficient.

## Safety and current limitations

- This is manifest preparation only. It does not call providers or generate media.
- Tasks remain `blocked_by_adapter` until a provider-specific adapter is implemented and explicitly verified.
- The function does not mark scenes as generating/generated.
- A separate worker is still required to claim tasks, apply retries, store assets and report progress.
- Heavy video generation and FFmpeg assembly should run in a worker/compute service, not inside this Edge Function.

## Secrets

No provider secret is read from the database or returned to the client. Provider credentials belong in secure Edge Function secrets or a dedicated secret manager.

## Trusted worker lease protocol

The database migration also installs the control-plane primitives for a separately hosted worker:

- `claim_production_tasks(worker_id, limit, lease_seconds)` atomically claims eligible tasks with row locking and `SKIP LOCKED`. Claims are limited to 1–10 tasks and 30–300 second leases.
- `heartbeat_production_task(task_id, worker_id, lease_seconds)` extends only the current worker's unexpired lease.
- `complete_production_task(task_id, worker_id, provider_job_id, result_asset_id)` accepts completion only from the current worker while its lease is valid.
- `fail_production_task(task_id, worker_id, error, retry_delay_seconds)` records a bounded error and schedules a retry while attempts remain; otherwise it marks the task failed.
- Expired leases can be reclaimed by another worker. Tasks at their retry limit are marked failed instead of being reclaimed.

These RPCs are revoked from `PUBLIC`, `anon`, and `authenticated`, and executable only by `service_role`. Keep the service-role key exclusively in the trusted worker's server-side secret store. Never put it in Next.js browser variables, project metadata, task payloads, or client code.

The worker itself and provider-specific adapters are **not deployed yet**. No task is currently being claimed or executed. The queue's browser-facing insert policy only permits `blocked_by_adapter` rows; an adapter must be implemented and verified by trusted server-side code before tasks can become eligible for claiming.
