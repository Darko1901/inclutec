<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Support\Reportes;
use Tests\TestCase;

class ReportesMockTest extends TestCase
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

    public function test_la_bandeja_tiene_la_forma_de_pagina_reportes(): void
    {
        $pagina = $this->api()->reportes();

        $this->assertSame(['items', 'total', 'page', 'size'], array_keys($pagina));
        $this->assertSame([39, 1, 25, 25], [$pagina['total'], $pagina['page'], $pagina['size'], count($pagina['items'])]);
        $this->assertSame(['id', 'tipo', 'objeto', 'motivo', 'reportante', 'estado', 'creado_en'], array_keys($pagina['items'][0]));
        $this->assertSame(['id', 'nombre'], array_keys($pagina['items'][0]['objeto']));
        $this->assertSame(['id', 'nombre', 'apellidos'], array_keys($pagina['items'][0]['reportante']));
    }

    public function test_hay_reportes_de_los_tres_tipos_y_en_los_cuatro_estados(): void
    {
        $api = $this->api();
        $todos = $api->reportes(size: 100)['items'];

        $this->assertEqualsCanonicalizing(['vacante', 'empresa', 'candidato'], array_values(array_unique(array_column($todos, 'tipo'))));
        $this->assertEqualsCanonicalizing(['abierto', 'en_revision', 'resuelto', 'descartado'], array_values(array_unique(array_column($todos, 'estado'))));
        $this->assertSame(39, $api->reportes()['total']);
        $this->assertSame(39, $api->reportes(estado: 'abierto')['total'] + $api->reportes(estado: 'en_revision')['total'] + $api->reportes(estado: 'resuelto')['total'] + $api->reportes(estado: 'descartado')['total']);
    }

    public function test_el_nombre_del_elemento_sigue_el_formato_del_contrato(): void
    {
        $porId = array_column($this->api()->reportes(size: 100)['items'], null, 'id');

        $this->assertSame('Ejecutivo de atención telefónica · ConCentro', $porId[1]['objeto']['nombre']);
        $this->assertSame('LogiBajío', $porId[105]['objeto']['nombre']);
        $this->assertSame('Sofía Cuenta Suspendida', $porId[108]['objeto']['nombre']);
    }

    public function test_el_orden_por_omision_es_antiguos_y_recientes_lo_invierte(): void
    {
        $api = $this->api();

        $antiguos = array_column($api->reportes(estado: 'abierto')['items'], 'creado_en');
        $recientes = array_column($api->reportes(estado: 'abierto', orden: 'recientes')['items'], 'creado_en');
        $ordenados = $antiguos;
        sort($ordenados);
        $this->assertSame($ordenados, $antiguos);
        $this->assertSame(array_reverse($antiguos), $recientes);
    }

    public function test_los_filtros_se_combinan_y_paginan(): void
    {
        $api = $this->api();

        $this->assertSame(3, $api->reportes(estado: 'abierto', tipo: 'vacante')['total']);
        $this->assertSame(1, $api->reportes(estado: 'abierto', tipo: 'vacante', motivoReporteId: 3)['total']);
        $this->assertSame([31, 2, 6], [$api->reportes(estado: 'resuelto', page: 2)['total'], $api->reportes(estado: 'resuelto', page: 2)['page'], count($api->reportes(estado: 'resuelto', page: 2)['items'])]);
    }

    public function test_los_filtros_no_validos_responden_422(): void
    {
        $error = $this->error(fn () => $this->api()->reportes(estado: 'cerrado', tipo: 'usuario', orden: 'azar', page: 0, size: 101));

        $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
        $this->assertEqualsCanonicalizing(['estado', 'tipo', 'orden', 'page', 'size'], array_keys($error->campos));
    }

    public function test_el_detalle_tiene_la_forma_de_reporte_admin_detalle(): void
    {
        $detalle = $this->api()->reporte(101);

        $this->assertSame(['reporte', 'descripcion', 'resolucion', 'accion', 'atendido_por', 'cerrado_en', 'historial', 'objeto_estado', 'reportes_previos'], array_keys($detalle));
        $this->assertSame(['estado_anterior', 'estado_nuevo', 'comentario', 'usuario', 'creado_en'], array_keys($detalle['historial'][1]));
        $this->assertSame(['id', 'nombre'], array_keys($detalle['historial'][1]['usuario']));
        $this->assertNull($detalle['historial'][0]['usuario']);
        $this->assertSame('publicada', $detalle['objeto_estado']);
        $this->assertSame(['id', 'nombre', 'apellidos'], array_keys($detalle['atendido_por']));
    }

    public function test_los_reportes_previos_son_los_otros_contra_el_mismo_elemento(): void
    {
        $previos = $this->api()->reporte(1)['reportes_previos'];

        $this->assertSame(['id', 'motivo', 'estado', 'creado_en'], array_keys($previos[0]));
        $this->assertSame([103], array_column($previos, 'id'));
        $this->assertSame('Vacante engañosa o fraudulenta', $previos[0]['motivo']);
        // Un reporte contra una empresa no cuenta como previo de una vacante con el mismo número.
        $this->assertSame([], $this->api()->reporte(104)['reportes_previos']);
    }

    public function test_el_estado_del_elemento_es_el_actual(): void
    {
        $api = $this->api();

        $this->assertSame('publicada', $api->reporte(1)['objeto_estado']);
        $api->moderarVacante(5, 'suspendida', 'Prueba.');
        $this->assertSame('suspendida', $api->reporte(1)['objeto_estado']);
        $this->assertSame('validada', $api->reporte(105)['objeto_estado']);
        $this->assertSame('suspendido', $api->reporte(108)['objeto_estado']);
    }

    public function test_sin_sesion_responde_401_y_un_candidato_403(): void
    {
        $acciones = [fn (ApiMock $m) => $m->reportes(), fn (ApiMock $m) => $m->reporte(1), fn (ApiMock $m) => $m->seguimientoReporte(1, 'en_revision')];
        foreach ($acciones as $n => $accion) {
            $this->assertSame(401, $this->error(fn () => $accion(new ApiMock))->status, "sin sesión #{$n}");
        }
        $candidato = $this->api('mariana.lopez@correo.mx');
        foreach ($acciones as $n => $accion) {
            $this->assertSame(403, $this->error(fn () => $accion($candidato))->status, "candidato #{$n}");
        }
    }

    public function test_el_flujo_completo_abierto_en_revision_resuelto_con_historial(): void
    {
        $api = $this->api();

        $enRevision = $api->seguimientoReporte(1, 'en_revision', 'Se pidió información.');
        $this->assertSame(['en_revision', 'Se pidió información.'], [$enRevision['reporte']['estado'], $enRevision['historial'][1]['comentario']]);
        $this->assertSame(['id' => 1, 'nombre' => 'Admin', 'apellidos' => 'IncluTec'], $enRevision['atendido_por']);
        $this->assertNull($enRevision['cerrado_en']);

        $resuelto = $api->seguimientoReporte(1, 'resuelto', null, 'La empresa corrigió el salario.', 'suspension');
        $this->assertSame(['resuelto', 'La empresa corrigió el salario.', 'suspension'], [$resuelto['reporte']['estado'], $resuelto['resolucion'], $resuelto['accion']]);
        $this->assertNotNull($resuelto['cerrado_en']);
        $this->assertSame([[null, 'abierto'], ['abierto', 'en_revision'], ['en_revision', 'resuelto']], array_map(fn ($h) => [$h['estado_anterior'], $h['estado_nuevo']], $resuelto['historial']));
    }

    public function test_un_abierto_se_puede_descartar_directamente(): void
    {
        $descartado = $this->api()->seguimientoReporte(1, 'descartado', null, 'No procede.');

        $this->assertSame(['descartado', 'ninguna'], [$descartado['reporte']['estado'], $descartado['accion']]);
    }

    public function test_no_se_cierra_sin_resolucion(): void
    {
        $api = $this->api();

        foreach ([[101, 'resuelto'], [101, 'descartado'], [1, 'descartado']] as [$id, $estado]) {
            foreach ([null, '', '   '] as $resolucion) {
                $error = $this->error(fn () => $api->seguimientoReporte($id, $estado, null, $resolucion));
                $this->assertSame([422, 'Escribe la resolución para cerrar el reporte.'], [$error->status, $error->campos['resolucion']]);
            }
        }
        $this->assertSame('en_revision', $api->reporte(101)['reporte']['estado']);
        $this->assertCount(2, $api->reporte(101)['historial']);
    }

    public function test_las_transiciones_fuera_del_contrato_responden_409(): void
    {
        $api = $this->api();

        foreach ([[1, 'resuelto'], [101, 'en_revision'], [104, 'en_revision'], [104, 'descartado'], [109, 'resuelto']] as [$id, $estado]) {
            $error = $this->error(fn () => $api->seguimientoReporte($id, $estado, null, 'x'));
            $this->assertSame([409, 'transicion_invalida'], [$error->status, $error->codigo], "{$id} → {$estado}");
        }
        $this->assertSame('El reporte ya está cerrado.', $this->error(fn () => $api->seguimientoReporte(104, 'resuelto', null, 'x'))->detail);
    }

    public function test_los_valores_no_validos_responden_422_y_no_cambian_nada(): void
    {
        $api = $this->api();

        $error = $this->error(fn () => $api->seguimientoReporte(1, 'archivado', str_repeat('a', 501), str_repeat('b', 1001), 'borrar'));
        $this->assertSame(422, $error->status);
        $this->assertEqualsCanonicalizing(['estado', 'comentario', 'resolucion', 'accion'], array_keys($error->campos));
        $this->assertSame('abierto', $api->reporte(1)['reporte']['estado']);
    }

    public function test_un_reporte_que_no_existe_responde_404(): void
    {
        $this->assertSame(404, $this->error(fn () => $this->api()->reporte(9999))->status);
        $this->assertSame(404, $this->error(fn () => $this->api()->seguimientoReporte(9999, 'en_revision'))->status);
    }

    public function test_suspender_un_elemento_desde_su_endpoint_se_ve_en_el_reporte(): void
    {
        $api = $this->api();

        $api->cambiarEstadoEmpresa(2, 'suspendida', 'Prueba.');
        $api->cambiarEstadoUsuario(109, 'suspendido', 'Prueba.');

        $this->assertSame('suspendida', $api->reporte(105)['objeto_estado']);
        $this->assertSame('suspendido', $api->reporte(106)['objeto_estado']);
    }

    public function test_el_catalogo_de_motivos_trae_los_de_s001(): void
    {
        $motivos = $this->api()->catalogo('motivos-reporte');

        $this->assertCount(6, $motivos);
        $this->assertSame(['id', 'nombre', 'aplica_a'], array_keys($motivos[0]));
        $this->assertContains('Solicitud de pago al candidato', array_column($motivos, 'nombre'));
    }

    public function test_las_acciones_de_seguimiento_siguen_la_tabla_de_transiciones(): void
    {
        $this->assertSame(['tomar', 'descartar'], Reportes::disponibles('abierto'));
        $this->assertSame(['resolver', 'descartar'], Reportes::disponibles('en_revision'));
        $this->assertSame([], Reportes::disponibles('resuelto'));
        $this->assertSame([], Reportes::disponibles('descartado'));
        $this->assertSame('resolver', Reportes::paraEstado('resuelto'));
    }
}
