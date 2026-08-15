alter table public.exercises
  add constraint exercises_default_prescription_shape check (
    default_prescription ? 'sets'
    and default_prescription ? 'restSeconds'
    and jsonb_typeof(default_prescription -> 'sets') = 'number'
    and jsonb_typeof(default_prescription -> 'restSeconds') = 'number'
    and (default_prescription ->> 'sets')::integer between 1 and 5
    and (default_prescription ->> 'restSeconds')::integer between 0 and 300
    and ((default_prescription ? 'reps') <> (default_prescription ? 'holdSeconds'))
    and (
      not (default_prescription ? 'reps')
      or (
        jsonb_typeof(default_prescription -> 'reps') = 'number'
        and (default_prescription ->> 'reps')::integer between 1 and 50
      )
    )
    and (
      not (default_prescription ? 'holdSeconds')
      or (
        jsonb_typeof(default_prescription -> 'holdSeconds') = 'number'
        and (default_prescription ->> 'holdSeconds')::integer between 1 and 600
      )
    )
  );

create or replace function public.validate_exercise_catalog(p_exercise_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  exercise_row public.exercises%rowtype;
begin
  select * into exercise_row
  from public.exercises
  where id = p_exercise_id;

  if not found or not exercise_row.active then
    return;
  end if;

  if jsonb_array_length(exercise_row.instructions) = 0 then
    raise exception using errcode = '23514', message = 'active exercise needs instructions';
  end if;
  if jsonb_array_length(exercise_row.safety_cues) = 0 then
    raise exception using errcode = '23514', message = 'active exercise needs safety cues';
  end if;
  if jsonb_array_length(exercise_row.adaptations) = 0 then
    raise exception using errcode = '23514', message = 'active exercise needs adaptations';
  end if;
  if not exists (
    select 1
    from public.exercise_body_demands
    where exercise_id = p_exercise_id
  ) then
    raise exception using errcode = '23514', message = 'active exercise needs body demands';
  end if;
  if not exists (
    select 1
    from public.exercise_capability_demands
    where exercise_id = p_exercise_id
  ) then
    raise exception using errcode = '23514', message = 'active exercise needs capability demands';
  end if;
  if not exists (
    select 1
    from public.exercise_source_links l
    join public.exercise_sources s on s.id = l.source_id
    where l.exercise_id = p_exercise_id
      and s.review_status = 'approved'
  ) then
    raise exception using errcode = '23514', message = 'active exercise needs an approved source';
  end if;
end;
$$;

create or replace function public.validate_active_exercise_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.validate_exercise_catalog(old.id);
    return old;
  end if;

  perform public.validate_exercise_catalog(new.id);
  return new;
end;
$$;

create or replace function public.validate_related_exercise_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  exercise_id uuid;
begin
  if tg_op = 'DELETE' then
    exercise_id := old.exercise_id;
    perform public.validate_exercise_catalog(exercise_id);
    return old;
  end if;

  exercise_id := new.exercise_id;
  perform public.validate_exercise_catalog(exercise_id);
  return new;
end;
$$;

create or replace function public.validate_active_source_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_exercise uuid;
begin
  if new.review_status <> 'approved' then
    for linked_exercise in
      select exercise_id
      from public.exercise_source_links
      where source_id = new.id
    loop
      perform public.validate_exercise_catalog(linked_exercise);
    end loop;
  end if;
  return new;
end;
$$;

create trigger validate_exercise_after_write
after insert or update or delete on public.exercises
for each row execute function public.validate_active_exercise_trigger();

create trigger validate_exercise_source_link_after_write
after insert or update or delete on public.exercise_source_links
for each row execute function public.validate_related_exercise_trigger();

create trigger validate_exercise_body_demand_after_write
after insert or update or delete on public.exercise_body_demands
for each row execute function public.validate_related_exercise_trigger();

create trigger validate_exercise_capability_demand_after_write
after insert or update or delete on public.exercise_capability_demands
for each row execute function public.validate_related_exercise_trigger();

create trigger validate_exercise_source_after_write
after update on public.exercise_sources
for each row execute function public.validate_active_source_trigger();

revoke execute on function public.validate_exercise_catalog(uuid) from public;
revoke execute on function public.validate_active_exercise_trigger() from public;
revoke execute on function public.validate_related_exercise_trigger() from public;
revoke execute on function public.validate_active_source_trigger() from public;
