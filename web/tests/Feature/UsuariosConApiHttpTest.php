<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** WEB-03 contra el API real (INCLUTEC_API_MOCK=false), con las respuestas del contrato. */
class UsuariosConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    /** El ejemplo de UsuarioAdmin del contrato. */
    private function laura(array $cambios = []): array
    {
        return $cambios + [
            'id' => 2, 'nombre' => 'Laura', 'apellidos' => 'Hernández Ruiz', 'correo' => 'rh@tecnoqro.mx', 'telefono' => '4421234567',
            'rol' => 'reclutador', 'estado' => 'activo', 'empresa' => ['id' => 1, 'nombre_comercial' => 'TecnoQro'],
            'creado_en' => '2026-09-28T15:00:00Z', 'ultimo_acceso_en' => '2026-10-02T16:25:00Z',
        ];
    }

    private function detalleLaura(): array
    {
        return ['usuario' => $this->laura(), 'motivo_estado' => null, 'puesto' => 'Coordinadora de Recursos Humanos',
            'totales' => ['postulaciones' => null, 'vacantes' => 1, 'reportes_recibidos' => 0, 'reportes_hechos' => 0]];
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

    private function empresas(): array
    {
        return ['items' => [['id' => 1, 'razon_social' => 'Tecnologías Querétaro S.A. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB1',
            'sector' => ['id' => 4, 'nombre' => 'Tecnologías de la información'], 'estado' => 'validada', 'reclutadores' => 1, 'vacantes_activas' => 1, 'documento' => true, 'creado_en' => '2026-09-28T15:00:00Z']],
            'total' => 1, 'page' => 1, 'size' => 100];
    }

    private function entrada(array $cambios = []): array
    {
        return $cambios + ['rol' => 'administrador', 'nombre' => 'Isay', 'apellidos' => 'Guerra López', 'correo' => 'isay@inclutec.mx', 'telefono' => '', 'contrasena' => 'Inclutec2026', 'empresa_id' => '', 'puesto' => ''];
    }

    public function test_el_listado_pide_page_size_y_filtros_con_el_token_y_pinta_la_pagina_del_contrato(): void
    {
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
        $html = $this->conAdministrador(['*/admin/usuarios*' => Http::response(['items' => [$this->laura()], 'total' => 7, 'page' => 1, 'size' => 25])])
            ->get('/usuarios?q=laura&rol=reclutador&estado=activo&page=1')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => str_starts_with($p->url(), 'http://localhost:8000/api/v1/admin/usuarios?') && $p->method() === 'GET'
            && $p->data() === ['q' => 'laura', 'rol' => 'reclutador', 'estado' => 'activo', 'page' => 1, 'size' => 25]
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('Laura Hernández Ruiz', $html);
        $this->assertStringContainsString('rh@tecnoqro.mx', $html);
        $this->assertStringContainsString('TecnoQro', $html);
        $this->assertStringContainsString('28/09/2026', $html);
        $this->assertStringContainsString('data-estado="activo"', $html);
    }

    public function test_sin_filtros_solo_manda_page_y_size(): void
    {
        $this->conAdministrador(['*/admin/usuarios*' => Http::response(['items' => [], 'total' => 0, 'page' => 1, 'size' => 25])])
            ->get('/usuarios')->assertOk()->assertSee('No se encontraron usuarios con esos filtros.');

        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/usuarios') && $p->data() === ['page' => 1, 'size' => 25]);
    }

    public function test_el_detalle_pide_get_admin_usuarios_id_y_muestra_el_aviso_de_privacidad(): void
    {
        $html = $this->conAdministrador(['*/admin/usuarios/2' => Http::response($this->detalleLaura())])->get('/usuarios/2')->assertOk()->getContent();

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/usuarios/2' && $p->method() === 'GET');
        $this->assertStringContainsString('Coordinadora de Recursos Humanos', $html);
        $this->assertStringContainsString('Por privacidad, las necesidades de ajuste de los candidatos no se muestran en el panel.', $html);
        $this->assertMatchesRegularExpression('/<dt>Vacantes<\/dt><dd class="detalle-cifra">1<\/dd>/', $html);
    }

    public function test_crear_envia_post_con_el_cuerpo_del_contrato_y_pide_las_empresas_para_el_formulario(): void
    {
        $this->conAdministrador(['*/admin/empresas*' => Http::response($this->empresas())])->get('/usuarios/nuevo')->assertOk()->assertSee('TecnoQro · Validada');
        Http::assertSent(fn (Request $p) => str_contains($p->url(), '/admin/empresas') && $p->data() === ['page' => 1, 'size' => 100]);

        $this->conAdministrador(['*/admin/usuarios' => Http::response($this->laura(['id' => 9, 'rol' => 'administrador', 'empresa' => null, 'nombre' => 'Isay', 'apellidos' => 'Guerra López']), 201)])
            ->post('/usuarios', $this->entrada())->assertRedirect('/usuarios/9');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/usuarios' && $p->method() === 'POST'
            && $p->data() === ['rol' => 'administrador', 'nombre' => 'Isay', 'apellidos' => 'Guerra López', 'correo' => 'isay@inclutec.mx', 'telefono' => null, 'empresa_id' => null, 'puesto' => null, 'contrasena' => 'Inclutec2026']);
    }

    public function test_crear_un_reclutador_manda_empresa_y_puesto(): void
    {
        $this->conAdministrador(['*/admin/usuarios' => Http::response($this->laura(), 201)])
            ->post('/usuarios', $this->entrada(['rol' => 'reclutador', 'empresa_id' => '1', 'puesto' => 'Coordinadora de Talento']))->assertRedirect('/usuarios/2');

        Http::assertSent(fn (Request $p) => $p->method() === 'POST' && $p['empresa_id'] === 1 && $p['puesto'] === 'Coordinadora de Talento' && $p['rol'] === 'reclutador');
    }

    public function test_409_correo_duplicado_se_marca_en_el_campo_correo(): void
    {
        $this->conAdministrador(['*/admin/usuarios' => Http::response($this->error('correo_duplicado', 'El correo ya está registrado.'), 409)])
            ->from('/usuarios/nuevo')->post('/usuarios', $this->entrada())->assertRedirect('/usuarios/nuevo')
            ->assertSessionHasErrors(['correo' => 'Ya existe un usuario con ese correo. Usa otro.']);
    }

    public function test_422_del_api_marca_cada_campo(): void
    {
        $this->conAdministrador(['*/admin/usuarios' => Http::response($this->error('validacion', 'Revisa los datos marcados.', ['telefono' => 'Debe tener 10 dígitos.', 'empresa_id' => 'La empresa no existe.']), 422)])
            ->from('/usuarios/nuevo')->post('/usuarios', $this->entrada())->assertRedirect('/usuarios/nuevo')
            ->assertSessionHasErrors(['telefono' => 'Debe tener 10 dígitos.', 'empresa_id' => 'La empresa no existe.']);
    }

    public function test_editar_envia_put_sin_contrasena(): void
    {
        $this->conAdministrador(['*/admin/usuarios/2' => Http::response($this->laura())])
            ->put('/usuarios/2', $this->entrada(['rol' => 'reclutador', 'empresa_id' => '1', 'puesto' => 'RH', 'correo' => 'rh@tecnoqro.mx']))->assertRedirect('/usuarios/2');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/usuarios/2' && $p->method() === 'PUT' && ! array_key_exists('contrasena', $p->data()));
    }

    public function test_409_en_uso_al_cambiar_el_rol_se_marca_en_el_campo_rol(): void
    {
        $this->conAdministrador(['*/admin/usuarios/2' => Http::response($this->error('en_uso', 'No se puede cambiar el rol: tiene postulaciones o vacantes.'), 409)])
            ->from('/usuarios/2/editar')->put('/usuarios/2', $this->entrada())->assertRedirect('/usuarios/2/editar')
            ->assertSessionHasErrors(['rol' => 'No se puede cambiar el rol: esta persona ya tiene postulaciones o vacantes.']);
    }

    public function test_cambiar_el_estado_envia_patch_con_estado_y_motivo(): void
    {
        $this->conAdministrador(['*/admin/usuarios/2/estado' => Http::response($this->laura(['estado' => 'suspendido']))])
            ->from('/usuarios')->patch('/usuarios/2/estado', ['estado' => 'suspendido', 'motivo' => 'Publicó información falsa en su perfil.'])->assertRedirect('/usuarios');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/admin/usuarios/2/estado' && $p->method() === 'PATCH'
            && $p->data() === ['estado' => 'suspendido', 'motivo' => 'Publicó información falsa en su perfil.']);
        $this->get('/usuarios')->assertSee($this->enAvisos('Se suspendió a Laura Hernández Ruiz.'), false);
    }

    public function test_reactivar_manda_el_motivo_en_null(): void
    {
        $this->conAdministrador(['*/admin/usuarios/2/estado' => Http::response($this->laura())])
            ->patch('/usuarios/2/estado', ['estado' => 'activo']);

        Http::assertSent(fn (Request $p) => $p->method() === 'PATCH' && $p->data() === ['estado' => 'activo', 'motivo' => null]);
    }

    public function test_409_estado_invalido_se_muestra_como_aviso(): void
    {
        $this->conAdministrador(['*/admin/usuarios/1/estado' => Http::response($this->error('estado_invalido', 'Un administrador no puede suspenderse a sí mismo.'), 409)])
            ->from('/usuarios/1')->patch('/usuarios/1/estado', ['estado' => 'suspendido', 'motivo' => 'Prueba'])->assertRedirect('/usuarios/1');

        $this->get('/usuarios/1')->assertSee($this->enAvisos('Un administrador no puede suspenderse a sí mismo.'), false);
    }

    public function test_422_del_motivo_vuelve_a_abrir_la_confirmacion(): void
    {
        $this->conAdministrador(['*/admin/usuarios/2/estado' => Http::response($this->error('validacion', 'Falta el motivo.', ['motivo' => 'Escribe el motivo.']), 422)])
            ->from('/usuarios')->patch('/usuarios/2/estado', ['estado' => 'suspendido', 'motivo' => 'x', 'modal' => 'estado-2-suspender'])
            ->assertSessionHasErrors(['motivo' => 'Escribe el motivo.'])->assertSessionHas('abrir_modal', 'estado-2-suspender');
    }

    public function test_404_del_api_muestra_la_pantalla_de_error(): void
    {
        $this->conAdministrador(['*/admin/usuarios/99' => Http::response($this->error('no_encontrado', 'El recurso no existe o no es visible para este usuario.'), 404)])
            ->get('/usuarios/99')->assertStatus(404)->assertSee('Página no encontrada')->assertSee('El recurso no existe o no es visible para este usuario.');
    }

    public function test_401_del_api_cierra_la_sesion_y_regresa_al_login(): void
    {
        $this->conAdministrador(['*/admin/usuarios*' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)])
            ->get('/usuarios')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_403_del_api_muestra_el_error_sin_cerrar_la_sesion(): void
    {
        $this->conAdministrador(['*/admin/usuarios*' => Http::response($this->error('sin_permiso', 'El rol del usuario no tiene acceso a este endpoint.'), 403)])
            ->get('/usuarios')->assertStatus(403)->assertSee('El rol del usuario no tiene acceso a este endpoint.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_5xx_del_api_muestra_el_aviso_de_servicio_no_disponible(): void
    {
        $this->conAdministrador(['*/admin/usuarios*' => Http::response('', 500)])
            ->get('/usuarios')->assertStatus(503)->assertSee('El servicio no está disponible; intenta más tarde.');
    }
}
