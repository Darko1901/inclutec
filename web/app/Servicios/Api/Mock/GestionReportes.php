<?php

namespace App\Servicios\Api\Mock;

use App\Servicios\Api\ApiError;

/**
 * Reglas de GET /admin/reportes, GET /admin/reportes/{id} y PATCH /admin/reportes/{id} sobre el
 * estado del mock (WEB-08). Transiciones: abierto → en_revision → resuelto o descartado, y abierto →
 * descartado. Al cerrar se exige la resolución y todo cambio queda en el historial. Los errores se
 * lanzan antes de guardar, así que una transición rechazada nunca deja datos a medias.
 */
class GestionReportes
{
    public const ESTADOS = ['abierto', 'en_revision', 'resuelto', 'descartado'];

    public const TIPOS = ['vacante', 'empresa', 'candidato'];

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    /** Estado → estados a los que puede pasar. */
    private const TRANSICIONES = [
        'abierto' => ['en_revision', 'descartado'],
        'en_revision' => ['resuelto', 'descartado'],
        'resuelto' => [],
        'descartado' => [],
    ];

    /**
     * @param  array<string, mixed>  $estado
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public static function listar(array $estado, ?string $estadoReporte, ?string $tipo, ?int $motivoId, string $orden, int $page, int $size): array
    {
        $campos = [];
        if ($estadoReporte !== null && $estadoReporte !== '' && ! in_array($estadoReporte, self::ESTADOS, true)) {
            $campos['estado'] = 'Elige abierto, en_revision, resuelto o descartado.';
        }
        if ($tipo !== null && $tipo !== '' && ! in_array($tipo, self::TIPOS, true)) {
            $campos['tipo'] = 'Elige vacante, empresa o candidato.';
        }
        if (! in_array($orden, ['antiguos', 'recientes'], true)) {
            $campos['orden'] = 'Elige antiguos o recientes.';
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

        $reportes = array_values(array_filter($estado['reportes'], fn (array $r) => ($estadoReporte === null || $estadoReporte === '' || $r['estado'] === $estadoReporte)
            && ($tipo === null || $tipo === '' || self::tipo($r) === $tipo)
            && ($motivoId === null || $r['motivo_reporte_id'] === $motivoId)));

        // Por omisión, los más antiguos primero (y el folio desempata).
        usort($reportes, fn (array $a, array $b) => $orden === 'recientes'
            ? [$b['creado_en'], $b['id']] <=> [$a['creado_en'], $a['id']]
            : [$a['creado_en'], $a['id']] <=> [$b['creado_en'], $b['id']]);

        return [
            'items' => array_map(fn (array $r) => self::reporteAdmin($estado, $r), array_slice($reportes, ($page - 1) * $size, $size)),
            'total' => count($reportes),
            'page' => $page,
            'size' => $size,
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function detalle(array $estado, int $id): array
    {
        return self::reporteDetalle($estado, $estado['reportes'][self::indice($estado, $id)]);
    }

    /**
     * Dar seguimiento: tomar en revisión, resolver o descartar. Cerrar exige `resolucion`.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function seguimiento(array &$estado, int $id, int $administradorId, string $nuevo, ?string $comentario, ?string $resolucion, ?string $accion): array
    {
        $indice = self::indice($estado, $id);

        $comentario = $comentario === null ? null : trim($comentario);
        $resolucion = $resolucion === null ? null : trim($resolucion);
        $cierra = in_array($nuevo, ['resuelto', 'descartado'], true);

        $campos = [];
        if (! in_array($nuevo, ['en_revision', 'resuelto', 'descartado'], true)) {
            $campos['estado'] = 'Elige en_revision, resuelto o descartado.';
        }
        if ($comentario !== null && mb_strlen($comentario) > 500) {
            $campos['comentario'] = 'Debe tener máximo 500 caracteres.';
        }
        if ($cierra && ($resolucion === null || $resolucion === '')) {
            $campos['resolucion'] = 'Escribe la resolución para cerrar el reporte.';
        } elseif ($resolucion !== null && mb_strlen($resolucion) > 1000) {
            $campos['resolucion'] = 'Debe tener máximo 1000 caracteres.';
        }
        if ($accion !== null && ! in_array($accion, ['ninguna', 'suspension'], true)) {
            $campos['accion'] = 'Elige ninguna o suspension.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $reporte = &$estado['reportes'][$indice];
        if (! in_array($nuevo, self::TRANSICIONES[$reporte['estado']], true)) {
            throw new ApiError(409, 'transicion_invalida', in_array($reporte['estado'], ['resuelto', 'descartado'], true)
                ? 'El reporte ya está cerrado.'
                : 'Un reporte abierto primero se toma en revisión o se descarta; solo uno en revisión se resuelve.');
        }

        $ahora = gmdate('Y-m-d\TH:i:s\Z');
        $reporte['historial'][] = [$reporte['estado'], $nuevo, $comentario === '' ? null : $comentario, $administradorId, $ahora];
        $reporte['estado'] = $nuevo;
        $reporte['atendido_por'] = $administradorId;
        if ($cierra) {
            $reporte['resolucion'] = $resolucion;
            // Descartar nunca lleva sanción.
            $reporte['accion'] = $nuevo === 'descartado' ? 'ninguna' : ($accion ?? 'ninguna');
            $reporte['cerrado_en'] = $ahora;
        }

        return self::reporteDetalle($estado, $reporte);
    }

    /**
     * Tipo del reporte según el elemento al que apunta.
     *
     * @param  array<string, mixed>  $r
     */
    private static function tipo(array $r): string
    {
        return $r['vacante_id'] !== null ? 'vacante' : ($r['empresa_id'] !== null ? 'empresa' : 'candidato');
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $r
     * @return array<string, mixed>
     */
    private static function reporteAdmin(array $estado, array $r): array
    {
        $tipo = self::tipo($r);
        $reportante = self::usuario($estado, $r['reportante_id']);
        $objetoId = $r['vacante_id'] ?? $r['empresa_id'] ?? $r['candidato_id'];

        return [
            'id' => $r['id'],
            'tipo' => $tipo,
            'objeto' => ['id' => $objetoId, 'nombre' => self::nombreObjeto($estado, $tipo, $objetoId)],
            'motivo' => ['id' => $r['motivo_reporte_id'], 'nombre' => $estado['catalogos']['motivos_reporte'][$r['motivo_reporte_id']][0]],
            'reportante' => ['id' => $reportante['id'], 'nombre' => $reportante['nombre'], 'apellidos' => $reportante['apellidos']],
            'estado' => $r['estado'],
            'creado_en' => $r['creado_en'],
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $r
     * @return array<string, mixed>
     */
    private static function reporteDetalle(array $estado, array $r): array
    {
        $tipo = self::tipo($r);
        $objetoId = $r['vacante_id'] ?? $r['empresa_id'] ?? $r['candidato_id'];
        $atendido = $r['atendido_por'] === null ? null : self::usuario($estado, $r['atendido_por']);

        $previos = array_filter($estado['reportes'], fn (array $otro) => $otro['id'] !== $r['id'] && self::tipo($otro) === $tipo
            && ($otro['vacante_id'] ?? $otro['empresa_id'] ?? $otro['candidato_id']) === $objetoId);
        usort($previos, fn (array $a, array $b) => [$a['creado_en'], $a['id']] <=> [$b['creado_en'], $b['id']]);

        return [
            'reporte' => self::reporteAdmin($estado, $r),
            'descripcion' => $r['descripcion'],
            'resolucion' => $r['resolucion'],
            'accion' => $r['accion'],
            'atendido_por' => $atendido === null ? null : ['id' => $atendido['id'], 'nombre' => $atendido['nombre'], 'apellidos' => $atendido['apellidos']],
            'cerrado_en' => $r['cerrado_en'],
            'historial' => array_map(function (array $h) use ($estado) {
                $usuario = $h[3] === null ? null : self::usuario($estado, $h[3]);

                return [
                    'estado_anterior' => $h[0], 'estado_nuevo' => $h[1], 'comentario' => $h[2],
                    'usuario' => $usuario === null ? null : ['id' => $usuario['id'], 'nombre' => $usuario['nombre']],
                    'creado_en' => $h[4],
                ];
            }, $r['historial']),
            'objeto_estado' => self::estadoObjeto($estado, $tipo, $objetoId),
            'reportes_previos' => array_values(array_map(fn (array $otro) => [
                'id' => $otro['id'], 'motivo' => $estado['catalogos']['motivos_reporte'][$otro['motivo_reporte_id']][0], 'estado' => $otro['estado'], 'creado_en' => $otro['creado_en'],
            ], $previos)),
        ];
    }

    /** @param  array<string, mixed>  $estado */
    private static function nombreObjeto(array $estado, string $tipo, int $id): string
    {
        return match ($tipo) {
            'vacante' => (function () use ($estado, $id) {
                $vacante = collect($estado['vacantes'])->firstWhere('id', $id);

                return $vacante['titulo'].' · '.collect($estado['empresas'])->firstWhere('id', $vacante['empresa_id'])['nombre_comercial'];
            })(),
            'empresa' => collect($estado['empresas'])->firstWhere('id', $id)['nombre_comercial'],
            default => trim(self::usuario($estado, $id)['nombre'].' '.self::usuario($estado, $id)['apellidos']),
        };
    }

    /** @param  array<string, mixed>  $estado */
    private static function estadoObjeto(array $estado, string $tipo, int $id): string
    {
        return match ($tipo) {
            'vacante' => collect($estado['vacantes'])->firstWhere('id', $id)['estado'],
            'empresa' => collect($estado['empresas'])->firstWhere('id', $id)['estado'],
            default => self::usuario($estado, $id)['estado'],
        };
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    private static function usuario(array $estado, int $id): array
    {
        return collect($estado['usuarios'])->firstWhere('usuario.id', $id)['usuario'];
    }

    /** @param  array<string, mixed>  $estado */
    private static function indice(array $estado, int $id): int
    {
        foreach ($estado['reportes'] as $indice => $reporte) {
            if ($reporte['id'] === $id) {
                return $indice;
            }
        }

        throw new ApiError(404, 'no_encontrado', 'El reporte no existe.');
    }
}
