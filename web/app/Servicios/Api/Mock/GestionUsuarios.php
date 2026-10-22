<?php

namespace App\Servicios\Api\Mock;

use App\Servicios\Api\ApiError;

/**
 * Reglas de GET/POST/PUT/PATCH /admin/usuarios sobre el estado del mock (WEB-03). Las funciones que
 * modifican reciben el estado por referencia y lanzan ApiError con los códigos del contrato; como el
 * error se lanza antes de guardar, un cambio rechazado nunca deja datos a medias.
 */
class GestionUsuarios
{
    public const ROLES = ['candidato', 'reclutador', 'administrador'];

    public const ESTADOS = ['activo', 'suspendido', 'eliminado'];

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    /**
     * @param  array<string, mixed>  $estado
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public static function listar(array $estado, ?string $q, ?string $rol, ?string $estadoUsuario, int $page, int $size): array
    {
        $campos = [];
        if ($rol !== null && $rol !== '' && ! in_array($rol, self::ROLES, true)) {
            $campos['rol'] = 'Elige candidato, reclutador o administrador.';
        }
        if ($estadoUsuario !== null && $estadoUsuario !== '' && ! in_array($estadoUsuario, self::ESTADOS, true)) {
            $campos['estado'] = 'Elige activo, suspendido o eliminado.';
        }
        if ($page < 1) {
            $campos['page'] = 'La página empieza en 1.';
        }
        if ($size < 1 || $size > 100) {
            $campos['size'] = 'El tamaño de página va de 1 a 100.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $busqueda = mb_strtolower(trim((string) $q));
        $cuentas = array_filter($estado['usuarios'], function (array $cuenta) use ($busqueda, $rol, $estadoUsuario) {
            $u = $cuenta['usuario'];
            $texto = mb_strtolower($u['nombre'].' '.$u['apellidos'].' '.$u['correo']);

            return ($busqueda === '' || str_contains($texto, $busqueda))
                && ($rol === null || $rol === '' || $u['rol'] === $rol)
                && ($estadoUsuario === null || $estadoUsuario === '' || $u['estado'] === $estadoUsuario);
        });
        // Más recientes primero.
        usort($cuentas, fn (array $a, array $b) => [$b['ficha']['creado_en'], $b['usuario']['id']] <=> [$a['ficha']['creado_en'], $a['usuario']['id']]);

        return [
            'items' => array_map(self::usuarioAdmin(...), array_slice($cuentas, ($page - 1) * $size, $size)),
            'total' => count($cuentas),
            'page' => $page,
            'size' => $size,
        ];
    }

    /**
     * UsuarioAdminDetalle. Nunca incluye las necesidades de ajuste del candidato.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function detalle(array $estado, int $id): array
    {
        $cuenta = $estado['usuarios'][self::indice($estado, $id)];
        $rol = $cuenta['usuario']['rol'];

        $vacantesPropias = array_filter($estado['vacantes'], fn (array $v) => $v['reclutador_id'] === $id);
        $recibidos = match ($rol) {
            'candidato' => array_filter($estado['reportes'], fn (array $r) => ($r['candidato_id'] ?? null) === $id),
            'reclutador' => array_filter($estado['reportes'], fn (array $r) => in_array($r['vacante_id'] ?? null, array_column($vacantesPropias, 'id'), true)),
            default => [],
        };

        return [
            'usuario' => self::usuarioAdmin($cuenta),
            'motivo_estado' => $cuenta['ficha']['motivo_estado'],
            'puesto' => $cuenta['ficha']['puesto'],
            'totales' => [
                'postulaciones' => $rol === 'candidato' ? self::postulaciones($estado, $id) : null,
                'vacantes' => $rol === 'reclutador' ? count($vacantesPropias) : null,
                'reportes_recibidos' => count($recibidos),
                'reportes_hechos' => count(array_filter($estado['reportes'], fn (array $r) => ($r['reportante_id'] ?? null) === $id)),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function crear(array &$estado, array $datos): array
    {
        $limpios = self::validarEntrada($estado, $datos, true);
        self::exigirCorreoLibre($estado, $limpios['correo'], null);

        $id = max(100, ...array_map(fn (array $c) => $c['usuario']['id'], $estado['usuarios'])) + 1;
        $cuenta = [
            'contrasena' => (string) $datos['contrasena'],
            'ficha' => ['creado_en' => gmdate('Y-m-d\TH:i:s\Z'), 'ultimo_acceso_en' => null, 'motivo_estado' => null, 'puesto' => $limpios['puesto']],
            'usuario' => [
                'id' => $id,
                'correo' => $limpios['correo'],
                'nombre' => $limpios['nombre'],
                'apellidos' => $limpios['apellidos'],
                'telefono' => $limpios['telefono'],
                'rol' => $limpios['rol'],
                'estado' => 'activo',
                'empresa' => self::empresa($estado, $limpios['empresa_id']),
                // Un candidato creado por el administrador empieza sin consentimiento.
                'consentimiento_sensibles' => $limpios['rol'] === 'candidato' ? false : null,
            ],
        ];
        $estado['usuarios'][] = $cuenta;

        return self::usuarioAdmin($cuenta);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function editar(array &$estado, int $id, array $datos): array
    {
        $indice = self::indice($estado, $id);
        $limpios = self::validarEntrada($estado, $datos, false);
        self::exigirCorreoLibre($estado, $limpios['correo'], $id);

        $actual = $estado['usuarios'][$indice]['usuario'];
        if ($limpios['rol'] !== $actual['rol']
            && (($actual['rol'] === 'candidato' && self::postulaciones($estado, $id) > 0)
                || ($actual['rol'] === 'reclutador' && array_filter($estado['vacantes'], fn (array $v) => $v['reclutador_id'] === $id) !== []))) {
            throw new ApiError(409, 'en_uso', 'No se puede cambiar el rol: tiene postulaciones o vacantes.');
        }

        $cuenta = &$estado['usuarios'][$indice];
        $cuenta['usuario'] = array_merge($actual, [
            'correo' => $limpios['correo'],
            'nombre' => $limpios['nombre'],
            'apellidos' => $limpios['apellidos'],
            'telefono' => $limpios['telefono'],
            'rol' => $limpios['rol'],
            // Un reclutador que cambia de rol se desvincula de su empresa.
            'empresa' => self::empresa($estado, $limpios['empresa_id']),
            'consentimiento_sensibles' => $limpios['rol'] === 'candidato' ? ($actual['consentimiento_sensibles'] ?? false) : null,
        ]);
        $cuenta['ficha']['puesto'] = $limpios['puesto'];

        return self::usuarioAdmin($cuenta);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function cambiarEstado(array &$estado, int $id, int $administradorId, string $nuevo, ?string $motivo): array
    {
        $indice = self::indice($estado, $id);

        $campos = [];
        if (! in_array($nuevo, self::ESTADOS, true)) {
            $campos['estado'] = 'Elige activo, suspendido o eliminado.';
        }
        $motivo = $motivo === null ? null : trim($motivo);
        if ($nuevo !== 'activo' && ($motivo === null || $motivo === '')) {
            $campos['motivo'] = 'Escribe el motivo.';
        } elseif ($motivo !== null && mb_strlen($motivo) > 255) {
            $campos['motivo'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }
        if ($id === $administradorId && $nuevo !== 'activo') {
            throw new ApiError(409, 'estado_invalido', 'Un administrador no puede suspenderse a sí mismo.');
        }

        $cuenta = &$estado['usuarios'][$indice];
        $cuenta['usuario']['estado'] = $nuevo;
        $cuenta['ficha']['motivo_estado'] = $nuevo === 'activo' ? null : $motivo;

        return self::usuarioAdmin($cuenta);
    }

    /**
     * Objeto UsuarioAdmin: el Usuario del contrato más lo que solo ve el administrador.
     *
     * @param  array<string, mixed>  $cuenta
     * @return array<string, mixed>
     */
    private static function usuarioAdmin(array $cuenta): array
    {
        $u = $cuenta['usuario'];

        return [
            'id' => $u['id'],
            'nombre' => $u['nombre'],
            'apellidos' => $u['apellidos'],
            'correo' => $u['correo'],
            'telefono' => $u['telefono'],
            'rol' => $u['rol'],
            'estado' => $u['estado'],
            'empresa' => $u['empresa'] === null ? null : ['id' => $u['empresa']['id'], 'nombre_comercial' => $u['empresa']['nombre_comercial']],
            'creado_en' => $cuenta['ficha']['creado_en'],
            'ultimo_acceso_en' => $cuenta['ficha']['ultimo_acceso_en'],
        ];
    }

