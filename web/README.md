# IncluTec · Panel de administración (`web/`)

Panel web en Laravel (Blade) para el administrador de IncluTec. **No tiene base de datos:** todo pasa por el API REST (`api/`), con JSON y un token JWT. El panel guarda ese token en la **sesión del servidor** y nunca lo manda al navegador.

Pantallas: WEB-01 inicio de sesión (listo) y WEB-02 a WEB-08 (maquetadas con datos fijos; se conectan al API en las siguientes tareas). Qué hace cada una: `docs/diseno/pantallas.md` y `docs/diseno/requerimientos.md`.

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
npm run build          # compila Alpine.js; sin este paso el panel no carga su JavaScript
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

Con el mock, cinco intentos fallidos con el mismo correo bloquean el acceso 15 minutos: el sexto responde 429 con `Retry-After`, aunque la contraseña sea correcta. El estado se guarda en la caché de archivo; para reiniciarlo, `php artisan cache:clear`.

## Estructura

```
app/
  Http/
    Controllers/        un controlador por pantalla; SesionController maneja login y logout
    Middleware/         ExigirAdministrador (alias `admin`): exige sesión y valida el token con GET /auth/me
  Providers/            ApiServiceProvider elige ApiMock o ApiHttp según INCLUTEC_API_MOCK
  Servicios/Api/
    ApiAdmin.php        interfaz: lo único de lo que dependen los controladores
    ApiHttp.php         llama al API real (Bearer con el token de la sesión, 15 s de tiempo máximo)
    ApiMock.php         responde como el contrato con datos de prueba
    Mock/datos.php      datos del mock (los de S002); único lugar donde viven
    ApiError.php        excepción con status, codigo, detail y campos (forma del contrato)
bootstrap/app.php       alias del middleware y manejo de ApiError (401 y 423 cierran sesión)
config/inclutec.php     api_url y mock
resources/views/        layouts, auth/ (WEB-01) y admin/ (WEB-02 a WEB-09)
resources/js/app.js     Alpine.js (se empaqueta con Vite; no se carga desde ningún CDN)
public/css/admin.css    estilos del panel
tests/                  pruebas de Feature (login, rutas, sesión) y Unit (ApiMock y ApiHttp)
```

Reglas del panel: las vistas nunca importan datos de prueba; siempre pasan por `ApiAdmin`. Rutas, campos, estados y errores siguen `docs/api/contrato.md`. Para agregar un grupo del contrato (estadísticas, usuarios, empresas…), se agregan los métodos a `ApiAdmin`, a `ApiHttp` y a `ApiMock` (con sus datos en `Mock/datos.php`).

## Calidad

```bash
php artisan test           # pruebas
./vendor/bin/pint --test   # estilo (Laravel Pint); sin --test corrige los archivos
npm run build              # compila el JavaScript
```
