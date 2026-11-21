# Cletus Tech Workspace

A professional, free-first AI production workspace for planning and coordinating creative projects from the first brief through final delivery.

## Product direction

This is a web application, not a marketing website or a directory of AI links. Its long-term workflow is:

1. Creative direction and production brief
2. Script development and storyboard
3. Character, location and visual references
4. Video generation through interchangeable providers
5. Voice, dialogue, music and sound design
6. Editing, captions, review and export
7. Project archive with prompts and source assets

Provider connections are modular. A provider is only marked connected after its supported API or approved connection flow has been verified. A website URL alone does not grant programmatic control.

## Technology

- Next.js 16 App Router + TypeScript
- Supabase Postgres, Auth and Storage
- GitHub as the source of truth
- Optional provider APIs and approved browser-assisted workflows
- FFmpeg for media assembly where execution resources permit

Vercel hosting is intentionally deferred until the local application foundation is ready.

## Local development

Requirements: Node.js 22 LTS or newer, npm, and Git.

```bash
git clone https://github.com/Cletus-Tech/Cletustech-workspace-.git
cd Cletustech-workspace-
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Add the Supabase project URL and publishable key to `.env.local` when the database integration is enabled. Never place a Supabase secret/service-role key in browser code or commit credentials to Git.

## Engineering principles

- One main branch; small, understandable commits.
- No fake connected states, fake job progress, or fake exports.
- Save project context and each production stage independently.
- Retry failed scenes or tasks without restarting an entire production.
- Keep provider credentials out of Git and out of client-side storage.
- Respect provider terms, quotas and account restrictions.
- Design for a free-first start, with optional upgrades later.

## Current milestone

Milestone 1: professional dashboard shell and application foundation. Project persistence, authentication, provider registry and production workflows are the next implementation steps.