<?php

namespace App\Servicios\Api;

use App\Servicios\Api\Mock\Almacen;
use App\Servicios\Api\Mock\CalculadoraEstadisticas;
use App\Servicios\Api\Mock\ExportadorEstadisticas;
use App\Servicios\Api\Mock\GestionEmpresas;
use App\Servicios\Api\Mock\GestionReportes;
use App\Servicios\Api\Mock\GestionUsuarios;
use App\Servicios\Api\Mock\GestionVacantes;
use Carbon\CarbonImmutable;

/**
 * Implementación con datos simulados. Responde con la forma del contrato y con los mismos códigos
 * de error que dará el API. Parte de los datos de Mock/datos.php y guarda sus cambios en el archivo
 * que administra Mock\Almacen, así sobreviven entre peticiones.
 */
class ApiMock implements ApiAdmin
{
    private const MAX_INTENTOS_FALLIDOS = 5;

    private const BLOQUEO_SEGUNDOS = 15 * 60;

    private const VIGENCIA_TOKEN_SEGUNDOS = 8 * 60 * 60;

    private const FIRMA_SIMULADA = 'firma-simulada';

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    public function login(string $correo, string $contrasena): array
    {
        $this->simularLatencia();

        $campos = [];
        if (! filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $campos['correo'] = 'Escribe un correo válido.';
        }
        if (mb_strlen($contrasena) < 8 || mb_strlen($contrasena) > 64) {
            $campos['contrasena'] = 'Debe tener de 8 a 64 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $llave = sha1(mb_strtolower(trim($correo)));

        // Los intentos fallidos se guardan aunque la respuesta sea un error; por eso el resultado
        // (sesión o error) se devuelve y se lanza después de soltar el archivo.
        $resultado = Almacen::modificar(function (array &$estado) use ($llave, $correo, $contrasena) {
            $intentos = $estado['intentos_login'][$llave] ?? ['fallidos' => 0, 'bloqueado_hasta' => null];

            // Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos,
            // aunque la contraseña sea correcta.
            if ($intentos['bloqueado_hasta'] !== null && $intentos['bloqueado_hasta'] > time()) {
                return new ApiError(
                    429,
                    'demasiados_intentos',
                    'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
                    [],
                    $intentos['bloqueado_hasta'] - time(),
                );
            }
            if ($intentos['bloqueado_hasta'] !== null) {
                $intentos = ['fallidos' => 0, 'bloqueado_hasta' => null];
            }

            $cuenta = $this->buscarPorCorreo($estado, $correo);
            if ($cuenta === null || $cuenta['contrasena'] !== $contrasena) {
                $intentos['fallidos']++;
                if ($intentos['fallidos'] >= self::MAX_INTENTOS_FALLIDOS) {
                    $intentos['bloqueado_hasta'] = time() + self::BLOQUEO_SEGUNDOS;
                }
                $estado['intentos_login'][$llave] = $intentos;

                return new ApiError(401, 'credenciales_invalidas', 'Correo o contraseña incorrectos.');
            }

            unset($estado['intentos_login'][$llave]);
            if ($cuenta['usuario']['estado'] !== 'activo') {
                return new ApiError(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
            }

            return $this->sesionPara($cuenta['usuario']);
        });

        if ($resultado instanceof ApiError) {
            throw $resultado;
        }

        return $resultado;
    }

    public function me(): array
    {
        $this->simularLatencia();

        return $this->exigirSesion(Almacen::leer());
    }

    public function logout(): void
    {
        $this->simularLatencia();
        $this->exigirSesion(Almacen::leer());
    }

    public function cambiarContrasena(string $contrasenaActual, string $contrasenaNueva): void
    {
        $this->simularLatencia();

        $resultado = Almacen::modificar(function (array &$estado) use ($contrasenaActual, $contrasenaNueva) {
            $usuario = $this->exigirSesion($estado);

            if (mb_strlen($contrasenaNueva) < 8 || mb_strlen($contrasenaNueva) > 64
                || ! preg_match('/\pL/u', $contrasenaNueva) || ! preg_match('/\pN/u', $contrasenaNueva)) {
                return new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, [
                    'contrasena_nueva' => 'Debe tener de 8 a 64 caracteres, con al menos una letra y un número.',
                ]);
            }

            foreach ($estado['usuarios'] as &$cuenta) {
                if ($cuenta['usuario']['id'] === $usuario['id']) {
                    if ($cuenta['contrasena'] !== $contrasenaActual) {
                        return new ApiError(400, 'contrasena_incorrecta', 'La contraseña actual no es correcta.');
                    }
                    $cuenta['contrasena'] = $contrasenaNueva;
                }
            }

            return null;
        });

        if ($resultado instanceof ApiError) {
            throw $resultado;
        }
    }

    public function estadisticas(?string $desde = null, ?string $hasta = null): array
    {
        $this->simularLatencia();

        return $this->resumen(Almacen::leer(), $desde, $hasta);
    }

    public function exportarEstadisticas(string $formato, ?string $desde = null, ?string $hasta = null): array
    {
        $this->simularLatencia();

        $estado = Almacen::leer();
        $this->exigirAdministrador($estado);
        if (! in_array($formato, ['pdf', 'xlsx'], true)) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, ['formato' => 'Elige pdf o xlsx.']);
        }

