create index body_regions_parent_id_idx on public.body_regions (parent_id);
create index user_body_regions_body_region_id_idx on public.user_body_regions (body_region_id);
create index user_capabilities_capability_id_idx on public.user_capabilities (capability_id);
create index user_equipment_equipment_id_idx on public.user_equipment (equipment_id);
create index user_goals_goal_id_idx on public.user_goals (goal_id);

create index exercises_active_slug_idx on public.exercises (slug) where active;
create index exercise_source_links_source_id_idx on public.exercise_source_links (source_id);
create index exercise_body_demands_body_region_id_idx on public.exercise_body_demands (body_region_id);
create index exercise_capability_demands_capability_id_idx on public.exercise_capability_demands (capability_id);
create index exercise_equipment_options_equipment_id_idx on public.exercise_equipment_options (equipment_id);
create index exercise_muscles_muscle_group_id_idx on public.exercise_muscles (muscle_group_id);
create index exercise_goals_goal_id_idx on public.exercise_goals (goal_id);
create index exercise_form_rules_tracking_profile_id_idx on public.exercise_form_rules (tracking_profile_id);

create index workouts_user_history_idx on public.workouts (user_id, created_at desc, id desc);
create index workout_items_user_id_idx on public.workout_items (user_id);
create index workout_items_exercise_id_idx on public.workout_items (exercise_id);
create index workout_sessions_user_history_idx on public.workout_sessions (user_id, started_at desc, id desc);
create index workout_sessions_workout_id_idx on public.workout_sessions (workout_id);
create index exercise_sessions_user_history_idx on public.exercise_sessions (user_id, created_at desc, id desc);
create index exercise_sessions_exercise_id_idx on public.exercise_sessions (exercise_id);
create index metric_batches_user_id_idx on public.metric_batches (user_id);
create index metric_batches_exercise_session_id_idx on public.metric_batches (exercise_session_id);
create index rep_metrics_user_id_idx on public.rep_metrics (user_id);
create index rep_metrics_exercise_session_idx
  on public.rep_metrics (exercise_session_id, set_number, rep_number);
create index summaries_user_id_idx on public.exercise_session_summaries (user_id);
create index session_events_workout_session_idx
  on public.session_events (workout_session_id, occurred_at, id);
create index session_events_exercise_session_idx on public.session_events (exercise_session_id);
create index daily_progress_user_date_idx on public.daily_progress (user_id, activity_date desc);

create unique index one_active_exercise_session_per_workout_session_idx
  on public.exercise_sessions (workout_session_id)
  where state in ('active', 'paused', 'resting');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.movement_profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.bump_movement_profile_version(
  p_user_id uuid,
  p_expected_version bigint
)
returns bigint
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

  update public.movement_profiles
  set version = version + 1,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and version = p_expected_version
  returning version into next_version;

  if next_version is null then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;

  return next_version;
end;
$$;

create or replace function public.is_valid_workout_session_transition(
  p_current_state text,
  p_next_state text
)
returns boolean
language sql
immutable
as $$
  select case p_current_state
    when 'active' then p_next_state in ('paused', 'resting', 'completed', 'cancelled')
    when 'paused' then p_next_state in ('active', 'completed', 'cancelled')
    when 'resting' then p_next_state in ('active', 'completed', 'cancelled')
    else false
  end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.bump_movement_profile_version(uuid, bigint) from public;
revoke execute on function public.is_valid_workout_session_transition(text, text) from public;
grant execute on function public.bump_movement_profile_version(uuid, bigint) to authenticated;
grant execute on function public.is_valid_workout_session_transition(text, text) to authenticated;

