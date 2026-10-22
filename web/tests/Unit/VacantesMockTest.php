<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Support\AccionesVacante;
use Tests\TestCase;

class VacantesMockTest extends TestCase
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

    public function test_el_listado_tiene_la_forma_de_pagina_vacantes_admin(): void
    {
        $pagina = $this->api()->vacantes();

        $this->assertSame(['items', 'total', 'page', 'size'], array_keys($pagina));
        $this->assertSame([34, 1, 25, 25], [$pagina['total'], $pagina['page'], $pagina['size'], count($pagina['items'])]);
        $this->assertSame(['id', 'titulo', 'empresa', 'categoria', 'modalidad', 'estado', 'publicada_en', 'postulados', 'reportes_abiertos'], array_keys($pagina['items'][0]));
        $this->assertSame(['id', 'nombre_comercial'], array_keys($pagina['items'][0]['empresa']));
        $this->assertSame(['id', 'nombre'], array_keys($pagina['items'][0]['categoria']));
    }

    public function test_los_cinco_filtros_se_combinan(): void
    {
        $api = $this->api();

        $this->assertSame(10, $api->vacantes(empresaId: 1)['total']);
        $this->assertSame(4, $api->vacantes(estado: 'suspendida')['total']);
        $this->assertSame(8, $api->vacantes(categoriaId: 1)['total']);
        $this->assertSame(12, $api->vacantes(modalidadId: 2)['total']);
        $this->assertSame(2, $api->vacantes(conReportes: true)['total']);
        $this->assertSame(['Asistente contable', 'Coordinador de turno'], array_column($api->vacantes(empresaId: 2, estado: 'pausada')['items'], 'titulo'));
        $this->assertSame(0, $api->vacantes(empresaId: 1, estado: 'publicada', categoriaId: 5)['total']);
        $this->assertSame([34, 2, 9], [$api->vacantes(page: 2)['total'], $api->vacantes(page: 2)['page'], count($api->vacantes(page: 2)['items'])]);
    }

    public function test_los_filtros_no_validos_responden_422(): void
    {
        $error = $this->error(fn () => $this->api()->vacantes(estado: 'oculta', page: 0, size: 101));

        $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
        $this->assertEqualsCanonicalizing(['estado', 'page', 'size'], array_keys($error->campos));
    }

    public function test_el_detalle_tiene_la_forma_de_vacante_detalle(): void
    {
        $detalle = $this->api()->vacante(1);

        $this->assertSame(
            ['id', 'titulo', 'descripcion', 'empresa', 'categoria', 'modalidad', 'jornada', 'tipo_contrato', 'municipio', 'direccion', 'plazas', 'salario', 'mostrar_salario', 'nivel_educativo', 'experiencia_anios', 'habilidades', 'ajustes', 'sin_condiciones_accesibilidad', 'notas_accesibilidad', 'estado', 'motivo_estado', 'publicada_en', 'actualizado_en', 'postulacion_id', 'postulados'],
            array_keys($detalle),
        );
        $this->assertSame(['id', 'nombre_comercial', 'logo_url', 'validada'], array_keys($detalle['empresa']));
        $this->assertSame(['id', 'nombre', 'orden'], array_keys($detalle['nivel_educativo']));
        $this->assertSame(['id', 'nombre', 'obligatoria'], array_keys($detalle['habilidades'][0]));
        $this->assertSame(['id', 'nombre', 'categoria', 'descripcion', 'tipo'], array_keys($detalle['ajustes'][0]));
        // Las obligatorias van primero, igual que en el ejemplo del contrato.
        $this->assertSame([true, true, true, true, false, false], array_column($detalle['habilidades'], 'obligatoria'));
        $this->assertSame(['existente', 'existente', 'bajo_solicitud'], array_column($detalle['ajustes'], 'tipo'));
        $this->assertSame(4, $detalle['postulados']);
    }

    public function test_el_salario_se_entrega_al_administrador_aunque_no_se_muestre_al_candidato(): void
    {
        $detalle = $this->api()->vacante(4);

        $this->assertFalse($detalle['mostrar_salario']);
        $this->assertSame(['min' => 8000, 'max' => 9000], $detalle['salario']);
        $this->assertNull($this->api()->vacante(7)['salario']);
        $this->assertNull($this->api()->vacante(7)['nivel_educativo']);
    }

    public function test_sin_sesion_responde_401_y_un_candidato_403(): void
    {
        $acciones = [fn (ApiMock $m) => $m->vacantes(), fn (ApiMock $m) => $m->vacante(1), fn (ApiMock $m) => $m->moderarVacante(1, 'suspendida', 'x')];
        foreach ($acciones as $n => $accion) {
            $this->assertSame(401, $this->error(fn () => $accion(new ApiMock))->status, "sin sesión #{$n}");
        }
        $candidato = $this->api('mariana.lopez@correo.mx');
        foreach ($acciones as $n => $accion) {
            $this->assertSame(403, $this->error(fn () => $accion($candidato))->status, "candidato #{$n}");
        }
    }

    public function test_suspender_pide_motivo_y_solo_funciona_con_publicadas_o_pausadas(): void
    {
        $api = $this->api();

        $this->assertSame([422, 'Escribe el motivo de la suspensión.'], [$this->error(fn () => $api->moderarVacante(1, 'suspendida', ' '))->status, $this->error(fn () => $api->moderarVacante(1, 'suspendida'))->campos['motivo']]);
        $this->assertSame('publicada', $api->vacante(1)['estado']);
        $this->assertSame('suspendida', $api->moderarVacante(1, 'suspendida', 'Motivo.')['estado']);
        $this->assertSame('suspendida', $api->moderarVacante(201, 'suspendida', 'Motivo.')['estado']);
        foreach ([[1, 'suspendida'], [202, 'suspendida'], [7, 'suspendida']] as [$id, $estado]) {
            $error = $this->error(fn () => $api->moderarVacante($id, $estado, 'x'));
            $this->assertSame([409, 'transicion_invalida'], [$error->status, $error->codigo], "{$id} → {$estado}");
        }
    }

    public function test_reactivar_solo_funciona_con_suspendidas_y_las_deja_publicadas(): void
    {
        $api = $this->api();

        $this->assertSame('transicion_invalida', $this->error(fn () => $api->moderarVacante(1, 'publicada'))->codigo);
        $reactivada = $api->moderarVacante(203, 'publicada');
        $this->assertSame(['publicada', null], [$reactivada['estado'], $reactivada['motivo_estado']]);
    }

    public function test_un_estado_que_no_existe_responde_422(): void
    {
        $this->assertSame(['estado'], array_keys($this->error(fn () => $this->api()->moderarVacante(1, 'oculta', 'x'))->campos));
    }

    public function test_las_ultimas_vacantes_del_listado_no_cuentan_como_publicadas_en_las_estadisticas(): void
    {
        $api = $this->api();

        $this->assertSame(8, $api->estadisticas()['indicadores']['vacantes_publicadas']);
        $api->moderarVacante(1, 'suspendida', 'Prueba.');
        $this->assertSame(7, $api->estadisticas()['indicadores']['vacantes_publicadas']);
    }

    public function test_los_textos_de_la_app_se_repiten_en_el_panel(): void
    {
        $this->assertSame('No se requiere experiencia previa', AccionesVacante::experiencia(0));
        $this->assertSame(['1 año de experiencia', '3 años de experiencia'], [AccionesVacante::experiencia(1), AccionesVacante::experiencia(3)]);
        $this->assertSame(['1 plaza', '2 plazas'], [AccionesVacante::plazas(1), AccionesVacante::plazas(2)]);
        $this->assertSame(['$14,000 a $18,000 MXN', '$9,000 MXN', 'Desde $1,000 MXN', 'Hasta $2,000 MXN', null], [
            AccionesVacante::salario(['min' => 14000, 'max' => 18000]), AccionesVacante::salario(['min' => 9000, 'max' => 9000]),
            AccionesVacante::salario(['min' => 1000, 'max' => null]), AccionesVacante::salario(['min' => null, 'max' => 2000]), AccionesVacante::salario(null),
        ]);
    }
}