        $resumen = $this->resumen($estado, $desde, $hasta);

        return [
            'contenido' => $formato === 'pdf' ? ExportadorEstadisticas::pdf($resumen) : ExportadorEstadisticas::xlsx($resumen),
            'tipo' => $formato === 'pdf' ? ExportadorEstadisticas::TIPO_PDF : ExportadorEstadisticas::TIPO_XLSX,
            'nombre' => ExportadorEstadisticas::nombre($resumen, $formato),
        ];
    }

    public function usuarios(?string $q = null, ?string $rol = null, ?string $estado = null, int $page = 1, int $size = 25): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionUsuarios::listar($datos, $q, $rol, $estado, $page, $size);
    }

    public function usuario(int $id): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionUsuarios::detalle($datos, $id);
    }

    public function crearUsuario(array $datos): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$estado) use ($datos) {
            $this->exigirAdministrador($estado);

            return GestionUsuarios::crear($estado, $datos);
        });
    }

    public function editarUsuario(int $id, array $datos): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$estado) use ($id, $datos) {
            $this->exigirAdministrador($estado);

            return GestionUsuarios::editar($estado, $id, $datos);
        });
    }

    public function cambiarEstadoUsuario(int $id, string $estado, ?string $motivo = null): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$datos) use ($id, $estado, $motivo) {
            $this->exigirAdministrador($datos);

            return GestionUsuarios::cambiarEstado($datos, $id, $this->exigirSesion($datos)['id'], $estado, $motivo);
        });
    }

    public function listarEmpresas(?string $q = null, ?string $estado = null, ?int $sectorId = null, int $page = 1, int $size = 25): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionEmpresas::listar($datos, $q, $estado, $sectorId, $page, $size);
    }

    public function empresa(int $id): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionEmpresas::detalle($datos, $id);
    }

    public function crearEmpresa(array $datos): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$estado) use ($datos) {
            $this->exigirAdministrador($estado);

            return GestionEmpresas::crear($estado, $datos);
        });
    }

    public function editarEmpresa(int $id, array $datos): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$estado) use ($id, $datos) {
            $this->exigirAdministrador($estado);

            return GestionEmpresas::editar($estado, $id, $datos);
        });
    }

    public function validarEmpresa(int $id, string $decision, ?string $motivo = null): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$estado) use ($id, $decision, $motivo) {
            $this->exigirAdministrador($estado);

            return GestionEmpresas::validar($estado, $id, $decision, $motivo);
        });
    }

    public function cambiarEstadoEmpresa(int $id, string $estado, ?string $motivo = null): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$datos) use ($id, $estado, $motivo) {
            $this->exigirAdministrador($datos);

            return GestionEmpresas::cambiarEstado($datos, $id, $estado, $motivo);
        });
    }

    public function vacantes(?string $q = null, ?int $empresaId = null, ?string $estado = null, ?int $categoriaId = null, ?int $modalidadId = null, bool $conReportes = false, int $page = 1, int $size = 25): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionVacantes::listar($datos, $q, $empresaId, $estado, $categoriaId, $modalidadId, $conReportes, $page, $size);
    }

    public function vacante(int $id): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionVacantes::detalle($datos, $id);
    }

    public function moderarVacante(int $id, string $estado, ?string $motivo = null): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$datos) use ($id, $estado, $motivo) {
            $this->exigirAdministrador($datos);

            return GestionVacantes::moderar($datos, $id, $estado, $motivo);
        });
    }

    public function reportes(?string $estado = null, ?string $tipo = null, ?int $motivoReporteId = null, string $orden = 'antiguos', int $page = 1, int $size = 25): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionReportes::listar($datos, $estado, $tipo, $motivoReporteId, $orden, $page, $size);
    }

    public function reporte(int $id): array
    {
        $this->simularLatencia();
        $datos = Almacen::leer();
        $this->exigirAdministrador($datos);

        return GestionReportes::detalle($datos, $id);
    }

    public function seguimientoReporte(int $id, string $estado, ?string $comentario = null, ?string $resolucion = null, ?string $accion = null): array
    {
        $this->simularLatencia();

        return Almacen::modificar(function (array &$datos) use ($id, $estado, $comentario, $resolucion, $accion) {
            $this->exigirAdministrador($datos);

            return GestionReportes::seguimiento($datos, $id, $this->exigirSesion($datos)['id'], $estado, $comentario, $resolucion, $accion);
        });
    }

    public function catalogo(string $tipo, ?int $entidadId = null): array
    {
        $this->simularLatencia();
        $c = Almacen::leer()['catalogos'];

        $items = match ($tipo) {
            'sectores' => array_map(fn (int $id, string $nombre) => ['id' => $id, 'nombre' => $nombre], array_keys($c['sectores']), $c['sectores']),
            'tamanos-empresa' => array_map(fn (int $id, array $t) => ['id' => $id, 'nombre' => $t[0], 'rango' => $t[1]], array_keys($c['tamanos']), $c['tamanos']),
            'categorias' => array_map(fn (int $id, string $nombre) => ['id' => $id, 'nombre' => $nombre], array_keys($c['categorias']), $c['categorias']),
            'modalidades' => array_map(fn (int $id, string $nombre) => ['id' => $id, 'nombre' => $nombre], array_keys($c['modalidades']), $c['modalidades']),
            'motivos-reporte' => array_map(fn (int $id, array $m) => ['id' => $id, 'nombre' => $m[0], 'aplica_a' => $m[1]], array_keys($c['motivos_reporte']), $c['motivos_reporte']),
            'entidades' => array_map(fn (int $id, string $nombre) => ['id' => $id, 'nombre' => $nombre], array_keys($c['entidades']), $c['entidades']),
            'municipios' => array_map(
                fn (int $id, array $m) => ['id' => $id, 'nombre' => $m[0], 'entidad_federativa_id' => $m[1]],
                array_keys(array_filter($c['municipios'], fn (array $m) => $entidadId === null || $m[1] === $entidadId)),
                array_filter($c['municipios'], fn (array $m) => $entidadId === null || $m[1] === $entidadId),
            ),
            default => throw new ApiError(404, 'no_encontrado', 'El tipo de catálogo no existe.'),
        };
        usort($items, fn (array $a, array $b) => mb_strtolower($a['nombre']) <=> mb_strtolower($b['nombre']));

        return $items;
    }

    public function archivo(string $ruta): array
    {
        $this->simularLatencia();
        $this->exigirAdministrador(Almacen::leer());

        // Los archivos de ejemplo del mock viven en public/mock/.
        $archivo = str_starts_with($ruta, '/mock/') ? public_path(ltrim($ruta, '/')) : null;
        if ($archivo === null || ! is_file($archivo) || str_contains($ruta, '..')) {
            throw new ApiError(404, 'no_encontrado', 'El archivo no existe.');
        }

        return ['contenido' => (string) file_get_contents($archivo), 'tipo' => 'application/pdf', 'nombre' => basename($archivo)];
    }

    /**
     * Valida el periodo y calcula las estadísticas. Por omisión, los últimos 30 días.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    private function resumen(array $estado, ?string $desde, ?string $hasta): array
    {
        $this->exigirAdministrador($estado);

        $campos = [];
        foreach (['desde' => $desde, 'hasta' => $hasta] as $campo => $valor) {
            if ($valor !== null && ! $this->esFecha($valor)) {
                $campos[$campo] = 'Escribe la fecha como AAAA-MM-DD.';
            }
        }
        if ($campos === [] && $desde !== null && $hasta !== null && $desde > $hasta) {
            $campos['hasta'] = 'La fecha final no puede ser anterior a la inicial.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $hasta ??= now()->format('Y-m-d');
        $desde ??= CarbonImmutable::parse($hasta)->subDays(30)->format('Y-m-d');

        return CalculadoraEstadisticas::calcular($estado, $desde, $hasta);
    }

    private function esFecha(string $valor): bool
    {
        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $valor);

        return $fecha !== false && $fecha->format('Y-m-d') === $valor;
    }

    /**
     * @param  array<string, mixed>  $estado
     *
     * @throws ApiError 401 sin sesión, 423 cuenta suspendida y 403 si el rol no es administrador.
     */
    private function exigirAdministrador(array $estado): void
    {
        if ($this->exigirSesion($estado)['rol'] !== 'administrador') {
            throw new ApiError(403, 'sin_permiso', 'No tienes permiso para esta acción.');
        }
    }

    /** Crea un token con la misma carga que el JWT del contrato: sub, rol y exp (no se firma). */
    public static function crearToken(int $usuarioId, string $rol, ?int $ahora = null): string
    {
        $carga = ['sub' => (string) $usuarioId, 'rol' => $rol, 'exp' => ($ahora ?? time()) + self::VIGENCIA_TOKEN_SEGUNDOS];

        return implode('.', [
            self::base64Url(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])),
            self::base64Url(json_encode($carga)),
            self::FIRMA_SIMULADA,
        ]);
    }

    /**
     * Devuelve el usuario del token de la sesión del servidor.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     *
     * @throws ApiError 401 si falta el token, no es del mock o venció; 423 si la cuenta se suspendió.
     */
    private function exigirSesion(array $estado): array
    {
        $carga = $this->leerToken(session(ApiHttp::SESION_TOKEN));
        $cuenta = $carga === null ? null : $this->buscarPorId($estado, (int) $carga['sub']);
        if ($cuenta === null) {
            throw new ApiError(401, 'no_autenticado', 'Tu sesión expiró. Inicia sesión de nuevo.');
        }
        if ($cuenta['usuario']['estado'] !== 'activo') {
            throw new ApiError(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
        }

        return $cuenta['usuario'];
    }

    /** @return array{sub: string, rol: string, exp: int}|null */
    private function leerToken(?string $token): ?array
    {
        $partes = $token === null ? [] : explode('.', $token);
        if (count($partes) !== 3 || $partes[2] !== self::FIRMA_SIMULADA) {
            return null;
        }

        $carga = json_decode(base64_decode(strtr($partes[1], '-_', '+/')), true);
        if (! is_array($carga) || ! isset($carga['sub'], $carga['exp']) || $carga['exp'] <= time()) {
            return null;
        }

        return $carga;
    }

    /**
     * @param  array<string, mixed>  $usuario
     * @return array<string, mixed>
     */
    private function sesionPara(array $usuario): array
    {
        $token = self::crearToken($usuario['id'], $usuario['rol']);
        $carga = $this->leerToken($token);

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expira_en' => gmdate('Y-m-d\TH:i:s\Z', $carga['exp']),
            'usuario' => $usuario,
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array{contrasena: string, usuario: array<string, mixed>}|null
     */
    private function buscarPorCorreo(array $estado, string $correo): ?array
    {
        $correo = mb_strtolower(trim($correo));
        foreach ($estado['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['correo'] === $correo) {
                return $cuenta;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array{contrasena: string, usuario: array<string, mixed>}|null
     */
    private function buscarPorId(array $estado, int $id): ?array
    {
        foreach ($estado['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['id'] === $id) {
                return $cuenta;
            }
        }

        return null;
    }

    /** Latencia corta para que el panel se sienta como con un API real (no se aplica en pruebas). */
    private function simularLatencia(): void
    {
        if (! app()->runningUnitTests()) {
            usleep(random_int(80, 200) * 1000);
        }
    }

    private static function base64Url(string $texto): string
    {
        return rtrim(strtr(base64_encode($texto), '+/', '-_'), '=');
    }
}
