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

    public function cambiarContrasena(string $contrasenaActual, string $contrasenaNueva): void
    {
        $this->enviar('put', '/auth/password', [
            'contrasena_actual' => $contrasenaActual,
            'contrasena_nueva' => $contrasenaNueva,
        ]);
    }

    public function estadisticas(?string $desde = null, ?string $hasta = null): array
    {
        return $this->enviar('get', '/admin/estadisticas/resumen', $this->periodo($desde, $hasta))->json();
    }

    public function exportarEstadisticas(string $formato, ?string $desde = null, ?string $hasta = null): array
    {
        $respuesta = $this->enviar('get', '/admin/estadisticas/exportar', ['formato' => $formato] + $this->periodo($desde, $hasta));

        // El nombre viene en Content-Disposition; si falta, se arma con el periodo y el formato.
        $nombre = preg_match('/filename\*?=(?:UTF-8\'\')?"?([^";]+)"?/i', $respuesta->header('Content-Disposition'), $partes)
            ? basename(rawurldecode($partes[1]))
            : "estadisticas.{$formato}";

        return [
            'contenido' => $respuesta->body(),
            'tipo' => trim(explode(';', $respuesta->header('Content-Type'))[0]) ?: 'application/octet-stream',
            'nombre' => $nombre,
        ];
    }

    public function usuarios(?string $q = null, ?string $rol = null, ?string $estado = null, int $page = 1, int $size = 25): array
    {
        $consulta = array_filter(['q' => $q, 'rol' => $rol, 'estado' => $estado], fn (?string $valor) => $valor !== null && $valor !== '');

        return $this->enviar('get', '/admin/usuarios', $consulta + ['page' => $page, 'size' => $size])->json();
    }

    public function usuario(int $id): array
    {
        return $this->enviar('get', "/admin/usuarios/{$id}")->json();
    }

    public function crearUsuario(array $datos): array
    {
        return $this->enviar('post', '/admin/usuarios', $datos)->json();
    }

    public function editarUsuario(int $id, array $datos): array
    {
        return $this->enviar('put', "/admin/usuarios/{$id}", $datos)->json();
    }

    public function cambiarEstadoUsuario(int $id, string $estado, ?string $motivo = null): array
    {
        return $this->enviar('patch', "/admin/usuarios/{$id}/estado", ['estado' => $estado, 'motivo' => $motivo])->json();
    }

    public function listarEmpresas(?string $q = null, ?string $estado = null, ?int $sectorId = null, int $page = 1, int $size = 25): array
    {
        $consulta = array_filter(['q' => $q, 'estado' => $estado, 'sector_id' => $sectorId], fn ($valor) => $valor !== null && $valor !== '');

        return $this->enviar('get', '/admin/empresas', $consulta + ['page' => $page, 'size' => $size])->json();
    }

    public function empresa(int $id): array
    {
        return $this->enviar('get', "/admin/empresas/{$id}")->json();
    }

    public function crearEmpresa(array $datos): array
    {
        return $this->enviar('post', '/admin/empresas', $datos)->json();
    }

    public function editarEmpresa(int $id, array $datos): array
    {
        return $this->enviar('put', "/admin/empresas/{$id}", $datos)->json();
    }

    public function validarEmpresa(int $id, string $decision, ?string $motivo = null): array
    {
        return $this->enviar('patch', "/admin/empresas/{$id}/validacion", ['decision' => $decision, 'motivo' => $motivo])->json();
    }

    public function cambiarEstadoEmpresa(int $id, string $estado, ?string $motivo = null): array
    {
        return $this->enviar('patch', "/admin/empresas/{$id}/estado", ['estado' => $estado, 'motivo' => $motivo])->json();
    }

    public function vacantes(?string $q = null, ?int $empresaId = null, ?string $estado = null, ?int $categoriaId = null, ?int $modalidadId = null, bool $conReportes = false, int $page = 1, int $size = 25): array
    {
        $consulta = array_filter(
            ['q' => $q, 'empresa_id' => $empresaId, 'estado' => $estado, 'categoria_id' => $categoriaId, 'modalidad_id' => $modalidadId, 'con_reportes' => $conReportes ?: null],
            fn ($valor) => $valor !== null && $valor !== '',
        );

        return $this->enviar('get', '/admin/vacantes', $consulta + ['page' => $page, 'size' => $size])->json();
    }

    public function vacante(int $id): array
    {
        return $this->enviar('get', "/vacantes/{$id}")->json();
    }

    public function moderarVacante(int $id, string $estado, ?string $motivo = null): array
    {
        return $this->enviar('patch', "/admin/vacantes/{$id}/estado", ['estado' => $estado, 'motivo' => $motivo])->json();
    }

    public function reportes(?string $estado = null, ?string $tipo = null, ?int $motivoReporteId = null, string $orden = 'antiguos', int $page = 1, int $size = 25): array
    {
        $consulta = array_filter(['estado' => $estado, 'tipo' => $tipo, 'motivo_reporte_id' => $motivoReporteId], fn ($valor) => $valor !== null && $valor !== '');

        return $this->enviar('get', '/admin/reportes', $consulta + ['orden' => $orden, 'page' => $page, 'size' => $size])->json();
    }

    public function reporte(int $id): array
    {
        return $this->enviar('get', "/admin/reportes/{$id}")->json();
    }

    public function seguimientoReporte(int $id, string $estado, ?string $comentario = null, ?string $resolucion = null, ?string $accion = null): array
    {
        return $this->enviar('patch', "/admin/reportes/{$id}", ['estado' => $estado, 'comentario' => $comentario, 'resolucion' => $resolucion, 'accion' => $accion])->json();
    }

    public function catalogo(string $tipo, ?int $entidadId = null): array
    {
        return $this->enviar('get', "/catalogos/{$tipo}", $entidadId === null ? [] : ['entidad_id' => $entidadId])->json();
    }

    public function archivo(string $ruta): array
    {
        // Los archivos se sirven desde el origen del API (http://localhost:8000/archivos/...), fuera de /api/v1.
        $partes = parse_url((string) config('inclutec.api_url'));
        $origen = ($partes['scheme'] ?? 'http').'://'.($partes['host'] ?? 'localhost').(isset($partes['port']) ? ':'.$partes['port'] : '');

        $respuesta = $this->enviar('get', $origen.'/'.ltrim($ruta, '/'));

        return [
            'contenido' => $respuesta->body(),
            'tipo' => trim(explode(';', $respuesta->header('Content-Type'))[0]) ?: 'application/octet-stream',
            'nombre' => basename($ruta),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function periodo(?string $desde, ?string $hasta): array
    {
        return array_filter(['desde' => $desde, 'hasta' => $hasta], fn (?string $fecha) => $fecha !== null);
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
