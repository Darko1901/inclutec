<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Support\Catalogos;
use Tests\TestCase;

class CatalogosMockTest extends TestCase
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

    public function test_categorias_tiene_la_forma_de_categoria_admin_con_sus_conteos(): void
    {
        $categorias = $this->api()->categorias();

        $this->assertCount(5, $categorias);
        $this->assertSame(['id', 'nombre', 'descripcion', 'activo', 'habilidades', 'vacantes'], array_keys($categorias[0]));
        $ti = array_column($categorias, null, 'nombre')['Tecnologías de la información'];
        $this->assertSame([5, 8], [$ti['habilidades'], $ti['vacantes']]);
        $this->assertSame(['Atención a clientes'], array_column($this->api()->categorias('atenci'), 'nombre'));
    }

    public function test_habilidades_tiene_la_forma_de_pagina_habilidades_admin(): void
    {
        $pagina = $this->api()->habilidades();

        $this->assertSame(['items', 'total', 'page', 'size'], array_keys($pagina));
        $this->assertSame([15, 1, 25], [$pagina['total'], $pagina['page'], $pagina['size']]);
        $this->assertSame(['id', 'nombre', 'categoria', 'activo', 'candidatos', 'vacantes'], array_keys($pagina['items'][0]));
        $this->assertSame(['id', 'nombre'], array_keys($pagina['items'][0]['categoria']));
        $this->assertSame(3, $this->api()->habilidades(categoriaId: 3)['total']);
        $this->assertSame(['SQL'], array_column($this->api()->habilidades(q: 'SQL')['items'], 'nombre'));
        $this->assertSame(2, $this->api()->habilidades(page: 2, size: 13)['total'] - 13);
    }

    public function test_los_catalogos_generales_tienen_la_forma_de_catalogo_admin_con_sus_campos_propios(): void
    {
        $api = $this->api();

        $this->assertSame(['id', 'nombre', 'activo', 'en_uso', 'categoria', 'descripcion'], array_keys($api->catalogoAdmin('ajustes')[0]));
        $this->assertSame(['id', 'nombre', 'activo', 'en_uso', 'orden'], array_keys($api->catalogoAdmin('niveles-educativos')[0]));
        $this->assertSame(['id', 'nombre', 'activo', 'en_uso', 'rango'], array_keys($api->catalogoAdmin('tamanos-empresa')[0]));
        $this->assertSame(['id', 'nombre', 'activo', 'en_uso', 'aplica_a'], array_keys($api->catalogoAdmin('motivos-reporte')[0]));
        $this->assertSame(['id', 'nombre', 'activo', 'en_uso'], array_keys($api->catalogoAdmin('modalidades')[0]));
        $this->assertSame([13, 3, 4, 4, 6, 7, 4, 6], array_map(fn (string $tipo) => count($api->catalogoAdmin($tipo)), array_keys(Catalogos::TIPOS)));
    }

    public function test_los_ocho_tipos_del_panel_existen_y_las_entidades_y_municipios_no(): void
    {
        $api = $this->api();

        foreach (array_keys(Catalogos::TIPOS) as $tipo) {
            $this->assertNotEmpty($api->catalogoAdmin($tipo), $tipo);
        }
        foreach (['entidades', 'municipios', 'colores', 'discapacidades'] as $tipo) {
            $this->assertSame(404, $this->error(fn () => $api->catalogoAdmin($tipo))->status, $tipo);
            $this->assertSame(404, $this->error(fn () => $api->crearElementoCatalogo($tipo, ['nombre' => 'x']))->status, $tipo);
        }
    }

    public function test_el_en_uso_de_cada_elemento_se_calcula_con_el_estado(): void
    {
        $api = $this->api();

        $this->assertSame(0, array_column($api->catalogoAdmin('niveles-educativos'), null, 'nombre')['Primaria']['en_uso']);
        $this->assertGreaterThan(0, array_column($api->catalogoAdmin('modalidades'), null, 'nombre')['Remoto']['en_uso']);
        $this->assertSame(5, array_column($api->catalogoAdmin('motivos-reporte'), null, 'nombre')['Discriminación']['en_uso']);
        $api->crearElementoCatalogo('sectores', ['nombre' => 'Agricultura']);
        $this->assertSame(0, array_column($api->catalogoAdmin('sectores'), null, 'nombre')['Agricultura']['en_uso']);
    }

    public function test_el_nombre_es_unico_por_catalogo_sin_importar_mayusculas(): void
    {
        $api = $this->api();

        foreach ([
            fn () => $api->crearCategoria(['nombre' => 'ADMINISTRACIÓN']),
            fn () => $api->crearHabilidad(['nombre' => 'sql', 'categoria_id' => 1]),
            fn () => $api->crearElementoCatalogo('jornadas', ['nombre' => 'medio tiempo']),
            fn () => $api->editarElementoCatalogo('jornadas', 1, ['nombre' => 'Por horas']),
            fn () => $api->editarCategoria(1, ['nombre' => 'Administración']),
        ] as $n => $accion) {
            $error = $this->error($accion);
            $this->assertSame([409, 'nombre_duplicado'], [$error->status, $error->codigo], "caso {$n}");
        }
        // El mismo nombre en otro catálogo no choca.
        $this->assertSame('Mixto', $api->crearElementoCatalogo('modalidades', ['nombre' => 'Mixto'])['nombre']);
        $this->assertSame('Mixto', $api->crearElementoCatalogo('sectores', ['nombre' => 'Mixto'])['nombre']);
    }

    public function test_eliminar_solo_si_nada_lo_usa_y_desactivar_siempre_se_puede(): void
    {
        $api = $this->api();

        foreach ([
            fn () => $api->eliminarCategoria(1), fn () => $api->eliminarHabilidad(3), fn () => $api->eliminarElementoCatalogo('ajustes', 1),
            fn () => $api->eliminarElementoCatalogo('modalidades', 1), fn () => $api->eliminarElementoCatalogo('sectores', 4),
        ] as $n => $accion) {
            $error = $this->error($accion);
            $this->assertSame([409, 'en_uso'], [$error->status, $error->codigo], "caso {$n}");
        }
        $this->assertFalse($api->activarCategoria(1, false)['activo']);
        $this->assertFalse($api->activarHabilidad(3, false)['activo']);
        $this->assertFalse($api->activarElementoCatalogo('ajustes', 1, false)['activo']);
        $this->assertTrue($api->activarElementoCatalogo('ajustes', 1, true)['activo']);
        // Sin uso, sí se elimina (niveles Primaria, Secundaria y Posgrado no los usa nadie).
        $api->eliminarElementoCatalogo('niveles-educativos', 1);
        $this->assertNotContains('Primaria', array_column($api->catalogoAdmin('niveles-educativos'), 'nombre'));
    }

    public function test_una_categoria_o_habilidad_nueva_se_puede_eliminar(): void
    {
        $api = $this->api();

        $categoria = $api->crearCategoria(['nombre' => 'Salud y bienestar', 'descripcion' => 'Atención y apoyo en servicios de salud']);
        $this->assertSame(['activo' => true, 'habilidades' => 0, 'vacantes' => 0], ['activo' => $categoria['activo'], 'habilidades' => $categoria['habilidades'], 'vacantes' => $categoria['vacantes']]);
        $habilidad = $api->crearHabilidad(['nombre' => 'Primeros auxilios', 'categoria_id' => $categoria['id']]);
        // Con una habilidad la categoría está en uso.
        $this->assertSame('en_uso', $this->error(fn () => $api->eliminarCategoria($categoria['id']))->codigo);
        $api->eliminarHabilidad($habilidad['id']);
        $api->eliminarCategoria($categoria['id']);
        $this->assertCount(5, $api->categorias());
    }

    public function test_cada_tipo_valida_sus_campos_propios(): void
    {
        $api = $this->api();
        $campos = fn (callable $accion) => array_keys($this->error($accion)->campos);

        $this->assertSame(['descripcion', 'categoria'], $campos(fn () => $api->crearElementoCatalogo('ajustes', ['nombre' => 'X'])));
        $this->assertSame(['orden'], $campos(fn () => $api->crearElementoCatalogo('niveles-educativos', ['nombre' => 'X', 'orden' => 'dos'])));
        $this->assertSame(['rango'], $campos(fn () => $api->crearElementoCatalogo('tamanos-empresa', ['nombre' => 'X'])));
        $this->assertSame(['aplica_a'], $campos(fn () => $api->crearElementoCatalogo('motivos-reporte', ['nombre' => 'X', 'aplica_a' => 'usuario'])));
        $this->assertSame(['nombre'], $campos(fn () => $api->crearElementoCatalogo('sectores', ['nombre' => str_repeat('a', 101)])));
        $this->assertSame(['nombre'], $campos(fn () => $api->crearCategoria(['nombre' => str_repeat('a', 81)])));
        $this->assertSame(['nombre', 'categoria_id'], $campos(fn () => $api->crearHabilidad(['nombre' => '', 'categoria_id' => 99])));
        $this->assertSame(['descripcion'], $campos(fn () => $api->crearCategoria(['nombre' => 'X', 'descripcion' => str_repeat('a', 256)])));
        // Un campo que no es del tipo se ignora.
        $this->assertArrayNotHasKey('rango', $api->crearElementoCatalogo('jornadas', ['nombre' => 'Turno rotativo', 'rango' => 'x']));
    }

    public function test_un_error_no_deja_cambios_a_medias(): void
    {
        $api = $this->api();

        $this->error(fn () => $api->crearCategoria(['nombre' => 'Administración']));
        $this->error(fn () => $api->editarElementoCatalogo('ajustes', 1, ['nombre' => 'Elevador', 'categoria' => 'movilidad', 'descripcion' => 'x']));

        $this->assertCount(5, $api->categorias());
        $this->assertSame('Acceso con rampa', array_column($api->catalogoAdmin('ajustes'), null, 'id')[1]['nombre']);
    }

    public function test_editar_actualiza_lo_que_leen_las_demas_pantallas(): void
    {
        $api = $this->api();

        $api->editarElementoCatalogo('modalidades', 3, ['nombre' => 'Mixto']);
        $api->editarElementoCatalogo('tamanos-empresa', 1, ['nombre' => 'Micro', 'rango' => '1 a 5 trabajadores']);
        $api->editarElementoCatalogo('ajustes', 1, ['nombre' => 'Acceso con rampa', 'categoria' => 'general', 'descripcion' => 'Nueva descripción']);

        $this->assertSame('Mixto', $api->vacante(1)['modalidad']['nombre']);
        $this->assertSame('1 a 5 trabajadores', array_column($api->catalogo('tamanos-empresa'), null, 'id')[1]['rango']);
        $this->assertSame(['general', 'Nueva descripción'], [$api->vacante(1)['ajustes'][0]['categoria'], $api->vacante(1)['ajustes'][0]['descripcion']]);
    }

    public function test_el_catalogo_publico_solo_ofrece_los_activos(): void
    {
        $api = $this->api();
        $api->activarElementoCatalogo('sectores', 7, false);
        $api->activarCategoria(5, false);

        $this->assertNotContains('Gobierno', array_column($api->catalogo('sectores'), 'nombre'));
        $this->assertNotContains('Producción y logística', array_column($api->catalogo('categorias'), 'nombre'));
        $this->assertSame(['id', 'nombre'], array_keys($api->catalogo('sectores')[0]));
        // El administrador sí los ve todos.
        $this->assertContains('Gobierno', array_column($api->catalogoAdmin('sectores'), 'nombre'));
    }

    public function test_sin_sesion_responde_401_y_un_candidato_403_en_todo(): void
    {
        $acciones = [
            fn (ApiMock $m) => $m->categorias(), fn (ApiMock $m) => $m->crearCategoria(['nombre' => 'x']), fn (ApiMock $m) => $m->editarCategoria(1, ['nombre' => 'x']),
            fn (ApiMock $m) => $m->activarCategoria(1, false), fn (ApiMock $m) => $m->eliminarCategoria(1), fn (ApiMock $m) => $m->habilidades(),
            fn (ApiMock $m) => $m->crearHabilidad([]), fn (ApiMock $m) => $m->activarHabilidad(1, false), fn (ApiMock $m) => $m->eliminarHabilidad(1),
            fn (ApiMock $m) => $m->catalogoAdmin('ajustes'), fn (ApiMock $m) => $m->crearElementoCatalogo('ajustes', []), fn (ApiMock $m) => $m->eliminarElementoCatalogo('ajustes', 1),
        ];
        foreach ($acciones as $n => $accion) {
            $this->assertSame(401, $this->error(fn () => $accion(new ApiMock))->status, "sin sesión #{$n}");
        }
        $candidato = $this->api('mariana.lopez@correo.mx');
        foreach ($acciones as $n => $accion) {
            $this->assertSame(403, $this->error(fn () => $accion($candidato))->status, "candidato #{$n}");
        }
    }

    public function test_la_definicion_de_cada_catalogo_coincide_con_catalogo_entrada(): void
    {
        $campos = fn (string $clave) => array_column(Catalogos::definicion($clave)['campos'], 'nombre');

        $this->assertSame(['nombre', 'categoria', 'descripcion'], $campos('ajustes'));
        $this->assertSame(['nombre', 'orden'], $campos('niveles-educativos'));
        $this->assertSame(['nombre', 'rango'], $campos('tamanos-empresa'));
        $this->assertSame(['nombre', 'aplica_a'], $campos('motivos-reporte'));
        $this->assertSame(['nombre', 'descripcion'], $campos('categorias'));
        $this->assertSame(['nombre', 'categoria_id'], $campos('habilidades'));
        $this->assertCount(10, Catalogos::claves());
        $this->expectException(\InvalidArgumentException::class);
        Catalogos::definicion('discapacidades');
    }
}
