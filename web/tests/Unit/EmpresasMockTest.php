<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use Tests\TestCase;

class EmpresasMockTest extends TestCase
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

    public function test_el_listado_tiene_la_forma_de_pagina_empresas_admin(): void
    {
        $pagina = $this->api()->listarEmpresas();

        $this->assertSame(['items', 'total', 'page', 'size'], array_keys($pagina));
        $this->assertSame([10, 1, 25], [$pagina['total'], $pagina['page'], $pagina['size']]);
        $this->assertSame(
            ['id', 'razon_social', 'nombre_comercial', 'rfc', 'sector', 'estado', 'reclutadores', 'vacantes_activas', 'documento', 'creado_en'],
            array_keys($pagina['items'][0]),
        );
        $this->assertSame(['id', 'nombre'], array_keys($pagina['items'][0]['sector']));
    }

    public function test_las_pendientes_van_primero_por_antiguedad_y_las_demas_por_nombre(): void
    {
        $nombres = array_column($this->api()->listarEmpresas()['items'], 'nombre_comercial');

        $this->assertSame(['MediBajío', 'OficiosDigitales', 'Estudio Trazo'], array_slice($nombres, 0, 3));
        $resto = array_slice($nombres, 3);
        $ordenado = $resto;
        usort($ordenado, fn ($a, $b) => mb_strtolower($a) <=> mb_strtolower($b));
        $this->assertSame($ordenado, $resto);
    }

    public function test_filtra_por_estado_busqueda_y_sector_y_pagina(): void
    {
        $api = $this->api();

        $this->assertSame(3, $api->listarEmpresas(estado: 'validada')['total']);
        $this->assertSame(['ConCentro'], array_column($api->listarEmpresas(q: 'cac0904')['items'], 'nombre_comercial'));
        $this->assertSame([3, 1], [$api->listarEmpresas(sectorId: 3)['total'], $api->listarEmpresas(sectorId: 3, estado: 'validada')['total']]);
        $segunda = $api->listarEmpresas(page: 2, size: 4);
        $this->assertSame([10, 2, 4, 4], [$segunda['total'], $segunda['page'], $segunda['size'], count($segunda['items'])]);
    }

    public function test_los_filtros_no_validos_responden_422(): void
    {
        $error = $this->error(fn () => $this->api()->listarEmpresas(estado: 'cerrada', page: 0, size: 101));

        $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
        $this->assertEqualsCanonicalizing(['estado', 'page', 'size'], array_keys($error->campos));
    }

    public function test_el_detalle_tiene_la_forma_del_contrato(): void
    {
        $detalle = $this->api()->empresa(1);

        $this->assertSame(['empresa', 'reclutadores', 'rfc_duplicado', 'reportes'], array_keys($detalle));
        $this->assertSame(
            ['id', 'razon_social', 'nombre_comercial', 'rfc', 'sector', 'tamano_empresa', 'municipio', 'direccion', 'descripcion', 'sitio_web', 'logo_url', 'practicas_inclusion', 'documento_url', 'estado', 'motivo_estado', 'validada_en', 'datos_fiscales_editables'],
            array_keys($detalle['empresa']),
        );
        $this->assertSame(['id', 'nombre', 'entidad'], array_keys($detalle['empresa']['municipio']));
        $this->assertSame(['usuario_id', 'nombre', 'apellidos', 'correo', 'puesto', 'estado'], array_keys($detalle['reclutadores'][0]));
        $this->assertFalse($detalle['empresa']['datos_fiscales_editables']);
        $this->assertTrue($this->api()->empresa(4)['empresa']['datos_fiscales_editables']);
        $this->assertFalse($detalle['rfc_duplicado']);
    }

    public function test_los_catalogos_se_devuelven_como_catalogo_item_ordenados_por_nombre(): void
    {
        $api = $this->api();

        $this->assertSame(['Comercio', 'Educación'], array_slice(array_column($api->catalogo('sectores'), 'nombre'), 0, 2));
        $this->assertSame(['id', 'nombre', 'rango'], array_keys($api->catalogo('tamanos-empresa')[0]));
        $this->assertSame(['id', 'nombre', 'entidad_federativa_id'], array_keys($api->catalogo('municipios')[0]));
        $this->assertCount(4, $api->catalogo('municipios', 22));
        $this->assertSame(404, $this->error(fn () => $api->catalogo('colores'))->status);
    }

    public function test_el_archivo_de_ejemplo_se_descarga_y_los_demas_responden_404(): void
    {
        $archivo = $this->api()->archivo('/mock/constancia-ejemplo.pdf');

        $this->assertSame(['application/pdf', 'constancia-ejemplo.pdf'], [$archivo['tipo'], $archivo['nombre']]);
        $this->assertStringStartsWith('%PDF-', $archivo['contenido']);
        $this->assertSame(404, $this->error(fn () => $this->api()->archivo('/archivos/documentos/empresa-1.pdf'))->status);
        $this->assertSame(404, $this->error(fn () => $this->api()->archivo('/mock/../.env'))->status);
    }

    public function test_sin_sesion_responde_401_y_un_candidato_403_en_todo(): void
    {
        $acciones = [
            fn (ApiMock $m) => $m->listarEmpresas(), fn (ApiMock $m) => $m->empresa(1), fn (ApiMock $m) => $m->crearEmpresa([]), fn (ApiMock $m) => $m->editarEmpresa(1, []),
            fn (ApiMock $m) => $m->validarEmpresa(4, 'validada'), fn (ApiMock $m) => $m->cambiarEstadoEmpresa(1, 'suspendida', 'x'), fn (ApiMock $m) => $m->archivo('/mock/constancia-ejemplo.pdf'),
        ];
        foreach ($acciones as $n => $accion) {
            $this->assertSame(401, $this->error(fn () => $accion(new ApiMock))->status, "sin sesión #{$n}");
        }
        $candidato = $this->api('mariana.lopez@correo.mx');
        foreach ($acciones as $n => $accion) {
            $this->assertSame(403, $this->error(fn () => $accion($candidato))->status, "candidato #{$n}");
        }
    }

    public function test_validar_solo_funciona_con_pendientes_y_rechazar_pide_motivo(): void
    {
        $api = $this->api();

        $this->assertSame([422, 'Escribe el motivo del rechazo.'], [$this->error(fn () => $api->validarEmpresa(4, 'rechazada', ' '))->status, $this->error(fn () => $api->validarEmpresa(4, 'rechazada'))->campos['motivo']]);
        $this->assertSame('pendiente', $api->empresa(4)['empresa']['estado']);
        $this->assertSame('validada', $api->validarEmpresa(4, 'validada')['estado']);
        $error = $this->error(fn () => $api->validarEmpresa(4, 'rechazada', 'x'));
        $this->assertSame([409, 'estado_invalido'], [$error->status, $error->codigo]);
    }

    public function test_suspender_y_reactivar_siguen_la_tabla_de_transiciones(): void
    {
        $api = $this->api();

        foreach ([[4, 'suspendida'], [103, 'suspendida'], [1, 'validada'], [105, 'suspendida']] as [$id, $estado]) {
            $error = $this->error(fn () => $api->cambiarEstadoEmpresa($id, $estado, 'x'));
            $this->assertSame([409, 'transicion_invalida'], [$error->status, $error->codigo], "{$id} → {$estado}");
        }
        $this->assertSame(422, $this->error(fn () => $api->cambiarEstadoEmpresa(1, 'suspendida', ''))->status);
        $this->assertSame(422, $this->error(fn () => $api->cambiarEstadoEmpresa(1, 'cerrada', 'x'))->status);
        $this->assertSame('validada', $api->empresa(1)['empresa']['estado']);
    }

    public function test_el_resultado_de_suspender_tiene_la_forma_resultado_estado_empresa(): void
    {
        $resultado = $this->api()->cambiarEstadoEmpresa(2, 'suspendida', 'Prueba.');

        $this->assertSame(['empresa', 'vacantes_suspendidas', 'postulados_notificados'], array_keys($resultado));
        $this->assertSame('suspendida', $resultado['empresa']['estado']);
        $this->assertSame('Prueba.', $resultado['empresa']['motivo_estado']);
        // LogiBajío tiene publicadas las vacantes 2 y 3.
        $this->assertSame(2, $resultado['vacantes_suspendidas']);
    }

    public function test_un_error_no_deja_cambios_a_medias(): void
    {
        $api = $this->api();

        $this->error(fn () => $api->crearEmpresa(['razon_social' => 'X', 'nombre_comercial' => 'X', 'rfc' => 'ETR2101119P4', 'sector_id' => 1, 'tamano_empresa_id' => 1, 'municipio_id' => 1]));
        $this->error(fn () => $api->editarEmpresa(1, ['razon_social' => 'Nueva', 'nombre_comercial' => 'X', 'rfc' => 'LBN180725KQ3', 'sector_id' => 1, 'tamano_empresa_id' => 1, 'municipio_id' => 1]));

        $this->assertSame(10, $api->listarEmpresas()['total']);
        $this->assertSame('Tecnologías Querétaro S.A. de C.V.', $api->empresa(1)['empresa']['razon_social']);
    }
}
