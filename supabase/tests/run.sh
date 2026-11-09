#!/bin/bash
# Tests de la base : crée un PostgreSQL 16 jetable, imite Supabase (rôles, schémas auth et storage),
# applique toutes les migrations avec un rôle non super-utilisateur, puis vérifie droits et historique.
# Usage : sudo supabase/tests/run.sh   (nécessite PostgreSQL 16 installé localement)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../.." && pwd)
PG=${PG_BIN:-/usr/lib/postgresql/16/bin}; D=${PG_TEST_DIR:-/var/lib/postgresql/nova-tests}; PORT=${PG_TEST_PORT:-5499}
su postgres -c "$PG/pg_ctl -D $D stop -m fast >/dev/null 2>&1 || true; rm -rf $D && $PG/initdb -D $D -A trust -U postgres >/dev/null && $PG/pg_ctl -D $D -o '-p $PORT -k $D' -l $D.log start >/dev/null"
trap 'su postgres -c "$PG/pg_ctl -D $D stop -m fast >/dev/null"' EXIT
sleep 1
P="psql -h $D -p $PORT -X -q -v ON_ERROR_STOP=1"
$P -U postgres -c "create database nova"
$P -U postgres -d nova -f "$HERE/00_supabase_stub.sql"
for f in "$REPO"/supabase/migrations/*.sql; do
  $P -U migrator -d nova -f "$f" || { echo "ÉCHEC migration $(basename "$f")"; exit 1; }
  echo "migration OK : $(basename "$f")"
done
OUT=$($P -U postgres -d nova -f "$HERE/10_rls_and_history.test.sql" 2>&1)
echo "$OUT" | grep -E "^ (OK|ÉCHEC)|ERROR"
echo "$OUT" | grep -qE "ÉCHEC|ERROR" && { echo "Des tests ont échoué."; exit 1; }
echo "Tous les tests de la base passent."
