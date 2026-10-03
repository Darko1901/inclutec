#!/usr/bin/env bash
# Se ejecuta automáticamente la primera vez que arranca el contenedor de PostgreSQL
# (docker compose up). Aplica migraciones y semillas sobre $POSTGRES_DB.
set -euo pipefail
for f in /db/migraciones/V*.sql /db/semillas/S*.sql; do
  echo "==> $(basename "$f")"
  psql -X -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