    /**
     * Valida un UsuarioAdminEntrada y devuelve los campos ya limpios (sin la contraseña).
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array{rol: string, nombre: string, apellidos: string, correo: string, telefono: ?string, empresa_id: ?int, puesto: ?string}
     */
    private static function validarEntrada(array $estado, array $datos, bool $alCrear): array
    {
        $texto = fn (string $campo): string => is_string($datos[$campo] ?? null) ? trim($datos[$campo]) : '';
        $rol = $texto('rol');
        $nombre = $texto('nombre');
        $apellidos = $texto('apellidos');
        $correo = mb_strtolower($texto('correo'));
        $telefono = $texto('telefono');
        $puesto = $texto('puesto');
        $empresaId = isset($datos['empresa_id']) && $datos['empresa_id'] !== '' ? (int) $datos['empresa_id'] : null;

        $campos = [];
        if (! in_array($rol, self::ROLES, true)) {
            $campos['rol'] = 'Elige candidato, reclutador o administrador.';
        }
        if ($nombre === '' || mb_strlen($nombre) > 80) {
            $campos['nombre'] = $nombre === '' ? 'Escribe el nombre.' : 'Debe tener máximo 80 caracteres.';
        }
        if ($apellidos === '' || mb_strlen($apellidos) > 120) {
            $campos['apellidos'] = $apellidos === '' ? 'Escribe los apellidos.' : 'Debe tener máximo 120 caracteres.';
        }
        if (! filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 254) {
            $campos['correo'] = 'Escribe un correo válido.';
        }
        if ($telefono !== '' && ! preg_match('/^[0-9]{10}$/', $telefono)) {
            $campos['telefono'] = 'Debe tener 10 dígitos.';
        }
        if ($alCrear) {
            $contrasena = $datos['contrasena'] ?? null;
            if (! is_string($contrasena) || mb_strlen($contrasena) < 8 || mb_strlen($contrasena) > 64) {
                $campos['contrasena'] = 'Debe tener de 8 a 64 caracteres.';
            }
        }
        if ($rol === 'reclutador') {
            if ($empresaId === null || self::empresa($estado, $empresaId) === null) {
                $campos['empresa_id'] = 'Elige una empresa de la lista.';
            }
            if ($puesto === '' || mb_strlen($puesto) > 100) {
                $campos['puesto'] = $puesto === '' ? 'Escribe el puesto.' : 'Debe tener máximo 100 caracteres.';
            }
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $esReclutador = $rol === 'reclutador';

        return [
            'rol' => $rol,
            'nombre' => $nombre,
            'apellidos' => $apellidos,
            'correo' => $correo,
            'telefono' => $telefono === '' ? null : $telefono,
            'empresa_id' => $esReclutador ? $empresaId : null,
            'puesto' => $esReclutador ? $puesto : null,
        ];
    }

    /** @param  array<string, mixed>  $estado */
    private static function exigirCorreoLibre(array $estado, string $correo, ?int $exceptoId): void
    {
        foreach ($estado['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['correo'] === $correo && $cuenta['usuario']['id'] !== $exceptoId) {
                throw new ApiError(409, 'correo_duplicado', 'El correo ya está registrado.');
            }
        }
    }

    /**
     * Referencia a la empresa tal como la guarda el Usuario del contrato (con su estado).
     *
     * @param  array<string, mixed>  $estado
     * @return array{id: int, nombre_comercial: string, estado: string}|null
     */
    private static function empresa(array $estado, ?int $empresaId): ?array
    {
        foreach ($estado['empresas'] as $empresa) {
            if ($empresa['id'] === $empresaId) {
                return ['id' => $empresa['id'], 'nombre_comercial' => $empresa['nombre_comercial'], 'estado' => $empresa['estado']];
            }
        }

        return null;
    }

    /** @param  array<string, mixed>  $estado */
    private static function postulaciones(array $estado, int $candidatoId): int
    {
        return count(array_filter($estado['postulaciones'], fn (array $p) => $p['candidato_id'] === $candidatoId));
    }

    /** @param  array<string, mixed>  $estado */
    private static function indice(array $estado, int $id): int
    {
        foreach ($estado['usuarios'] as $indice => $cuenta) {
            if ($cuenta['usuario']['id'] === $id) {
                return $indice;
            }
        }

        throw new ApiError(404, 'no_encontrado', 'El usuario no existe.');
    }
}
