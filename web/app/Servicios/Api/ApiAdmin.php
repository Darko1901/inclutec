<?php

namespace App\Servicios\Api;

/**
 * Operaciones del API que usa el panel de administración. Los controladores solo dependen de
 * esta interfaz; la implementación (ApiHttp o ApiMock) se elige con INCLUTEC_API_MOCK.
 *
 * Crece por grupos del contrato (estadísticas, usuarios, empresas, vacantes, catálogos, reportes).
 * Todos los métodos devuelven el JSON del contrato como arreglo y lanzan ApiError si falla.
 */
interface ApiAdmin
{
    // --- Autenticación y cuenta ---

    /**
     * POST /auth/login. Devuelve el objeto Sesion: access_token, token_type, expira_en y usuario.
     *
     * @return array<string, mixed>
     */
    public function login(string $correo, string $contrasena): array;

    /**
     * GET /auth/me con el token de la sesión del servidor. Devuelve el objeto Usuario.
     *
     * @return array<string, mixed>
     */
    public function me(): array;

    /** POST /auth/logout con el token de la sesión del servidor (204 sin cuerpo). */
    public function logout(): void;

    /**
     * PUT /auth/password (204 sin cuerpo). Lanza 400 `contrasena_incorrecta` si la actual no coincide
     * y 422 `validacion` (con `campos`) si la nueva no cumple la política.
     */
    public function cambiarContrasena(string $contrasenaActual, string $contrasenaNueva): void;

    // --- Administración: estadísticas ---

    /**
     * GET /admin/estadisticas/resumen. Devuelve el objeto Estadisticas del contrato. `desde` y `hasta`
     * son AAAA-MM-DD; sin ellos, el API usa los últimos 30 días.
     *
     * @return array<string, mixed>
     */
    public function estadisticas(?string $desde = null, ?string $hasta = null): array;

    /**
     * GET /admin/estadisticas/exportar. `formato` es `pdf` o `xlsx`. Devuelve el archivo tal como lo
     * manda el API: su contenido, su tipo (`Content-Type`) y su nombre (`Content-Disposition`).
     *
     * @return array{contenido: string, tipo: string, nombre: string}
     */
    public function exportarEstadisticas(string $formato, ?string $desde = null, ?string $hasta = null): array;

    // --- Administración: usuarios ---

    /**
     * GET /admin/usuarios. Más recientes primero. Devuelve PaginaUsuarios: items (UsuarioAdmin), total,
     * page y size. `q` busca en nombre, apellidos o correo; `rol` y `estado` filtran.
     *
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public function usuarios(?string $q = null, ?string $rol = null, ?string $estado = null, int $page = 1, int $size = 25): array;

    /**
     * GET /admin/usuarios/{id}. Devuelve UsuarioAdminDetalle (nunca trae necesidades de ajuste).
     * Lanza 404 `no_encontrado`.
     *
     * @return array<string, mixed>
     */
    public function usuario(int $id): array;

    /**
     * POST /admin/usuarios con un UsuarioAdminEntrada (rol, nombre, apellidos, correo, telefono,
     * contrasena, empresa_id, puesto). Devuelve el UsuarioAdmin creado. Lanza 409 `correo_duplicado` y
     * 422 `validacion` (con `campos`).
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function crearUsuario(array $datos): array;

    /**
     * PUT /admin/usuarios/{id} con un UsuarioAdminEntrada (sin contrasena). Devuelve el UsuarioAdmin.
     * Lanza 404, 409 `correo_duplicado`, 409 `en_uso` (cambio de rol con postulaciones o vacantes) y 422.
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function editarUsuario(int $id, array $datos): array;

    /**
     * PATCH /admin/usuarios/{id}/estado con un CambioEstadoUsuario. `estado` es activo, suspendido o
     * eliminado; el motivo es obligatorio salvo al reactivar. Lanza 404, 409 `estado_invalido` (un
     * administrador no puede suspenderse a sí mismo) y 422 `validacion`.
     *
     * @return array<string, mixed>
     */
    public function cambiarEstadoUsuario(int $id, string $estado, ?string $motivo = null): array;

    // --- Administración: empresas ---

    /**
     * GET /admin/empresas. Devuelve PaginaEmpresasAdmin: las pendientes primero (de la más antigua a la
     * más reciente) y después las demás por nombre. `q` busca en razón social, nombre comercial o RFC.
     *
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public function listarEmpresas(?string $q = null, ?string $estado = null, ?int $sectorId = null, int $page = 1, int $size = 25): array;

    /**
     * GET /admin/empresas/{id}. Devuelve EmpresaAdminDetalle: la empresa, sus reclutadores, `rfc_duplicado`
     * y los reportes recibidos. Lanza 404 `no_encontrado`.
     *
     * @return array<string, mixed>
     */
    public function empresa(int $id): array;

