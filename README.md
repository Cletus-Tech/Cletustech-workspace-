# Cletus Tech Workspace

A professional, free-first AI production web application. The long-term goal is to coordinate the complete workflow from creative brief and script through storyboard, visual generation, audio, editing and final delivery.

## Current capabilities

- Professional dark workspace dashboard
- Supabase email/password sign-up and sign-in
- Email confirmation callback
- Private project creation and listing
- Live counts from the user's AI provider registry and production queue
- Owner-scoped data protected by Supabase Row Level Security

## Stack

- Next.js App Router + TypeScript
- Supabase Auth, Postgres and private Storage
- GitHub source control and GitHub Actions validation
- Optional external AI providers added in later milestones

Vercel hosting is intentionally deferred. Work locally first, then choose hosting when the app is ready.

## Local setup

Requirements: Node.js 22 LTS or newer, npm and Git.

```bash
git clone https://github.com/Cletus-Tech/Cletustech-workspace-.git
cd Cletustech-workspace-
npm install
```

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hibbcjkgppblkgvftawl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qhdZfdgdQ2H-xoEy67a4ng_cbqUv0Mx
```

Get the publishable key from Supabase Project Settings → API Keys → Publishable key. Do not use the service_role/secret key in browser code, and never commit `.env.local`.

Run `npm run dev` and open http://localhost:3000.

## Supabase authentication setup

In Supabase Authentication → URL Configuration, add this local redirect URL:

- `http://localhost:3000/auth/callback`

Ensure the Supabase email provider is enabled. When hosted later, add the deployed app's callback URL too.

## Engineering principles

- Keep all development on the `main` branch.
- Never display a provider as connected until its actual connection is verified.
- Provider website links do not automatically grant API or browser control.
- Keep provider passwords and raw API secrets out of database tables and Git.
- Retry individual production steps without restarting an entire project.
- Respect provider terms, quotas and account restrictions.

## Current milestone

The dashboard, authentication flow and private project persistence are implemented. Next: editable AI provider registry, provider capability definitions and production workflow engine.
