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
}
