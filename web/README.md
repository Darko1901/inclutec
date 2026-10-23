# IncluTec · Panel de administración (`web/`)

Panel web en Laravel (Blade) para el administrador de IncluTec. **No tiene base de datos:** todo pasa por el API REST (`api/`), con JSON y un token JWT. El panel guarda ese token en la **sesión del servidor** y nunca lo manda al navegador.

Pantallas: WEB-01 inicio de sesión, «Cambiar contraseña» WEB-02 dashboard y estadísticas y WEB-03 usuarios, WEB-04 empresas, WEB-05 vacantes, WEB-06 categorías y habilidades, WEB-07 catálogos y WEB-08 reportes (listas, conectadas a `ApiAdmin`) (maquetadas con datos fijos dentro del layout nuevo; se conectan al API en las siguientes tareas). Qué hace cada una: `docs/diseno/pantallas.md` y `docs/diseno/requerimientos.md`.

## Requisitos

- PHP 8.2 o superior con las extensiones habituales de Laravel (`mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl`, `fileinfo`, `iconv`).
- Composer 2.
- Node 20.19 o superior y npm.

**Arch Linux:** Composer necesita la extensión `iconv`, que viene desactivada. Actívala una vez:

```bash
sudo sed -i 's/^;extension=iconv/extension=iconv/' /etc/php/php.ini
php -m | grep -i iconv   # debe imprimir: iconv
```

No hace falta `pdo_sqlite` ni ningún otro controlador de base de datos.

## Instalación

Desde `web/`:

```bash
composer install
cp .env.example .env
php artisan key:generate
npm ci
npm run build          # compila estilos, la fuente Inter y Alpine.js; sin este paso el panel no carga
```

## Variables de entorno (`.env`)

| Variable | Para qué sirve |
|---|---|
| `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL` | Configuración básica de Laravel (`APP_URL` usa el puerto 8001). |
| `APP_LOCALE`, `APP_FALLBACK_LOCALE` | `es_MX`. La zona horaria es `America/Mexico_City` (las fechas del API vienen en UTC y se muestran en hora de la Ciudad de México). |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION` | `file`, `file` y `sync`: no hay base de datos. |
| `INCLUTEC_API_URL` | Dirección del API, con `/api/v1`. Por omisión `http://localhost:8000/api/v1`. |
| `INCLUTEC_API_MOCK` | `true` usa datos simulados; `false` llama al API real. |

## Cómo correr

El API usa el puerto 8000, así que el panel corre en el **8001**.

```bash
composer run dev                        # servidor (puerto 8001), registros y Vite
# o, por separado:
php artisan serve --port=8001
npm run dev                             # solo si vas a editar JavaScript; si no, basta npm run build
```

Abre http://localhost:8001. La raíz lleva al dashboard si hay sesión o al inicio de sesión si no.

## Cuentas de prueba

Contraseña de todas: `Inclutec2026`. Son las de `db/semillas/S002__datos_prueba.sql` (sección 9 de `docs/CONTEXTO.md`). El panel solo deja entrar al administrador:

| Correo | Qué pasa en el panel |
|---|---|
| `admin@inclutec.mx` | Entra al dashboard. |
| `mariana.lopez@correo.mx`, `jorge.ramirez@correo.mx` (candidatos) y las cuentas de reclutador (`rh@tecnoqro.mx`, `rh@logibajio.mx`, `talento@concentro.mx`, `contacto@estudiotrazo.mx`) | «Esta cuenta no tiene acceso al panel. Usa la aplicación móvil.» y no se guarda la sesión. |
| `suspendida@correo.mx` | Existe solo en el mock (id 100): responde 423, «Tu cuenta está suspendida.». |
| `ana.torres@correo.mx`, `luis.fernandez@correo.mx`, `carmen.vazquez@correo.mx`, `miguel.cruz@correo.mx`, `daniela.morales@correo.mx`, `hector.salinas@correo.mx` | Candidatos solo del mock (ids 101 a 106) que dan volumen a las estadísticas. Tampoco entran al panel. |
| `nombre.apellido07@correo.mx`… (ids 107 a 152) | Usuarios de relleno del mock: 60 cuentas en total (3 páginas de 25) con roles y estados mezclados. Hay 3 administradores extra; todos entran con `Inclutec2026`. |

Con el mock, cinco intentos fallidos con el mismo correo bloquean el acceso 15 minutos: el sexto responde 429 con `Retry-After`, aunque la contraseña sea correcta.

