create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.body_regions (
  id text primary key,
  label text not null,
  side text not null check (side in ('central', 'left', 'right')),
  parent_id text references public.body_regions (id) on delete restrict,
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.capabilities (
  id text primary key,
  label text not null,
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.equipment (
  id text primary key,
  label text not null,
  category text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.goals (
  id text primary key,
  label text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.muscle_groups (
  id text primary key,
  label text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.body_regions is 'Public movement taxonomy; user selections reference these stable IDs.';
comment on table public.capabilities is 'Public movement capability taxonomy used by compatibility rules.';
comment on table public.equipment is 'Public equipment taxonomy; an empty user set means no equipment.';
comment on table public.goals is 'Public workout goal taxonomy.';
comment on table public.muscle_groups is 'Public muscle-group taxonomy used for progress coverage.';
