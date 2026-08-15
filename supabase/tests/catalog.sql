-- Run after `supabase db reset` in a local Supabase database.

do $$
declare
  observed integer;
begin
  select count(*) into observed from public.exercises where active;
  if observed <> 24 then
    raise exception 'expected 24 active exercises, got %', observed;
  end if;

  select count(*) into observed from public.exercise_tracking_profiles;
  if observed <> 6 then
    raise exception 'expected 6 tracking profiles, got %', observed;
  end if;

  if exists (
    select 1
    from public.exercises e
    where e.active
      and not exists (
        select 1
        from public.exercise_source_links l
        join public.exercise_sources s on s.id = l.source_id
        where l.exercise_id = e.id and s.review_status = 'approved'
      )
  ) then
    raise exception 'active exercise without approved source';
  end if;

  if exists (
    select 1
    from public.exercises e
    where e.active
      and (
        not exists (select 1 from public.exercise_body_demands d where d.exercise_id = e.id)
        or not exists (select 1 from public.exercise_capability_demands d where d.exercise_id = e.id)
      )
  ) then
    raise exception 'active exercise without movement requirements';
  end if;

  if exists (
    select 1
    from public.exercise_form_rules r
    where r.feedback_code not in ('low_tracking_confidence', 'tempo_too_slow')
  ) then
    raise exception 'unknown seeded feedback code';
  end if;
end;
$$;
