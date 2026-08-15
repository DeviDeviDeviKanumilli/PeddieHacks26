create table public.exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  family_key text not null,
  name text not null,
  summary text not null,
  category text not null check (category in ('strength', 'mobility', 'balance', 'cardio')),
  position text not null check (position in ('seated', 'standing', 'floor', 'kneeling')),
  difficulty integer not null check (difficulty between 1 and 5),
  default_prescription jsonb not null check (jsonb_typeof(default_prescription) = 'object'),
  instructions jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  safety_cues jsonb not null default '[]'::jsonb check (jsonb_typeof(safety_cues) = 'array'),
  adaptations jsonb not null default '[]'::jsonb check (jsonb_typeof(adaptations) = 'array'),
  active boolean not null default false,
  content_version integer not null default 1 check (content_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.exercise_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  publisher text not null,
  url text not null unique check (url ~ '^https?://'),
  publication_year integer check (publication_year between 1900 and 2100),
  access_date date not null,
  license_note text,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'approved', 'rejected')),
  reviewer_role text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.exercise_source_links (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  source_id uuid not null references public.exercise_sources (id) on delete restrict,
  primary key (exercise_id, source_id)
);

create table public.exercise_body_demands (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  body_region_id text not null references public.body_regions (id) on delete restrict,
  involvement text not null check (involvement in ('primary', 'secondary', 'stabilizing')),
  demand text not null check (demand in ('minimal', 'moderate', 'high')),
  primary key (exercise_id, body_region_id)
);

create table public.exercise_capability_demands (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  capability_id text not null references public.capabilities (id) on delete restrict,
  demand text not null check (demand in ('minimal', 'moderate', 'high')),
  required boolean not null default true,
  primary key (exercise_id, capability_id)
);

create table public.exercise_equipment_options (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_id text not null references public.equipment (id) on delete restrict,
  mode text not null check (mode in ('required', 'optional')),
  or_group text,
  primary key (exercise_id, equipment_id)
);

create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_group_id text not null references public.muscle_groups (id) on delete restrict,
  role text not null check (role in ('primary', 'secondary', 'stabilizer')),
  intensity integer not null check (intensity between 1 and 5),
  primary key (exercise_id, muscle_group_id)
);

create table public.exercise_goals (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  goal_id text not null references public.goals (id) on delete restrict,
  primary key (exercise_id, goal_id)
);

create table public.exercise_tracking_profiles (
  exercise_id uuid primary key references public.exercises (id) on delete cascade,
  tracking_key text not null unique,
  version integer not null default 1 check (version > 0),
  confidence_floor numeric(4, 3) not null default 0.600
    check (confidence_floor between 0 and 1),
  range_of_motion_target jsonb check (range_of_motion_target is null or jsonb_typeof(range_of_motion_target) = 'object'),
  tempo_target jsonb check (tempo_target is null or jsonb_typeof(tempo_target) = 'object'),
  supported_metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(supported_metrics) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.exercise_form_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  tracking_profile_id uuid not null references public.exercise_tracking_profiles (exercise_id) on delete cascade,
  feedback_code text not null check (feedback_code ~ '^[a-z0-9_]+$'),
  metric_name text not null,
  comparison text not null check (comparison in ('lt', 'lte', 'gt', 'gte', 'outside_range')),
  threshold numeric not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message_key text not null,
  unique (tracking_profile_id, feedback_code)
);

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

create trigger exercise_sources_set_updated_at
before update on public.exercise_sources
for each row execute function public.set_updated_at();

create trigger exercise_tracking_profiles_set_updated_at
before update on public.exercise_tracking_profiles
for each row execute function public.set_updated_at();
