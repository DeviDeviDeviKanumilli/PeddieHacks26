-- Run after `supabase db reset` in a local Supabase database.
-- This is intentionally SQL-only so the isolation boundary can be checked without the API.

begin;

insert into auth.users (id)
values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);

insert into public.workouts (
  id,
  user_id,
  source,
  title,
  client_request_id,
  request_hash
)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'manual',
  'RLS isolation workout',
  '40000000-0000-4000-8000-000000000001',
  repeat('a', 64)
);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.profiles
  where user_id = '20000000-0000-4000-8000-000000000001';
  if visible_count <> 1 then
    raise exception 'owner cannot read own profile';
  end if;

  select count(*) into visible_count
  from public.profiles
  where user_id = '20000000-0000-4000-8000-000000000002';
  if visible_count <> 0 then
    raise exception 'owner can read another profile';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    update public.profiles
    set user_id = '20000000-0000-4000-8000-000000000002'
    where user_id = '20000000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'owner transfer of profile row was not rejected';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.workouts
  where id = '30000000-0000-4000-8000-000000000001';
  if visible_count <> 0 then
    raise exception 'owner can read another workout';
  end if;
end;
$$;

set local role anon;

do $$
declare
  active_count integer;
begin
  select count(*) into active_count from public.exercises where active;
  if active_count <> 24 then
    raise exception 'anonymous catalog visibility expected 24 active exercises, got %', active_count;
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    perform 1 from public.profiles;
  exception when insufficient_privilege then
    rejected := true;
  end;
  if not rejected then
    raise exception 'anonymous profile access was not rejected';
  end if;
end;
$$;

rollback;
