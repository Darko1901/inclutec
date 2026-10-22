<?php

namespace App\Servicios\Api\Mock;

use App\Servicios\Api\ApiError;

/**
 * Reglas de GET /admin/vacantes, GET /vacantes/{id} y PATCH /admin/vacantes/{id}/estado sobre el
 * estado del mock (WEB-05). Las funciones que modifican lanzan ApiError con los códigos del contrato
 * antes de guardar, así que una transición rechazada nunca deja datos a medias.
 */
class GestionVacantes
{
    public const ESTADOS = ['borrador', 'publicada', 'pausada', 'cerrada', 'suspendida'];

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    /**
     * @param  array<string, mixed>  $estado
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public static function listar(array $estado, ?string $q, ?int $empresaId, ?string $estadoVacante, ?int $categoriaId, ?int $modalidadId, bool $conReportes, int $page, int $size): array
    {
        $campos = [];
        if ($estadoVacante !== null && $estadoVacante !== '' && ! in_array($estadoVacante, self::ESTADOS, true)) {
            $campos['estado'] = 'Elige borrador, publicada, pausada, cerrada o suspendida.';
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
        $vacantes = array_values(array_filter($estado['vacantes'], fn (array $v) => ($busqueda === '' || str_contains(mb_strtolower($v['titulo']), $busqueda))
            && ($empresaId === null || $v['empresa_id'] === $empresaId)
            && ($estadoVacante === null || $estadoVacante === '' || $v['estado'] === $estadoVacante)
            && ($categoriaId === null || $v['categoria_id'] === $categoriaId)
            && ($modalidadId === null || $v['modalidad_id'] === $modalidadId)
            && (! $conReportes || self::reportesAbiertos($estado, $v['id']) > 0)));

        // Las más recientes primero; los borradores (sin fecha de publicación) al final.
        usort($vacantes, fn (array $a, array $b) => [$b['publicada_en'] ?? '', $b['id']] <=> [$a['publicada_en'] ?? '', $a['id']]);

        return [
            'items' => array_map(fn (array $v) => self::vacanteAdmin($estado, $v), array_slice($vacantes, ($page - 1) * $size, $size)),
            'total' => count($vacantes),
            'page' => $page,
            'size' => $size,
        ];
    }

    /**
     * VacanteDetalle tal como lo ve el administrador (con el salario aunque no se muestre a los candidatos).
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function detalle(array $estado, int $id): array
    {
        return self::vacanteDetalle($estado, $estado['vacantes'][self::indice($estado, $id)]);
    }

    /**
     * Suspender (solo publicada o pausada, con motivo) o reactivar (solo suspendida; queda publicada).
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function moderar(array &$estado, int $id, string $nuevo, ?string $motivo): array
    {
        $indice = self::indice($estado, $id);

        $campos = [];
        if (! in_array($nuevo, ['suspendida', 'publicada'], true)) {
            $campos['estado'] = 'Elige suspendida o publicada.';
        }
        $motivo = $motivo === null ? null : trim($motivo);
        if ($nuevo === 'suspendida' && ($motivo === null || $motivo === '')) {
            $campos['motivo'] = 'Escribe el motivo de la suspensión.';
        } elseif ($motivo !== null && mb_strlen($motivo) > 255) {
            $campos['motivo'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $actual = $estado['vacantes'][$indice]['estado'];
        if (($nuevo === 'suspendida' && ! in_array($actual, ['publicada', 'pausada'], true)) || ($nuevo === 'publicada' && $actual !== 'suspendida')) {
            throw new ApiError(409, 'transicion_invalida', 'Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.');
        }

        $vacante = &$estado['vacantes'][$indice];
        $vacante['estado'] = $nuevo;
        $vacante['motivo_estado'] = $nuevo === 'suspendida' ? $motivo : null;
        $vacante['actualizado_en'] = gmdate('Y-m-d\TH:i:s\Z');

        return self::vacanteDetalle($estado, $vacante);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $v
     * @return array<string, mixed>
     */
    private static function vacanteAdmin(array $estado, array $v): array
    {
        return [
            'id' => $v['id'],
            'titulo' => $v['titulo'],
            'empresa' => self::empresa($estado, $v['empresa_id']),
            'categoria' => ['id' => $v['categoria_id'], 'nombre' => $estado['catalogos']['categorias'][$v['categoria_id']]],
            'modalidad' => ['id' => $v['modalidad_id'], 'nombre' => $estado['catalogos']['modalidades'][$v['modalidad_id']]],
            'estado' => $v['estado'],
            'publicada_en' => $v['publicada_en'],
            'postulados' => count(array_filter($estado['postulaciones'], fn (array $p) => $p['vacante_id'] === $v['id'])),
            'reportes_abiertos' => self::reportesAbiertos($estado, $v['id']),
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $v
     * @return array<string, mixed>
     */
    private static function vacanteDetalle(array $estado, array $v): array
    {
        $c = $estado['catalogos'];
        $empresa = collect($estado['empresas'])->firstWhere('id', $v['empresa_id']);
        [$municipio, $entidadId] = $c['municipios'][$v['municipio_id']];
        $nivel = $v['nivel_educativo_id'] === null ? null : ['id' => $v['nivel_educativo_id'], 'nombre' => $c['niveles'][$v['nivel_educativo_id']][0], 'orden' => $c['niveles'][$v['nivel_educativo_id']][1]];

        return [
            'id' => $v['id'],
            'titulo' => $v['titulo'],
            'descripcion' => $v['descripcion'],
            'empresa' => ['id' => $empresa['id'], 'nombre_comercial' => $empresa['nombre_comercial'], 'logo_url' => $empresa['logo_url'], 'validada' => $empresa['estado'] === 'validada'],
            'categoria' => ['id' => $v['categoria_id'], 'nombre' => $c['categorias'][$v['categoria_id']]],
            'modalidad' => ['id' => $v['modalidad_id'], 'nombre' => $c['modalidades'][$v['modalidad_id']]],
            'jornada' => ['id' => $v['jornada_id'], 'nombre' => $c['jornadas'][$v['jornada_id']]],
            'tipo_contrato' => ['id' => $v['tipo_contrato_id'], 'nombre' => $c['tipos_contrato'][$v['tipo_contrato_id']]],
            'municipio' => ['id' => $v['municipio_id'], 'nombre' => $municipio, 'entidad' => ['id' => $entidadId, 'nombre' => $c['entidades'][$entidadId]]],
            'direccion' => $v['direccion'],
            'plazas' => $v['plazas'],
            'salario' => $v['salario_min'] === null && $v['salario_max'] === null ? null : ['min' => $v['salario_min'], 'max' => $v['salario_max']],
            'mostrar_salario' => $v['mostrar_salario'],
            'nivel_educativo' => $nivel,
            'experiencia_anios' => $v['experiencia_anios'],
            // Primero las obligatorias y después las deseables, cada grupo en su orden.
            'habilidades' => array_map(fn (int $id) => ['id' => $id, 'nombre' => $c['habilidades'][$id], 'obligatoria' => ! in_array($id, $v['deseables'], true)],
                array_values(array_merge(array_diff($v['habilidades'], $v['deseables']), array_intersect($v['habilidades'], $v['deseables'])))),
            'ajustes' => array_map(fn (array $a) => ['id' => $a[0], 'nombre' => $c['ajustes'][$a[0]], 'categoria' => $c['ajustes_detalle'][$a[0]][0], 'descripcion' => $c['ajustes_detalle'][$a[0]][1], 'tipo' => $a[1]], $v['ajustes']),
            'sin_condiciones_accesibilidad' => $v['sin_condiciones_accesibilidad'],
            'notas_accesibilidad' => $v['notas_accesibilidad'],
            'estado' => $v['estado'],
            'motivo_estado' => $v['motivo_estado'],
            'publicada_en' => $v['publicada_en'],
            'actualizado_en' => $v['actualizado_en'],
            'postulacion_id' => null,
            'postulados' => count(array_filter($estado['postulaciones'], fn (array $p) => $p['vacante_id'] === $v['id'])),
        ];
    }

    /** @param  array<string, mixed>  $estado */
    private static function reportesAbiertos(array $estado, int $vacanteId): int
    {
        return count(array_filter($estado['reportes'], fn (array $r) => ($r['vacante_id'] ?? null) === $vacanteId && $r['estado'] === 'abierto'));
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array{id: int, nombre_comercial: string}
     */
    private static function empresa(array $estado, int $empresaId): array
    {
        $empresa = collect($estado['empresas'])->firstWhere('id', $empresaId);

        return ['id' => $empresa['id'], 'nombre_comercial' => $empresa['nombre_comercial']];
    }

    /** @param  array<string, mixed>  $estado */
    private static function indice(array $estado, int $id): int
    {
        foreach ($estado['vacantes'] as $indice => $vacante) {
            if ($vacante['id'] === $id) {
                return $indice;
            }
        }

        throw new ApiError(404, 'no_encontrado', 'La vacante no existe.');
    }
}
