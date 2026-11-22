-- Tighten learner profile visibility and cover foreign-key access paths.
drop policy if exists "Profiles are viewable by authenticated learners" on public.profiles;
create policy "Learners can read their own profile" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

create index if not exists exercise_test_cases_exercise_id_idx on public.exercise_test_cases(exercise_id);
create index if not exists exercises_lesson_id_idx on public.exercises(lesson_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress(lesson_id);
create index if not exists submissions_exercise_id_idx on public.submissions(exercise_id);
create index if not exists user_achievements_achievement_id_idx on public.user_achievements(achievement_id);
