#!/usr/bin/env bash
# Crea (o recrea) la base de datos de IncluTec desde cero:
#   1) aplica las migraciones de db/migraciones en orden (V001, V002, ...)
#   2) carga las semillas de db/semillas (S001 catálogos, S002 datos de prueba)
#
# Uso:
#   db/scripts/crear_bd.sh               # recrea la BD "inclutec" con catálogos y datos de prueba
#   db/scripts/crear_bd.sh --sin-prueba  # solo catálogos (sin cuentas ni vacantes de ejemplo)
#   db/scripts/crear_bd.sh --pruebas     # crea una BD temporal, corre db/pruebas y la elimina
#
# Conexión: usa las variables estándar de PostgreSQL (PGHOST, PGPORT, PGUSER, PGPASSWORD).
# El nombre de la BD se toma de INCLUTEC_DB (por omisión: inclutec).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${INCLUTEC_DB:-inclutec}"
MODO="completo"
case "${1:-}" in
  --sin-prueba) MODO="catalogos" ;;
  --pruebas)    MODO="pruebas"; DB="${DB}_pruebas" ;;
  "")           ;;
  *) echo "Opción desconocida: $1" >&2; exit 1 ;;
esac

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

echo "==> Recreando la base de datos '$DB'"
dropdb --if-exists "$DB"
createdb -E UTF8 "$DB"

for f in "$DIR"/migraciones/V*.sql; do
  echo "==> Migración  $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

for f in "$DIR"/semillas/S*.sql; do
  if [[ "$MODO" == "catalogos" && "$(basename "$f")" != S001__* ]]; then continue; fi
  echo "==> Semilla    $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

if [[ "$MODO" == "pruebas" ]]; then
  for f in "$DIR"/pruebas/P*.sql; do
    echo "==> Prueba     $(basename "$f")"
    psql -X -d "$DB" -f "$f"
  done
  echo "==> Eliminando la base de datos temporal '$DB'"
  dropdb "$DB"
fi

echo "Listo."
