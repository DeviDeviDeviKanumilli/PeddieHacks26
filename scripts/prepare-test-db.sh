#!/usr/bin/env bash
set -euo pipefail

database_url="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -z "$database_url" ]]; then
  echo "Database preparation requires SUPABASE_DB_URL or DATABASE_URL." >&2
  exit 1
fi

if [[ "${ALLOW_DATABASE_BOOTSTRAP:-}" != "true" ]]; then
  echo "Refusing to bootstrap a database without ALLOW_DATABASE_BOOTSTRAP=true." >&2
  echo "Use only a disposable local or CI database; never point this at hosted Supabase." >&2
  exit 1
fi

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists extensions;
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL

for migration_file in supabase/migrations/*.sql; do
  echo "Applying $migration_file"
  psql "$database_url" -v ON_ERROR_STOP=1 -f "$migration_file"
done

echo "Applying supabase/seed.sql"
psql "$database_url" -v ON_ERROR_STOP=1 -f supabase/seed.sql
