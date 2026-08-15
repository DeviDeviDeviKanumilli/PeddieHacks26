-- Run after `supabase db reset` in a local Supabase database.

begin;

insert into auth.users (id)
values ('20000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);

select public.replace_movement_profile(
  '20000000-0000-4000-8000-000000000003',
  1,
  '{"knees":"limited"}'::jsonb,
  '{"seated_posture":"available"}'::jsonb,
  array['stable-chair']::text[],
  array['lower_body']::text[],
  'low'
);

do $$
declare
  profile_version bigint;
  selected_count integer;
begin
  select version into profile_version
  from public.movement_profiles
  where user_id = '20000000-0000-4000-8000-000000000003';
  if profile_version <> 2 then
    raise exception 'profile RPC did not increment version';
  end if;

  select count(*) into selected_count
  from public.user_body_regions
  where user_id = '20000000-0000-4000-8000-000000000003';
  if selected_count <> 1 then
    raise exception 'profile RPC did not replace body-region selections';
  end if;
end;
$$;

rollback;
