<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-08 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class ReportesConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    /** El ejemplo de ReporteAdmin del contrato. */
    private function fila(array $cambios = []): array
    {
        return $cambios + ['id' => 1, 'tipo' => 'vacante', 'objeto' => ['id' => 5, 'nombre' => 'Ejecutivo de atención telefónica · ConCentro'],
            'motivo' => ['id' => 2, 'nombre' => 'Información falsa'], 'reportante' => ['id' => 4, 'nombre' => 'Jorge', 'apellidos' => 'Ramírez Soto'],
            'estado' => 'abierto', 'creado_en' => '2026-10-03T18:00:00Z'];
    }

    /** El ejemplo de ReporteAdminDetalle del contrato. */
    private function detalle(array $reporte = [], array $cambios = []): array
    {
        return $cambios + [
            'reporte' => $this->fila($reporte), 'descripcion' => 'El salario publicado no coincide con lo que me dijeron por teléfono.',
            'resolucion' => null, 'accion' => null, 'atendido_por' => null, 'cerrado_en' => null,
            'historial' => [['estado_anterior' => null, 'estado_nuevo' => 'abierto', 'comentario' => null, 'usuario' => null, 'creado_en' => '2026-10-03T18:00:00Z']],
            'objeto_estado' => 'publicada', 'reportes_previos' => [],
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

    private function motivos(): array
    {
        return ['*/catalogos/motivos-reporte' => Http::response([['id' => 2, 'nombre' => 'Información falsa', 'aplica_a' => 'todos'], ['id' => 6, 'nombre' => 'Otro', 'aplica_a' => 'todos']])];
    }

    public function test_la_bandeja_pide_estado_tipo_motivo_orden_y_pagina_con_el_token(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $html = $this->conAdministrador(['*/admin/reportes*' => Http::response($this->pagina([$this->fila()], 7))] + $this->motivos())
            ->get('/reportes?estado=abierto&tipo=vacante&motivo_reporte_id=2&orden=recientes&page=1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/reportes?') && $p->method() === 'GET'
            && $p->data() === ['estado' => 'abierto', 'tipo' => 'vacante', 'motivo_reporte_id' => 2, 'orden' => 'recientes', 'page' => 1, 'size' => 25]
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        foreach (['en_revision', 'resuelto', 'descartado'] as $estado) {
            Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/reportes?') && ($p->data()['estado'] ?? null) === $estado && $p->data()['size'] === 1 && $p->data()['tipo'] === 'vacante');
        }
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('Ejecutivo de atención telefónica · ConCentro', $html);
        $this->assertStringContainsString('Jorge Ramírez Soto', $html);
        $this->assertMatchesRegularExpression('/Abiertos <span class="pestana-total">\(7\)<\/span>/', $html);
    }

    public function test_sin_filtros_pide_los_abiertos_antiguos_primero(): void
    {
        $this->conAdministrador(['*/admin/reportes*' => Http::response($this->pagina([]))] + $this->motivos())->get('/reportes')->assertOk();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/reportes?') && $p->data() === ['estado' => 'abierto', 'orden' => 'antiguos', 'page' => 1, 'size' => 25]);
    }

    public function test_un_motivo_que_no_esta_en_el_catalogo_no_se_manda(): void
    {
        $this->conAdministrador(['*/admin/reportes*' => Http::response($this->pagina([]))] + $this->motivos())->get('/reportes?motivo_reporte_id=77&tipo=usuario')->assertOk();

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/reportes?') && ! array_key_exists('motivo_reporte_id', $p->data()) && ! array_key_exists('tipo', $p->data()));
    }

    public function test_el_detalle_pide_get_y_pinta_el_ejemplo_del_contrato(): void
    {
        $detalle = $this->detalle([], [
            'reportes_previos' => [['id' => 9, 'motivo' => 'Otro', 'estado' => 'descartado', 'creado_en' => '2026-09-20T10:00:00Z']],
        ]);
        $html = $this->conAdministrador(['*/admin/reportes/1' => Http::response($detalle)])->get('/reportes/1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/reportes/1' && $p->method() === 'GET');
        $this->assertStringContainsString('El salario publicado no coincide con lo que me dijeron por teléfono.', $html);
        $this->assertStringContainsString('Reportes anteriores contra este elemento: 1', $html);
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/reportes\/9">#9<\/a>/', $html);
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/vacantes\/5">Ejecutivo de atención telefónica · ConCentro/', $html);
        $this->assertStringContainsString('>Tomar en revisión</button>', $html);
        $this->assertStringContainsString('>Suspender vacante</button>', $html);
    }

    public function test_el_detalle_de_un_reporte_resuelto_muestra_la_resolucion_y_el_historial_del_contrato(): void
    {
        $detalle = $this->detalle(['estado' => 'resuelto'], [
            'resolucion' => 'La empresa corrigió el salario publicado.', 'accion' => 'suspension', 'atendido_por' => ['id' => 1, 'nombre' => 'Admin', 'apellidos' => 'IncluTec'], 'cerrado_en' => '2026-10-03T19:00:00Z',
            'historial' => [
                ['estado_anterior' => null, 'estado_nuevo' => 'abierto', 'comentario' => null, 'usuario' => null, 'creado_en' => '2026-10-03T18:00:00Z'],
                ['estado_anterior' => 'abierto', 'estado_nuevo' => 'resuelto', 'comentario' => null, 'usuario' => ['id' => 1, 'nombre' => 'Admin'], 'creado_en' => '2026-10-03T19:00:00Z'],
            ],
        ]);
        $html = $this->conAdministrador(['*/admin/reportes/1' => Http::response($detalle)])->get('/reportes/1')->getContent();

        $this->assertStringContainsString('<dt>Resolución</dt><dd>La empresa corrigió el salario publicado.</dd>', $html);
        $this->assertStringContainsString('Suspensión del elemento reportado', $html);
        $this->assertStringContainsString('Admin IncluTec', $html);
        $this->assertMatchesRegularExpression('/data-estado="abierto".*?pasó a.*?data-estado="resuelto"/s', $html);
    }

    public function test_tomar_en_revision_envia_patch_con_el_cuerpo_del_contrato(): void
    {
        $this->conAdministrador(['*/admin/reportes/1' => Http::response($this->detalle(['estado' => 'en_revision']))])->patch('/reportes/1', ['estado' => 'en_revision'])->assertRedirect('/reportes/1');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/reportes/1' && $p->method() === 'PATCH'
            && $p->data() === ['estado' => 'en_revision', 'comentario' => null, 'resolucion' => null, 'accion' => null]);
        $this->get('/reportes/1')->assertSee($this->enAvisos('El reporte #1 quedó en revisión.'), false);
    }

    public function test_resolver_envia_resolucion_y_accion_y_descartar_no_manda_accion(): void
    {
        $this->conAdministrador(['*/admin/reportes/1' => Http::response($this->detalle(['estado' => 'resuelto']))])
            ->patch('/reportes/1', ['estado' => 'resuelto', 'resolucion' => 'La empresa corrigió el salario publicado.', 'accion' => 'suspension'])->assertRedirect('/reportes/1');
        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['estado' => 'resuelto', 'comentario' => null, 'resolucion' => 'La empresa corrigió el salario publicado.', 'accion' => 'suspension']);
        $this->get('/reportes/1')->assertSee($this->enAvisos('Se resolvió el reporte #1. Se notificó a quien lo reportó.'), false);
    }

    public function test_descartar_envia_la_resolucion_sin_accion(): void
    {
        $this->conAdministrador(['*/admin/reportes/1' => Http::response($this->detalle(['estado' => 'descartado']))])
            ->patch('/reportes/1', ['estado' => 'descartado', 'resolucion' => 'No incumple las reglas.', 'accion' => 'suspension'])->assertRedirect('/reportes/1');

        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['estado' => 'descartado', 'comentario' => null, 'resolucion' => 'No incumple las reglas.', 'accion' => null]);
    }

    public function test_409_transicion_invalida_muestra_el_mensaje_del_api(): void
    {
        $this->conAdministrador(['*/admin/reportes/1' => Http::response($this->error('transicion_invalida', 'El reporte ya está cerrado.'), 409)])
            ->from('/reportes/1')->patch('/reportes/1', ['estado' => 'en_revision'])->assertRedirect('/reportes/1');

        $this->get('/reportes/1')->assertSee($this->enAvisos('El reporte ya está cerrado.'), false);
    }

    public function test_422_del_api_vuelve_a_abrir_la_confirmacion_con_el_error_de_la_resolucion(): void
    {
        $this->conAdministrador(['*/admin/reportes/1' => Http::response($this->error('validacion', 'Falta la resolución al cerrar.', ['resolucion' => 'Falta la resolución al cerrar.']), 422)])
            ->from('/reportes/1')->patch('/reportes/1', ['estado' => 'resuelto', 'resolucion' => 'x', 'modal' => 'reporte-1-resolver'])
            ->assertSessionHasErrors(['resolucion' => 'Falta la resolución al cerrar.'])->assertSessionHas('abrir_modal', 'reporte-1-resolver');
    }

    public function test_suspender_la_vacante_usa_el_endpoint_de_vacantes(): void
    {
        $this->conAdministrador([
            '*/admin/reportes/1' => Http::response($this->detalle()),
            '*/admin/vacantes/5/estado' => Http::response(['id' => 5, 'titulo' => 'Ejecutivo de atención telefónica'] + ['estado' => 'suspendida']),
        ])->patch('/reportes/1/suspension', ['motivo' => 'Solicita pagos a los candidatos.'])->assertRedirect('/reportes/1');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/vacantes/5/estado' && $p->method() === 'PATCH' && $p->data() === ['estado' => 'suspendida', 'motivo' => 'Solicita pagos a los candidatos.']);
    }

    public function test_suspender_la_empresa_usa_el_endpoint_de_empresas_y_avisa_cuantas_vacantes(): void
    {
        $empresa = ['id' => 1, 'nombre_comercial' => 'TecnoQro', 'estado' => 'suspendida'];
        $this->conAdministrador([
            '*/admin/reportes/3' => Http::response($this->detalle(['id' => 3, 'tipo' => 'empresa', 'objeto' => ['id' => 1, 'nombre' => 'TecnoQro']], ['objeto_estado' => 'validada'])),
            '*/admin/empresas/1/estado' => Http::response(['empresa' => $empresa, 'vacantes_suspendidas' => 1, 'postulados_notificados' => 1]),
        ])->patch('/reportes/3/suspension', ['motivo' => 'Varias vacantes reportadas como engañosas.'])->assertRedirect('/reportes/3');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/empresas/1/estado' && $p->data() === ['estado' => 'suspendida', 'motivo' => 'Varias vacantes reportadas como engañosas.']);
        $this->get('/reportes/3')->assertSee($this->enAvisos('Se suspendió a TecnoQro: 1 vacante suspendida y 1 persona postulada notificada.'), false);
    }

    public function test_suspender_al_usuario_usa_el_endpoint_de_usuarios(): void
    {
        $this->conAdministrador([
            '*/admin/reportes/4' => Http::response($this->detalle(['id' => 4, 'tipo' => 'candidato', 'objeto' => ['id' => 3, 'nombre' => 'Mariana López García']], ['objeto_estado' => 'activo'])),
            '*/admin/usuarios/3/estado' => Http::response(['id' => 3, 'nombre' => 'Mariana', 'apellidos' => 'López García', 'estado' => 'suspendido']),
        ])->patch('/reportes/4/suspension', ['motivo' => 'Comentarios discriminatorios.'])->assertRedirect('/reportes/4');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/usuarios/3/estado' && $p->method() === 'PATCH' && $p->data() === ['estado' => 'suspendido', 'motivo' => 'Comentarios discriminatorios.']);
        $this->get('/reportes/4')->assertSee($this->enAvisos('Se suspendió a Mariana López García.'), false);
    }

    public function test_409_al_suspender_el_elemento_se_muestra_como_aviso(): void
    {
        $this->conAdministrador([
            '*/admin/reportes/1' => Http::response($this->detalle()),
            '*/admin/vacantes/5/estado' => Http::response($this->error('transicion_invalida', 'Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.'), 409),
        ])->from('/reportes/1')->patch('/reportes/1/suspension', ['motivo' => 'x'])->assertRedirect('/reportes/1');

        $this->get('/reportes/1')->assertSee($this->enAvisos('Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.'), false);
    }

    public function test_404_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/admin/reportes/99' => Http::response($this->error('no_encontrado', 'El recurso no existe o no es visible para este usuario.'), 404)])
            ->get('/reportes/99')->assertStatus(404)->assertSee('El recurso no existe o no es visible para este usuario.');
    }

    public function test_401_cierra_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/reportes*' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)] + $this->motivos())->get('/reportes')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_403_muestra_el_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/reportes*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)] + $this->motivos())
            ->get('/reportes')->assertStatus(403)->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/reportes*' => Http::response('', 500)] + $this->motivos())->get('/reportes')->assertStatus(503)->assertSee('El servicio no está disponible; intenta más tarde.');
    }
}
