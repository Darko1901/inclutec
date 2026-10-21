<?php

namespace App\Servicios\Api\Mock;

use Carbon\CarbonImmutable;

/**
 * Calcula el objeto Estadisticas del contrato (GET /admin/estadisticas/resumen) con el estado del
 * mock; ninguna cifra está escrita a mano. Solo produce datos agregados (RF-07).
 *
 * Definiciones del contrato:
 * - `postulaciones`: creadas en el periodo. `contrataciones`: pasaron a «aceptada» en el periodo.
 * - `tasa_colocacion`: candidatos con al menos una postulación aceptada en el periodo ÷ candidatos
 *   que se postularon en el periodo × 100.
 * - Candidatos, empresas, vacantes y pendientes son el estado actual; no dependen del periodo.
 *
 * Las categorías con menos de 5 registros de `brecha_ajustes` se suman en «Otros» solo en el API
 * real: con datos de prueba el contrato pide mostrarlas tal cual, y aquí no se agrupan.
 */
class CalculadoraEstadisticas
{
    /** Orden de los estados de postulación en la gráfica (valores de BD). */
    private const ESTADOS_POSTULACION = ['postulada', 'en_revision', 'entrevista', 'aceptada', 'no_seleccionada', 'retirada'];

    /** Máximo de ajustes y de habilidades que se comparan en las gráficas de brecha. */
    private const MAX_BRECHAS = 8;

    /**
     * @param  array<string, mixed>  $estado  Estado del mock (Almacen).
     * @param  string  $desde  AAAA-MM-DD, inclusive.
     * @param  string  $hasta  AAAA-MM-DD, inclusive.
     * @return array<string, mixed>
     */
    public static function calcular(array $estado, string $desde, string $hasta): array
    {
        $enPeriodo = fn (string $fechaHora): bool => substr($fechaHora, 0, 10) >= $desde && substr($fechaHora, 0, 10) <= $hasta;

        $candidatosActivos = self::candidatosActivos($estado);
        $publicadas = array_values(array_filter($estado['vacantes'], fn (array $v) => $v['estado'] === 'publicada'));

        $postulaciones = array_values(array_filter($estado['postulaciones'], fn (array $p) => $enPeriodo($p['creado_en'])));
        $aceptaciones = self::aceptaciones($estado['postulaciones'], $enPeriodo);

        $postulantes = array_unique(array_column($postulaciones, 'candidato_id'));
        $colocados = array_unique(array_column($aceptaciones, 'candidato_id'));

        return [
            'periodo' => ['desde' => $desde, 'hasta' => $hasta],
            'indicadores' => [
                'candidatos_activos' => count($candidatosActivos),
                'empresas_validadas' => count(array_filter($estado['empresas'], fn (array $e) => $e['estado'] === 'validada')),
                'vacantes_publicadas' => count($publicadas),
                'postulaciones' => count($postulaciones),
                'contrataciones' => count($aceptaciones),
                'tasa_colocacion' => $postulantes === [] ? 0.0 : round(count($colocados) / count($postulantes) * 100, 1),
            ],
            'pendientes' => [
                'empresas_por_validar' => count(array_filter($estado['empresas'], fn (array $e) => $e['estado'] === 'pendiente')),
                'reportes_abiertos' => count(array_filter($estado['reportes'], fn (array $r) => $r['estado'] === 'abierto')),
            ],
            'graficas' => [
                'postulaciones_por_estado' => self::porEstado($postulaciones),
                'vacantes_por_modalidad' => self::contarPorCatalogo($publicadas, 'modalidad_id', $estado['catalogos']['modalidades']),
                'vacantes_por_categoria' => self::contarPorCatalogo($publicadas, 'categoria_id', $estado['catalogos']['categorias']),
                'evolucion_mensual' => self::evolucionMensual($desde, $hasta, $postulaciones, $aceptaciones),
                'brecha_ajustes' => self::brechaAjustes($estado, $candidatosActivos, $publicadas),
                'brecha_habilidades' => self::brechaHabilidades($estado, $candidatosActivos, $publicadas),
            ],
        ];
    }

