<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Convierte el objeto Estadisticas del contrato en lo que pintan las vistas del dashboard: los seis
 * indicadores con su significado y las especificaciones de las gráficas (que lee <x-grafica>).
 * No calcula nada: solo da formato y textos a lo que manda el API.
 */
class PresentadorEstadisticas
{
    /**
     * @param  array<string, mixed>  $estadisticas
     * @return list<array{clave: string, titulo: string, valor: string, significado: string, icono: string}>
     */
    public static function indicadores(array $estadisticas): array
    {
        $i = $estadisticas['indicadores'];
        $entero = fn (int $n): string => number_format($n);
        $tasa = rtrim(rtrim(number_format((float) $i['tasa_colocacion'], 1), '0'), '.');

        return [
            ['clave' => 'candidatos_activos', 'titulo' => 'Candidatos activos', 'valor' => $entero($i['candidatos_activos']),
                'significado' => 'Personas candidatas con la cuenta activa hoy.', 'icono' => 'usuarios'],
            ['clave' => 'empresas_validadas', 'titulo' => 'Empresas validadas', 'valor' => $entero($i['empresas_validadas']),
                'significado' => 'Empresas aprobadas por administración que pueden publicar vacantes.', 'icono' => 'empresa'],
            ['clave' => 'vacantes_publicadas', 'titulo' => 'Vacantes publicadas', 'valor' => $entero($i['vacantes_publicadas']),
                'significado' => 'Vacantes que las personas candidatas pueden ver hoy.', 'icono' => 'maletin'],
            ['clave' => 'postulaciones', 'titulo' => 'Postulaciones', 'valor' => $entero($i['postulaciones']),
                'significado' => 'Postulaciones creadas en el periodo.', 'icono' => 'bandeja'],
            ['clave' => 'contrataciones', 'titulo' => 'Contrataciones', 'valor' => $entero($i['contrataciones']),
                'significado' => 'Postulaciones que pasaron a «Aceptada» en el periodo.', 'icono' => 'check-circulo'],
            ['clave' => 'tasa_colocacion', 'titulo' => 'Tasa de colocación', 'valor' => $tasa.' %',
                'significado' => 'De las personas que se postularon en el periodo, el porcentaje con al menos una postulación aceptada.', 'icono' => 'sello'],
        ];
    }

    /**
     * @param  array<string, mixed>  $estadisticas
     * @return list<array<string, mixed>>
     */
    public static function graficasVinculacion(array $estadisticas): array
    {
        $g = $estadisticas['graficas'];

        return [
            [
                'id' => 'postulaciones-estado', 'tipo' => 'barras', 'titulo' => 'Postulaciones por estado',
                'descripcion' => 'Postulaciones creadas en el periodo, según su estado actual.',
                'columna' => 'Estado', 'series' => ['Postulaciones'], 'vacio' => 'No hubo postulaciones en este periodo.',
                'filas' => array_map(fn (array $f) => [
                    'etiqueta' => Estados::de('postulacion', $f['etiqueta'])['texto'],
                    'estado' => ['postulacion', $f['etiqueta']],
                    'valores' => [$f['total']],
                ], $g['postulaciones_por_estado']),
            ],
            [
                'id' => 'vacantes-modalidad', 'tipo' => 'barras', 'titulo' => 'Vacantes por modalidad',
                'descripcion' => 'Vacantes publicadas hoy, según su modalidad de trabajo.',
                'columna' => 'Modalidad', 'series' => ['Vacantes'], 'vacio' => 'No hay vacantes publicadas.',
                'filas' => array_map(fn (array $f) => ['etiqueta' => $f['etiqueta'], 'valores' => [$f['total']]], $g['vacantes_por_modalidad']),
            ],
            [
                'id' => 'vacantes-categoria', 'tipo' => 'barras', 'titulo' => 'Vacantes por categoría',
                'descripcion' => 'Vacantes publicadas hoy, según su categoría.',
                'columna' => 'Categoría', 'series' => ['Vacantes'], 'vacio' => 'No hay vacantes publicadas.',
                'filas' => array_map(fn (array $f) => ['etiqueta' => $f['etiqueta'], 'valores' => [$f['total']]], $g['vacantes_por_categoria']),
            ],
            [
                'id' => 'evolucion-mensual', 'tipo' => 'lineas', 'titulo' => 'Postulaciones y contrataciones por mes',
                'descripcion' => 'Postulaciones creadas y contrataciones logradas en cada mes del periodo.',
                'columna' => 'Mes', 'series' => ['Postulaciones', 'Contrataciones'], 'vacio' => 'No hay datos en este periodo.',
                'filas' => array_map(function (array $f) {
                    $mes = CarbonImmutable::parse($f['mes'].'-01')->locale('es_MX');

                    return [
                        'etiqueta' => ucfirst($mes->isoFormat('MMMM YYYY')),
                        'mes' => rtrim($mes->isoFormat('MMM'), '.'),
                        'anio' => $mes->isoFormat('YYYY'),
                        'valores' => [$f['postulaciones'], $f['contrataciones']],
                    ];
                }, $g['evolucion_mensual']),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $estadisticas
     * @return list<array<string, mixed>>
     */
    public static function graficasBrecha(array $estadisticas): array
    {
        $g = $estadisticas['graficas'];

        return [
            [
                'id' => 'brecha-ajustes', 'tipo' => 'barras', 'titulo' => 'Ajustes solicitados y ajustes ofrecidos',
                'descripcion' => 'Candidatos que registraron cada necesidad de ajuste, frente a vacantes publicadas que la declaran.',
                'nota' => 'Solo se muestran totales. Cuando hay 5 o más candidatos, los ajustes con menos de 5 solicitudes se suman en «Otros» para que nadie pueda ser identificado.',
                'columna' => 'Ajuste', 'series' => ['Solicitados por candidatos', 'Ofrecidos en vacantes'], 'vacio' => 'Aún no hay ajustes registrados ni declarados.',
                'filas' => array_map(fn (array $f) => ['etiqueta' => $f['etiqueta'], 'valores' => [$f['solicitados'], $f['ofrecidos']]], $g['brecha_ajustes']),
            ],
            [
                'id' => 'brecha-habilidades', 'tipo' => 'barras', 'titulo' => 'Habilidades demandadas y habilidades registradas',
                'descripcion' => 'Vacantes publicadas que piden cada habilidad, frente a candidatos que la registraron.',
                'columna' => 'Habilidad', 'series' => ['Demandadas en vacantes', 'Registradas por candidatos'], 'vacio' => 'Aún no hay habilidades registradas ni demandadas.',
                'filas' => array_map(fn (array $f) => ['etiqueta' => $f['etiqueta'], 'valores' => [$f['demandadas'], $f['registradas']]], $g['brecha_habilidades']),
            ],
        ];
    }
}
