# Production Director Edge Function

This authenticated function builds a provider-routing assessment for an approved production.

## Requirements

The project must have an approved screenplay, storyboard, continuity bible and audio plan.

## What it checks

- Enabled provider records in `ai_providers`.
- Provider categories: image, video, voice, music and editing.
- Provider-level connection status.
- Linked account profiles and their connection status.
- Default-provider preference and registered alternatives.

It reads provider records through the caller's Supabase client, so Row Level Security remains active. It never reads or returns raw API keys, passwords, cookies or secret values.

## Important execution boundary

This function does **not** call third-party providers or generate media. It creates a transparent routing assessment and labels each department as one of:

- `provider_not_registered`
- `provider_account_required`
- `account_connection_required`
- `account_marked_connected_adapter_missing`

Even when a provider and account are marked connected, the route is not executable until a supported provider adapter has been implemented and tested. The response always sets `execution_ready: false` for this milestone.

## Client invocation

```ts
supabase.functions.invoke("production-director", {
  body: { project_id: project.id, action: "plan" }
});
```

The function requires a valid user JWT. It saves the assessment to `projects.metadata.production_route` and the `production_director` production step. The user can approve the assessment, but generation remains paused until adapters are available.