    /**
     * Ids de los candidatos con cuenta activa.
     *
     * @param  array<string, mixed>  $estado
     * @return list<int>
     */
    private static function candidatosActivos(array $estado): array
    {
        $ids = [];
        foreach ($estado['usuarios'] as $cuenta) {
            $usuario = $cuenta['usuario'];
            if ($usuario['rol'] === 'candidato' && $usuario['estado'] === 'activo') {
                $ids[] = $usuario['id'];
            }
        }

        return $ids;
    }

    /**
     * Postulaciones que pasaron a «aceptada» dentro del periodo (una por cada cambio de estado).
     *
     * @param  list<array<string, mixed>>  $postulaciones
     * @return list<array{candidato_id: int, aceptada_en: string}>
     */
    private static function aceptaciones(array $postulaciones, callable $enPeriodo): array
    {
        $lista = [];
        foreach ($postulaciones as $postulacion) {
            foreach ($postulacion['historial'] as [$estadoNuevo, $fecha]) {
                if ($estadoNuevo === 'aceptada' && $enPeriodo($fecha)) {
                    $lista[] = ['candidato_id' => $postulacion['candidato_id'], 'aceptada_en' => $fecha];
                }
            }
        }

        return $lista;
    }

    /**
     * @param  list<array<string, mixed>>  $postulaciones
     * @return list<array{etiqueta: string, total: int}>
     */
    private static function porEstado(array $postulaciones): array
    {
        $totales = array_count_values(array_column($postulaciones, 'estado'));
        $lista = [];
        foreach (self::ESTADOS_POSTULACION as $valor) {
            if (($totales[$valor] ?? 0) > 0) {
                $lista[] = ['etiqueta' => $valor, 'total' => $totales[$valor]];
            }
        }

        return $lista;
    }

    /**
     * @param  list<array<string, mixed>>  $vacantes
     * @param  array<int, string>  $catalogo
     * @return list<array{etiqueta: string, total: int}>
     */
    private static function contarPorCatalogo(array $vacantes, string $campo, array $catalogo): array
    {
        $totales = array_count_values(array_column($vacantes, $campo));
        $lista = [];
        foreach ($totales as $id => $total) {
            $lista[] = ['etiqueta' => $catalogo[$id], 'total' => $total];
        }
        usort($lista, fn (array $a, array $b) => [$b['total'], $a['etiqueta']] <=> [$a['total'], $b['etiqueta']]);

        return $lista;
    }

    /**
     * Un renglón por mes del periodo (AAAA-MM), con los conteos que caen dentro de él.
     *
     * @param  list<array<string, mixed>>  $postulaciones
     * @param  list<array{candidato_id: int, aceptada_en: string}>  $aceptaciones
     * @return list<array{mes: string, postulaciones: int, contrataciones: int}>
     */
    private static function evolucionMensual(string $desde, string $hasta, array $postulaciones, array $aceptaciones): array
    {
        $porMes = array_count_values(array_map(fn (array $p) => substr($p['creado_en'], 0, 7), $postulaciones));
        $contratadosPorMes = array_count_values(array_map(fn (array $a) => substr($a['aceptada_en'], 0, 7), $aceptaciones));

        $lista = [];
        $mes = CarbonImmutable::parse($desde)->startOfMonth();
        $ultimo = CarbonImmutable::parse($hasta)->startOfMonth();
        while ($mes <= $ultimo) {
            $clave = $mes->format('Y-m');
            $lista[] = ['mes' => $clave, 'postulaciones' => $porMes[$clave] ?? 0, 'contrataciones' => $contratadosPorMes[$clave] ?? 0];
            $mes = $mes->addMonth();
        }

        return $lista;
    }