### El mock tiene memoria

`ApiMock` guarda su estado (contraseñas cambiadas, intentos fallidos y, en las siguientes tareas, lo que el administrador cree o edite) en `storage/app/mock-api.json`. El archivo está fuera de git, se crea a partir de `app/Servicios/Api/Mock/datos.php` (los datos de S002) la primera vez que se usa y se actualiza con bloqueo de archivo. Así un cambio hecho en el panel se conserva al recargar.

```bash
php artisan inclutec:mock-reiniciar   # borra el archivo y vuelve a los datos iniciales de la semilla
```

- Si cambias `Mock/datos.php` (por ejemplo, agregas un grupo nuevo), las llaves que falten se completan solas, pero los registros ya guardados no cambian: corre `inclutec:mock-reiniciar` para verlos.
- En las pruebas cada caso usa un archivo temporal propio (lo configura `tests/TestCase.php`), así que todos parten de los datos iniciales y nunca tocan el archivo de desarrollo.
- Las fechas de postulaciones, vacantes y reportes del mock son relativas al día en que se crea el archivo (por ejemplo, «hace 12 días»), para que el periodo por omisión del dashboard siempre tenga datos. Pasados unos días, corre `inclutec:mock-reiniciar` para volver a anclarlas a hoy.
- Para depurar, el archivo se puede abrir y editar a mano (es JSON).

## Estructura

```
app/
  Console/Commands/     inclutec:mock-reiniciar
  Http/
    Controllers/        un controlador por pantalla; SesionController maneja login y logout
    Middleware/         ExigirAdministrador (alias `admin`): exige sesión, valida el token con GET /auth/me y comparte `$administrador`
  Providers/            ApiServiceProvider elige ApiMock o ApiHttp según INCLUTEC_API_MOCK
  Servicios/Api/
    ApiAdmin.php        interfaz: lo único de lo que dependen los controladores
    ApiHttp.php         llama al API real (Bearer con el token de la sesión, 15 s de tiempo máximo)
    ApiMock.php         responde como el contrato con datos de prueba
    ApiError.php        excepción con status, codigo, detail y campos (forma del contrato)
    Mock/datos.php      datos iniciales del mock (los de S002); único lugar donde viven
    Mock/Almacen.php    estado persistente del mock (storage/app/mock-api.json)
    Mock/CalculadoraEstadisticas.php   calcula el objeto Estadisticas con el estado del mock
    Mock/ExportadorEstadisticas.php    arma el PDF (FPDF) y el XLSX (SimpleXLSXGen) del mock
    Mock/GestionUsuarios.php           listar, detalle, alta, edición y cambio de estado de usuarios con los 409 y 422 del contrato
    Mock/GestionEmpresas.php           cola de validación, alta, edición, validar o rechazar y suspender o reactivar empresas
    Mock/GestionVacantes.php           listado con filtros, detalle y suspender o reactivar vacantes (409 transicion_invalida)
    Mock/GestionReportes.php           bandeja, detalle con historial y reportes previos, y seguimiento con las transiciones del contrato
    Mock/GestionCatalogos.php          categorías, habilidades y ocho catálogos: nombre único, `en_uso` y eliminar solo sin uso
  Support/
    PeriodoEstadisticas.php, PresentadorEstadisticas.php   periodo de la URL y datos que pinta el dashboard
    AccionesUsuario.php, Roles.php, Fechas.php             textos de las acciones de estado, roles y fechas en hora de la Ciudad de México
    Empresas.php                                           pestañas, acciones de estado y formato del RFC de WEB-04
    AccionesVacante.php                                    acciones de moderación y textos de accesibilidad, experiencia y salario de WEB-05
    Reportes.php                                           pestañas, tipos, acciones de seguimiento y elemento reportado de WEB-08
    Catalogos.php                                          definición de los diez catálogos de WEB-06 y WEB-07 (campos, textos y filas)
    Estados.php         mapa único de estados: valor de BD → texto, ícono y variante (tabla 3.4)
    Iconos.php          íconos SVG de contorno
bootstrap/app.php       alias del middleware y manejo de ApiError (401 y 423 cierran sesión)
config/inclutec.php     api_url, mock y mock_archivo
resources/
  css/admin.css         estilos del panel (con Vite); fuentes.css carga Inter desde @fontsource, sin internet
  js/                   app.js (Alpine + plugin focus) y componentes.js (avisos, modal, confirmación…)
  views/layouts/        admin_layout: layout de todas las pantallas del panel
  views/components/     componentes Blade (ver abajo)
  views/auth/           WEB-01 inicio de sesión
  views/admin/          pantallas del panel
  views/desarrollo/     guía de componentes (solo APP_ENV=local)
tests/                  Feature (login, layout, componentes, contraseña, mock) y Unit (ApiMock, ApiHttp, Estados)
```

