create or replace function public.create_workout_session(
  p_user_id uuid,
  p_workout_id uuid,
  p_client_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_id uuid;
  existing_id uuid;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  if not exists (
    select 1
    from public.workouts
    where id = p_workout_id
      and user_id = p_user_id
      and status <> 'archived'
  ) then
    raise exception using errcode = 'P0002', message = 'workout not found';
  end if;

  insert into public.workout_sessions (user_id, workout_id, client_request_id)
  values (p_user_id, p_workout_id, p_client_request_id)
  on conflict (user_id, client_request_id) do nothing
  returning id into session_id;

  if session_id is null then
    select id into existing_id
    from public.workout_sessions
    where user_id = p_user_id
      and client_request_id = p_client_request_id;
    if existing_id is null then
      raise exception using errcode = '40001', message = 'session creation conflict';
    end if;
    return existing_id;
  end if;

  insert into public.exercise_sessions (
    user_id,
    workout_session_id,
    workout_item_id,
    exercise_id,
    target_snapshot,
    tracking_profile_version
  )
  select
    p_user_id,
    session_id,
    wi.id,
    wi.exercise_id,
    jsonb_build_object(
      'sets', wi.sets,
      'reps', wi.reps,
      'holdSeconds', wi.hold_seconds,
      'restSeconds', wi.rest_seconds,
      'trackingProfileVersion', tp.version,
      'rangeOfMotionTarget', tp.range_of_motion_target,
      'tempoTarget', tp.tempo_target
    ),
    tp.version
  from public.workout_items wi
  left join public.exercise_tracking_profiles tp on tp.exercise_id = wi.exercise_id
  where wi.workout_id = p_workout_id
    and wi.user_id = p_user_id
  order by wi.position;

  insert into public.session_events (
    user_id,
    workout_session_id,
    event_type,
    to_state,
    metadata
  )
  values (p_user_id, session_id, 'workout_session_created', 'active', '{}'::jsonb);

  return session_id;
end;
$$;

create or replace function public.transition_workout_session(
  p_user_id uuid,
  p_session_id uuid,
  p_expected_version bigint,
  p_next_state text,
  p_end_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.workout_sessions%rowtype;
  next_ended_at timestamptz;
  next_duration integer;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select * into session_row
  from public.workout_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'workout session not found';
  end if;
  if session_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;
  if not public.is_valid_workout_session_transition(session_row.state, p_next_state) then
    raise exception using errcode = '22023', message = 'invalid workout session transition';
  end if;

  if p_next_state in ('completed', 'cancelled') then
    next_ended_at := coalesce(session_row.ended_at, timezone('utc', now()));
    next_duration := greatest(0, extract(epoch from (next_ended_at - session_row.started_at))::integer);
  else
    next_ended_at := null;
    next_duration := null;
  end if;

  update public.workout_sessions
  set state = p_next_state,
      ended_at = next_ended_at,
      duration_seconds = next_duration,
      end_reason = case when p_next_state in ('completed', 'cancelled') then p_end_reason else null end,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_session_id;

  insert into public.session_events (
    user_id,
    workout_session_id,
    event_type,
    from_state,
    to_state,
    metadata
  )
  values (
    p_user_id,
    p_session_id,
    'workout_session_transition',
    session_row.state,
    p_next_state,
    jsonb_build_object('endReason', p_end_reason)
  );

  return p_session_id;
end;
$$;

create or replace function public.is_valid_exercise_session_transition(
  p_current_state text,
  p_next_state text
)
returns boolean
language sql
immutable
as $$
  select case p_current_state
    when 'pending' then p_next_state in ('active', 'skipped')
    when 'active' then p_next_state in ('paused', 'resting', 'completed', 'cancelled')
    when 'paused' then p_next_state in ('active', 'completed', 'cancelled')
    when 'resting' then p_next_state in ('active', 'completed', 'cancelled')
    else false
  end;
$$;

create or replace function public.transition_exercise_session(
  p_user_id uuid,
  p_session_id uuid,
  p_expected_version bigint,
  p_next_state text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.exercise_sessions%rowtype;
  next_started_at timestamptz;
  next_ended_at timestamptz;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select * into session_row
  from public.exercise_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'exercise session not found';
  end if;
  if session_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;
  if not public.is_valid_exercise_session_transition(session_row.state, p_next_state) then
    raise exception using errcode = '22023', message = 'invalid exercise session transition';
  end if;

  next_started_at := case
    when p_next_state = 'active' and session_row.started_at is null then timezone('utc', now())
    else session_row.started_at
  end;
  next_ended_at := case
    when p_next_state in ('completed', 'cancelled', 'skipped') then coalesce(session_row.ended_at, timezone('utc', now()))
    else null
  end;

  update public.exercise_sessions
  set state = p_next_state,
      started_at = next_started_at,
      ended_at = next_ended_at,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_session_id;

  insert into public.session_events (
    user_id,
    workout_session_id,
    exercise_session_id,
    event_type,
    from_state,
    to_state
  )
  values (
    p_user_id,
    session_row.workout_session_id,
    p_session_id,
    'exercise_session_transition',
    session_row.state,
    p_next_state
  );

  return p_session_id;
end;
$$;

create or replace function public.ingest_metric_batch(
  p_user_id uuid,
  p_exercise_session_id uuid,
  p_batch_id uuid,
  p_request_hash text,
  p_metrics jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  exercise_row public.exercise_sessions%rowtype;
  existing_batch public.metric_batches%rowtype;
  metric jsonb;
  inserted_count integer := 0;
  duplicate_count integer := 0;
  rows_inserted integer;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;
  if jsonb_typeof(p_metrics) <> 'array' then
    raise exception using errcode = '22023', message = 'metrics must be an array';
  end if;
  if jsonb_array_length(p_metrics) > 100 then
    raise exception using errcode = '22023', message = 'metric batch has too many reps';
  end if;
  if octet_length(convert_to(p_metrics::text, 'UTF8')) > 65536 then
    raise exception using errcode = '22023', message = 'metric batch is too large';
  end if;

  select * into exercise_row
  from public.exercise_sessions
  where id = p_exercise_session_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'exercise session not found';
  end if;
  if exercise_row.state not in ('active', 'paused', 'resting') then
    raise exception using errcode = '22023', message = 'metrics are closed for this exercise session';
  end if;

  select * into existing_batch
  from public.metric_batches
  where exercise_session_id = p_exercise_session_id
    and batch_id = p_batch_id;
  if found then
    if existing_batch.request_hash <> p_request_hash then
      raise exception using errcode = '23505', message = 'metric batch idempotency conflict';
    end if;
    return jsonb_build_object(
      'acceptedCount', 0,
      'duplicateCount', existing_batch.rep_count,
      'rejectedCount', 0
    );
  end if;

  insert into public.metric_batches (
    user_id,
    exercise_session_id,
    batch_id,
    request_hash,
    rep_count
  )
  values (
    p_user_id,
    p_exercise_session_id,
    p_batch_id,
    p_request_hash,
    jsonb_array_length(p_metrics)
  )
  returning * into existing_batch;

  for metric in select value from jsonb_array_elements(p_metrics) loop
    if exists (
      select 1
      from jsonb_object_keys(metric) as keys(key)
      where key not in (
        'setNumber',
        'repNumber',
        'counted',
        'durationMs',
        'rangeOfMotionDeg',
        'targetPositionReached',
        'accuracyScore',
        'controlScore',
        'stabilityScore',
        'formScore',
        'trackingConfidence',
        'feedbackCodes',
        'recordedOffsetMs'
      )
    ) then
      raise exception using errcode = '22023', message = 'metric contains unsupported fields';
    end if;
    if coalesce(jsonb_typeof(metric -> 'feedbackCodes'), 'array') <> 'array' then
      raise exception using errcode = '22023', message = 'feedbackCodes must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements_text(coalesce(metric -> 'feedbackCodes', '[]'::jsonb)) as codes(code)
      where code not in (
        'low_tracking_confidence',
        'tempo_too_slow',
        'range_of_motion_short',
        'target_position_missed',
        'movement_jerky',
        'stability_left',
        'stability_right'
      )
    ) then
      raise exception using errcode = '22023', message = 'metric contains an unknown feedback code';
    end if;

    insert into public.rep_metrics (
      user_id,
      exercise_session_id,
      metric_batch_id,
      set_number,
      rep_number,
      counted,
      duration_ms,
      range_of_motion_deg,
      target_position_reached,
      accuracy_score,
      control_score,
      stability_score,
      form_score,
      tracking_confidence,
      feedback_codes,
      recorded_offset_ms
    )
    values (
      p_user_id,
      p_exercise_session_id,
      existing_batch.id,
      (metric ->> 'setNumber')::integer,
      (metric ->> 'repNumber')::integer,
      (metric ->> 'counted')::boolean,
      nullif(metric ->> 'durationMs', '')::integer,
      nullif(metric ->> 'rangeOfMotionDeg', '')::numeric,
      nullif(metric ->> 'targetPositionReached', '')::boolean,
      nullif(metric ->> 'accuracyScore', '')::numeric,
      nullif(metric ->> 'controlScore', '')::numeric,
      nullif(metric ->> 'stabilityScore', '')::numeric,
      nullif(metric ->> 'formScore', '')::numeric,
      nullif(metric ->> 'trackingConfidence', '')::numeric,
      coalesce(
        array(select jsonb_array_elements_text(metric -> 'feedbackCodes')),
        '{}'::text[]
      ),
      nullif(metric ->> 'recordedOffsetMs', '')::integer
    )
    on conflict (exercise_session_id, set_number, rep_number) do nothing;

    get diagnostics rows_inserted = row_count;
    if rows_inserted = 1 then
      inserted_count := inserted_count + 1;
    else
      duplicate_count := duplicate_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'acceptedCount', inserted_count,
    'duplicateCount', duplicate_count,
    'rejectedCount', 0
  );
end;
$$;

create or replace function public.complete_exercise_session(
  p_user_id uuid,
  p_exercise_session_id uuid,
  p_expected_version bigint,
  p_analysis jsonb,
  p_counted_reps integer,
  p_completed_sets integer,
  p_overall_score numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.exercise_sessions%rowtype;
  existing_summary public.exercise_session_summaries%rowtype;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;
  if jsonb_typeof(p_analysis) <> 'object' then
    raise exception using errcode = '22023', message = 'analysis must be an object';
  end if;

  select * into session_row
  from public.exercise_sessions
  where id = p_exercise_session_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'exercise session not found';
  end if;
  if session_row.state = 'completed' then
    select * into existing_summary
    from public.exercise_session_summaries
    where exercise_session_id = p_exercise_session_id;
    if existing_summary.exercise_session_id is null then
      raise exception using errcode = 'XX000', message = 'completed exercise summary is missing';
    end if;
    return jsonb_build_object(
      'analysis', existing_summary.analysis,
      'alreadyCompleted', true
    );
  end if;
  if session_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;
  if session_row.state not in ('active', 'paused', 'resting') then
    raise exception using errcode = '22023', message = 'exercise session cannot be completed';
  end if;

  update public.exercise_sessions
  set state = 'completed',
      completed_reps = greatest(0, p_counted_reps),
      completed_sets = greatest(0, p_completed_sets),
      ended_at = coalesce(ended_at, timezone('utc', now())),
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_exercise_session_id;

  insert into public.exercise_session_summaries (
    exercise_session_id,
    user_id,
    target_reps,
    counted_reps,
    overall_score,
    analysis
  )
  values (
    p_exercise_session_id,
    p_user_id,
    greatest(0, coalesce((session_row.target_snapshot ->> 'reps')::integer, 0))
      * greatest(1, coalesce((session_row.target_snapshot ->> 'sets')::integer, 1)),
    greatest(0, p_counted_reps),
    p_overall_score,
    p_analysis
  );

  insert into public.session_events (
    user_id,
    workout_session_id,
    exercise_session_id,
    event_type,
    from_state,
    to_state,
    metadata
  )
  values (
    p_user_id,
    session_row.workout_session_id,
    p_exercise_session_id,
    'exercise_session_completed',
    session_row.state,
    'completed',
    jsonb_build_object('countedReps', p_counted_reps, 'completedSets', p_completed_sets)
  );

  return jsonb_build_object(
    'analysis', p_analysis,
    'alreadyCompleted', false
  );
end;
$$;

create or replace function public.rebuild_daily_progress(
  p_user_id uuid,
  p_activity_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_total integer;
  exercise_total integer;
  set_total integer;
  rep_total integer;
  active_total integer;
  score_average numeric;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select
    count(*)::integer,
    coalesce(sum(duration_seconds), 0)::integer
  into session_total, active_total
  from public.workout_sessions
  where user_id = p_user_id
    and state = 'completed'
    and started_at::date = p_activity_date;

  select
    count(*) filter (where es.state = 'completed')::integer,
    coalesce(sum(es.completed_sets) filter (where es.state = 'completed'), 0)::integer,
    coalesce(sum(es.completed_reps) filter (where es.state = 'completed'), 0)::integer,
    avg(s.overall_score)
  into exercise_total, set_total, rep_total, score_average
  from public.exercise_sessions es
  join public.workout_sessions ws on ws.id = es.workout_session_id
  left join public.exercise_session_summaries s on s.exercise_session_id = es.id
  where es.user_id = p_user_id
    and ws.user_id = p_user_id
    and ws.state = 'completed'
    and ws.started_at::date = p_activity_date;

  delete from public.daily_progress
  where user_id = p_user_id
    and activity_date = p_activity_date;

  if session_total > 0 then
    insert into public.daily_progress (
      user_id,
      activity_date,
      session_count,
      exercise_count,
      set_count,
      rep_count,
      active_seconds,
      average_score
    )
    values (
      p_user_id,
      p_activity_date,
      session_total,
      exercise_total,
      set_total,
      rep_total,
      active_total,
      score_average
    );
  end if;
end;
$$;

create or replace function public.complete_workout_session(
  p_user_id uuid,
  p_session_id uuid,
  p_expected_version bigint,
  p_end_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.workout_sessions%rowtype;
  next_ended_at timestamptz;
  next_duration integer;
  incomplete_count integer;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select * into session_row
  from public.workout_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'workout session not found';
  end if;
  if session_row.state = 'completed' then
    return p_session_id;
  end if;
  if session_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'version conflict';
  end if;
  if session_row.state not in ('active', 'paused', 'resting') then
    raise exception using errcode = '22023', message = 'workout session cannot be completed';
  end if;

  select count(*) into incomplete_count
  from public.exercise_sessions
  where workout_session_id = p_session_id
    and state not in ('completed', 'cancelled', 'skipped');
  if incomplete_count > 0 then
    raise exception using errcode = '22023', message = 'all exercise sessions must be terminal';
  end if;

  next_ended_at := coalesce(session_row.ended_at, timezone('utc', now()));
  next_duration := greatest(0, extract(epoch from (next_ended_at - session_row.started_at))::integer);

  update public.workout_sessions
  set state = 'completed',
      ended_at = next_ended_at,
      duration_seconds = next_duration,
      end_reason = p_end_reason,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_session_id;

  update public.workouts
  set status = 'completed',
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = session_row.workout_id
    and user_id = p_user_id
    and status <> 'archived';

  insert into public.session_events (
    user_id,
    workout_session_id,
    event_type,
    from_state,
    to_state,
    metadata
  )
  values (
    p_user_id,
    p_session_id,
    'workout_session_completed',
    session_row.state,
    'completed',
    jsonb_build_object('endReason', p_end_reason)
  );

  perform public.rebuild_daily_progress(p_user_id, session_row.started_at::date);
  return p_session_id;
end;
$$;

create or replace function public.delete_workout_session(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.workout_sessions%rowtype;
  started_date date;
  ended_date date;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'not owner';
  end if;

  select * into session_row
  from public.workout_sessions
  where id = p_session_id
    and user_id = p_user_id
  for update;
  if not found then
    return false;
  end if;

  started_date := session_row.started_at::date;
  ended_date := coalesce(session_row.ended_at, session_row.started_at)::date;
  delete from public.workout_sessions where id = p_session_id;
  perform public.rebuild_daily_progress(p_user_id, started_date);
  if ended_date <> started_date then
    perform public.rebuild_daily_progress(p_user_id, ended_date);
  end if;
  return true;
end;
$$;

revoke execute on function public.create_workout_session(uuid, uuid, uuid) from public;
revoke execute on function public.transition_workout_session(uuid, uuid, bigint, text, text) from public;
revoke execute on function public.transition_exercise_session(uuid, uuid, bigint, text) from public;
revoke execute on function public.ingest_metric_batch(uuid, uuid, uuid, text, jsonb) from public;
revoke execute on function public.complete_exercise_session(uuid, uuid, bigint, jsonb, integer, integer, numeric) from public;
revoke execute on function public.rebuild_daily_progress(uuid, date) from public;
revoke execute on function public.complete_workout_session(uuid, uuid, bigint, text) from public;
revoke execute on function public.delete_workout_session(uuid, uuid) from public;

grant execute on function public.create_workout_session(uuid, uuid, uuid) to authenticated;
grant execute on function public.transition_workout_session(uuid, uuid, bigint, text, text) to authenticated;
grant execute on function public.transition_exercise_session(uuid, uuid, bigint, text) to authenticated;
grant execute on function public.ingest_metric_batch(uuid, uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.complete_exercise_session(uuid, uuid, bigint, jsonb, integer, integer, numeric) to authenticated;
grant execute on function public.rebuild_daily_progress(uuid, date) to authenticated;
grant execute on function public.complete_workout_session(uuid, uuid, bigint, text) to authenticated;
grant execute on function public.delete_workout_session(uuid, uuid) to authenticated;