    /**
     * Necesidades registradas por los candidatos activos con consentimiento contra ajustes declarados
     * en las vacantes publicadas (de cualquier tipo). Solo conteos.
     *
     * @param  array<string, mixed>  $estado
     * @param  list<int>  $candidatosActivos
     * @param  list<array<string, mixed>>  $publicadas
     * @return list<array{etiqueta: string, solicitados: int, ofrecidos: int}>
     */
    private static function brechaAjustes(array $estado, array $candidatosActivos, array $publicadas): array
    {
        $solicitados = [];
        foreach (self::conConsentimiento($estado, $candidatosActivos) as $id) {
            foreach ($estado['candidatos'][$id]['necesidades'] ?? [] as $ajusteId) {
                $solicitados[$ajusteId] = ($solicitados[$ajusteId] ?? 0) + 1;
            }
        }
        $ofrecidos = [];
        foreach ($publicadas as $vacante) {
            foreach (array_unique(array_column($vacante['ajustes'], 0)) as $ajusteId) {
                $ofrecidos[$ajusteId] = ($ofrecidos[$ajusteId] ?? 0) + 1;
            }
        }

        return self::comparar($estado['catalogos']['ajustes'], $solicitados, $ofrecidos, 'solicitados', 'ofrecidos');
    }

    /**
     * Habilidades que piden las vacantes publicadas contra las que registraron los candidatos activos.
     *
     * @param  array<string, mixed>  $estado
     * @param  list<int>  $candidatosActivos
     * @param  list<array<string, mixed>>  $publicadas
     * @return list<array{etiqueta: string, demandadas: int, registradas: int}>
     */
    private static function brechaHabilidades(array $estado, array $candidatosActivos, array $publicadas): array
    {
        $demandadas = [];
        foreach ($publicadas as $vacante) {
            foreach (array_unique($vacante['habilidades']) as $habilidadId) {
                $demandadas[$habilidadId] = ($demandadas[$habilidadId] ?? 0) + 1;
            }
        }
        $registradas = [];
        foreach ($candidatosActivos as $id) {
            foreach (array_unique($estado['candidatos'][$id]['habilidades'] ?? []) as $habilidadId) {
                $registradas[$habilidadId] = ($registradas[$habilidadId] ?? 0) + 1;
            }
        }

        return self::comparar($estado['catalogos']['habilidades'], $demandadas, $registradas, 'demandadas', 'registradas');
    }

    /**
     * Candidatos activos que dieron su consentimiento expreso para registrar necesidades de ajuste.
     *
     * @param  array<string, mixed>  $estado
     * @param  list<int>  $candidatosActivos
     * @return list<int>
     */
    private static function conConsentimiento(array $estado, array $candidatosActivos): array
    {
        $consienten = [];
        foreach ($estado['usuarios'] as $cuenta) {
            if (($cuenta['usuario']['consentimiento_sensibles'] ?? false) === true) {
                $consienten[] = $cuenta['usuario']['id'];
            }
        }

        return array_values(array_intersect($candidatosActivos, $consienten));
    }

    /**
     * Junta dos conteos por id de catálogo en renglones etiquetados. Ordena por el primer conteo y
     * luego por el segundo (de mayor a menor) y deja los primeros MAX_BRECHAS con algún valor.
     *
     * @param  array<int, string>  $catalogo
     * @param  array<int, int>  $primero
     * @param  array<int, int>  $segundo
     * @return list<array<string, int|string>>
     */
    private static function comparar(array $catalogo, array $primero, array $segundo, string $campoPrimero, string $campoSegundo): array
    {
        $lista = [];
        foreach ($catalogo as $id => $nombre) {
            $a = $primero[$id] ?? 0;
            $b = $segundo[$id] ?? 0;
            if ($a + $b > 0) {
                $lista[] = ['etiqueta' => $nombre, $campoPrimero => $a, $campoSegundo => $b];
            }
        }
        usort($lista, fn (array $x, array $y) => [$y[$campoPrimero], $y[$campoSegundo], $x['etiqueta']] <=> [$x[$campoPrimero], $x[$campoSegundo], $y['etiqueta']]);

        return array_slice($lista, 0, self::MAX_BRECHAS);
    }
}
