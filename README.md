# IncluTec

Plataforma web y móvil para vincular de manera equitativa a personas con discapacidad con oportunidades laborales, considerando competencias, características de las vacantes, modalidad de trabajo, condiciones de accesibilidad y ajustes razonables.

Proyecto de Estadía · Ingeniería en Sistemas Computacionales · Universidad Politécnica de Querétaro · septiembre–diciembre 2026.

## Equipo

- Alan David Santiago de Vicente
- Ricardo Méndez Rodríguez
- Eduardo Daniel Licea González

Asesor: Ivan Isay Guerra López.

## Estructura

| Carpeta | Componente | Tecnología |
|---|---|---|
| [`mobile/`](mobile/) | App móvil para candidatos y reclutadores | React Native + Expo |
| [`web/`](web/) | Panel de administración | Laravel |
| [`api/`](api/) | API REST que consumen la app y el panel | FastAPI |
| [`db/`](db/) | Esquema, catálogos, datos de prueba y pruebas de la base de datos | PostgreSQL 16 |
| [`docs/`](docs/) | Guía de desarrollo y documentación de diseño | Markdown |

La app móvil y el panel web nunca se conectan a la base de datos: todo pasa por el API. Ver [`docs/CONTEXTO.md`](docs/CONTEXTO.md).

## Avance

| Etapa | Contenido | Fecha |
|---|---|---|
| 1 | Análisis y diseño | 28 de octubre de 2026 |
| 2 | Frontend móvil y web | 9 de noviembre de 2026 |
| 3 | API y base de datos; presentación final | 7 de diciembre de 2026 |

## Arranque rápido

```bash
# Base de datos (Docker)
docker compose up -d db

# o con PostgreSQL local
db/scripts/crear_bd.sh
```

Las instrucciones de la app móvil, el panel web y el API están en el README de cada carpeta.