Reglas del panel: las vistas nunca importan datos de prueba; siempre pasan por `ApiAdmin`. Rutas, campos, estados y errores siguen `docs/api/contrato.md`. Para agregar un grupo del contrato (estadísticas, usuarios, empresas…), se agregan los métodos a `ApiAdmin`, a `ApiHttp` y a `ApiMock` (con sus datos en `Mock/datos.php`).

## Calidad

```bash
php artisan test           # pruebas
./vendor/bin/pint --test   # estilo (Laravel Pint); sin --test corrige los archivos
npm run build              # compila el JavaScript
```

## Estadísticas y exportación (WEB-02)

Las cifras y las gráficas salen de `ApiAdmin::estadisticas($desde, $hasta)`; `ApiAdmin::exportarEstadisticas($formato, $desde, $hasta)` devuelve el archivo (contenido, tipo y nombre) y el panel lo reenvía al navegador. El periodo vive en la URL: `/dashboard?periodo=7|30|90` o `?periodo=personalizado&desde=AAAA-MM-DD&hasta=AAAA-MM-DD` (máximo 12 meses). En el mock, las cifras se calculan con su estado y el PDF y el XLSX son reales; usan las bibliotecas de Composer `setasign/fpdf` y `shuchkin/simplexlsxgen` (de un solo archivo, sin extensiones adicionales). Las gráficas no usan biblioteca de JavaScript: son HTML y SVG generados en el servidor (`<x-grafica>`).

## Usuarios (WEB-03)

`/usuarios` lista 25 por página con búsqueda (`q`) y filtros por `rol` y `estado` en la URL; `/usuarios/nuevo`, `/usuarios/{id}/editar`, `/usuarios/{id}` (detalle, con el aviso de privacidad y sin necesidades de ajuste) y `PATCH /usuarios/{id}/estado` (Suspender, Reactivar o Dar de baja; el motivo es obligatorio salvo al reactivar). Los errores del contrato se marcan en su campo: `409 correo_duplicado` en el correo, `409 en_uso` en el rol, `422` en cada campo y `409 estado_invalido` como aviso. El selector de empresa del reclutador sale de `ApiAdmin::listarEmpresas()` (`GET /admin/empresas`). Si ya tenías un `mock-api.json`, corre `inclutec:mock-reiniciar`: los usuarios ahora llevan una `ficha` (registro, último acceso, motivo y puesto).

## Empresas (WEB-04)

`/empresas` muestra cuatro pestañas (Pendientes, Validadas, Rechazadas y Suspendidas, con el número de cada una) con `?estado=` y `?q=` en la URL; sin estado abre Pendientes, que salen primero por antigüedad. `/empresas/{id}` es la revisión: datos, reclutadores, verificación del RFC (el formato se comprueba en el panel con el patrón del contrato y la unicidad la manda el API en `rfc_duplicado`) y la constancia. Validar, Rechazar (con motivo), Suspender (con motivo) y Reactivar son confirmaciones sobre `PATCH /admin/empresas/{id}/validacion` y `/estado`; una empresa rechazada no tiene acciones, porque solo vuelve a pendiente cuando el reclutador sube otra constancia. Al suspender, las vacantes publicadas pasan a suspendidas y el aviso dice cuántas; al reactivar siguen suspendidas.

La constancia no se enlaza directo al API: `/empresas/{id}/constancia` la descarga con el token de la sesión y la reenvía, porque el navegador nunca recibe el token. En el mock sale de `public/mock/constancia-ejemplo.pdf` (un PDF ficticio, igual para todas las empresas que tienen documento). El formulario de alta y edición pide sus listas (sectores, tamaños y municipios) a `GET /catalogos/{tipo}` mediante `ApiAdmin::catalogo()`. Corre `inclutec:mock-reiniciar` para que el mock tome las empresas nuevas (10 en total: 3 pendientes, 3 validadas, 2 rechazadas y 2 suspendidas).

## Vacantes (WEB-05)

