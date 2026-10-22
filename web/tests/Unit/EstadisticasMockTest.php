<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Servicios\Api\Mock\Almacen;
use App\Servicios\Api\Mock\CalculadoraEstadisticas;
use App\Servicios\Api\Mock\ExportadorEstadisticas;
use Tests\TestCase;
use ZipArchive;

class EstadisticasMockTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Las fechas del mock son relativas a hoy: se congela para que las cifras no cambien con los días.
        $this->travelTo('2026-10-21 12:00:00');
    }

    private function conSesion(string $correo = 'admin@inclutec.mx'): ApiMock
    {
        $mock = new ApiMock;
        session([ApiHttp::SESION_TOKEN => $mock->login($correo, 'Inclutec2026')['access_token']]);

        return $mock;
    }

    public function test_el_resumen_tiene_la_forma_del_objeto_estadisticas_del_contrato(): void
    {
        $resumen = $this->conSesion()->estadisticas('2026-09-21', '2026-10-21');

        $this->assertSame(['periodo', 'indicadores', 'pendientes', 'graficas'], array_keys($resumen));
        $this->assertSame(['desde' => '2026-09-21', 'hasta' => '2026-10-21'], $resumen['periodo']);
        $this->assertSame(
            ['candidatos_activos', 'empresas_validadas', 'vacantes_publicadas', 'postulaciones', 'contrataciones', 'tasa_colocacion'],
            array_keys($resumen['indicadores']),
        );
        $this->assertSame(['empresas_por_validar', 'reportes_abiertos'], array_keys($resumen['pendientes']));
        $this->assertSame(
            ['postulaciones_por_estado', 'vacantes_por_modalidad', 'vacantes_por_categoria', 'evolucion_mensual', 'brecha_ajustes', 'brecha_habilidades'],
            array_keys($resumen['graficas']),
        );
        $this->assertSame(['etiqueta', 'total'], array_keys($resumen['graficas']['vacantes_por_modalidad'][0]));
        $this->assertSame(['mes', 'postulaciones', 'contrataciones'], array_keys($resumen['graficas']['evolucion_mensual'][0]));
        $this->assertSame(['etiqueta', 'solicitados', 'ofrecidos'], array_keys($resumen['graficas']['brecha_ajustes'][0]));
        $this->assertSame(['etiqueta', 'demandadas', 'registradas'], array_keys($resumen['graficas']['brecha_habilidades'][0]));
    }

    public function test_por_omision_son_los_ultimos_30_dias(): void
    {
        $this->assertSame(
            ['desde' => '2026-09-21', 'hasta' => '2026-10-21'],
            $this->conSesion()->estadisticas()['periodo'],
        );
    }

    public function test_las_cifras_se_calculan_con_el_estado_del_mock_y_cambian_con_el_periodo(): void
    {
        $mock = $this->conSesion();

        $esperado = [
            // periodo => [postulaciones, contrataciones, tasa de colocación]
            '7 días' => [['2026-10-14', '2026-10-21'], 3, 1, 33.3],
            '30 días' => [['2026-09-21', '2026-10-21'], 8, 2, 33.3],
            '90 días' => [['2026-07-23', '2026-10-21'], 14, 4, 50.0],
        ];
        foreach ($esperado as $nombre => [[$desde, $hasta], $postulaciones, $contrataciones, $tasa]) {
            $i = $mock->estadisticas($desde, $hasta)['indicadores'];

            $this->assertSame([$postulaciones, $contrataciones, $tasa], [$i['postulaciones'], $i['contrataciones'], $i['tasa_colocacion']], $nombre);
        }
    }

    public function test_los_indicadores_de_estado_actual_salen_de_los_datos_y_no_dependen_del_periodo(): void
    {
        $mock = $this->conSesion();

        foreach ([['2026-10-14', '2026-10-21'], ['2026-07-23', '2026-10-21']] as [$desde, $hasta]) {
            $i = $mock->estadisticas($desde, $hasta)['indicadores'];

            // 37 candidatos activos (las cuentas suspendidas o dadas de baja no cuentan), 3 empresas validadas y 8 vacantes publicadas.
            $this->assertSame([37, 3, 8], [$i['candidatos_activos'], $i['empresas_validadas'], $i['vacantes_publicadas']]);
        }
        $this->assertSame(['empresas_por_validar' => 3, 'reportes_abiertos' => 3], $mock->estadisticas()['pendientes']);
    }

    public function test_agregar_datos_al_estado_cambia_las_cifras(): void
    {
        $mock = $this->conSesion();
        $antes = $mock->estadisticas()['indicadores'];

        Almacen::modificar(function (array &$estado) {
            $estado['postulaciones'][] = ['id' => 500, 'candidato_id' => 3, 'vacante_id' => 2, 'estado' => 'aceptada', 'creado_en' => '2026-10-20T10:00:00Z',
                'historial' => [['postulada', '2026-10-20T10:00:00Z'], ['aceptada', '2026-10-21T10:00:00Z']]];
            $estado['reportes'][] = ['id' => 500, 'vacante_id' => 2, 'estado' => 'abierto', 'creado_en' => '2026-10-20T10:00:00Z'];
        });

        $despues = $mock->estadisticas();
        $this->assertSame($antes['postulaciones'] + 1, $despues['indicadores']['postulaciones']);
        $this->assertSame($antes['contrataciones'] + 1, $despues['indicadores']['contrataciones']);
        $this->assertSame(4, $despues['pendientes']['reportes_abiertos']);
    }

    public function test_las_series_mensuales_suman_los_indicadores_del_mismo_periodo(): void
    {
        $mock = $this->conSesion();

        foreach ([['2026-10-14', '2026-10-21'], ['2026-09-21', '2026-10-21'], ['2026-07-23', '2026-10-21']] as [$desde, $hasta]) {
            $resumen = $mock->estadisticas($desde, $hasta);
            $meses = $resumen['graficas']['evolucion_mensual'];

            $this->assertSame($resumen['indicadores']['postulaciones'], array_sum(array_column($meses, 'postulaciones')), "{$desde} a {$hasta}");
            $this->assertSame($resumen['indicadores']['contrataciones'], array_sum(array_column($meses, 'contrataciones')), "{$desde} a {$hasta}");
            $this->assertSame($resumen['indicadores']['postulaciones'], array_sum(array_column($resumen['graficas']['postulaciones_por_estado'], 'total')));
        }
        $this->assertSame(['2026-07', '2026-08', '2026-09', '2026-10'], array_column($mock->estadisticas('2026-07-23', '2026-10-21')['graficas']['evolucion_mensual'], 'mes'));
    }

    public function test_postulaciones_por_estado_usa_valores_de_bd_en_el_orden_del_flujo(): void
    {
        $estados = array_column($this->conSesion()->estadisticas('2026-07-23', '2026-10-21')['graficas']['postulaciones_por_estado'], 'etiqueta');

        $this->assertSame(['postulada', 'en_revision', 'entrevista', 'aceptada', 'no_seleccionada', 'retirada'], $estados);
    }

    public function test_las_vacantes_por_modalidad_y_categoria_solo_cuentan_las_publicadas(): void
    {
        $graficas = $this->conSesion()->estadisticas()['graficas'];

        $this->assertSame(['Presencial' => 3, 'Remoto' => 3, 'Híbrido' => 2], array_column($graficas['vacantes_por_modalidad'], 'total', 'etiqueta'));
        $this->assertSame(8, array_sum(array_column($graficas['vacantes_por_categoria'], 'total')));
        // Los borradores (Diseñador gráfico e Ilustrador digital) no suman: Diseño y comunicación solo tiene la vacante 101.
        $this->assertSame(1, array_column($graficas['vacantes_por_categoria'], 'total', 'etiqueta')['Diseño y comunicación']);
    }

    public function test_la_brecha_de_ajustes_compara_necesidades_registradas_con_ajustes_declarados(): void
    {
        $ajustes = array_column($this->conSesion()->estadisticas()['graficas']['brecha_ajustes'], null, 'etiqueta');

        // Necesitan rampa: Mariana, Ana y Héctor. La declaran las vacantes 1, 2 y 102.
        $this->assertSame(['solicitados' => 3, 'ofrecidos' => 3], ['solicitados' => $ajustes['Acceso con rampa']['solicitados'], 'ofrecidos' => $ajustes['Acceso con rampa']['ofrecidos']]);
        $this->assertSame(4, $ajustes['Horario flexible']['ofrecidos']);
        $this->assertLessThanOrEqual(8, count($ajustes));
    }

    public function test_las_necesidades_solo_cuentan_con_consentimiento_del_candidato(): void
    {
        $mock = $this->conSesion();
        Almacen::modificar(function (array &$estado) {
            foreach ($estado['usuarios'] as &$cuenta) {
                if ($cuenta['usuario']['id'] === 3) {
                    $cuenta['usuario']['consentimiento_sensibles'] = false;
                }
            }
        });

        $ajustes = array_column($mock->estadisticas()['graficas']['brecha_ajustes'], null, 'etiqueta');
        $this->assertSame(2, $ajustes['Acceso con rampa']['solicitados']);
    }

    public function test_la_brecha_de_habilidades_compara_las_demandadas_con_las_registradas(): void
    {
        $habilidades = array_column($this->conSesion()->estadisticas()['graficas']['brecha_habilidades'], null, 'etiqueta');

        // Piden Excel las vacantes 1, 2, 3 y 4; lo registraron Mariana, Jorge, Ana, Carmen y Héctor.
        $this->assertSame([4, 5], [$habilidades['Excel']['demandadas'], $habilidades['Excel']['registradas']]);
    }

    public function test_solo_hay_datos_agregados_nunca_personas(): void
    {
        $json = json_encode($this->conSesion()->estadisticas(), JSON_UNESCAPED_UNICODE);

        foreach (['Mariana', 'Jorge', 'López', 'correo.mx', 'candidato_id', 'usuario'] as $texto) {
            $this->assertStringNotContainsString($texto, $json);
        }
    }

    public function test_sin_postulantes_la_tasa_de_colocacion_es_cero(): void
    {
        $this->assertSame(0.0, $this->conSesion()->estadisticas('2020-01-01', '2020-01-31')['indicadores']['tasa_colocacion']);
    }

    public function test_las_fechas_no_validas_responden_422_con_los_campos(): void
    {
        $mock = $this->conSesion();

        foreach ([['2026-13-01', null, 'desde'], [null, 'ayer', 'hasta'], ['2026-10-10', '2026-10-01', 'hasta']] as [$desde, $hasta, $campo]) {
            try {
                $mock->estadisticas($desde, $hasta);
                $this->fail('Debió lanzar ApiError.');
            } catch (ApiError $error) {
                $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
                $this->assertArrayHasKey($campo, $error->campos);
            }
        }
    }

    public function test_sin_sesion_responde_401_y_un_candidato_responde_403(): void
    {
        try {
            (new ApiMock)->estadisticas();
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame([401, 'no_autenticado'], [$error->status, $error->codigo]);
        }

        try {
            $this->conSesion('mariana.lopez@correo.mx')->estadisticas();
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame([403, 'sin_permiso'], [$error->status, $error->codigo]);
        }
        try {
            $this->conSesion('mariana.lopez@correo.mx')->exportarEstadisticas('pdf');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame(403, $error->status);
        }
    }

    public function test_la_calculadora_no_agrupa_en_otros_con_datos_de_prueba(): void
    {
        $resumen = CalculadoraEstadisticas::calcular(Almacen::leer(), '2026-09-21', '2026-10-21');

        $this->assertNotContains('Otros', array_column($resumen['graficas']['brecha_ajustes'], 'etiqueta'));
    }

    public function test_exportar_pdf_devuelve_un_pdf_con_las_cifras_del_periodo(): void
    {
        $archivo = $this->conSesion()->exportarEstadisticas('pdf', '2026-10-14', '2026-10-21');

        $this->assertSame('application/pdf', $archivo['tipo']);
        $this->assertSame('estadisticas_2026-10-14_2026-10-21.pdf', $archivo['nombre']);
        $this->assertStringStartsWith('%PDF-', $archivo['contenido']);

        $texto = self::textoDelPdf($archivo['contenido']);
        foreach (['Estadísticas', 'Periodo: del 14/10/2026 al 21/10/2026', 'Candidatos activos', 'Contrataciones del periodo', 'Tasa de colocación', 'Brecha de ajustes', 'Acceso con rampa'] as $esperado) {
            $this->assertStringContainsString($esperado, $texto);
        }
        // Las cifras del periodo de 7 días: 3 postulaciones, 1 contratación y 33.3 %.
        $this->assertMatchesRegularExpression('/Postulaciones del periodo\s+3\b/', $texto);
        $this->assertMatchesRegularExpression('/Contrataciones del periodo\s+1\b/', $texto);
        $this->assertStringContainsString('33.3', $texto);
    }

    public function test_exportar_xlsx_devuelve_un_libro_con_una_hoja_por_tabla_y_las_mismas_cifras(): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->markTestSkipped('Falta la extensión zip para abrir el libro.');
        }

        $archivo = $this->conSesion()->exportarEstadisticas('xlsx', '2026-07-23', '2026-10-21');

        $this->assertSame(ExportadorEstadisticas::TIPO_XLSX, $archivo['tipo']);
        $this->assertSame('estadisticas_2026-07-23_2026-10-21.xlsx', $archivo['nombre']);

        $ruta = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($ruta, $archivo['contenido']);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($ruta), 'El libro debe abrirse como un zip válido.');
        $libro = $zip->getFromName('xl/workbook.xml');
        $textos = $zip->getFromName('xl/sharedStrings.xml');
        $hoja1 = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        unlink($ruta);

        foreach (['Indicadores', 'Postulaciones por estado', 'Vacantes por modalidad', 'Vacantes por categoría', 'Evolución mensual', 'Brecha de ajustes', 'Brecha de habilidades'] as $hoja) {
            $this->assertStringContainsString('name="'.$hoja.'"', $libro);
        }
        $this->assertStringContainsString('Candidatos activos', $textos);
        $this->assertStringContainsString('2026-07-23 a 2026-10-21', $textos);
        // 90 días: 14 postulaciones y 4 contrataciones; la tasa es 50.
        $this->assertMatchesRegularExpression('/<v>14<\/v>/', $hoja1);
        $this->assertMatchesRegularExpression('/<v>4<\/v>/', $hoja1);
        $this->assertMatchesRegularExpression('/<v>50<\/v>/', $hoja1);
    }

    public function test_exportar_con_un_formato_distinto_responde_422(): void
    {
        try {
            $this->conSesion()->exportarEstadisticas('csv');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame(422, $error->status);
            $this->assertArrayHasKey('formato', $error->campos);
        }
    }

    /** Junta el texto de los flujos de contenido del PDF (FPDF los comprime con zlib). */
    public static function textoDelPdf(string $pdf): string
    {
        preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $pdf, $flujos);
        $texto = '';
        foreach ($flujos[1] as $flujo) {
            $contenido = @gzuncompress($flujo) ?: $flujo;
            preg_match_all('/\(((?:[^()\\\\]|\\\\.)*)\)\s*Tj/', $contenido, $partes);
            // Cada celda es un Tj; los saltos de renglón se aproximan con un espacio.
            $texto .= implode(' ', array_map(fn (string $parte) => stripcslashes($parte), $partes[1])).' ';
        }

        return iconv('windows-1252', 'UTF-8//IGNORE', $texto) ?: $texto;
    }
}
