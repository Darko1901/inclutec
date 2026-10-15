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
}
