# Base de datos de IncluTec (PostgreSQL 16)

Esta carpeta es la **única fuente del esquema** de la base de datos: 39 tablas con llaves, restricciones, índices y el diccionario de datos en sus comentarios.

## Contenido

| Ruta | Para qué sirve |
|---|---|
| `migraciones/V001__esquema_inicial.sql` | Crea las 39 tablas. Los cambios futuros van en archivos nuevos (`V002__...`, `V003__...`); los ya existentes no se editan. |
| `semillas/S001__catalogos.sql` | Catálogos que la plataforma necesita para funcionar: roles, entidades, modalidades, habilidades, ajustes razonables y motivos de reporte. |
| `semillas/S002__datos_prueba.sql` | Datos de desarrollo: 4 cuentas, la empresa TecnoQro, una vacante, una postulación con entrevista. Son los mismos que usan los mocks de `mobile/` y `web/`. |
| `pruebas/P001__restricciones.sql` | 8 operaciones que la BD debe rechazar y 1 que debe aceptar. |
| `pruebas/P002__compatibilidad.sql` | Recalcula el índice de compatibilidad en SQL (referencia para el motor del API: 88 % / 83 %). |
| `modelo/diccionario.md` | Diccionario de datos de las 39 tablas. |
| `modelo/inclutec.dbml` | Modelo completo; se pega en https://dbdiagram.io para ver el diagrama. |
| `scripts/crear_bd.sh` | Crea o recrea la BD desde cero. |
| `scripts/docker-init.sh` | Lo ejecuta el contenedor de PostgreSQL de `docker-compose.yml` al arrancar por primera vez. |

## Crear la base de datos

Con PostgreSQL instalado en la máquina (las variables `PGHOST`, `PGPORT`, `PGUSER` y `PGPASSWORD` indican a qué servidor conectarse):

```bash
db/scripts/crear_bd.sh               # BD "inclutec" con catálogos y datos de prueba
db/scripts/crear_bd.sh --sin-prueba  # solo catálogos
db/scripts/crear_bd.sh --pruebas     # BD temporal: corre las pruebas y la elimina
```

O con Docker, desde la raíz del repositorio:

```bash
docker compose up -d db              # crea la BD la primera vez que arranca
docker compose down -v               # borra el volumen para empezar de cero
```

Cuentas de prueba: `admin@inclutec.mx`, `rh@tecnoqro.mx`, `mariana.lopez@correo.mx` y `jorge.ramirez@correo.mx`, todas con la contraseña `Inclutec2026`.

## Por qué la base de datos está en su propia carpeta y no dentro de `api/`

1. **Es un componente de la arquitectura, no un detalle del API.** El diagrama de componentes del diseño tiene cuatro elementos desplegados en nodos distintos: app móvil, panel web, API y servidor de base de datos. El repositorio refleja ese diseño: cuatro componentes, cuatro carpetas.
2. **El esquema es la fuente de verdad y está escrito en SQL.** Usa recursos que un ORM no genera: restricciones `CHECK` de reglas de negocio, un índice único parcial que impide reservar dos veces un horario, `num_nonnulls` para validar reportes y `COMMENT ON` con el diccionario de datos. El API se adapta al esquema (SQLAlchemy lo mapea), no al revés.
3. **Tiene su propio ciclo de vida.** Se diseñó y validó en la etapa 1, antes de que exista el API (sprints 4 y 5), y sus datos de prueba ya los usan la app móvil y el panel web para trabajar con datos simulados en los sprints 2 y 3.
4. **Se puede revisar y probar por sí sola.** `crear_bd.sh --pruebas` crea la base, carga los datos y comprueba las restricciones sin instalar Python ni levantar el API. La etapa 3 evalúa el API y la base de datos como entregables distintos.
5. **Separa datos de código.** Son 39 tablas, migraciones, semillas, pruebas, diccionario y modelo. Dentro de `api/` se mezclarían con el código Python y quedarían atados a una sola tecnología.

Que solo el API se conecte a la base de datos es una regla de ejecución y se mantiene; tener el esquema en su propia carpeta es una decisión de organización que la refuerza, porque deja claro que ningún componente define tablas por su cuenta.
