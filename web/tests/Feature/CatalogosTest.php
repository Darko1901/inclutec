<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\Mock\Almacen;
use App\Support\Catalogos;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** WEB-06 y WEB-07 con el mock: diez catálogos administrados con el mismo componente. */
class CatalogosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-21 12:00:00');
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    /** @return array<string, mixed> */
    private function registro(string $clave, int $id): array
    {
        return collect(Almacen::leer()['catalogos_admin'][$clave])->firstWhere('id', $id);
    }

    /** Nombres de la columna «Nombre» de todas las tablas, en orden. @return list<string> */
    private function nombres(string $html): array
    {
        preg_match_all('/<td class="celda-nombre">([^<]*)<\/td>/', $html, $m);

        return array_map('html_entity_decode', $m[1]);
    }

    // --- Acceso ---

    public function test_sin_sesion_todas_las_rutas_llevan_a_login(): void
    {
        $this->post('/logout');

        $this->get('/habilidades')->assertRedirect('/login');
        $this->get('/catalogos')->assertRedirect('/login');
        $this->post('/catalogo/categorias', ['nombre' => 'x'])->assertRedirect('/login');
        $this->put('/catalogo/categorias/1', ['nombre' => 'x'])->assertRedirect('/login');
        $this->patch('/catalogo/categorias/1/activo', ['activo' => 0])->assertRedirect('/login');
        $this->delete('/catalogo/categorias/1')->assertRedirect('/login');
    }

    public function test_una_clave_que_no_es_un_catalogo_no_existe(): void
    {
        $this->post('/catalogo/entidades', ['nombre' => 'x'])->assertStatus(404);
        $this->post('/catalogo/municipios', ['nombre' => 'x'])->assertStatus(404);
        $this->post('/catalogo/tipos-de-discapacidad', ['nombre' => 'x'])->assertStatus(404);
    }

    // --- WEB-06 ---

    public function test_web06_abre_categorias_con_descripcion_y_cuantas_habilidades_y_vacantes_la_usan(): void
    {
        $html = $this->get('/habilidades')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertSame(['Administración', 'Atención a clientes', 'Diseño y comunicación', 'Producción y logística', 'Tecnologías de la información'], $this->nombres($html));
        foreach (['Nombre', 'Descripción', 'En uso', 'Estado', 'Acciones'] as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html);
        }
        $this->assertStringContainsString('Desarrollo, soporte y administración de sistemas', $html);
        // Tecnologías de la información: 5 habilidades y 8 vacantes (3 de S002 y 5 de relleno).
        $this->assertMatchesRegularExpression('/Desarrollo, soporte y administración de sistemas<\/td>\s*<td>5 habilidades · 8 vacantes<\/td>/', $html);
        $this->assertStringContainsString('<span>Activa</span>', $html);
    }

    public function test_las_pestanas_de_web06_marcan_la_actual_y_traen_su_numero(): void
    {
        $html = $this->get('/habilidades?seccion=habilidades')->getContent();

        preg_match('/<nav class="pestanas".*?<\/nav>/s', $html, $nav);
        $this->assertSame(2, substr_count($nav[0], '<a href='));
        $this->assertSame(1, substr_count($nav[0], 'aria-current="page"'));
        $this->assertMatchesRegularExpression('/<a href="[^"]*seccion=habilidades"[^>]*aria-current="page"\s*>\s*Habilidades <span class="pestana-total">\(15\)<\/span>/', $nav[0]);
        $this->assertMatchesRegularExpression('/Categorías <span class="pestana-total">\(5\)<\/span>/', $nav[0]);
    }

    public function test_habilidades_muestra_su_categoria_y_cuantos_candidatos_y_vacantes_la_usan(): void
    {
        $html = $this->get('/habilidades?seccion=habilidades&q=sql')->getContent();

        $this->assertSame(['SQL'], $this->nombres($html));
        $this->assertStringContainsString('<th scope="col">Categoría</th>', $html);
        $this->assertMatchesRegularExpression('/SQL<\/td>\s*<td>Tecnologías de la información<\/td>\s*<td>2 candidatos · 8 vacantes<\/td>/', $html);
    }

    public function test_habilidades_se_busca_por_nombre_y_se_filtra_por_categoria_con_paginacion_de_25(): void
    {
        $this->assertCount(15, $this->nombres($this->get('/habilidades?seccion=habilidades')->getContent()));
        $this->assertSame(['Excel', 'Contabilidad', 'Facturación electrónica'], array_values(array_intersect(['Excel', 'Contabilidad', 'Facturación electrónica'], $this->nombres($this->get('/habilidades?seccion=habilidades&categoria_id=2')->getContent()))));
        $this->assertCount(3, $this->nombres($this->get('/habilidades?seccion=habilidades&categoria_id=2')->getContent()));
        $this->assertSame(['Atención telefónica'], $this->nombres($this->get('/habilidades?seccion=habilidades&q=atenci')->getContent()));
        $html = $this->get('/habilidades?seccion=habilidades&categoria_id=2')->getContent();
        $this->assertMatchesRegularExpression('/<option value="2" selected>Administración<\/option>/', $html);
        $this->assertMatchesRegularExpression('/<input type="hidden" name="seccion" value="habilidades">/', $html);
    }

    public function test_habilidades_pagina_de_25_y_conserva_la_busqueda(): void
    {
        for ($n = 1; $n <= 12; $n++) {
            $this->post('/catalogo/habilidades', ['nombre' => "Habilidad de prueba {$n}", 'categoria_id' => 1]);
        }

        $uno = $this->get('/habilidades?seccion=habilidades')->getContent();
        $this->assertCount(25, $this->nombres($uno));
        $this->assertStringContainsString('Mostrando 1 a 25 de 27', $uno);
        $this->assertCount(2, $this->nombres($this->get('/habilidades?seccion=habilidades&page=2')->getContent()));
        $this->assertMatchesRegularExpression('/href="[^"]*habilidades\?seccion=habilidades&amp;page=2"/', $uno);
        $this->assertCount(12, $this->nombres($this->get('/habilidades?seccion=habilidades&q=prueba')->getContent()));
    }

    public function test_un_filtro_o_seccion_que_no_existe_se_ignora(): void
    {
        $this->assertCount(5, $this->nombres($this->get('/habilidades?seccion=diagnosticos&categoria_id=99')->getContent()));
        $this->assertCount(15, $this->nombres($this->get('/habilidades?seccion=habilidades&categoria_id=99')->getContent()));
    }

    // --- WEB-07 ---

    public function test_web07_trae_los_ocho_catalogos_en_la_lista_lateral_y_marca_el_actual(): void
    {
        $html = $this->get('/catalogos')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        preg_match('/<nav class="catalogos-lista".*?<\/nav>/s', $html, $nav);
        $this->assertSame(8, substr_count($nav[0], '<a href='));
        $this->assertSame(1, substr_count($nav[0], 'aria-current="page"'));
        foreach (['Ajustes y condiciones de accesibilidad', 'Modalidades', 'Jornadas', 'Tipos de contrato', 'Niveles educativos', 'Sectores', 'Tamaños de empresa', 'Motivos de reporte'] as $nombre) {
            $this->assertStringContainsString($nombre.'</a>', $nav[0]);
        }
        $this->assertMatchesRegularExpression('/<a href="[^"]*tipo=ajustes"[^>]*aria-current="page"/', $nav[0]);
    }

    public function test_los_ajustes_se_agrupan_por_categoria_con_su_descripcion_en_lenguaje_claro(): void
    {
        $html = $this->get('/catalogos?tipo=ajustes')->getContent();

        preg_match_all('/<h3 id="grupo-[a-z_]+" class="catalogo-grupo-titulo">([^<]+)<\/h3>/', $html, $grupos);
        $this->assertSame(['Movilidad', 'Visual', 'Auditiva', 'Comunicación', 'Cognitiva y psicosocial', 'General'], array_map('html_entity_decode', $grupos[1]));
        $this->assertMatchesRegularExpression('/<h3 id="grupo-movilidad".*?Acceso con rampa.*?Entrada y áreas de trabajo accesibles en silla de ruedas.*?<h3 id="grupo-visual"/s', $html);
        $this->assertMatchesRegularExpression('/<h3 id="grupo-cognitiva_psicosocial".*?Espacio de trabajo tranquilo.*?Área con poco ruido y pocas distracciones/s', $html);
        $this->assertCount(13, $this->nombres($html));
        $this->assertSame(6, substr_count($html, 'class="table-wrapper"'));
    }

    #[DataProvider('catalogosGenerales')]
    public function test_cada_catalogo_muestra_sus_campos_propios(string $tipo, array $extras, string $celda): void
    {
        $html = $this->get('/catalogos?tipo='.$tipo)->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertNotEmpty($this->nombres($html));
        foreach (array_merge(['Nombre'], $extras, ['En uso', 'Estado', 'Acciones']) as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html, "{$tipo}: {$columna}");
        }
        $this->assertStringContainsString($celda, $html);
    }

    public static function catalogosGenerales(): array
    {
        return [
            'modalidades' => ['modalidades', [], 'Híbrido'],
            'jornadas' => ['jornadas', [], 'Fines de semana'],
            'tipos de contrato' => ['tipos-contrato', [], 'Prácticas profesionales'],
            'niveles educativos' => ['niveles-educativos', ['Orden'], 'Técnico superior universitario'],
            'sectores' => ['sectores', [], 'Tecnologías de la información'],
            'tamaños de empresa' => ['tamanos-empresa', ['Rango'], '51 a 250 trabajadores'],
            'motivos de reporte' => ['motivos-reporte', ['Aplica a'], 'Solicitud de pago al candidato'],
        ];
    }

    public function test_los_niveles_educativos_van_por_orden_y_los_motivos_dicen_a_que_aplican(): void
    {
        $this->assertSame(['Primaria', 'Secundaria', 'Bachillerato', 'Técnico superior universitario', 'Licenciatura', 'Posgrado'], $this->nombres($this->get('/catalogos?tipo=niveles-educativos')->getContent()));
        $motivos = $this->get('/catalogos?tipo=motivos-reporte')->getContent();
        $this->assertMatchesRegularExpression('/Solicitud de pago al candidato<\/td>\s*<td>Vacantes<\/td>/', $motivos);
        $this->assertMatchesRegularExpression('/Discriminación<\/td>\s*<td>Todos<\/td>/', $motivos);
    }

    public function test_un_tipo_que_no_existe_abre_ajustes(): void
    {
        $this->get('/catalogos?tipo=entidades')->assertSee('Ajustes y condiciones de accesibilidad', false);
    }

    public function test_ya_no_existen_los_tipos_de_discapacidad_ni_el_nivel_de_soporte(): void
    {
        foreach (['/catalogos', '/habilidades', '/habilidades?seccion=habilidades'] as $ruta) {
            $html = mb_strtolower($this->get($ruta)->getContent());
            foreach (['tipos de discapacidad', 'tipo de discapacidad', 'nivel de soporte', 'diagnóstico'] as $texto) {
                $this->assertStringNotContainsString($texto, $html, "{$ruta}: {$texto}");
            }
        }
        foreach (Catalogos::TIPOS as $tipo => $nombre) {
            $this->assertStringNotContainsStringIgnoringCase('discapacidad', $nombre);
        }
        $this->assertArrayNotHasKey('discapacidades', Almacen::leer()['catalogos_admin']);
    }

    // --- Un solo componente para las dos pantallas ---

    public function test_las_dos_pantallas_usan_el_mismo_componente_de_catalogo(): void
    {
        foreach (['/habilidades' => 'categorias', '/habilidades?seccion=habilidades' => 'habilidades', '/catalogos?tipo=jornadas' => 'jornadas', '/catalogos' => 'ajustes'] as $ruta => $clave) {
            $html = $this->get($ruta)->getContent();

            $this->assertSame(1, substr_count($html, 'class="catalogo" data-catalogo="'.$clave.'"'), $ruta);
            $this->assertStringContainsString('data-modal="catalogo-nuevo"', $html);
            $this->assertStringContainsString('data-modal="catalogo-editar"', $html);
            $this->assertMatchesRegularExpression('/data-modal="catalogo-eliminar-\d+"/', $html);
            $this->assertStringContainsString('tabla-catalogo', $html);
        }
        $this->assertStringContainsString('<x-catalogo ', file_get_contents(resource_path('views/admin/WEB06_Habilidades.blade.php')));
        $this->assertStringContainsString('<x-catalogo ', file_get_contents(resource_path('views/admin/WEB07_Catalogos.blade.php')));
    }

    public function test_el_formulario_cambia_sus_campos_segun_el_tipo(): void
    {
        $campos = fn (string $ruta) => (function (string $html) {
            preg_match('/data-modal="catalogo-nuevo".*?<\/form>/s', $html, $m);
            preg_match_all('/<(?:input|select|textarea)[^>]*\sname="([a-z_]+)"/', $m[0], $n);

            return array_values(array_diff($n[1], ['_token', 'modal']));
        })($this->get($ruta)->getContent());

        $this->assertSame(['nombre', 'categoria', 'descripcion'], $campos('/catalogos?tipo=ajustes'));
        $this->assertSame(['nombre', 'orden'], $campos('/catalogos?tipo=niveles-educativos'));
        $this->assertSame(['nombre', 'rango'], $campos('/catalogos?tipo=tamanos-empresa'));
        $this->assertSame(['nombre', 'aplica_a'], $campos('/catalogos?tipo=motivos-reporte'));
        $this->assertSame(['nombre'], $campos('/catalogos?tipo=sectores'));
        $this->assertSame(['nombre', 'descripcion'], $campos('/habilidades'));
        $this->assertSame(['nombre', 'categoria_id'], $campos('/habilidades?seccion=habilidades'));
    }

    public function test_el_formulario_de_ajustes_ofrece_las_seis_categorias_y_cada_campo_tiene_etiqueta(): void
    {
        $html = $this->get('/catalogos?tipo=ajustes')->getContent();

        preg_match('/<select[^>]*id="nuevo-categoria".*?<\/select>/s', $html, $select);
        preg_match_all('/<option value="([^"]*)"/', $select[0], $valores);
        $this->assertSame(['', 'movilidad', 'visual', 'auditiva', 'comunicacion', 'cognitiva_psicosocial', 'general'], $valores[1]);
        foreach (['nuevo', 'editar'] as $ventana) {
            foreach (['nombre', 'categoria', 'descripcion'] as $campo) {
                $this->assertStringContainsString('<label class="form-label" for="'.$ventana.'-'.$campo.'">', $html);
            }
        }
        $this->assertStringContainsString('Descripción en lenguaje claro', $html);
    }

    public function test_cada_fila_trae_editar_activar_o_desactivar_y_eliminar_con_su_nombre(): void
    {
        $html = $this->get('/catalogos?tipo=jornadas')->getContent();

        $this->assertStringContainsString('Editar<span class="visually-hidden"> «Medio tiempo»</span>', $html);
        $this->assertStringContainsString('Desactivar<span class="visually-hidden"> «Medio tiempo»</span>', $html);
        $this->assertStringContainsString('Eliminar<span class="visually-hidden"> «Medio tiempo»</span>', $html);
        $this->assertMatchesRegularExpression('/action="[^"]*catalogo\/jornadas\/2\/activo".*?name="_method" value="PATCH".*?name="activo" value="0"/s', $html);
        $this->assertMatchesRegularExpression('/id="catalogo-eliminar-2-titulo">¿Eliminar «Medio tiempo»\?/', $html);
        $this->assertMatchesRegularExpression('/action="[^"]*catalogo\/jornadas\/2".*?name="_method" value="DELETE"/s', $html);
    }

    // --- Alta ---

    public function test_crear_una_categoria_y_una_habilidad_se_conserva_y_aparece_en_la_lista(): void
    {
        $this->post('/catalogo/categorias', ['nombre' => 'Salud y bienestar', 'descripcion' => 'Atención y apoyo en servicios de salud'])->assertRedirect();
        $this->post('/catalogo/habilidades', ['nombre' => 'Power BI', 'categoria_id' => '1'])->assertRedirect();

        $this->assertSame(['Salud y bienestar', 'Atención y apoyo en servicios de salud', true], [$this->registro('categorias', 6)['nombre'], $this->registro('categorias', 6)['descripcion'], $this->registro('categorias', 6)['activo']]);
        $html = $this->get('/habilidades')->getContent();
        $this->assertContains('Salud y bienestar', $this->nombres($html));
        $this->assertStringContainsString('0 habilidades · 0 vacantes', $html);
        $this->assertStringContainsString($this->enAvisos('Se agregó «Power BI».'), $html);
        $this->assertMatchesRegularExpression('/Power BI<\/td>\s*<td>Tecnologías de la información<\/td>\s*<td>0 candidatos · 0 vacantes<\/td>/', $this->get('/habilidades?seccion=habilidades&q=power')->getContent());
    }

    #[DataProvider('altasPorTipo')]
    public function test_crear_un_elemento_de_cada_catalogo_general(string $tipo, array $datos): void
    {
        $this->post("/catalogo/{$tipo}", $datos)->assertRedirect();

        $creado = collect(Almacen::leer()['catalogos_admin'][$tipo])->firstWhere('nombre', $datos['nombre']);
        $this->assertNotNull($creado, $tipo);
        $this->assertTrue($creado['activo']);
        $this->assertContains($datos['nombre'], $this->nombres($this->get("/catalogos?tipo={$tipo}")->getContent()));
    }

    public static function altasPorTipo(): array
    {
        return [
            'ajustes' => ['ajustes', ['nombre' => 'Lector de pantalla instalado', 'categoria' => 'visual', 'descripcion' => 'Equipos con NVDA o JAWS ya instalados']],
            'modalidades' => ['modalidades', ['nombre' => 'Mixta']],
            'jornadas' => ['jornadas', ['nombre' => 'Turno rotativo']],
            'tipos de contrato' => ['tipos-contrato', ['nombre' => 'Honorarios']],
            'niveles educativos' => ['niveles-educativos', ['nombre' => 'Maestría', 'orden' => '7']],
            'sectores' => ['sectores', ['nombre' => 'Agricultura']],
            'tamaños' => ['tamanos-empresa', ['nombre' => 'Gigante', 'rango' => 'Más de 5,000 trabajadores']],
            'motivos' => ['motivos-reporte', ['nombre' => 'Acoso', 'aplica_a' => 'candidato']],
        ];
    }

    public function test_un_ajuste_nuevo_aparece_en_su_grupo(): void
    {
        $this->post('/catalogo/ajustes', ['nombre' => 'Lector de pantalla instalado', 'categoria' => 'visual', 'descripcion' => 'Equipos con NVDA o JAWS ya instalados']);

        $this->assertMatchesRegularExpression('/<h3 id="grupo-visual".*?Lector de pantalla instalado.*?<h3 id="grupo-auditiva"/s', $this->get('/catalogos?tipo=ajustes')->getContent());
    }

    public function test_un_nombre_duplicado_se_marca_en_el_campo_nombre_y_reabre_la_ventana(): void
    {
        $this->from('/catalogos?tipo=sectores')->post('/catalogo/sectores', ['nombre' => 'salud', 'modal' => 'catalogo-nuevo'])
            ->assertRedirect('/catalogos?tipo=sectores')->assertSessionHasErrors(['nombre' => 'Ya existe un sector con ese nombre. Usa otro.'])->assertSessionHas('abrir_modal', 'catalogo-nuevo');

        $html = $this->get('/catalogos?tipo=sectores')->getContent();
        $this->assertStringContainsString('Ya existe un sector con ese nombre. Usa otro.', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="nuevo-nombre"[^>]*aria-invalid="true"[^>]*value="salud"/', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
        $this->assertCount(7, Almacen::leer()['catalogos_admin']['sectores']);
    }

    #[DataProvider('duplicadosPorClave')]
    public function test_el_duplicado_usa_el_texto_de_cada_catalogo(string $clave, array $datos, string $mensaje): void
    {
        $this->from('/')->post("/catalogo/{$clave}", $datos + ['modal' => 'catalogo-nuevo'])->assertSessionHasErrors(['nombre' => $mensaje]);
    }

    public static function duplicadosPorClave(): array
    {
        return [
            'categoría' => ['categorias', ['nombre' => 'Administración'], 'Ya existe una categoría con ese nombre. Usa otro.'],
            'habilidad' => ['habilidades', ['nombre' => 'sql', 'categoria_id' => '1'], 'Ya existe una habilidad con ese nombre. Usa otro.'],
            'ajuste' => ['ajustes', ['nombre' => 'Elevador', 'categoria' => 'movilidad', 'descripcion' => 'x'], 'Ya existe un ajuste con ese nombre. Usa otro.'],
            'motivo' => ['motivos-reporte', ['nombre' => 'Otro', 'aplica_a' => 'todos'], 'Ya existe un motivo de reporte con ese nombre. Usa otro.'],
        ];
    }

    #[DataProvider('entradasNoValidas')]
    public function test_los_datos_no_validos_se_marcan_en_su_campo(string $clave, array $datos, string $campo, string $mensaje): void
    {
        $this->from('/catalogos')->post("/catalogo/{$clave}", $datos + ['modal' => 'catalogo-nuevo'])->assertRedirect('/catalogos')->assertSessionHasErrors([$campo => $mensaje]);
    }

    public static function entradasNoValidas(): array
    {
        return [
            'categoría sin nombre' => ['categorias', ['nombre' => ''], 'nombre', 'Escribe el nombre.'],
            'categoría con descripción larga' => ['categorias', ['nombre' => 'X', 'descripcion' => str_repeat('a', 256)], 'descripcion', 'Descripción debe tener máximo 255 caracteres.'],
            'habilidad sin categoría' => ['habilidades', ['nombre' => 'Algo', 'categoria_id' => ''], 'categoria_id', 'Elige categoría.'],
            'ajuste sin descripción' => ['ajustes', ['nombre' => 'Algo', 'categoria' => 'visual', 'descripcion' => ''], 'descripcion', 'Escribe la descripción en lenguaje claro.'],
            'ajuste con categoría inválida' => ['ajustes', ['nombre' => 'Algo', 'categoria' => 'diagnostico', 'descripcion' => 'x'], 'categoria', 'Elige categoría de la lista.'],
            'nivel sin orden' => ['niveles-educativos', ['nombre' => 'Algo', 'orden' => ''], 'orden', 'Escribe el orden como un número entero.'],
            'nivel con orden decimal' => ['niveles-educativos', ['nombre' => 'Algo', 'orden' => '2.5'], 'orden', 'Escribe un número entero, sin decimales.'],
            'tamaño sin rango' => ['tamanos-empresa', ['nombre' => 'Algo', 'rango' => ''], 'rango', 'Escribe el rango de trabajadores.'],
            'tamaño con rango largo' => ['tamanos-empresa', ['nombre' => 'Algo', 'rango' => str_repeat('a', 41)], 'rango', 'Rango de trabajadores debe tener máximo 40 caracteres.'],
            'motivo sin aplica_a' => ['motivos-reporte', ['nombre' => 'Algo', 'aplica_a' => ''], 'aplica_a', 'Elige aplica a.'],
            'motivo con aplica_a inválido' => ['motivos-reporte', ['nombre' => 'Algo', 'aplica_a' => 'usuario'], 'aplica_a', 'Elige aplica a de la lista.'],
            'nombre largo' => ['sectores', ['nombre' => str_repeat('a', 101)], 'nombre', 'Nombre debe tener máximo 100 caracteres.'],
        ];
    }

    public function test_un_dato_que_solo_el_api_rechaza_llega_a_su_campo(): void
    {
        // La categoría 99 no existe: pasa la validación de Laravel y el mock responde 422 en `categoria_id`.
        $this->from('/habilidades')->post('/catalogo/habilidades', ['nombre' => 'Algo', 'categoria_id' => '99', 'modal' => 'catalogo-nuevo'])
            ->assertSessionHasErrors(['categoria_id' => 'Elige una categoría de la lista.']);
    }

    // --- Edición ---

    public function test_editar_cambia_los_datos_y_se_ve_en_las_demas_pantallas(): void
    {
        $this->put('/catalogo/modalidades/3', ['nombre' => 'Mixto'])->assertRedirect();

        $this->assertSame('Mixto', $this->registro('modalidades', 3)['nombre']);
        $this->assertStringContainsString($this->enAvisos('Se guardaron los cambios de «Mixto».'), $this->get('/catalogos?tipo=modalidades')->getContent());
        // Las vacantes leen el nombre nuevo.
        $this->assertStringContainsString('Mixto', $this->get('/vacantes/1')->getContent());
    }

    public function test_editar_un_ajuste_cambia_su_categoria_y_su_grupo(): void
    {
        $this->put('/catalogo/ajustes/13', ['nombre' => 'Trabajo remoto', 'categoria' => 'movilidad', 'descripcion' => 'Posibilidad de trabajar desde casa'])->assertRedirect();

        $this->assertMatchesRegularExpression('/<h3 id="grupo-movilidad".*?Trabajo remoto.*?<h3 id="grupo-visual"/s', $this->get('/catalogos?tipo=ajustes')->getContent());
    }

    public function test_editar_una_habilidad_cambia_su_categoria(): void
    {
        $this->put('/catalogo/habilidades/6', ['nombre' => 'Excel', 'categoria_id' => '1'])->assertRedirect();

        $this->assertMatchesRegularExpression('/Excel<\/td>\s*<td>Tecnologías de la información<\/td>/', $this->get('/habilidades?seccion=habilidades&q=excel')->getContent());
    }

    public function test_conservar_el_propio_nombre_no_es_un_duplicado_y_el_de_otro_si(): void
    {
        $this->put('/catalogo/jornadas/1', ['nombre' => 'Tiempo completo'])->assertRedirect();
        $this->from('/catalogos')->put('/catalogo/jornadas/1', ['nombre' => 'Medio tiempo', 'modal' => 'catalogo-editar', 'editar_id' => 1])
            ->assertSessionHasErrors(['nombre' => 'Ya existe una jornada con ese nombre. Usa otro.'])->assertSessionHas('abrir_modal', 'catalogo-editar');
    }

    public function test_el_error_de_edicion_reabre_la_ventana_de_edicion_con_lo_que_se_escribio(): void
    {
        $this->from('/catalogos?tipo=tamanos-empresa')->put('/catalogo/tamanos-empresa/2', ['nombre' => 'Micro', 'rango' => '11 a 50 trabajadores', 'modal' => 'catalogo-editar', 'editar_id' => 2]);

        $html = $this->get('/catalogos?tipo=tamanos-empresa')->getContent();
        $this->assertStringContainsString('Ya existe un tamaño de empresa con ese nombre. Usa otro.', $html);
        $this->assertMatchesRegularExpression('/x-data="catalogoEdicion\(.*?editar_id|catalogoEdicion\(/', $html);
        $this->assertStringContainsString('11 a 50 trabajadores', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
        $this->assertMatchesRegularExpression('/data-modal="catalogo-editar"/', $html);
    }

    public function test_editar_algo_que_no_existe_responde_404(): void
    {
        $this->put('/catalogo/sectores/9999', ['nombre' => 'X'])->assertStatus(404)->assertSee('El elemento no existe.');
        $this->patch('/catalogo/categorias/9999/activo', ['activo' => 0])->assertStatus(404);
        $this->delete('/catalogo/habilidades/9999')->assertStatus(404);
    }

    // --- Activar y desactivar ---

    public function test_desactivar_siempre_se_puede_incluso_si_esta_en_uso_y_lo_ya_guardado_no_cambia(): void
    {
        $this->assertSame(12, $this->conteo('modalidades', 2));

        $this->from('/catalogos?tipo=modalidades')->patch('/catalogo/modalidades/2/activo', ['activo' => '0'])->assertRedirect('/catalogos?tipo=modalidades');

        $this->assertFalse($this->registro('modalidades', 2)['activo']);
        $html = $this->get('/catalogos?tipo=modalidades')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se desactivó «Remoto». Ya no se ofrece en registros nuevos; lo que ya se guardó no cambia.'), $html);
        $this->assertMatchesRegularExpression('/Remoto<\/td>.*?data-estado="inactivo".*?<span>Inactivo<\/span>/s', $html);
        $this->assertStringContainsString('>Activar<span class="visually-hidden"> «Remoto»</span>', $html);
        // Lo ya guardado conserva el nombre.
        $this->assertStringContainsString('Remoto', $this->get('/vacantes')->getContent());
    }

    public function test_activar_de_nuevo_lo_deja_activo(): void
    {
        $this->patch('/catalogo/jornadas/4/activo', ['activo' => '0']);
        $this->patch('/catalogo/jornadas/4/activo', ['activo' => '1'])->assertRedirect();

        $this->assertTrue($this->registro('jornadas', 4)['activo']);
        $this->get('/catalogos?tipo=jornadas')->assertSee($this->enAvisos('Se activó «Fines de semana».'), false);
    }

    public function test_una_categoria_o_habilidad_desactivada_se_muestra_inactiva_con_su_texto(): void
    {
        $this->patch('/catalogo/categorias/5/activo', ['activo' => '0']);

        $this->assertMatchesRegularExpression('/Producción y logística<\/td>.*?data-estado="inactivo".*?<span>Inactiva<\/span>/s', $this->get('/habilidades')->getContent());
    }

    public function test_lo_desactivado_deja_de_ofrecerse_en_los_formularios_de_registros_nuevos(): void
    {
        $this->assertMatchesRegularExpression('/<option value="7"[^>]*>Gobierno<\/option>/', $this->get('/empresas/nueva')->getContent());

        $this->patch('/catalogo/sectores/7/activo', ['activo' => '0']);

        $this->assertDoesNotMatchRegularExpression('/<option value="7"[^>]*>Gobierno<\/option>/', $this->get('/empresas/nueva')->getContent());
        // Las empresas que ya lo tienen siguen mostrándolo.
        $this->assertStringContainsString('Gobierno', $this->get('/empresas/104')->getContent());
    }

    // --- Eliminar ---

    public function test_eliminar_un_registro_sin_uso_lo_borra_y_se_conserva(): void
    {
        $this->post('/catalogo/sectores', ['nombre' => 'Agricultura']);
        $id = collect(Almacen::leer()['catalogos_admin']['sectores'])->firstWhere('nombre', 'Agricultura')['id'];

        $this->delete("/catalogo/sectores/{$id}", ['nombre' => 'Agricultura'])->assertRedirect();

        $this->assertNull(collect(Almacen::leer()['catalogos_admin']['sectores'])->firstWhere('id', $id));
        $this->assertNotContains('Agricultura', $this->nombres($this->get('/catalogos?tipo=sectores')->getContent()));
        $this->assertArrayNotHasKey($id, Almacen::leer()['catalogos']['sectores']);
    }

    public function test_el_aviso_de_eliminar_dice_el_nombre(): void
    {
        $this->post('/catalogo/jornadas', ['nombre' => 'Turno rotativo']);
        $id = collect(Almacen::leer()['catalogos_admin']['jornadas'])->firstWhere('nombre', 'Turno rotativo')['id'];

        $this->from('/catalogos?tipo=jornadas')->delete("/catalogo/jornadas/{$id}", ['nombre' => 'Turno rotativo']);

        $this->get('/catalogos?tipo=jornadas')->assertSee($this->enAvisos('Se eliminó «Turno rotativo».'), false);
    }

    #[DataProvider('enUsoPorClave')]
    public function test_eliminar_un_registro_en_uso_no_lo_borra_explica_por_que_y_ofrece_desactivar(string $clave, int $id, string $nombre, string $pantalla): void
    {
        $this->from($pantalla)->delete("/catalogo/{$clave}/{$id}", ['nombre' => $nombre])->assertRedirect($pantalla);

        $this->assertNotNull($this->registro($clave, $id), 'El registro en uso no se borra.');
        $html = $this->get($pantalla)->getContent();
        $this->assertStringContainsString('<div class="aviso-en-uso" role="alert"', $html);
        $this->assertStringContainsString('No se puede eliminar «'.$nombre.'» porque está en uso; puedes desactivarlo.', html_entity_decode($html));
        $this->assertMatchesRegularExpression('/action="[^"]*catalogo\/'.$clave.'\/'.$id.'\/activo".*?name="activo" value="0".*?Desactivar «'.preg_quote($nombre, '/').'»/su', html_entity_decode($html) ?: $html);
    }

    public static function enUsoPorClave(): array
    {
        return [
            'categoría' => ['categorias', 1, 'Tecnologías de la información', '/habilidades'],
            'habilidad' => ['habilidades', 3, 'SQL', '/habilidades?seccion=habilidades'],
            'ajuste' => ['ajustes', 1, 'Acceso con rampa', '/catalogos?tipo=ajustes'],
            'modalidad' => ['modalidades', 1, 'Presencial', '/catalogos?tipo=modalidades'],
            'jornada' => ['jornadas', 1, 'Tiempo completo', '/catalogos?tipo=jornadas'],
            'tipo de contrato' => ['tipos-contrato', 1, 'Indefinido', '/catalogos?tipo=tipos-contrato'],
            'nivel educativo' => ['niveles-educativos', 4, 'Técnico superior universitario', '/catalogos?tipo=niveles-educativos'],
            'sector' => ['sectores', 4, 'Tecnologías de la información', '/catalogos?tipo=sectores'],
            'tamaño' => ['tamanos-empresa', 3, 'Mediana', '/catalogos?tipo=tamanos-empresa'],
            'motivo' => ['motivos-reporte', 2, 'Información falsa', '/catalogos?tipo=motivos-reporte'],
        ];
    }

    public function test_el_boton_desactivar_del_aviso_desactiva_el_registro_en_uso(): void
    {
        $this->from('/catalogos?tipo=ajustes')->delete('/catalogo/ajustes/1', ['nombre' => 'Acceso con rampa']);

        $this->patch('/catalogo/ajustes/1/activo', ['activo' => '0'])->assertRedirect();

        $this->assertFalse($this->registro('ajustes', 1)['activo']);
        $this->assertNotNull($this->registro('ajustes', 1));
    }

    public function test_un_ajuste_en_uso_por_candidatos_tambien_cuenta(): void
    {
        // El ajuste 6 (intérprete de LSM) lo piden candidatos y lo declaran vacantes.
        $this->from('/catalogos?tipo=ajustes')->delete('/catalogo/ajustes/6', ['nombre' => 'Intérprete de Lengua de Señas Mexicana']);

        $this->assertNotNull($this->registro('ajustes', 6));
        $this->assertStringContainsString('<div class="aviso-en-uso"', $this->get('/catalogos?tipo=ajustes')->getContent());
    }

    public function test_el_aviso_de_en_uso_solo_sale_en_el_catalogo_que_lo_provoco(): void
    {
        $this->from('/habilidades')->delete('/catalogo/categorias/1', ['nombre' => 'Tecnologías de la información']);

        $this->assertStringContainsString('aviso-en-uso', $this->get('/habilidades')->getContent());
        $this->assertStringNotContainsString('aviso-en-uso', $this->get('/habilidades?seccion=habilidades')->getContent());
    }

    public function test_la_confirmacion_de_eliminar_explica_la_consecuencia(): void
    {
        $html = $this->get('/catalogos?tipo=sectores')->getContent();

        $this->assertStringContainsString('Se borra de forma definitiva. Si está en uso no se puede eliminar; en ese caso puedes desactivarlo.', $html);
        $this->assertStringContainsString('<input type="hidden" name="nombre" value="Gobierno">', $html);
    }

    private function conteo(string $clave, int $id): int
    {
        return collect(app(ApiAdmin::class)->catalogoAdmin($clave))->firstWhere('id', $id)['en_uso'];
    }
}
