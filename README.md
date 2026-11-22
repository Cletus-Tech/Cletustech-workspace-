# Syntax Studio

A professional, practical-first coding academy and learning workspace.

## Product direction
Syntax Studio helps learners move from understanding a concept to proving mastery through guided lessons, coding practice, challenges and assessed work.

## First learning track
Python Mastery is the first track. Its curriculum will be aligned with the supplied CSC 201 lecture slides while clearly distinguishing lecturer-taught Python 2 conventions from modern Python 3.

## Stack
- Next.js App Router
- React 19 and TypeScript
- Supabase Auth, Postgres and Storage (to be integrated)
- Sandboxed code execution (to be designed before enabling student code runs)

## Local development
```bash
npm install
npm run dev
```

## Current milestone
The first responsive workspace shell is in place. Navigation, learning cards and progress values are presentation scaffolding; real authentication, persisted progress, scoring and administration will be connected in subsequent milestones.

## Security principles
- Never trust client-submitted XP, grades or achievement claims.
- Verify assessment outcomes on the server.
- Never execute arbitrary student code directly inside the application server process.
- Apply Row Level Security to exposed Supabase tables.