alter table public.body_regions enable row level security;
alter table public.body_regions force row level security;
alter table public.capabilities enable row level security;
alter table public.capabilities force row level security;
alter table public.equipment enable row level security;
alter table public.equipment force row level security;
alter table public.goals enable row level security;
alter table public.goals force row level security;
alter table public.muscle_groups enable row level security;
alter table public.muscle_groups force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.movement_profiles enable row level security;
alter table public.movement_profiles force row level security;
alter table public.user_body_regions enable row level security;
alter table public.user_body_regions force row level security;
alter table public.user_capabilities enable row level security;
alter table public.user_capabilities force row level security;
alter table public.user_equipment enable row level security;
alter table public.user_equipment force row level security;
alter table public.user_goals enable row level security;
alter table public.user_goals force row level security;
alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;
alter table public.exercises enable row level security;
alter table public.exercises force row level security;
alter table public.exercise_sources enable row level security;
alter table public.exercise_sources force row level security;
alter table public.exercise_source_links enable row level security;
alter table public.exercise_source_links force row level security;
alter table public.exercise_body_demands enable row level security;
alter table public.exercise_body_demands force row level security;
alter table public.exercise_capability_demands enable row level security;
alter table public.exercise_capability_demands force row level security;
alter table public.exercise_equipment_options enable row level security;
alter table public.exercise_equipment_options force row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_muscles force row level security;
alter table public.exercise_goals enable row level security;
alter table public.exercise_goals force row level security;
alter table public.exercise_tracking_profiles enable row level security;
alter table public.exercise_tracking_profiles force row level security;
alter table public.exercise_form_rules enable row level security;
alter table public.exercise_form_rules force row level security;
alter table public.workouts enable row level security;
alter table public.workouts force row level security;
alter table public.workout_items enable row level security;
alter table public.workout_items force row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sessions force row level security;
alter table public.exercise_sessions enable row level security;
alter table public.exercise_sessions force row level security;
alter table public.metric_batches enable row level security;
alter table public.metric_batches force row level security;
alter table public.rep_metrics enable row level security;
alter table public.rep_metrics force row level security;
alter table public.exercise_session_summaries enable row level security;
alter table public.exercise_session_summaries force row level security;
alter table public.session_events enable row level security;
alter table public.session_events force row level security;
alter table public.daily_progress enable row level security;
alter table public.daily_progress force row level security;

create policy public_active_body_regions_select on public.body_regions
for select to anon, authenticated using (active);
create policy public_active_capabilities_select on public.capabilities
for select to anon, authenticated using (active);
create policy public_active_equipment_select on public.equipment
for select to anon, authenticated using (active);
create policy public_active_goals_select on public.goals
for select to anon, authenticated using (active);
create policy public_active_muscle_groups_select on public.muscle_groups
for select to anon, authenticated using (active);

create policy public_active_exercises_select on public.exercises
for select to anon, authenticated using (active);
create policy public_approved_sources_select on public.exercise_sources
for select to anon, authenticated using (review_status = 'approved');
create policy public_active_source_links_select on public.exercise_source_links
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
  and exists (
    select 1 from public.exercise_sources s
    where s.id = source_id and s.review_status = 'approved'
  )
);
create policy public_active_body_demands_select on public.exercise_body_demands
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_capability_demands_select on public.exercise_capability_demands
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_equipment_options_select on public.exercise_equipment_options
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_muscles_select on public.exercise_muscles
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_goals_select on public.exercise_goals
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_tracking_profiles_select on public.exercise_tracking_profiles
for select to anon, authenticated using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.active)
);
create policy public_active_form_rules_select on public.exercise_form_rules
for select to anon, authenticated using (
  exists (
    select 1
    from public.exercise_tracking_profiles t
    join public.exercises e on e.id = t.exercise_id
    where t.exercise_id = tracking_profile_id and e.active
  )
);

create policy profiles_owner_all on public.profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy movement_profiles_owner_all on public.movement_profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy user_body_regions_owner_all on public.user_body_regions
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy user_capabilities_owner_all on public.user_capabilities
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy user_equipment_owner_all on public.user_equipment
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy user_goals_owner_all on public.user_goals
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy user_settings_owner_all on public.user_settings
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy workouts_owner_all on public.workouts
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy workout_items_owner_all on public.workout_items
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy workout_sessions_owner_all on public.workout_sessions
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy exercise_sessions_owner_all on public.exercise_sessions
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy metric_batches_owner_all on public.metric_batches
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy rep_metrics_owner_all on public.rep_metrics
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy exercise_session_summaries_owner_all on public.exercise_session_summaries
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy session_events_owner_all on public.session_events
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy daily_progress_owner_all on public.daily_progress
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on
  public.body_regions,
  public.capabilities,
  public.equipment,
  public.goals,
  public.muscle_groups,
  public.exercises,
  public.exercise_sources,
  public.exercise_source_links,
  public.exercise_body_demands,
  public.exercise_capability_demands,
  public.exercise_equipment_options,
  public.exercise_muscles,
  public.exercise_goals,
  public.exercise_tracking_profiles,
  public.exercise_form_rules
to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.movement_profiles,
  public.user_body_regions,
  public.user_capabilities,
  public.user_equipment,
  public.user_goals,
  public.user_settings,
  public.workouts,
  public.workout_items,
  public.workout_sessions,
  public.exercise_sessions,
  public.metric_batches,
  public.rep_metrics,
  public.exercise_session_summaries,
  public.session_events,
  public.daily_progress
to authenticated;

grant usage, select on sequence
  public.metric_batches_id_seq,
  public.rep_metrics_id_seq,
  public.session_events_id_seq
to authenticated;
