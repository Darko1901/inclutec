<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-02 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class DashboardConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
        $this->travelTo('2026-10-03 12:00:00');
    }

    /** El ejemplo de GET /admin/estadisticas/resumen del contrato. */
    private function resumenDelContrato(): array
    {
        return [
            'periodo' => ['desde' => '2026-09-03', 'hasta' => '2026-10-03'],
            'indicadores' => ['candidatos_activos' => 2, 'empresas_validadas' => 3, 'vacantes_publicadas' => 6, 'postulaciones' => 2, 'contrataciones' => 0, 'tasa_colocacion' => 0.0],
            'pendientes' => ['empresas_por_validar' => 1, 'reportes_abiertos' => 1],
            'graficas' => [
                'postulaciones_por_estado' => [['etiqueta' => 'entrevista', 'total' => 1]],
                'vacantes_por_modalidad' => [['etiqueta' => 'Híbrido', 'total' => 1]],
                'vacantes_por_categoria' => [['etiqueta' => 'Tecnologías de la información', 'total' => 1]],
                'evolucion_mensual' => [
                    ['mes' => '2026-09', 'postulaciones' => 1, 'contrataciones' => 0],
                    ['mes' => '2026-10', 'postulaciones' => 0, 'contrataciones' => 0],
                ],
                'brecha_ajustes' => [
                    ['etiqueta' => 'Acceso con rampa', 'solicitados' => 1, 'ofrecidos' => 1],
                    ['etiqueta' => 'Baño accesible', 'solicitados' => 1, 'ofrecidos' => 1],
                    ['etiqueta' => 'Horario flexible', 'solicitados' => 0, 'ofrecidos' => 1],
                ],
                'brecha_habilidades' => [
                    ['etiqueta' => 'SQL', 'demandadas' => 1, 'registradas' => 1],
                    ['etiqueta' => 'Soporte técnico', 'demandadas' => 1, 'registradas' => 1],
                ],
            ],
        ];
    }

    private function conAdministrador(array $respuestas)
    {
        Http::fake(['*/auth/me' => Http::response(['id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => 'Admin', 'apellidos' => 'IncluTec', 'telefono' => null, 'rol' => 'administrador', 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null])] + $respuestas);

        return $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN]);
    }

    private function error(string $codigo, string $detail): array
    {
        return ['detail' => $detail, 'codigo' => $codigo];
    }

    public function test_el_proveedor_usa_apihttp_y_el_dashboard_pide_el_resumen_con_el_periodo_y_el_token(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->resumenDelContrato())])->get('/dashboard?periodo=7')->assertOk();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/estadisticas/resumen')
            && $p->method() === 'GET'
            && $p->data() === ['desde' => '2026-09-26', 'hasta' => '2026-10-03']
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
    }

    public function test_pinta_las_cifras_del_ejemplo_del_contrato(): void
    {
        $html = $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->resumenDelContrato())])->get('/dashboard')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        foreach (['candidatos_activos' => '2', 'empresas_validadas' => '3', 'vacantes_publicadas' => '6', 'postulaciones' => '2', 'contrataciones' => '0', 'tasa_colocacion' => '0 %'] as $clave => $valor) {
            $this->assertMatchesRegularExpression('/data-indicador="'.$clave.'">.*?indicador-valor">'.preg_quote($valor, '/').'<\/p>/s', $html, $clave);
        }
        $this->assertStringContainsString('data-estado="entrevista"', $html);
        $this->assertStringContainsString('Septiembre 2026', $html);
        $this->assertStringContainsString('Horario flexible', $html);
        $this->assertStringContainsString('Soporte técnico', $html);
        $this->assertMatchesRegularExpression('/data-pendiente="reportes_abiertos".*?>1<\/p>\s*<div>\s*<p class="pendiente-texto">reporte abierto/s', $html);
    }

    public function test_sin_periodo_pide_los_ultimos_30_dias(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->resumenDelContrato())])->get('/dashboard')->assertOk();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/estadisticas/resumen')
            && $p->data() === ['desde' => '2026-09-03', 'hasta' => '2026-10-03']);
    }

    public function test_un_periodo_personalizado_viaja_al_api_tal_cual(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->resumenDelContrato())])
            ->get('/dashboard?periodo=personalizado&desde=2026-08-01&hasta=2026-08-31')->assertOk();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/estadisticas/resumen')
            && $p->data() === ['desde' => '2026-08-01', 'hasta' => '2026-08-31']);
    }

    public function test_un_periodo_no_valido_no_llega_al_api(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->resumenDelContrato())])
            ->get('/dashboard?periodo=personalizado&desde=2026-09-10&hasta=2026-09-01')->assertOk()
            ->assertSee('La fecha final no puede ser anterior a la inicial.');

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/estadisticas/resumen')
            && $p->data() === ['desde' => '2026-09-03', 'hasta' => '2026-10-03']);
    }

    public function test_401_del_api_cierra_la_sesion_y_regresa_al_login(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)])
            ->get('/dashboard')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu sesión expiró. Inicia sesión de nuevo');
    }

    public function test_403_del_api_muestra_la_pantalla_de_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)])
            ->get('/dashboard')->assertStatus(403)
            ->assertSee('No se pudo completar la acción')
            ->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_del_api_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/resumen*' => Http::response('', 500)])
            ->get('/dashboard')->assertStatus(503)
            ->assertSee('El servicio no está disponible; intenta más tarde.');
    }

    public function test_exportar_reenvia_el_archivo_del_api_con_su_tipo_y_su_nombre(): void
    {
        $pdf = "%PDF-1.4\ncontenido de prueba";
        $respuesta = $this->conAdministrador(['*/admin/estadisticas/exportar*' => Http::response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="estadisticas_2026-09-26_2026-10-03.pdf"',
        ])])->get('/dashboard/exportar?formato=pdf&periodo=7')->assertOk();

        $this->assertSame('application/pdf', $respuesta->headers->get('Content-Type'));
        $this->assertSame('attachment; filename="estadisticas_2026-09-26_2026-10-03.pdf"', $respuesta->headers->get('Content-Disposition'));
        $this->assertSame($pdf, $respuesta->getContent());
        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/estadisticas/exportar')
            && $p->method() === 'GET'
            && $p->data() === ['formato' => 'pdf', 'desde' => '2026-09-26', 'hasta' => '2026-10-03']
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
    }

    public function test_exportar_xlsx_conserva_el_tipo_del_contrato(): void
    {
        $tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        $respuesta = $this->conAdministrador(['*/admin/estadisticas/exportar*' => Http::response('PK-contenido', 200, [
            'Content-Type' => $tipo,
            'Content-Disposition' => 'attachment; filename=reporte.xlsx',
        ])])->get('/dashboard/exportar?formato=xlsx')->assertOk();

        $this->assertSame($tipo, $respuesta->headers->get('Content-Type'));
        $this->assertSame('attachment; filename="reporte.xlsx"', $respuesta->headers->get('Content-Disposition'));
    }

    public function test_exportar_sin_nombre_en_el_api_arma_uno_con_el_formato(): void
    {
        $respuesta = $this->conAdministrador(['*/admin/estadisticas/exportar*' => Http::response('x', 200, ['Content-Type' => 'application/pdf'])])
            ->get('/dashboard/exportar?formato=pdf')->assertOk();

        $this->assertSame('attachment; filename="estadisticas.pdf"', $respuesta->headers->get('Content-Disposition'));
    }

    public function test_exportar_con_error_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/admin/estadisticas/exportar*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)])
            ->get('/dashboard/exportar?formato=pdf')->assertStatus(403)->assertSee('No se pudo completar la acción');
    }
}
