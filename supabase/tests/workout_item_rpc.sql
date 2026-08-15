-- Run after `supabase db reset` in a local Supabase database.

begin;

insert into auth.users (id)
values ('20000000-0000-0000-0000-000000000020')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000020', true);

do $$
declare
  workout_version bigint;
  updated_exercise uuid;
  updated_hold integer;
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
    '40000000-0000-4000-8000-000000000020',
    '20000000-0000-0000-0000-000000000020',
    'manual',
    'SQL replacement test',
    'draft',
    '50000000-0000-4000-8000-000000000020',
    repeat('c', 64)
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
    '60000000-0000-4000-8000-000000000020',
    '20000000-0000-0000-0000-000000000020',
    '40000000-0000-4000-8000-000000000020',
    1,
    '00000000-0000-4000-8000-000000000001',
    1,
    8,
    30,
    '{}'::jsonb
  );

  perform public.patch_workout_item(
    '20000000-0000-0000-0000-000000000020',
    '40000000-0000-4000-8000-000000000020',
    '60000000-0000-4000-8000-000000000020',
    1,
    '00000000-0000-4000-8000-000000000002',
    2,
    null,
    30,
    45,
    '{}'::jsonb
  );

  select version into workout_version
  from public.workouts
  where id = '40000000-0000-4000-8000-000000000020';
  select exercise_id, hold_seconds into updated_exercise, updated_hold
  from public.workout_items
  where id = '60000000-0000-4000-8000-000000000020';

  if workout_version <> 2
    or updated_exercise <> '00000000-0000-4000-8000-000000000002'
    or updated_hold <> 30 then
    raise exception 'workout item replacement did not update atomically';
  end if;
end;
$$;

rollback;
