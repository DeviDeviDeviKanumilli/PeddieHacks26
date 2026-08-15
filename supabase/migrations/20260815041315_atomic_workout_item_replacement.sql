create or replace function public.patch_workout_item(
  p_user_id uuid,
  p_workout_id uuid,
  p_item_id uuid,
  p_expected_workout_version bigint,
  p_exercise_id uuid,
  p_sets integer,
  p_reps integer,
  p_hold_seconds integer,
  p_rest_seconds integer,
  p_compatibility_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  workout_row public.workouts%rowtype;
  item_exists boolean;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select * into workout_row
  from public.workouts
  where id = p_workout_id
    and user_id = p_user_id
    and status <> 'archived'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'workout not found';
  end if;
  if workout_row.version <> p_expected_workout_version then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;

  select exists (
    select 1
    from public.workout_items
    where id = p_item_id
      and workout_id = p_workout_id
      and user_id = p_user_id
  ) into item_exists;
  if not item_exists then
    raise exception using errcode = 'P0002', message = 'workout item not found';
  end if;
  if not exists (
    select 1 from public.exercises where id = p_exercise_id and active
  ) then
    raise exception using errcode = 'P0002', message = 'exercise not found';
  end if;
  if jsonb_typeof(p_compatibility_snapshot) <> 'object' then
    raise exception using errcode = '22023', message = 'compatibility snapshot must be an object';
  end if;

  update public.workout_items
  set exercise_id = p_exercise_id,
      sets = p_sets,
      reps = p_reps,
      hold_seconds = p_hold_seconds,
      rest_seconds = p_rest_seconds,
      compatibility_snapshot = p_compatibility_snapshot,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_item_id
    and workout_id = p_workout_id
    and user_id = p_user_id;

  update public.workouts
  set version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_workout_id;

  return p_item_id;
end;
$$;

revoke execute on function public.patch_workout_item(uuid, uuid, uuid, bigint, uuid, integer, integer, integer, integer, jsonb) from public;
grant execute on function public.patch_workout_item(uuid, uuid, uuid, bigint, uuid, integer, integer, integer, integer, jsonb) to authenticated;
