#!/usr/bin/env bash
set -euo pipefail

database_url="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"

if [[ -z "$database_url" ]]; then
  echo "Skipping database tests: set SUPABASE_DB_URL or DATABASE_URL after applying migrations and seed." >&2
  exit 0
fi

for test_file in \
  supabase/tests/catalog.sql \
  supabase/tests/rls.sql \
  supabase/tests/profile_rpc.sql \
  supabase/tests/session_lifecycle.sql \
  supabase/tests/workout_item_rpc.sql
do
  echo "Running $test_file"
  psql "$database_url" -v ON_ERROR_STOP=1 -f "$test_file"
done
