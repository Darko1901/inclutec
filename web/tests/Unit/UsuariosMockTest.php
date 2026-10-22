<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use Tests\TestCase;

class UsuariosMockTest extends TestCase
{
    private function api(string $correo = 'admin@inclutec.mx'): ApiMock
    {
        $mock = new ApiMock;
        session([ApiHttp::SESION_TOKEN => $mock->login($correo, 'Inclutec2026')['access_token']]);

        return $mock;
    }

    private function error(callable $accion): ApiError
    {
        try {
            $accion();
        } catch (ApiError $error) {
            return $error;
        }
        $this->fail('Debió lanzar ApiError.');
    }

    public function test_el_listado_tiene_la_forma_de_pagina_usuarios_y_el_usuario_admin_del_contrato(): void
    {
        $pagina = $this->api()->usuarios();

        $this->assertSame(['items', 'total', 'page', 'size'], array_keys($pagina));
        $this->assertSame([60, 1, 25, 25], [$pagina['total'], $pagina['page'], $pagina['size'], count($pagina['items'])]);
        $this->assertSame(
            ['id', 'nombre', 'apellidos', 'correo', 'telefono', 'rol', 'estado', 'empresa', 'creado_en', 'ultimo_acceso_en'],
            array_keys($pagina['items'][0]),
        );
        $laura = array_values(array_filter($this->api()->usuarios('laura')['items']))[0];
        $this->assertSame(['id' => 1, 'nombre_comercial' => 'TecnoQro'], $laura['empresa']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $laura['creado_en']);
    }

    public function test_el_listado_va_de_mas_reciente_a_mas_antiguo(): void
    {
        $fechas = array_column($this->api()->usuarios(null, null, null, 1, 100)['items'], 'creado_en');

        $ordenadas = $fechas;
        rsort($ordenadas);
        $this->assertSame($ordenadas, $fechas);
    }

    public function test_el_detalle_tiene_la_forma_del_contrato_y_no_trae_necesidades(): void
    {
        $detalle = $this->api()->usuario(3);

        $this->assertSame(['usuario', 'motivo_estado', 'puesto', 'totales'], array_keys($detalle));
        $this->assertSame(['postulaciones', 'vacantes', 'reportes_recibidos', 'reportes_hechos'], array_keys($detalle['totales']));
        $this->assertStringNotContainsString('necesidad', json_encode($detalle));
        $this->assertStringNotContainsString('consentimiento', json_encode($detalle));
        $this->assertNull($detalle['totales']['vacantes']);
    }

    public function test_sin_sesion_responde_401_y_un_candidato_responde_403_en_todo(): void
    {
        $acciones = [
            fn (ApiMock $m) => $m->usuarios(), fn (ApiMock $m) => $m->usuario(3), fn (ApiMock $m) => $m->crearUsuario([]),
            fn (ApiMock $m) => $m->editarUsuario(3, []), fn (ApiMock $m) => $m->cambiarEstadoUsuario(3, 'activo'), fn (ApiMock $m) => $m->listarEmpresas(),
        ];
        foreach ($acciones as $n => $accion) {
            $this->assertSame(401, $this->error(fn () => $accion(new ApiMock))->status, "sin sesión #{$n}");
        }
        $candidato = $this->api('mariana.lopez@correo.mx');
        foreach ($acciones as $n => $accion) {
            $this->assertSame([403, 'sin_permiso'], [$this->error(fn () => $accion($candidato))->status, 'sin_permiso'], "candidato #{$n}");
        }
    }

    public function test_los_filtros_invalidos_responden_422(): void
    {
        $error = $this->error(fn () => $this->api()->usuarios(null, 'superadmin', 'bloqueado', 0, 101));

        $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
        $this->assertEqualsCanonicalizing(['rol', 'estado', 'page', 'size'], array_keys($error->campos));
    }

    public function test_el_motivo_es_obligatorio_salvo_al_reactivar(): void
    {
        $mock = $this->api();

        $error = $this->error(fn () => $mock->cambiarEstadoUsuario(3, 'suspendido', null));
        $this->assertSame([422, 'Escribe el motivo.'], [$error->status, $error->campos['motivo']]);
        $this->assertSame(422, $this->error(fn () => $mock->cambiarEstadoUsuario(3, 'eliminado', '   '))->status);
        $this->assertSame('activo', $mock->cambiarEstadoUsuario(100, 'activo', null)['estado']);
    }

    public function test_un_administrador_no_puede_suspenderse_ni_darse_de_baja_pero_si_reactivarse(): void
    {
        $mock = $this->api();

        foreach (['suspendido', 'eliminado'] as $estado) {
            $error = $this->error(fn () => $mock->cambiarEstadoUsuario(1, $estado, 'Prueba'));
            $this->assertSame([409, 'estado_invalido'], [$error->status, $error->codigo]);
        }
        $this->assertSame('activo', $mock->cambiarEstadoUsuario(1, 'activo')['estado']);
    }

    public function test_un_error_no_deja_cambios_a_medias(): void
    {
        $mock = $this->api();

        $this->error(fn () => $mock->crearUsuario(['rol' => 'candidato', 'nombre' => 'A', 'apellidos' => 'B', 'correo' => 'rh@tecnoqro.mx', 'contrasena' => 'Inclutec2026']));

        $this->assertSame(60, $mock->usuarios()['total']);
    }

    public function test_un_candidato_con_postulaciones_no_cambia_de_rol_pero_si_edita_sus_datos(): void
    {
        $mock = $this->api();
        $entrada = ['rol' => 'candidato', 'nombre' => 'Mariana', 'apellidos' => 'López', 'correo' => 'mariana.lopez@correo.mx', 'telefono' => '', 'empresa_id' => null, 'puesto' => null];

        $this->assertSame('López', $mock->editarUsuario(3, $entrada)['apellidos']);
        $error = $this->error(fn () => $mock->editarUsuario(3, ['rol' => 'administrador'] + $entrada));
        $this->assertSame([409, 'en_uso'], [$error->status, $error->codigo]);
    }

    public function test_las_empresas_van_primero_las_pendientes_y_despues_por_nombre(): void
    {
        $empresas = $this->api()->listarEmpresas();

        $this->assertSame(['Estudio Trazo', 'ConCentro', 'LogiBajío', 'TecnoQro'], array_column($empresas['items'], 'nombre_comercial'));
        $this->assertSame(
            ['id', 'razon_social', 'nombre_comercial', 'rfc', 'sector', 'estado', 'reclutadores', 'vacantes_activas', 'documento', 'creado_en'],
            array_keys($empresas['items'][0]),
        );
        $this->assertSame(['pendiente', 'validada', 'validada', 'validada'], array_column($empresas['items'], 'estado'));
        $this->assertSame([1, 1], [$empresas['items'][3]['reclutadores'] >= 1 ? 1 : 0, $empresas['items'][3]['vacantes_activas'] >= 1 ? 1 : 0]);
    }
}
