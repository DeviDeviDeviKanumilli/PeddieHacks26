alter table public.workouts
  add column client_request_id uuid,
  add column request_hash text;

alter table public.workouts
  add constraint workouts_request_hash_shape check (
    request_hash is null or request_hash ~ '^[a-f0-9]{64}$'
  );

create unique index workouts_user_client_request_id_idx
  on public.workouts (user_id, client_request_id)
  where client_request_id is not null;

create or replace function public.replace_movement_profile(
  p_user_id uuid,
  p_expected_version bigint,
  p_body_regions jsonb,
  p_capabilities jsonb,
  p_equipment_ids text[],
  p_goal_ids text[],
  p_intensity_preference text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_version bigint;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;
  if jsonb_typeof(p_body_regions) <> 'object' or jsonb_typeof(p_capabilities) <> 'object' then
    raise exception using errcode = '22023', message = 'profile selections must be objects';
  end if;
  if p_intensity_preference not in ('low', 'standard', 'high') then
    raise exception using errcode = '22023', message = 'invalid intensity preference';
  end if;

  update public.movement_profiles
  set version = version + 1,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and version = p_expected_version
  returning version into next_version;

  if next_version is null then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;

  update public.profiles
  set intensity_preference = p_intensity_preference,
      updated_at = timezone('utc', now())
  where user_id = p_user_id;

  delete from public.user_body_regions where user_id = p_user_id;
  delete from public.user_capabilities where user_id = p_user_id;
  delete from public.user_equipment where user_id = p_user_id;
  delete from public.user_goals where user_id = p_user_id;

  insert into public.user_body_regions (user_id, body_region_id, state)
  select p_user_id, key, value
  from jsonb_each_text(p_body_regions);

  insert into public.user_capabilities (user_id, capability_id, state)
  select p_user_id, key, value
  from jsonb_each_text(p_capabilities);

  insert into public.user_equipment (user_id, equipment_id)
  select p_user_id, equipment_id
  from unnest(coalesce(p_equipment_ids, '{}'::text[])) as equipment_id;

  insert into public.user_goals (user_id, goal_id, priority)
  select p_user_id, goal_id, row_number() over ()::integer
  from unnest(coalesce(p_goal_ids, '{}'::text[])) as goal_id;

  return jsonb_build_object(
    'version', next_version,
    'bodyRegions', p_body_regions,
    'capabilities', p_capabilities,
    'equipmentIds', to_jsonb(coalesce(p_equipment_ids, '{}'::text[])),
    'goalIds', to_jsonb(coalesce(p_goal_ids, '{}'::text[])),
    'intensityPreference', p_intensity_preference
  );
end;
$$;

revoke execute on function public.replace_movement_profile(uuid, bigint, jsonb, jsonb, text[], text[], text) from public;
grant execute on function public.replace_movement_profile(uuid, bigint, jsonb, jsonb, text[], text[], text) to authenticated;