`/vacantes` lista 25 por página (`GET /admin/vacantes`) con búsqueda por título y filtros por empresa, estado, categoría, modalidad y «Solo con reportes abiertos» en la URL (`q`, `empresa_id`, `estado`, `categoria_id`, `modalidad_id`, `con_reportes=1`); las listas de los selectores salen de `GET /admin/empresas` y de `GET /catalogos/categorias` y `/modalidades`. `/vacantes/{id}` usa `GET /vacantes/{id}`: datos generales, requisitos, condiciones (con el salario aunque no se muestre a los candidatos) y la sección de accesibilidad con los mismos textos que CAN-02. «Suspender» (publicada o pausada, con motivo) y «Reactivar» (solo suspendida) son confirmaciones sobre `PATCH /admin/vacantes/{id}/estado`; cualquier otra transición muestra el mensaje del `409 transicion_invalida`. El mock trae 34 vacantes (ids 1 a 8, 101, 102 y 201 a 224): las 8 publicadas de siempre y 26 más sin publicar (borrador, pausada, cerrada y suspendida) que no cambian las estadísticas. El número de reportes abiertos no es un enlace porque `GET /admin/reportes` no filtra por elemento reportado; el detalle de cada reporte sí enlaza a la vacante.

## Reportes (WEB-08)

`/reportes` es la bandeja: pestañas por estado (Abiertos por omisión, con el número de cada una), filtros por tipo y motivo, orden por antigüedad (`?estado=`, `?tipo=`, `?motivo_reporte_id=`, `?orden=antiguos|recientes`) y paginación de 25. `/reportes/{id}` muestra el reporte, el elemento reportado con su estado actual y enlace a su pantalla (vacante, empresa o usuario), los reportes anteriores contra el mismo elemento y el historial. El seguimiento sigue la tabla del contrato: abierto → «Tomar en revisión» o «Descartar»; en revisión → «Resolver» o «Descartar»; cerrar exige la resolución (y, al resolver, la acción tomada: ninguna o suspensión). La suspensión del elemento usa el endpoint de su tipo (`moderarVacante`, `cambiarEstadoEmpresa` o `cambiarEstadoUsuario`) desde `PATCH /reportes/{id}/suspension`, mientras el reporte siga abierto. El mock trae 39 reportes de los tres tipos (los 31 resueltos llenan dos páginas); `<x-confirmacion>` ahora acepta `campoMotivo`, `maximoMotivo` y `mensajeVacio` para pedir la resolución.

## Categorías, habilidades y catálogos (WEB-06 y WEB-07)

Las dos pantallas usan **un solo componente**, `<x-catalogo>`, armado con la definición de `App\Support\Catalogos`: cada catálogo (`categorias`, `habilidades` y los ocho tipos de `/admin/catalogos/{tipo}`) declara sus campos (los de `CatalogoEntrada`), sus columnas y sus textos. Para agregar un campo o un catálogo se toca esa clase, no las vistas. `/habilidades?seccion=categorias|habilidades` (con `q`, `categoria_id` y `page`) es WEB-06; `/catalogos?tipo=ajustes|modalidades|jornadas|tipos-contrato|niveles-educativos|sectores|tamanos-empresa|motivos-reporte` es WEB-07, con los ajustes agrupados por categoría. Alta, edición, activar o desactivar y eliminar van por `/catalogo/{clave}` (un solo controlador para los diez). Desactivar siempre se puede; eliminar un registro en uso responde `409 en_uso` y la pantalla lo explica y ofrece «Desactivar». No hay catálogos de tipos de discapacidad ni de niveles de soporte: el proyecto registra necesidades de ajuste, nunca diagnósticos.

En el mock, `catalogos_admin` guarda los registros con `activo` y sus campos propios, y cada cambio reconstruye `catalogos` (lo que leen vacantes, empresas, reportes y estadísticas); `GET /catalogos/{tipo}` solo ofrece los activos, así que lo desactivado deja de aparecer en los formularios nuevos. Corre `inclutec:mock-reiniciar` si ya tenías un `mock-api.json`.

## Dependencias y auditoría

`npm audit` en `web/` reporta **0 vulnerabilidades** (el JavaScript del panel solo usa Vite, `laravel-vite-plugin`, Alpine.js y la fuente Inter), así que no hay `overrides` ni excepciones. Corre `npm audit` cuando cambies dependencias. Si aparece algo, corrígelo con `npm audit fix` y nunca con `npm audit fix --force`: puede saltar de versión mayor (por ejemplo, de Vite) y romper el build. Después de tocar dependencias, `npm run build` y `php artisan test` deben seguir en verde.