    /**
     * POST /admin/empresas con un EmpresaAdminEntrada. La empresa se crea ya validada; devuelve la
     * EmpresaPropia. Lanza 409 `rfc_duplicado` y 422 `validacion` (con `campos`).
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function crearEmpresa(array $datos): array;

    /**
     * PUT /admin/empresas/{id} con un EmpresaAdminEntrada (el administrador sí puede corregir razón
     * social y RFC de una empresa validada). Lanza 404, 409 `rfc_duplicado` y 422.
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function editarEmpresa(int $id, array $datos): array;

    /**
     * PATCH /admin/empresas/{id}/validacion. `decision` es `validada` o `rechazada` (el motivo es
     * obligatorio al rechazar). Solo para empresas pendientes: si no, 409 `estado_invalido`. Devuelve la
     * EmpresaPropia.
     *
     * @return array<string, mixed>
     */
    public function validarEmpresa(int $id, string $decision, ?string $motivo = null): array;

    /**
     * PATCH /admin/empresas/{id}/estado. `estado` es `suspendida` (motivo obligatorio) o `validada` para
     * reactivar. Devuelve ResultadoEstadoEmpresa: la empresa, `vacantes_suspendidas` y
     * `postulados_notificados`. Lanza 409 `transicion_invalida` y 422.
     *
     * @return array{empresa: array<string, mixed>, vacantes_suspendidas: int, postulados_notificados: int}
     */
    public function cambiarEstadoEmpresa(int $id, string $estado, ?string $motivo = null): array;

    // --- Administración: vacantes ---

    /**
     * GET /admin/vacantes. Devuelve PaginaVacantesAdmin (VacanteAdmin: título, empresa, categoría,
     * modalidad, estado, fecha de publicación, postulados y reportes abiertos). `q` busca en el título y
     * `conReportes` deja solo las vacantes con reportes abiertos.
     *
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public function vacantes(?string $q = null, ?int $empresaId = null, ?string $estado = null, ?int $categoriaId = null, ?int $modalidadId = null, bool $conReportes = false, int $page = 1, int $size = 25): array;

    /**
     * GET /vacantes/{id}. Devuelve el VacanteDetalle (para el administrador, con `postulados`). Lanza 404
     * `no_encontrado`.
     *
     * @return array<string, mixed>
     */
    public function vacante(int $id): array;

    /**
     * PATCH /admin/vacantes/{id}/estado. `estado` es `suspendida` (motivo obligatorio) o `publicada` para
     * reactivar. Devuelve el VacanteDetalle. Lanza 409 `transicion_invalida` (solo se suspende una publicada
     * o pausada y solo se reactiva una suspendida) y 422 `validacion`.
     *
     * @return array<string, mixed>
     */
    public function moderarVacante(int $id, string $estado, ?string $motivo = null): array;

    // --- Administración: reportes ---

    /**
     * GET /admin/reportes. Devuelve PaginaReportes (ReporteAdmin: folio, tipo, elemento reportado, motivo,
     * quién reporta, estado y fecha). `orden` es `antiguos` (por omisión) o `recientes`.
     *
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public function reportes(?string $estado = null, ?string $tipo = null, ?int $motivoReporteId = null, string $orden = 'antiguos', int $page = 1, int $size = 25): array;

    /**
     * GET /admin/reportes/{id}. Devuelve ReporteAdminDetalle: el reporte, su descripción y resolución, el
     * historial, el estado actual del elemento reportado y los reportes previos contra él. Lanza 404.
     *
     * @return array<string, mixed>
     */
    public function reporte(int $id): array;

    /**
     * PATCH /admin/reportes/{id} con un SeguimientoReporte: `estado` en_revision, resuelto o descartado;
     * `resolucion` obligatoria al cerrar y `accion` ninguna o suspension. Devuelve el ReporteAdminDetalle.
     * Lanza 409 `transicion_invalida` y 422 `validacion`. La suspensión del elemento se hace con
     * `cambiarEstadoUsuario`, `cambiarEstadoEmpresa` o `moderarVacante`.
     *
     * @return array<string, mixed>
     */
    public function seguimientoReporte(int $id, string $estado, ?string $comentario = null, ?string $resolucion = null, ?string $accion = null): array;

    // --- Catálogos y archivos ---

    /**
     * GET /catalogos/{tipo}: arreglo de CatalogoItem ordenado por nombre. Tipos que usa el panel:
     * `sectores`, `tamanos-empresa`, `entidades`, `municipios` (con `entidad_id` opcional), `categorias`, `modalidades` y `motivos-reporte`.
     *
     * @return list<array<string, mixed>>
     */
    public function catalogo(string $tipo, ?int $entidadId = null): array;

    /**
     * Descarga un archivo del API con el token de la sesión (por ejemplo, la constancia fiscal
     * `/archivos/documentos/empresa-1.pdf`): el navegador nunca recibe el token. Devuelve su contenido, tipo
     * y nombre. Lanza 404 si no existe.
     *
     * @return array{contenido: string, tipo: string, nombre: string}
     */
    public function archivo(string $ruta): array;
}
