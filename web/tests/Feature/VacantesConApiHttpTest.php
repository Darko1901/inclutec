<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-05 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class VacantesConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    /** El ejemplo de VacanteAdmin del contrato. */
    private function fila(array $cambios = []): array
    {
        return $cambios + ['id' => 1, 'titulo' => 'Técnico de soporte de TI', 'empresa' => ['id' => 1, 'nombre_comercial' => 'TecnoQro'],
            'categoria' => ['id' => 1, 'nombre' => 'Tecnologías de la información'], 'modalidad' => ['id' => 3, 'nombre' => 'Híbrido'],
            'estado' => 'publicada', 'publicada_en' => '2026-09-29T15:00:00Z', 'postulados' => 1, 'reportes_abiertos' => 0];
    }

    /** El ejemplo de VacanteDetalle del contrato. */
    private function detalle(array $cambios = []): array
    {
        return $cambios + [
            'id' => 1, 'titulo' => 'Técnico de soporte de TI', 'descripcion' => 'Atención a usuarios internos, mantenimiento de equipos y redes.',
            'empresa' => ['id' => 1, 'nombre_comercial' => 'TecnoQro', 'logo_url' => '/archivos/logos/empresa-1.png', 'validada' => true],
            'categoria' => ['id' => 1, 'nombre' => 'Tecnologías de la información'], 'modalidad' => ['id' => 3, 'nombre' => 'Híbrido'],
            'jornada' => ['id' => 1, 'nombre' => 'Tiempo completo'], 'tipo_contrato' => ['id' => 1, 'nombre' => 'Indefinido'],
            'municipio' => ['id' => 3, 'nombre' => 'Querétaro', 'entidad' => ['id' => 22, 'nombre' => 'Querétaro']],
            'direccion' => 'Av. Constituyentes 100, Querétaro', 'plazas' => 2, 'salario' => ['min' => 14000, 'max' => 18000], 'mostrar_salario' => true,
            'nivel_educativo' => ['id' => 4, 'nombre' => 'Técnico superior universitario', 'orden' => 4], 'experiencia_anios' => 1,
            'habilidades' => [['id' => 4, 'nombre' => 'Soporte técnico', 'obligatoria' => true], ['id' => 5, 'nombre' => 'Redes', 'obligatoria' => true], ['id' => 2, 'nombre' => 'JavaScript', 'obligatoria' => false]],
            'ajustes' => [
                ['id' => 1, 'nombre' => 'Acceso con rampa', 'categoria' => 'movilidad', 'descripcion' => 'Entrada y áreas de trabajo accesibles en silla de ruedas', 'tipo' => 'existente'],
                ['id' => 12, 'nombre' => 'Horario flexible', 'categoria' => 'general', 'descripcion' => 'Posibilidad de ajustar horarios de entrada y salida', 'tipo' => 'bajo_solicitud'],
            ],
            'sin_condiciones_accesibilidad' => false, 'notas_accesibilidad' => null, 'estado' => 'publicada', 'motivo_estado' => null,
            'publicada_en' => '2026-09-29T15:00:00Z', 'actualizado_en' => '2026-09-29T15:00:00Z', 'postulacion_id' => null, 'postulados' => 1,
        ];
    }

    private function pagina(array $items, ?int $total = null): array
    {
        return ['items' => $items, 'total' => $total ?? count($items), 'page' => 1, 'size' => 25];
    }

    private function conAdministrador(array $respuestas)
    {
        Http::fake(['*/auth/me' => Http::response(['id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => 'Admin', 'apellidos' => 'IncluTec', 'telefono' => null, 'rol' => 'administrador', 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null])] + $respuestas);

        return $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN]);
    }

    private function error(string $codigo, string $detail, array $campos = []): array
    {
        return ['detail' => $detail, 'codigo' => $codigo] + ($campos ? ['campos' => $campos] : []);
    }

    /** Catálogos y empresas que pide el listado para armar sus filtros. */
    private function filtros(): array
    {
        return [
            '*/admin/empresas*' => Http::response(['items' => [['id' => 1, 'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1', 'sector' => ['id' => 4, 'nombre' => 'TI'], 'estado' => 'validada', 'reclutadores' => 1, 'vacantes_activas' => 1, 'documento' => true, 'creado_en' => '2026-09-28T15:00:00Z']], 'total' => 1, 'page' => 1, 'size' => 100]),
            '*/catalogos/categorias' => Http::response([['id' => 1, 'nombre' => 'Tecnologías de la información', 'descripcion' => 'x']]),
            '*/catalogos/modalidades' => Http::response([['id' => 2, 'nombre' => 'Remoto'], ['id' => 3, 'nombre' => 'Híbrido']]),
        ];
    }

    public function test_el_listado_pide_los_cinco_filtros_y_la_pagina_con_el_token(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $html = $this->conAdministrador(['*/admin/vacantes*' => Http::response($this->pagina([$this->fila(['reportes_abiertos' => 2])], 8))] + $this->filtros())
            ->get('/vacantes?q=soporte&empresa_id=1&estado=publicada&categoria_id=1&modalidad_id=3&con_reportes=1&page=1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/vacantes?') && $p->method() === 'GET'
            && $p->data() === ['q' => 'soporte', 'empresa_id' => 1, 'estado' => 'publicada', 'categoria_id' => 1, 'modalidad_id' => 3, 'con_reportes' => true, 'page' => 1, 'size' => 25]
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('Técnico de soporte de TI', $html);
        $this->assertStringContainsString('29/09/2026', $html);
        $this->assertMatchesRegularExpression('/reportes-resaltados"><svg[^>]*>.*?<\/svg>2</s', $html);
        $this->assertMatchesRegularExpression('/<input type="checkbox" id="con_reportes" name="con_reportes" value="1" checked>/', $html);
    }

    public function test_sin_filtros_solo_manda_page_y_size(): void
    {
        $this->conAdministrador(['*/admin/vacantes*' => Http::response($this->pagina([]))] + $this->filtros())->get('/vacantes')->assertOk()->assertSee('No se encontraron vacantes con esos filtros.');

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/vacantes?') && $p->data() === ['page' => 1, 'size' => 25]);
    }

    public function test_un_filtro_que_no_esta_en_los_selectores_no_se_manda(): void
    {
        $this->conAdministrador(['*/admin/vacantes*' => Http::response($this->pagina([]))] + $this->filtros())->get('/vacantes?empresa_id=77&categoria_id=88&estado=oculta')->assertOk();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/vacantes?') && $p->data() === ['page' => 1, 'size' => 25]);
    }

    public function test_el_detalle_pide_get_vacantes_id_y_pinta_el_ejemplo_del_contrato(): void
    {
        $html = $this->conAdministrador(['*/vacantes/1' => Http::response($this->detalle())])->get('/vacantes/1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/vacantes/1' && $p->method() === 'GET' && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertStringContainsString('$14,000 a $18,000 MXN', $html);
        $this->assertMatchesRegularExpression('/El lugar cuenta con.*?Acceso con rampa.*?La empresa puede ofrecer bajo solicitud.*?Horario flexible/s', $html);
        $this->assertStringContainsString('>Suspender</button>', $html);
    }

    public function test_el_detalle_con_salario_oculto_y_sin_condiciones_usa_las_aclaraciones(): void
    {
        $html = $this->conAdministrador(['*/vacantes/1' => Http::response($this->detalle(['mostrar_salario' => false, 'ajustes' => [], 'sin_condiciones_accesibilidad' => true, 'notas_accesibilidad' => 'Edificio antiguo.']))])->get('/vacantes/1')->getContent();

        $this->assertStringContainsString('No se muestra a los candidatos.', $html);
        $this->assertStringContainsString('La empresa declaró que el lugar no cuenta con condiciones de accesibilidad', $html);
        $this->assertStringContainsString('Edificio antiguo.', $html);
    }

    public function test_suspender_envia_patch_con_estado_y_motivo(): void
    {
        $this->conAdministrador(['*/admin/vacantes/1/estado' => Http::response($this->detalle(['estado' => 'suspendida', 'motivo_estado' => 'Solicita pagos a los candidatos.']))])
            ->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'Solicita pagos a los candidatos.'])->assertRedirect('/vacantes/1');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/vacantes/1/estado' && $p->method() === 'PATCH'
            && $p->data() === ['estado' => 'suspendida', 'motivo' => 'Solicita pagos a los candidatos.']);
        $this->get('/vacantes/1')->assertSee($this->enAvisos('Se suspendió la vacante «Técnico de soporte de TI». Se avisará al reclutador y a las personas postuladas.'), false);
    }

    public function test_reactivar_envia_publicada_sin_motivo(): void
    {
        $this->conAdministrador(['*/admin/vacantes/1/estado' => Http::response($this->detalle())])->patch('/vacantes/1/estado', ['estado' => 'publicada']);

        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['estado' => 'publicada', 'motivo' => null]);
    }

    public function test_409_transicion_invalida_muestra_el_mensaje_del_api(): void
    {
        $this->conAdministrador(['*/admin/vacantes/1/estado' => Http::response($this->error('transicion_invalida', 'Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.'), 409)])
            ->from('/vacantes/1')->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'x'])->assertRedirect('/vacantes/1');

        $this->get('/vacantes/1')->assertSee($this->enAvisos('Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.'), false);
    }

    public function test_422_del_motivo_vuelve_a_abrir_la_confirmacion(): void
    {
        $this->conAdministrador(['*/admin/vacantes/1/estado' => Http::response($this->error('validacion', 'Falta el motivo.', ['motivo' => 'Falta el motivo.']), 422)])
            ->from('/vacantes/1')->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'x', 'modal' => 'vacante-1-suspender'])
            ->assertSessionHasErrors(['motivo' => 'Falta el motivo.'])->assertSessionHas('abrir_modal', 'vacante-1-suspender');
    }

    public function test_404_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/vacantes/99' => Http::response($this->error('no_encontrado', 'El recurso no existe o no es visible para este usuario.'), 404)])
            ->get('/vacantes/99')->assertStatus(404)->assertSee('El recurso no existe o no es visible para este usuario.');
    }

    public function test_401_cierra_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/vacantes*' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)] + $this->filtros())
            ->get('/vacantes')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_403_muestra_el_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/vacantes*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)] + $this->filtros())
            ->get('/vacantes')->assertStatus(403)->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/vacantes*' => Http::response('', 500)] + $this->filtros())->get('/vacantes')->assertStatus(503)->assertSee('El servicio no está disponible; intenta más tarde.');
    }
}
