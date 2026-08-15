create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'advanced')),
  intensity_preference text not null default 'standard'
    check (intensity_preference in ('low', 'standard', 'high')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.movement_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_body_regions (
  user_id uuid not null references auth.users (id) on delete cascade,
  body_region_id text not null references public.body_regions (id) on delete restrict,
  state text not null check (state in ('neutral', 'focus', 'limited', 'avoid')),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, body_region_id)
);

create table public.user_capabilities (
  user_id uuid not null references auth.users (id) on delete cascade,
  capability_id text not null references public.capabilities (id) on delete restrict,
  state text not null check (state in ('unknown', 'available', 'limited', 'avoid')),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, capability_id)
);

create table public.user_equipment (
  user_id uuid not null references auth.users (id) on delete cascade,
  equipment_id text not null references public.equipment (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, equipment_id)
);

create table public.user_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id text not null references public.goals (id) on delete restrict,
  priority integer not null default 1 check (priority between 1 and 5),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, goal_id)
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accessibility_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(accessibility_preferences) = 'object'),
  feedback_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(feedback_preferences) = 'object'),
  pose_overlay_enabled boolean not null default true,
  default_rest_duration_seconds integer not null default 60
    check (default_rest_duration_seconds between 0 and 300),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger movement_profiles_set_updated_at
before update on public.movement_profiles
for each row execute function public.set_updated_at();

create trigger user_body_regions_set_updated_at
before update on public.user_body_regions
for each row execute function public.set_updated_at();

create trigger user_capabilities_set_updated_at
before update on public.user_capabilities
for each row execute function public.set_updated_at();

create trigger user_equipment_set_updated_at
before update on public.user_equipment
for each row execute function public.set_updated_at();

create trigger user_goals_set_updated_at
before update on public.user_goals
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();
