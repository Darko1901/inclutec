<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Servicios\Api\Mock\Almacen;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\Unit\EstadisticasMockTest;

class DashboardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Las fechas del mock son relativas a hoy: se congela para que las cifras no cambien con los días.
        $this->travelTo('2026-10-21 12:00:00');
    }

    private function entrar(string $correo = 'admin@inclutec.mx'): void
    {
        $this->from('/login')->post('/login', ['correo' => $correo, 'contrasena' => 'Inclutec2026']);
    }

    /** Valor que muestra el indicador `$clave`. */
    private function indicador(string $html, string $clave): string
    {
        $this->assertSame(1, preg_match('/data-indicador="'.$clave.'">.*?<p class="value indicador-valor">([^<]+)<\/p>/s', $html, $m), "Falta el indicador {$clave}.");

        return $m[1];
    }

    public function test_sin_sesion_el_dashboard_y_la_exportacion_llevan_a_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/dashboard?periodo=7')->assertRedirect('/login');
        $this->get('/dashboard/exportar?formato=pdf')->assertRedirect('/login');
    }

    public function test_una_cuenta_que_no_es_de_administrador_no_ve_el_dashboard(): void
    {
        $this->entrar('mariana.lopez@correo.mx');

        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_el_caso_feliz_muestra_los_seis_indicadores_con_las_cifras_del_mock(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertSame(
            ['37', '3', '8', '8', '2', '33.3 %'],
            array_map(fn (string $clave) => $this->indicador($html, $clave), ['candidatos_activos', 'empresas_validadas', 'vacantes_publicadas', 'postulaciones', 'contrataciones', 'tasa_colocacion']),
        );
        foreach (['Candidatos activos', 'Empresas validadas', 'Vacantes publicadas', 'Postulaciones', 'Contrataciones', 'Tasa de colocación'] as $titulo) {
            $this->assertStringContainsString($titulo, $html);
        }
        // Cada indicador explica su significado en texto.
        $this->assertStringContainsString('Postulaciones que pasaron a «Aceptada» en el periodo.', $html);
        $this->assertStringContainsString('Del 21 de septiembre de 2026 al 21 de octubre de 2026', $html);
    }

    public function test_las_cifras_cambian_al_cambiar_el_periodo(): void
    {
        $this->entrar();

        $siete = $this->get('/dashboard?periodo=7')->getContent();
        $noventa = $this->get('/dashboard?periodo=90')->getContent();

        $this->assertSame(['3', '1', '33.3 %'], array_map(fn ($c) => $this->indicador($siete, $c), ['postulaciones', 'contrataciones', 'tasa_colocacion']));
        $this->assertSame(['14', '4', '50 %'], array_map(fn ($c) => $this->indicador($noventa, $c), ['postulaciones', 'contrataciones', 'tasa_colocacion']));
        $this->assertStringContainsString('Del 14 de octubre de 2026 al 21 de octubre de 2026', $siete);
        $this->assertStringContainsString('Del 23 de julio de 2026 al 21 de octubre de 2026', $noventa);
    }

    public function test_ninguna_cifra_esta_escrita_en_la_vista(): void
    {
        $this->entrar();
        Almacen::modificar(function (array &$estado) {
            $estado['postulaciones'][] = ['id' => 500, 'candidato_id' => 3, 'vacante_id' => 2, 'estado' => 'postulada', 'creado_en' => '2026-10-20T10:00:00Z', 'historial' => [['postulada', '2026-10-20T10:00:00Z']]];
            $estado['empresas'][] = ['id' => 500, 'nombre_comercial' => 'Nueva', 'estado' => 'pendiente', 'creado_en' => '2026-10-20T10:00:00Z'];
        });

        $html = $this->get('/dashboard')->getContent();

        $this->assertSame('9', $this->indicador($html, 'postulaciones'));
        $this->assertMatchesRegularExpression('/pendiente-cifra">4<\/p>\s*<div>\s*<p class="pendiente-texto">empresas por validar/', $html);
    }

    public function test_el_periodo_se_conserva_en_la_url_en_el_filtro_y_en_la_exportacion(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard?periodo=90')->getContent();

        $this->assertMatchesRegularExpression('/<option value="90" selected>Últimos 90 días<\/option>/', $html);
        $this->assertStringContainsString('/dashboard/exportar?formato=pdf&amp;periodo=90', $html);
        $this->assertStringContainsString('/dashboard/exportar?formato=xlsx&amp;periodo=90', $html);

        $personalizado = $this->get('/dashboard?periodo=personalizado&desde=2026-08-01&hasta=2026-09-15')->getContent();
        $this->assertMatchesRegularExpression('/<option value="personalizado" selected>/', $personalizado);
        $this->assertMatchesRegularExpression('/<input[^>]*id="desde"[^>]*value="2026-08-01"/', $personalizado);
        $this->assertMatchesRegularExpression('/<input[^>]*id="hasta"[^>]*value="2026-09-15"/', $personalizado);
        $this->assertStringContainsString('formato=pdf&amp;periodo=personalizado&amp;desde=2026-08-01&amp;hasta=2026-09-15', $personalizado);
        $this->assertStringContainsString('Del 1 de agosto de 2026 al 15 de septiembre de 2026', $personalizado);
    }

    public function test_el_filtro_tiene_etiquetas_y_un_boton_para_aplicar(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard')->getContent();

        $this->assertStringContainsString('<label class="form-label" for="periodo">', $html);
        $this->assertStringContainsString('<label class="form-label" for="desde">', $html);
        $this->assertStringContainsString('<label class="form-label" for="hasta">', $html);
        $this->assertMatchesRegularExpression('/<option value="30" selected>Últimos 30 días<\/option>/', $html);
        $this->assertStringContainsString('Aplicar', $html);
        $this->assertStringContainsString('method="GET"', $html);
    }

    public function test_las_dos_tarjetas_de_pendientes_llevan_a_su_pantalla_filtrada(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard')->getContent();

        $this->assertMatchesRegularExpression('/data-pendiente="empresas_por_validar".*?3<\/p>.*?empresas por validar.*?data-estado="pendiente".*?href="[^"]*\/empresas\?estado=pendiente"[^>]*>Ver empresas por validar/s', $html);
        $this->assertMatchesRegularExpression('/data-pendiente="reportes_abiertos".*?5<\/p>.*?reportes abiertos.*?data-estado="abierto".*?href="[^"]*\/reportes\?estado=abierto"[^>]*>Ver reportes abiertos/s', $html);
        $this->get('/empresas?estado=pendiente')->assertOk();
        $this->get('/reportes?estado=abierto')->assertOk();
    }

    public function test_cada_grafica_tiene_titulo_valores_escritos_y_su_tabla_equivalente(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard?periodo=90')->getContent();

        $titulos = [
            'postulaciones-estado' => 'Postulaciones por estado',
            'vacantes-modalidad' => 'Vacantes por modalidad',
            'vacantes-categoria' => 'Vacantes por categoría',
            'evolucion-mensual' => 'Postulaciones y contrataciones por mes',
            'brecha-ajustes' => 'Ajustes solicitados y ajustes ofrecidos',
            'brecha-habilidades' => 'Habilidades demandadas y habilidades registradas',
        ];
        foreach ($titulos as $id => $titulo) {
            $this->assertSame(1, preg_match('/<article id="grafica-'.$id.'".*?<\/article>/s', $html, $m), "Falta la gráfica {$id}.");
            $grafica = $m[0];

            $this->assertStringContainsString('<h3 id="grafica-'.$id.'-titulo" class="grafica-titulo">'.e($titulo).'</h3>', $grafica);
            $this->assertStringContainsString('Ver como tabla', $grafica);
            $this->assertStringContainsString('aria-controls="grafica-'.$id.'-tabla"', $grafica);
            $this->assertStringContainsString('<caption class="visually-hidden">'.e($titulo).'</caption>', $grafica);
            $this->assertSame(1, preg_match_all('/<th scope="col">/', $grafica) > 1 ? 1 : 0, "{$id}: encabezados de columna");
        }
        $this->assertSame(6, substr_count($html, 'Ver como tabla'));
    }

    public function test_la_tabla_de_postulaciones_por_estado_usa_la_insignia_del_mapa_de_estados(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard?periodo=90')->getContent();
        preg_match('/<article id="grafica-postulaciones-estado".*?<\/article>/s', $html, $m);

        foreach (['postulada' => 'Postulada', 'en_revision' => 'En revisión', 'entrevista' => 'Entrevista', 'aceptada' => 'Aceptada', 'no_seleccionada' => 'No seleccionada', 'retirada' => 'Retirada'] as $valor => $texto) {
            $this->assertStringContainsString('data-estado="'.$valor.'"', $m[0]);
            $this->assertStringContainsString('<span>'.$texto.'</span>', $m[0]);
        }
    }

    public function test_las_graficas_de_dos_series_tienen_leyenda_y_no_dependen_solo_del_color(): void
    {
        $this->entrar();

        $html = $this->get('/dashboard?periodo=90')->getContent();
        preg_match('/<article id="grafica-brecha-ajustes".*?<\/article>/s', $html, $ajustes);
        preg_match('/<article id="grafica-evolucion-mensual".*?<\/article>/s', $html, $lineas);

        $this->assertStringContainsString('<ul class="grafica-leyenda" aria-label="Leyenda">', $ajustes[0]);
        $this->assertStringContainsString('Solicitados por candidatos', $ajustes[0]);
        $this->assertStringContainsString('Ofrecidos en vacantes', $ajustes[0]);
        // La segunda serie lleva trama; los valores van escritos junto a cada barra.
        $this->assertStringContainsString('url(#viz-trama)', $ajustes[0]);
        $this->assertStringContainsString('<span class="visually-hidden">Solicitados por candidatos: </span>3', $ajustes[0]);
        // La línea escribe cada valor, usa círculos y cuadrados y un resumen de texto para el lector de pantalla.
        $this->assertStringContainsString('stroke-dasharray="6 4"', $lineas[0]);
        $this->assertStringContainsString('<circle', $lineas[0]);
        $this->assertMatchesRegularExpression('/<svg class="linea"[^>]*role="img" aria-label="Postulaciones y contrataciones por mes\. Julio 2026: Postulaciones \d+, Contrataciones \d+/', $lineas[0]);
        $this->assertSame(8, substr_count($lineas[0], 'class="linea-valor"'));
    }

    public function test_la_nota_de_anonimato_aparece_en_la_brecha_de_ajustes(): void
    {
        $this->entrar();

        $this->get('/dashboard')->assertSee('los ajustes con menos de 5 solicitudes se suman en «Otros»', false);
    }

    public function test_un_periodo_sin_datos_muestra_mensajes_en_lugar_de_graficas_vacias(): void
    {
        $this->entrar();
        Almacen::modificar(function (array &$estado) {
            $estado['postulaciones'] = [];
        });

        $html = $this->get('/dashboard?periodo=7')->getContent();

        $this->assertStringContainsString('No hubo postulaciones en este periodo.', $html);
        $this->assertSame('0', $this->indicador($html, 'postulaciones'));
        $this->assertSame('0 %', $this->indicador($html, 'tasa_colocacion'));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
    }

    #[DataProvider('periodosNoValidos')]
    public function test_un_periodo_no_valido_muestra_el_error_y_usa_los_ultimos_30_dias(string $consulta, string $campo, string $mensaje): void
    {
        $this->entrar();

        $html = $this->get('/dashboard?'.$consulta)->assertOk()->getContent();

        $this->assertStringContainsString('role="alert"', $html);
        $this->assertStringContainsString('<a href="#'.$campo.'">'.$mensaje.'</a>', $html);
        $this->assertStringContainsString('id="error-'.$campo.'"', $html);
        $this->assertMatchesRegularExpression('/<[^>]*id="'.$campo.'"[^>]*aria-invalid="true"/', $html);
        $this->assertStringContainsString('Del 21 de septiembre de 2026 al 21 de octubre de 2026', $html);
        $this->assertSame('8', $this->indicador($html, 'postulaciones'));
    }

    public static function periodosNoValidos(): array
    {
        return [
            'periodo desconocido' => ['periodo=15', 'periodo', 'Elige un periodo de la lista.'],
            'fecha final anterior' => ['periodo=personalizado&desde=2026-09-10&hasta=2026-09-01', 'hasta', 'La fecha final no puede ser anterior a la inicial.'],
            'sin fecha inicial' => ['periodo=personalizado&hasta=2026-09-01', 'desde', 'Escribe la fecha de inicio.'],
            'más de 12 meses' => ['periodo=personalizado&desde=2025-01-01&hasta=2026-10-01', 'hasta', 'El periodo puede abarcar como máximo 12 meses. Acorta las fechas.'],
        ];
    }

    public function test_exportar_pdf_descarga_el_archivo_del_periodo_seleccionado(): void
    {
        $this->entrar();

        $respuesta = $this->get('/dashboard/exportar?formato=pdf&periodo=7')->assertOk();

        $this->assertSame('application/pdf', $respuesta->headers->get('Content-Type'));
        $this->assertSame('attachment; filename="estadisticas_2026-10-14_2026-10-21.pdf"', $respuesta->headers->get('Content-Disposition'));
        $contenido = $respuesta->getContent();
        $this->assertStringStartsWith('%PDF-', $contenido);
        $this->assertStringContainsString('Periodo: del 14/10/2026 al 21/10/2026', EstadisticasMockTest::textoDelPdf($contenido));
    }

    public function test_exportar_xlsx_descarga_el_archivo_del_periodo_seleccionado(): void
    {
        $this->entrar();

        $respuesta = $this->get('/dashboard/exportar?formato=xlsx&periodo=personalizado&desde=2026-08-01&hasta=2026-09-15')->assertOk();

        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $respuesta->headers->get('Content-Type'));
        $this->assertSame('attachment; filename="estadisticas_2026-08-01_2026-09-15.xlsx"', $respuesta->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('PK', $respuesta->getContent());
    }

    public function test_exportar_sin_formato_valido_regresa_al_dashboard_con_un_aviso(): void
    {
        $this->entrar();

        $this->get('/dashboard/exportar?formato=csv&periodo=7')->assertRedirect('/dashboard?periodo=7');
        $this->get('/dashboard')->assertSee($this->enAvisos('Elige el formato de exportación: PDF o XLSX.'), false);
    }

    public function test_exportar_con_un_periodo_no_valido_regresa_al_dashboard_con_un_aviso(): void
    {
        $this->entrar();

        $this->get('/dashboard/exportar?formato=pdf&periodo=personalizado&desde=2026-09-10&hasta=2026-09-01')->assertRedirect('/dashboard?periodo=30');
        $this->get('/dashboard')->assertSee($this->enAvisos('No se pudo exportar: revisa el periodo.'), false);
    }

    public function test_un_token_vencido_cierra_la_sesion_y_regresa_al_login(): void
    {
        $vencido = ApiMock::crearToken(1, 'administrador', time() - 9 * 3600);

        $this->withSession([ApiHttp::SESION_TOKEN => $vencido])->get('/dashboard')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu sesión expiró. Vuelve a iniciar sesión');
    }
}
