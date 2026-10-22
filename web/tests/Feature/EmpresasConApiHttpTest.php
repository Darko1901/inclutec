<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-04 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class EmpresasConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    /** El ejemplo de EmpresaPropia del contrato. */
    private function empresa(array $cambios = []): array
    {
        return $cambios + [
            'id' => 1, 'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1',
            'sector' => ['id' => 4, 'nombre' => 'Tecnologías de la información'],
            'tamano_empresa' => ['id' => 3, 'nombre' => 'Mediana', 'rango' => '51 a 250 trabajadores'],
            'municipio' => ['id' => 3, 'nombre' => 'Querétaro', 'entidad' => ['id' => 22, 'nombre' => 'Querétaro']],
            'direccion' => 'Av. Constituyentes 100, Querétaro', 'descripcion' => 'Empresa de desarrollo de software y soporte técnico.',
            'sitio_web' => 'https://tecnoqro.mx', 'logo_url' => '/archivos/logos/empresa-1.png',
            'practicas_inclusion' => 'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
            'documento_url' => '/archivos/documentos/empresa-1.pdf', 'estado' => 'validada', 'motivo_estado' => null,
            'validada_en' => '2026-09-28T16:00:00Z', 'datos_fiscales_editables' => false,
        ];
    }

    private function detalle(array $empresa = [], array $cambios = []): array
    {
        return $cambios + ['empresa' => $this->empresa($empresa), 'rfc_duplicado' => false, 'reportes' => 0, 'reclutadores' => [
            ['usuario_id' => 2, 'nombre' => 'Laura', 'apellidos' => 'Hernández Ruiz', 'correo' => 'rh@tecnoqro.mx', 'puesto' => 'Coordinadora de Recursos Humanos', 'estado' => 'activo'],
        ]];
    }

    /** Una fila de EmpresaAdmin. */
    private function fila(array $cambios = []): array
    {
        return $cambios + ['id' => 1, 'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1',
            'sector' => ['id' => 4, 'nombre' => 'Tecnologías de la información'], 'estado' => 'validada', 'reclutadores' => 1, 'vacantes_activas' => 1, 'documento' => true, 'creado_en' => '2026-09-28T15:00:00Z'];
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

    private function entrada(array $cambios = []): array
    {
        return $cambios + ['razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1', 'sector_id' => '4',
            'tamano_empresa_id' => '3', 'municipio_id' => '3', 'direccion' => '', 'sitio_web' => '', 'descripcion' => '', 'practicas_inclusion' => ''];
    }

    public function test_el_listado_pide_la_pestana_con_busqueda_y_pagina_y_cuenta_las_demas(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $html = $this->conAdministrador(['*/admin/empresas*' => Http::response($this->pagina([$this->fila()], 4))])
            ->get('/empresas?estado=validada&q=tecno&page=1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/empresas?') && $p->method() === 'GET'
            && $p->data() === ['q' => 'tecno', 'estado' => 'validada', 'page' => 1, 'size' => 25] && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        foreach (['pendiente', 'rechazada', 'suspendida'] as $estado) {
            Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/empresas?') && ($p->data()['estado'] ?? null) === $estado && $p->data()['size'] === 1 && $p->data()['q'] === 'tecno');
        }
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('Tecnologías Querétaro S.A. de C.V.', $html);
        $this->assertStringContainsString('28/09/2026', $html);
        $this->assertMatchesRegularExpression('/Validadas <span class="pestana-total">\(4\)<\/span>/', $html);
    }

    public function test_sin_estado_pide_pendientes_y_sin_busqueda_no_manda_q(): void
    {
        $this->conAdministrador(['*/admin/empresas*' => Http::response($this->pagina([]))])->get('/empresas')->assertOk()->assertSee('No hay empresas en esta pestaña.');

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/empresas?') && $p->data() === ['estado' => 'pendiente', 'page' => 1, 'size' => 25]);
    }

    public function test_la_revision_pide_el_detalle_y_pinta_los_datos_del_contrato(): void
    {
        $html = $this->conAdministrador(['*/admin/empresas/1' => Http::response($this->detalle())])->get('/empresas/1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas/1' && $p->method() === 'GET');
        $this->assertStringContainsString('Mediana (51 a 250 trabajadores)', $html);
        $this->assertStringContainsString('Laura Hernández Ruiz', $html);
        $this->assertSame(2, substr_count($html, 'data-verificacion="ok"'));
        $this->assertStringContainsString('Ver constancia de situación fiscal (PDF)', $html);
    }

    public function test_rfc_duplicado_del_api_se_marca_en_la_revision(): void
    {
        $html = $this->conAdministrador(['*/admin/empresas/1' => Http::response($this->detalle([], ['rfc_duplicado' => true]))])->get('/empresas/1')->getContent();

        $this->assertStringContainsString('Otra empresa ya registró este RFC', $html);
    }

    public function test_la_constancia_se_descarga_del_api_con_el_token_y_se_reenvia_inline(): void
    {
        $pdf = "%PDF-1.4\nconstancia";
        $respuesta = $this->conAdministrador([
            '*/admin/empresas/1' => Http::response($this->detalle()),
            '*/archivos/documentos/empresa-1.pdf' => Http::response($pdf, 200, ['Content-Type' => 'application/pdf']),
        ])->get('/empresas/1/constancia')->assertOk();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/archivos/documentos/empresa-1.pdf' && $p->method() === 'GET' && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertSame('application/pdf', $respuesta->headers->get('Content-Type'));
        $this->assertSame($pdf, $respuesta->getContent());
    }

    public function test_crear_envia_post_con_el_cuerpo_del_contrato(): void
    {
        $this->conAdministrador(['*/admin/empresas' => Http::response($this->empresa(['id' => 9]), 201)])->post('/empresas', $this->entrada())->assertRedirect('/empresas/9');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas' && $p->method() === 'POST' && $p->data() === [
            'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1', 'sector_id' => 4, 'tamano_empresa_id' => 3,
            'municipio_id' => 3, 'direccion' => null, 'descripcion' => null, 'sitio_web' => null, 'practicas_inclusion' => null,
        ]);
    }

    public function test_el_formulario_pide_los_catalogos_al_api(): void
    {
        $this->conAdministrador([
            '*/catalogos/sectores' => Http::response([['id' => 4, 'nombre' => 'Tecnologías de la información']]),
            '*/catalogos/tamanos-empresa' => Http::response([['id' => 3, 'nombre' => 'Mediana', 'rango' => '51 a 250 trabajadores']]),
            '*/catalogos/entidades' => Http::response([['id' => 22, 'nombre' => 'Querétaro']]),
            '*/catalogos/municipios' => Http::response([['id' => 3, 'nombre' => 'Querétaro', 'entidad_federativa_id' => 22]]),
        ])->get('/empresas/nueva')->assertOk()->assertSee('Mediana · 51 a 250 trabajadores')->assertSee('Querétaro, Querétaro');
    }

    public function test_editar_envia_put(): void
    {
        $this->conAdministrador(['*/admin/empresas/1' => Http::response($this->empresa())])->put('/empresas/1', $this->entrada())->assertRedirect('/empresas/1');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas/1' && $p->method() === 'PUT' && $p['rfc'] === 'TQU150312AB1');
    }

    public function test_409_rfc_duplicado_se_marca_en_el_campo_rfc(): void
    {
        $this->conAdministrador(['*/admin/empresas' => Http::response($this->error('rfc_duplicado', 'Otra empresa ya registró ese RFC.'), 409)])
            ->from('/empresas/nueva')->post('/empresas', $this->entrada())->assertRedirect('/empresas/nueva')
            ->assertSessionHasErrors(['rfc' => 'Otra empresa ya registró ese RFC. Revisa que esté bien escrito.']);
    }

    public function test_422_del_api_marca_cada_campo(): void
    {
        $this->conAdministrador(['*/admin/empresas/1' => Http::response($this->error('validacion', 'Revisa los datos marcados.', ['sector_id' => 'El sector no existe.', 'sitio_web' => 'No es una dirección válida.']), 422)])
            ->from('/empresas/1/editar')->put('/empresas/1', $this->entrada())->assertRedirect('/empresas/1/editar')
            ->assertSessionHasErrors(['sector_id' => 'El sector no existe.', 'sitio_web' => 'No es una dirección válida.']);
    }

    public function test_validar_envia_patch_validacion_con_la_decision(): void
    {
        $this->conAdministrador(['*/admin/empresas/4/validacion' => Http::response($this->empresa(['id' => 4, 'nombre_comercial' => 'Estudio Trazo']))])
            ->patch('/empresas/4/validacion', ['decision' => 'validada'])->assertRedirect('/empresas/4');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas/4/validacion' && $p->method() === 'PATCH' && $p->data() === ['decision' => 'validada', 'motivo' => null]);
        $this->get('/empresas/4')->assertSee($this->enAvisos('Se validó a Estudio Trazo. Ya puede publicar vacantes.'), false);
    }

    public function test_rechazar_envia_el_motivo(): void
    {
        $this->conAdministrador(['*/admin/empresas/4/validacion' => Http::response($this->empresa(['id' => 4, 'estado' => 'rechazada', 'motivo_estado' => 'La constancia de situación fiscal no es legible.']))])
            ->patch('/empresas/4/validacion', ['decision' => 'rechazada', 'motivo' => 'La constancia de situación fiscal no es legible.'])->assertRedirect('/empresas/4');

        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['decision' => 'rechazada', 'motivo' => 'La constancia de situación fiscal no es legible.']);
    }

    public function test_409_estado_invalido_al_validar_se_muestra_como_aviso(): void
    {
        $this->conAdministrador(['*/admin/empresas/1/validacion' => Http::response($this->error('estado_invalido', 'La empresa no está pendiente.'), 409)])
            ->from('/empresas/1')->patch('/empresas/1/validacion', ['decision' => 'validada'])->assertRedirect('/empresas/1');

        $this->get('/empresas/1')->assertSee($this->enAvisos('La empresa no está pendiente.'), false);
    }

    public function test_422_del_motivo_al_rechazar_vuelve_a_abrir_la_confirmacion(): void
    {
        $this->conAdministrador(['*/admin/empresas/4/validacion' => Http::response($this->error('validacion', 'Falta el motivo del rechazo.', ['motivo' => 'Escribe el motivo del rechazo.']), 422)])
            ->from('/empresas/4')->patch('/empresas/4/validacion', ['decision' => 'rechazada', 'motivo' => 'x', 'modal' => 'empresa-4-rechazar'])
            ->assertSessionHasErrors(['motivo' => 'Escribe el motivo del rechazo.'])->assertSessionHas('abrir_modal', 'empresa-4-rechazar');
    }

    public function test_suspender_envia_patch_estado_y_el_aviso_dice_cuantas_vacantes_y_postulados(): void
    {
        $this->conAdministrador(['*/admin/empresas/1/estado' => Http::response(['empresa' => $this->empresa(['estado' => 'suspendida', 'motivo_estado' => 'Varias vacantes reportadas como engañosas.']), 'vacantes_suspendidas' => 1, 'postulados_notificados' => 1])])
            ->patch('/empresas/1/estado', ['estado' => 'suspendida', 'motivo' => 'Varias vacantes reportadas como engañosas.'])->assertRedirect('/empresas/1');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas/1/estado' && $p->method() === 'PATCH'
            && $p->data() === ['estado' => 'suspendida', 'motivo' => 'Varias vacantes reportadas como engañosas.']);
        $this->get('/empresas/1')->assertSee($this->enAvisos('Se suspendió a TecnoQro: 1 vacante suspendida y 1 persona postulada notificada.'), false);
    }

    public function test_reactivar_envia_estado_validada_sin_motivo(): void
    {
        $this->conAdministrador(['*/admin/empresas/1/estado' => Http::response(['empresa' => $this->empresa(), 'vacantes_suspendidas' => 0, 'postulados_notificados' => 0])])
            ->patch('/empresas/1/estado', ['estado' => 'validada']);

        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['estado' => 'validada', 'motivo' => null]);
    }

    public function test_409_transicion_invalida_se_muestra_como_aviso(): void
    {
        $this->conAdministrador(['*/admin/empresas/4/estado' => Http::response($this->error('transicion_invalida', 'Solo se suspende una empresa validada y solo se reactiva una suspendida.'), 409)])
            ->from('/empresas/4')->patch('/empresas/4/estado', ['estado' => 'suspendida', 'motivo' => 'x'])->assertRedirect('/empresas/4');

        $this->get('/empresas/4')->assertSee($this->enAvisos('Solo se suspende una empresa validada y solo se reactiva una suspendida.'), false);
    }

    public function test_404_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/admin/empresas/99' => Http::response($this->error('no_encontrado', 'El recurso no existe o no es visible para este usuario.'), 404)])
            ->get('/empresas/99')->assertStatus(404)->assertSee('El recurso no existe o no es visible para este usuario.');
    }

    public function test_401_cierra_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/empresas*' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)])
            ->get('/empresas')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_403_muestra_el_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/empresas*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)])
            ->get('/empresas')->assertStatus(403)->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/empresas*' => Http::response('', 500)])->get('/empresas')->assertStatus(503)->assertSee('El servicio no está disponible; intenta más tarde.');
    }
}
