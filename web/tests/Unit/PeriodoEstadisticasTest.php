<?php

namespace Tests\Unit;

use App\Support\PeriodoEstadisticas;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PeriodoEstadisticasTest extends TestCase
{
    private function hoy(): CarbonImmutable
    {
        return CarbonImmutable::parse('2026-10-21');
    }

    public function test_por_omision_son_los_ultimos_30_dias(): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta([], $this->hoy());

        $this->assertSame(['30', '2026-09-21', '2026-10-21'], [$periodo->clave, $periodo->desde, $periodo->hasta]);
        $this->assertSame([], $periodo->errores);
        $this->assertSame(['periodo' => '30'], $periodo->parametros());
    }

    public function test_los_periodos_predefinidos_son_7_30_y_90_dias(): void
    {
        foreach (['7' => '2026-10-14', '30' => '2026-09-21', '90' => '2026-07-23'] as $dias => $desde) {
            $periodo = PeriodoEstadisticas::desdeConsulta(['periodo' => (string) $dias], $this->hoy());

            $this->assertSame([$desde, '2026-10-21'], [$periodo->desde, $periodo->hasta], "{$dias} días");
        }
    }

    public function test_un_periodo_personalizado_conserva_las_fechas_en_la_url(): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta(['periodo' => 'personalizado', 'desde' => '2026-08-01', 'hasta' => '2026-09-15'], $this->hoy());

        $this->assertSame([], $periodo->errores);
        $this->assertSame(['periodo' => 'personalizado', 'desde' => '2026-08-01', 'hasta' => '2026-09-15'], $periodo->parametros());
        $this->assertSame('Del 1 de agosto de 2026 al 15 de septiembre de 2026', $periodo->texto());
    }

    public function test_fechas_sueltas_equivalen_a_un_periodo_personalizado(): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta(['desde' => '2026-08-01', 'hasta' => '2026-08-31'], $this->hoy());

        $this->assertSame('personalizado', $periodo->clave);
        $this->assertSame([], $periodo->errores);
    }

    #[DataProvider('consultasNoValidas')]
    public function test_una_consulta_no_valida_vuelve_a_30_dias_con_su_mensaje(array $consulta, string $campo, string $mensaje): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta($consulta, $this->hoy());

        $this->assertSame('30', $periodo->clave);
        $this->assertSame('2026-09-21', $periodo->desde);
        $this->assertSame($mensaje, $periodo->errores[$campo]);
    }

    public static function consultasNoValidas(): array
    {
        return [
            'periodo desconocido' => [['periodo' => '15'], 'periodo', 'Elige un periodo de la lista.'],
            'sin fecha inicial' => [['periodo' => 'personalizado', 'hasta' => '2026-09-01'], 'desde', 'Escribe la fecha de inicio.'],
            'sin fecha final' => [['periodo' => 'personalizado', 'desde' => '2026-09-01'], 'hasta', 'Escribe la fecha final.'],
            'fecha inexistente' => [['periodo' => 'personalizado', 'desde' => '2026-02-30', 'hasta' => '2026-03-01'], 'desde', 'Escribe la fecha de inicio como AAAA-MM-DD.'],
            'texto en lugar de fecha' => [['periodo' => 'personalizado', 'desde' => '2026-02-01', 'hasta' => 'mañana'], 'hasta', 'Escribe la fecha final como AAAA-MM-DD.'],
            'fin antes del inicio' => [['periodo' => 'personalizado', 'desde' => '2026-09-10', 'hasta' => '2026-09-01'], 'hasta', 'La fecha final no puede ser anterior a la inicial.'],
            'más de 12 meses' => [['periodo' => 'personalizado', 'desde' => '2025-01-01', 'hasta' => '2026-10-01'], 'hasta', 'El periodo puede abarcar como máximo 12 meses. Acorta las fechas.'],
        ];
    }

    public function test_conserva_lo_que_escribio_la_persona_para_volver_a_mostrarlo(): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta(['periodo' => 'personalizado', 'desde' => '2026-09-10', 'hasta' => '2026-09-01'], $this->hoy());

        $this->assertSame(['periodo' => 'personalizado', 'desde' => '2026-09-10', 'hasta' => '2026-09-01'], $periodo->entrada);
    }

    public function test_un_parametro_que_no_es_texto_se_ignora(): void
    {
        $periodo = PeriodoEstadisticas::desdeConsulta(['periodo' => ['30'], 'desde' => ['x']], $this->hoy());

        $this->assertSame('30', $periodo->clave);
        $this->assertSame([], $periodo->errores);
    }
}
