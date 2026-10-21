<?php

namespace App\Servicios\Api\Mock;

use App\Support\Estados;
use Carbon\CarbonImmutable;
use FPDF;
use Shuchkin\SimpleXLSXGen;

/**
 * Genera el PDF y el XLSX de GET /admin/estadisticas/exportar con las mismas cifras del resumen.
 * Solo lo usa el mock: el API real arma sus propios archivos. FPDF y SimpleXLSXGen son bibliotecas
 * de un solo archivo, sin dependencias ni extensiones extra.
 */
class ExportadorEstadisticas
{
    public const TIPO_PDF = 'application/pdf';

    public const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    /**
     * Las tablas del reporte, en el orden de la pantalla: [título, columnas, filas].
     *
     * @param  array<string, mixed>  $estadisticas  Objeto Estadisticas.
     * @return list<array{0: string, 1: list<string>, 2: list<list<int|float|string>>}>
     */
    public static function tablas(array $estadisticas): array
    {
        $i = $estadisticas['indicadores'];
        $g = $estadisticas['graficas'];

        return [
            ['Indicadores', ['Indicador', 'Valor'], [
                ['Candidatos activos', $i['candidatos_activos']],
                ['Empresas validadas', $i['empresas_validadas']],
                ['Vacantes publicadas', $i['vacantes_publicadas']],
                ['Postulaciones del periodo', $i['postulaciones']],
                ['Contrataciones del periodo', $i['contrataciones']],
                ['Tasa de colocación (%)', $i['tasa_colocacion']],
                ['Empresas por validar', $estadisticas['pendientes']['empresas_por_validar']],
                ['Reportes abiertos', $estadisticas['pendientes']['reportes_abiertos']],
            ]],
            ['Postulaciones por estado', ['Estado', 'Postulaciones'],
                array_map(fn (array $f) => [Estados::de('postulacion', $f['etiqueta'])['texto'], $f['total']], $g['postulaciones_por_estado'])],
            ['Vacantes por modalidad', ['Modalidad', 'Vacantes'],
                array_map(fn (array $f) => [$f['etiqueta'], $f['total']], $g['vacantes_por_modalidad'])],
            ['Vacantes por categoría', ['Categoría', 'Vacantes'],
                array_map(fn (array $f) => [$f['etiqueta'], $f['total']], $g['vacantes_por_categoria'])],
            ['Evolución mensual', ['Mes', 'Postulaciones', 'Contrataciones'],
                array_map(fn (array $f) => [$f['mes'], $f['postulaciones'], $f['contrataciones']], $g['evolucion_mensual'])],
            ['Brecha de ajustes', ['Ajuste', 'Solicitados por candidatos', 'Ofrecidos en vacantes'],
                array_map(fn (array $f) => [$f['etiqueta'], $f['solicitados'], $f['ofrecidos']], $g['brecha_ajustes'])],
            ['Brecha de habilidades', ['Habilidad', 'Demandadas en vacantes', 'Registradas por candidatos'],
                array_map(fn (array $f) => [$f['etiqueta'], $f['demandadas'], $f['registradas']], $g['brecha_habilidades'])],
        ];
    }

    /** @param  array<string, mixed>  $estadisticas */
    public static function nombre(array $estadisticas, string $formato): string
    {
        return "estadisticas_{$estadisticas['periodo']['desde']}_{$estadisticas['periodo']['hasta']}.{$formato}";
    }

    /** @param  array<string, mixed>  $estadisticas */
    public static function pdf(array $estadisticas): string
    {
        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->SetTitle('IncluTec - Estadísticas', true);
        $pdf->SetAuthor('IncluTec', true);
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);
        $pdf->AddPage();

        $pdf->SetFont('Helvetica', 'B', 18);
        $pdf->Cell(0, 10, self::latin('IncluTec · Estadísticas'), 0, 1);
        $pdf->SetFont('Helvetica', '', 11);
        $periodo = $estadisticas['periodo'];
        $pdf->Cell(0, 7, self::latin('Periodo: del '.self::fecha($periodo['desde']).' al '.self::fecha($periodo['hasta'])), 0, 1);
        $pdf->Cell(0, 7, self::latin('Solo datos agregados; no identifican a ninguna persona.'), 0, 1);
        $pdf->Ln(4);

        foreach (self::tablas($estadisticas) as [$titulo, $columnas, $filas]) {
            $anchoPrimera = count($columnas) === 2 ? 120 : 180 - 35 * (count($columnas) - 1);
            $anchos = array_merge([$anchoPrimera], array_fill(0, count($columnas) - 1, (180 - $anchoPrimera) / (count($columnas) - 1)));

            $pdf->SetFont('Helvetica', 'B', 13);
            $pdf->Cell(0, 9, self::latin($titulo), 0, 1);
            $pdf->SetFont('Helvetica', 'B', 9);
            $pdf->SetFillColor(229, 231, 235);
            foreach ($columnas as $n => $columna) {
                $pdf->Cell($anchos[$n], 7, self::latin($columna), 1, 0, 'L', true);
            }
            $pdf->Ln();

            $pdf->SetFont('Helvetica', '', 10);
            foreach ($filas as $fila) {
                foreach ($fila as $n => $valor) {
                    $pdf->Cell($anchos[$n], 7, self::latin((string) $valor), 1, 0, $n === 0 ? 'L' : 'R');
                }
                $pdf->Ln();
            }
            if ($filas === []) {
                $pdf->Cell(180, 7, self::latin('Sin datos en el periodo.'), 1, 1);
            }
            $pdf->Ln(5);
        }

        return $pdf->Output('S');
    }

    /** @param  array<string, mixed>  $estadisticas */
    public static function xlsx(array $estadisticas): string
    {
        $libro = SimpleXLSXGen::create();
        $libro->setTitle('IncluTec - Estadísticas')->setAuthor('IncluTec');
        $periodo = $estadisticas['periodo'];
        $libro->setSubject('Periodo: '.$periodo['desde'].' a '.$periodo['hasta']);

        foreach (self::tablas($estadisticas) as $n => [$titulo, $columnas, $filas]) {
            $encabezado = array_map(fn (string $c) => '<b>'.$c.'</b>', $columnas);
            $filasHoja = [$encabezado, ...array_map(array_values(...), $filas)];
            if ($n === 0) {
                // La primera hoja repite el periodo para que el archivo se entienda solo.
                array_unshift($filasHoja, ['<b>Periodo</b>', $periodo['desde'].' a '.$periodo['hasta']], ['']);
            }
            // Los nombres de hoja de Excel admiten 31 caracteres como máximo.
            $libro->addSheet($filasHoja, mb_substr($titulo, 0, 31));
        }

        return (string) $libro;
    }

    private static function fecha(string $fecha): string
    {
        return CarbonImmutable::parse($fecha)->format('d/m/Y');
    }

    /** FPDF usa las fuentes básicas (Windows-1252): cubre acentos, ñ y «». */
    private static function latin(string $texto): string
    {
        return iconv('UTF-8', 'windows-1252//TRANSLIT', $texto) ?: $texto;
    }
}
