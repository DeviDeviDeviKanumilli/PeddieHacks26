-- Run after `supabase db reset` in a local Supabase database.

begin;

insert into auth.users (id)
values ('20000000-0000-0000-0000-000000000010')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000010', true);

do $$
declare
  workout_id uuid := '40000000-0000-4000-8000-000000000010';
  v_workout_session_id uuid;
  v_exercise_session_id uuid;
  metric_result jsonb;
  summary_count integer;
  progress_count integer;
begin
  insert into public.workouts (
    id,
    user_id,
    source,
    title,
    status,
    client_request_id,
    request_hash
  )
  values (
    workout_id,
    '20000000-0000-0000-0000-000000000010',
    'manual',
    'SQL session test',
    'draft',
    '50000000-0000-4000-8000-000000000010',
    repeat('a', 64)
  );

  insert into public.workout_items (
    id,
    user_id,
    workout_id,
    position,
    exercise_id,
    sets,
    reps,
    rest_seconds,
    compatibility_snapshot
  )
  values (
    '60000000-0000-4000-8000-000000000010',
    '20000000-0000-0000-0000-000000000010',
    workout_id,
    1,
    '00000000-0000-4000-8000-000000000001',
    1,
    2,
    30,
    '{}'::jsonb
  );

  v_workout_session_id := public.create_workout_session(
    '20000000-0000-0000-0000-000000000010',
    workout_id,
    '50000000-0000-4000-8000-000000000011'
  );
  select es.id into v_exercise_session_id
  from public.exercise_sessions es
  where es.workout_session_id = v_workout_session_id;

  perform public.transition_exercise_session(
    '20000000-0000-0000-0000-000000000010',
    v_exercise_session_id,
    1,
    'active'
  );

  metric_result := public.ingest_metric_batch(
    '20000000-0000-0000-0000-000000000010',
    v_exercise_session_id,
    '50000000-0000-4000-8000-000000000012',
    repeat('b', 64),
    '[{"setNumber":1,"repNumber":1,"counted":true,"feedbackCodes":[]},{"setNumber":1,"repNumber":2,"counted":true,"feedbackCodes":[]}]'::jsonb
  );
  if (metric_result ->> 'acceptedCount')::integer <> 2 then
    raise exception 'expected two accepted metrics, got %', metric_result;
  end if;

  metric_result := public.ingest_metric_batch(
    '20000000-0000-0000-0000-000000000010',
    v_exercise_session_id,
    '50000000-0000-4000-8000-000000000012',
    repeat('b', 64),
    '[{"setNumber":1,"repNumber":1,"counted":true,"feedbackCodes":[]},{"setNumber":1,"repNumber":2,"counted":true,"feedbackCodes":[]}]'::jsonb
  );
  if (metric_result ->> 'duplicateCount')::integer <> 2 then
    raise exception 'expected duplicate metric batch, got %', metric_result;
  end if;

  perform public.complete_exercise_session(
    '20000000-0000-0000-0000-000000000010',
    v_exercise_session_id,
    2,
    '{"completion":{"countedReps":2,"targetReps":2,"percentage":100}}'::jsonb,
    2,
    1,
    100
  );
  perform public.complete_workout_session(
    '20000000-0000-0000-0000-000000000010',
    v_workout_session_id,
    1,
    'finished'
  );

  select count(*) into summary_count
  from public.exercise_session_summaries
  where exercise_session_id = v_exercise_session_id;
  if summary_count <> 1 then
    raise exception 'expected one exercise summary';
  end if;

  select count(*) into progress_count
  from public.daily_progress
  where user_id = '20000000-0000-0000-0000-000000000010';
  if progress_count <> 1 then
    raise exception 'expected one daily progress row';
  end if;
end;
$$;

rollback;