## Layout y componentes

Todas las pantallas del panel extienden `layouts.admin_layout`:

```blade
@extends('layouts.admin_layout')
@section('titulo', 'Usuarios')      {{-- título de la pestaña: «Usuarios · IncluTec» --}}
@section('content')
    <x-encabezado-pagina titulo="Usuarios" descripcion="…">…</x-encabezado-pagina>   {{-- el único <h1> --}}
    …
@endsection
```

El layout ya trae «Saltar al contenido», `<header>` con el menú de usuario (Cambiar contraseña, Cerrar sesión), `<nav aria-label="Menú principal">` con `aria-current="page"`, un solo `<main id="contenido" tabindex="-1">`, el menú plegable en pantallas angostas y las regiones de avisos. **No agregues otro `<main>` ni otro `<h1>`.**

Con `APP_ENV=local`, **http://localhost:8001/componentes** muestra todos los componentes con ejemplos (fuente: `resources/views/desarrollo/componentes.blade.php`).

| Componente | Para qué |
|---|---|
| `<x-encabezado-pagina titulo descripcion>` | `<h1>`, descripción y, en el slot, los botones de acción |
| `<x-boton variante="primario\|secundario\|peligro\|texto" tipo href :deshabilitado>` | Botones de al menos 44 × 44 px |
| `<x-insignia-estado entidad valor>` | Estado con texto e ícono, desde el mapa de `App\Support\Estados` |
| `<x-tabla caption :columnas mensajeVacio>` | `<table>` con `<caption>`, `<th scope="col">` y fila de estado vacío cuando el slot no trae filas |
| `<x-paginacion :total :page :size>` | Recibe lo que devuelve el API; conserva los filtros de la URL |
| `<x-filtros buscar :selects :total>` | Formulario GET con «Aplicar» y «Limpiar»; anuncia el número de resultados |
| `<x-campo nombre etiqueta tipo valor ayuda obligatorio maximo :opciones>` | Etiqueta, control, ayuda, contador y error con `aria-invalid`/`aria-describedby`; toma el error de `$errors` |
| `<x-resumen-errores>` | Lista de errores con `role="alert"` que recibe el foco; cada error enlaza a su campo |
| `<x-modal id titulo>` | Diálogo accesible: foco atrapado, Escape y «Cerrar», devuelve el foco. Se abre con `$dispatch('abrir-modal', 'id')` |
| `<x-usuario-botones :usuario>` / `<x-usuario-confirmaciones :usuario>` | Botones de estado de un usuario (Suspender, Reactivar, Dar de baja) y sus `<x-confirmacion>`; las confirmaciones se dibujan fuera de la tabla |
| `<x-empresa-botones :empresa>` / `<x-empresa-confirmaciones :empresa>` | Botones de estado de una empresa (Validar, Rechazar, Suspender, Reactivar) y sus `<x-confirmacion>` |
| `<x-vacante-botones :vacante>` / `<x-vacante-confirmaciones :vacante>` | Botones de moderación de una vacante (Suspender, Reactivar) y sus `<x-confirmacion>` |
| `<x-reporte-botones :reporte :elemento>` / `<x-reporte-confirmaciones :reporte :elemento>` | Seguimiento de un reporte (Tomar en revisión, Resolver, Descartar) y suspensión del elemento reportado, con sus `<x-confirmacion>` |
| `<x-catalogo :clave :filas :grupos :opciones>` | Administrador de un catálogo (tabla con «En uso» y estado, alta y edición en ventana, activar o desactivar y eliminar con confirmación). Lo usan WEB-06 y WEB-07 |
| `<x-grafica :grafica>` | Gráfica del dashboard (barras o líneas) dibujada en el servidor, con título, leyenda, valores escritos y el botón «Ver como tabla» (`<x-tabla>`) |
| `<x-confirmacion id titulo pedirMotivo accion metodo>` | «¿Seguro que…?»; con `pedirMotivo` no deja confirmar sin motivo. Con `accion` envía un formulario; sin ella emite el evento `confirmado` |

### Avisos

Un controlador que termina bien redirige con `->with('exito', 'Tu contraseña se actualizó.')`; si algo falla sin ser un error de campo, con `->with('error', '…')`. El layout muestra `exito` en una región `role="status"` y `error` en una `role="alert"`. Los errores de validación de formularios no van por aquí: usan `->withErrors()` y `<x-resumen-errores>`.

