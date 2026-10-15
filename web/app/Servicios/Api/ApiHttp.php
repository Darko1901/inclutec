<?php

namespace App\Servicios\Api;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/** Implementación que llama al API real (INCLUTEC_API_URL). */
class ApiHttp implements ApiAdmin
{
    /** Llave de la sesión del servidor donde vive el JWT; nunca se envía al navegador. */
    public const SESION_TOKEN = 'api_token';

    private const TIEMPO_MAXIMO = 15;

    public function login(string $correo, string $contrasena): array
    {
        return $this->enviar('post', '/auth/login', ['correo' => $correo, 'contrasena' => $contrasena])->json();
    }

    public function me(): array
    {
        return $this->enviar('get', '/auth/me')->json();
    }

    public function logout(): void
    {
        $this->enviar('post', '/auth/logout');
    }

    private function peticion(): PendingRequest
    {
        $peticion = Http::baseUrl(rtrim((string) config('inclutec.api_url'), '/'))
            ->acceptJson()
            ->timeout(self::TIEMPO_MAXIMO);

        $token = session(self::SESION_TOKEN);

        return $token ? $peticion->withToken($token) : $peticion;
    }

    /**
     * @param  array<string, mixed>  $datos
     *
     * @throws ApiError
     */
    private function enviar(string $metodo, string $ruta, array $datos = []): Response
    {
        try {
            $respuesta = $this->peticion()->{$metodo}($ruta, $datos);
        } catch (ConnectionException) {
            throw ApiError::interno();
        }

        if ($respuesta->failed()) {
            throw ApiError::desdeRespuesta($respuesta);
        }

        return $respuesta;
    }
}
