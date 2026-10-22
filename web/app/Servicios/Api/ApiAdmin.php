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
     * más reciente) y después las demás por nombre. WEB-03 la usa para elegir la empresa de un reclutador.
     *
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public function listarEmpresas(int $page = 1, int $size = 25): array;
}
