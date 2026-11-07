#!/usr/bin/env bash
# Corre las migraciones y las pruebas en un Postgres local temporal.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
D="$(mktemp -d /var/tmp/catalejo-pg.XXXX)"
B="$(ls -d /usr/lib/postgresql/*/bin | tail -1)"
chown postgres "$D" 2>/dev/null || true
PORT=55432
cleanup() { su postgres -c "$B/pg_ctl -D $D/data stop -m fast" >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
su postgres -c "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-k $D -p $PORT -c listen_addresses=' -l $D/log start >/dev/null"
PSQL="psql -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f "$ROOT/supabase/tests/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f "$ROOT/supabase/tests/rls_and_ingest.sql"
