# Supabase schema notes

The initial Cletus Tech Workspace schema has been applied directly to the dedicated Supabase project `hibbcjkgppblkgvftawl`.

It includes ten owner-scoped public tables:

- profiles
- projects
- ai_providers
- provider_accounts
- production_jobs
- production_steps
- scenes
- assets
- prompt_revisions
- activity_events

Row Level Security is enabled on every table. A private `workspace-assets` Storage bucket is created with owner-folder access policies. Provider account records intentionally contain connection metadata only; never store provider passwords or raw API secrets in these tables.

The schema was applied and verified through Supabase. A versioned migration export should be generated from the live database before future schema changes are introduced, so migration history remains consistent with the live project.