### Estados

Los estados se guardan y llegan del API con su valor de BD (`en_revision`). El texto, el ícono y el color salen **solo** de `App\Support\Estados` (tabla 3.4 de `docs/diseno/pantallas.md`): `<x-insignia-estado entidad="empresa" valor="pendiente" />`. Nunca escribas «Revisión», «Bloqueado» u otros textos a mano. Si el contrato agrega un valor, `tests/Unit/EstadosTest.php` falla hasta que se agregue al mapa.

## Cómo construir una pantalla

Cada pantalla de W03 a W08 sigue estos pasos. **La vista nunca tiene datos escritos a mano ni llama al API: solo junta componentes con lo que le da el controlador.**

1. **Lee el diseño** (en este orden): la sección de la pantalla en `docs/api/contrato.md` (rutas, cuerpos, errores), sus RF en `docs/diseno/requerimientos.md`, su caso de uso en `docs/diseno/casos_de_uso.md` y su sección en `docs/diseno/pantallas.md`. Usa los campos de `db/modelo/diccionario.md`; no inventes ninguno.
2. **Agrega los métodos a `ApiAdmin`** (uno por endpoint, con el nombre en español y el endpoint en el comentario) y devuélvelos como arreglo con la forma del contrato. Impleméntalos en:
   - `ApiHttp`: una línea con `$this->enviar('get', '/admin/usuarios', $consulta)->json()` (o `put`, `post`, `patch`, `delete`). Los errores ya llegan como `ApiError`.
   - `ApiMock`: lee y escribe con `Almacen::leer()` / `Almacen::modificar(function (array &$estado) { … })`, valida y responde con **los mismos códigos de error del contrato** (`404 no_encontrado`, `409 …`, `422 validacion` con `campos`). Lanza el error después de guardar, no dentro de la función que modifica el estado (mira `login()`).
3. **Agrega los datos al mock** en `app/Servicios/Api/Mock/datos.php` bajo una llave nueva (`'empresas' => [...]`), con los de `db/semillas/S002__datos_prueba.sql` y los nombres de campo del contrato (snake_case, catálogos como objetos `{id, nombre}`, fechas en UTC). Si necesita más volumen para probar la paginación de 25, agrégalo ahí, con ids de 100 en adelante para lo que no esté en S002. Corre `php artisan inclutec:mock-reiniciar`.
4. **Crea o completa el controlador** (`app/Http/Controllers/…`): recibe `ApiAdmin` en el constructor, valida con `$request->validate()` (mensajes en español de México), llama al servicio y pasa el resultado a la vista. Captura `ApiError` solo para los errores que la pantalla maneja (409, 422…): `withErrors($error->campos)` para campos y `->with('error', …)` para el resto; el 401 y el 423 ya los maneja `bootstrap/app.php`.
5. **Registra la ruta** dentro del grupo `Route::middleware('admin')` de `routes/web.php`, con nombre.
6. **Arma la vista** con el layout y los componentes de arriba. Un `<h1>` (con `<x-encabezado-pagina>`), filtros con `<x-filtros>`, tabla con `<x-tabla>`, estados con `<x-insignia-estado>`, paginación con `<x-paginacion :total="$pagina['total']" :page="$pagina['page']" :size="$pagina['size']" />`, acciones críticas con `<x-confirmacion pedirMotivo …>`. Textos en español de México; fechas en hora de la Ciudad de México.
7. **Prueba**:
   - **Pruebas de Laravel** (`tests/Feature`): la ruta sin sesión lleva a `/login`; el caso feliz con el mock; cada error del contrato que la pantalla maneja; un `Http::fake` con la respuesta del contrato para `ApiHttp`; el `<h1>` único y los textos de estado. Usa `tests/Feature/CambiarContrasena*Test.php` como ejemplo.
   - **axe** (claro y oscuro) sobre la pantalla nueva, incluidos los estados con errores y con modales abiertos: sin hallazgos. Se puede correr con la extensión de navegador de axe DevTools, o con `axe-core` y Puppeteer/Playwright.
   - **Teclado**: recorre la pantalla solo con Tab, Shift+Tab, Enter, Espacio y Escape. El orden es lógico, el foco siempre se ve, los modales atrapan y devuelven el foco, y todo se puede hacer sin ratón.
   - `php artisan test`, `./vendor/bin/pint --test` y `npm run build` sin errores.
