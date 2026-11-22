# Syntax Studio

A professional, practical-first coding academy and learning workspace.

## Product direction
Syntax Studio moves learners from concept to confident practical work through structured lessons, guided exercises, assessments and evidence-based mastery.

## First learning track
Python Mastery is the first track. Its draft curriculum is being aligned with the CSC 201 lecture material. Older Python 2 conventions will be identified separately from modern Python 3 examples.

## Stack
- Next.js App Router, React 19 and TypeScript
- Supabase Authentication and Postgres with Row Level Security
- Browser-side Supabase client for the current email/password sign-in flow
- A separately sandboxed execution service is required before arbitrary learner code can run

## Local development
1. Copy `.env.example` to `.env.local`.
2. Add your Supabase publishable key from the Supabase project Connect dialog.
3. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment
- `NEXT_PUBLIC_SUPABASE_URL`: project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key only

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or in browser code.

## Current milestone
- Responsive workspace dashboard and Academy route.
- First Python learning room and initial structured lesson content.
- Supabase learner sign-up/sign-in UI.
- Database tables and RLS policies for learning content, submissions, progress, XP and achievements.
- CI workflow checks TypeScript and runs a production Next.js build.

The course is still a draft. Authentication needs the environment variables and the Supabase Auth redirect settings configured for the deployed domain. Progress tracking, secure grading, XP awarding and admin controls are not yet complete.

## Security principles
- Never trust client-submitted XP, grades or achievement claims.
- Verify assessment outcomes on the server.
- Never execute arbitrary student code directly inside the application server process.
- Keep private exercise test cases inaccessible to learner clients.
- Apply Row Level Security to exposed Supabase tables.
