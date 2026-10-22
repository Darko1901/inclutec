<?php

namespace Tests\Feature;

use App\Servicios\Api\Mock\Almacen;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** WEB-05 · Moderación de vacantes con el mock (34 vacantes: 2 páginas de 25). */
class VacantesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-21 12:00:00');
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    private function vacante(int $id): array
    {
        return collect(Almacen::leer()['vacantes'])->firstWhere('id', $id);
    }

    /** Títulos de la tabla, en orden. @return list<string> */
    private function titulos(string $html): array
    {
        preg_match_all('/<td class="celda-nombre">([^<]*)<\/td>/', $html, $m);

        return array_map('html_entity_decode', $m[1]);
    }

    // --- Acceso y listado ---

    public function test_sin_sesion_las_rutas_de_vacantes_llevan_a_login(): void
    {
        $this->post('/logout');

        $this->get('/vacantes')->assertRedirect('/login');
        $this->get('/vacantes/1')->assertRedirect('/login');
        $this->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'x'])->assertRedirect('/login');
    }

    public function test_el_listado_muestra_25_por_pagina_con_las_columnas_del_diseno(): void
    {
        $html = $this->get('/vacantes')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertCount(25, $this->titulos($html));
        foreach (['Título', 'Empresa', 'Categoría', 'Modalidad', 'Estado', 'Fecha de publicación', 'Postulados', 'Reportes abiertos', 'Acciones'] as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html);
        }
        $this->assertStringContainsString('Mostrando 1 a 25 de 34', $html);
        $this->assertCount(9, $this->titulos($this->get('/vacantes?page=2')->getContent()));
        // Las publicadas más recientes primero; los borradores, sin fecha, al final.
        $this->assertSame('Técnico de soporte de TI', $this->titulos($html)[0]);
    }

    public function test_los_filtros_de_empresa_estado_categoria_y_modalidad_se_aplican_y_se_conservan_en_la_pagina(): void
    {
        $this->assertCount(10, $this->titulos($this->get('/vacantes?empresa_id=1&size=100')->getContent()));
        $this->assertCount(4, $this->titulos($this->get('/vacantes?estado=suspendida')->getContent()));
        $this->assertCount(8, $this->titulos($this->get('/vacantes?categoria_id=1')->getContent()));
        $this->assertCount(12, $this->titulos($this->get('/vacantes?modalidad_id=2')->getContent()));
        $this->assertSame(['Asistente contable', 'Coordinador de turno'], $this->titulos($this->get('/vacantes?estado=pausada&empresa_id=2')->getContent()));
        $this->assertSame(5, count($this->titulos($this->get('/vacantes?q=AUXILIAR')->getContent())));

        $html = $this->get('/vacantes?modalidad_id=2&estado=cerrada&page=1')->getContent();
        $this->assertMatchesRegularExpression('/<option value="2" selected>Remoto<\/option>/', $html);
        $this->assertMatchesRegularExpression('/<option value="cerrada" selected>Cerrada<\/option>/', $html);
    }

    public function test_los_enlaces_de_paginacion_conservan_busqueda_y_filtros(): void
    {
        // 30 vacantes tienen una «a» en el título: dos páginas.
        $html = $this->get('/vacantes?q=a')->getContent();

        $this->assertMatchesRegularExpression('/<input[^>]*name="q"[^>]*value="a"/', $html);
        $this->assertMatchesRegularExpression('/href="[^"]*vacantes\?q=a&amp;page=2"/', $html);
        $this->assertCount(5, $this->titulos($this->get('/vacantes?q=a&page=2')->getContent()));
    }

    public function test_solo_con_reportes_abiertos_deja_las_vacantes_con_reportes_y_los_resalta(): void
    {
        $html = $this->get('/vacantes?con_reportes=1')->getContent();

        $this->assertSame(['Técnico de soporte de TI', 'Ejecutivo de atención telefónica'], $this->titulos($html));
        $this->assertMatchesRegularExpression('/<input type="checkbox" id="con_reportes" name="con_reportes" value="1" checked>/', $html);
        $this->assertStringContainsString('Solo con reportes abiertos', $html);
        // La 5 tiene dos reportes abiertos y la 1 uno; el resalte lleva icono y número.
        $this->assertSame(2, substr_count($html, 'class="reportes-resaltados"'));
        $this->assertMatchesRegularExpression('/reportes-resaltados"><svg[^>]*>.*?<\/svg>2</s', $html);
        $this->assertStringNotContainsString('class="reportes-resaltados"', $this->get('/vacantes?q=almac')->getContent());
    }

    public function test_un_filtro_que_no_existe_se_ignora(): void
    {
        $this->get('/vacantes?empresa_id=9999&estado=oculta&categoria_id=x&modalidad_id=77')->assertOk()->assertSee('Mostrando 1 a 25 de 34');
    }

    public function test_sin_resultados_muestra_un_mensaje_y_la_busqueda_lo_anuncia(): void
    {
        $this->get('/vacantes?q=zzzz')->assertSee('No se encontraron vacantes con esos filtros.')->assertSee('No se encontraron resultados.', false);
    }

    public function test_solo_se_usan_los_estados_del_contrato(): void
    {
        $html = $this->get('/vacantes')->getContent();

        // Entre las dos páginas aparecen los cinco estados y ningún otro.
        preg_match_all('/data-estado="([^"]+)"/', $html.$this->get('/vacantes?page=2')->getContent(), $estados);
        $this->assertEqualsCanonicalizing(['publicada', 'pausada', 'cerrada', 'suspendida', 'borrador'], array_values(array_unique($estados[1])));
        preg_match('/<select[^>]*id="estado".*?<\/select>/s', $html, $select);
        preg_match_all('/<option value="([^"]*)"/', $select[0], $valores);
        $this->assertSame(['', 'borrador', 'publicada', 'pausada', 'cerrada', 'suspendida'], $valores[1]);
        foreach (['Pública', 'Oculta', 'Dar de baja'] as $texto) {
            $this->assertStringNotContainsString($texto, $html);
        }
    }

    public function test_los_estados_salen_del_mapa_con_texto_e_icono(): void
    {
        $html = $this->get('/vacantes?estado=suspendida')->getContent();

        $this->assertMatchesRegularExpression('/<span class="badge badge-banned" data-estado="suspendida"><svg[^>]*>.*?<\/svg><span>Suspendida<\/span>/s', $html);
    }

    public function test_un_borrador_no_tiene_fecha_de_publicacion(): void
    {
        $this->assertStringContainsString('<span class="visually-hidden">Sin publicar</span>', $this->get('/vacantes?estado=borrador')->getContent());
    }

    public function test_los_postulados_se_cuentan_y_la_empresa_es_la_del_contrato(): void
    {
        $html = $this->get('/vacantes?q=Técnico+de+soporte')->getContent();

        // La vacante 1 tiene 4 postulaciones (1, 103, 110 y 112).
        $this->assertMatchesRegularExpression('/TecnoQro<\/td>.*?Híbrido<\/td>.*?<td>4<\/td>/s', $html);
    }

    // --- Detalle ---

    public function test_el_detalle_muestra_datos_requisitos_condiciones_y_accesibilidad(): void
    {
        $html = $this->get('/vacantes/1')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('<h1>Técnico de soporte de TI</h1>', $html);
        foreach (['Datos generales', 'Requisitos', 'Condiciones', 'Accesibilidad'] as $seccion) {
            $this->assertMatchesRegularExpression('/<h2 id="[^"]*" class="detalle-titulo">'.$seccion.'<\/h2>/', $html);
        }
        $this->assertStringContainsString('Atención a usuarios internos, mantenimiento de equipos y redes.', $html);
        // Requisitos: obligatorias, deseables, formación y experiencia.
        $this->assertMatchesRegularExpression('/Habilidades obligatorias.*?Soporte técnico.*?Redes.*?SQL.*?Comunicación escrita.*?Habilidades deseables.*?JavaScript.*?Excel/s', $html);
        $this->assertStringContainsString('Técnico superior universitario', $html);
        $this->assertStringContainsString('1 año de experiencia', $html);
        // Condiciones.
        foreach (['Tiempo completo', 'Indefinido', '2 plazas', 'Híbrido', 'Querétaro, Querétaro', 'Av. Constituyentes 100, Querétaro', '$14,000 a $18,000 MXN'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        $this->assertStringNotContainsString('No se muestra a los candidatos.', $html);
    }

    public function test_la_accesibilidad_se_muestra_en_sus_dos_grupos_como_en_la_app(): void
    {
        $html = $this->get('/vacantes/1')->getContent();

        $this->assertMatchesRegularExpression('/<h3 class="detalle-subtitulo">El lugar cuenta con<\/h3>.*?Acceso con rampa.*?Entrada y áreas de trabajo accesibles en silla de ruedas.*?Baño accesible.*?<h3 class="detalle-subtitulo">La empresa puede ofrecer bajo solicitud<\/h3>.*?Horario flexible.*?Posibilidad de ajustar horarios/s', $html);
        $this->assertStringNotContainsString('no cuenta con condiciones de accesibilidad', $html);
    }

    public function test_las_notas_de_accesibilidad_se_muestran(): void
    {
        $html = $this->get('/vacantes/2')->getContent();

        $this->assertStringContainsString('Notas de la empresa', $html);
        $this->assertStringContainsString('Pasillos de 1.5 m y estaciones de trabajo a dos alturas.', $html);
    }

    public function test_sin_condiciones_muestra_la_declaracion_y_no_los_grupos(): void
    {
        $html = $this->get('/vacantes/5')->getContent();

        $this->assertStringContainsString('La empresa declaró que el lugar no cuenta con condiciones de accesibilidad', $html);
        $this->assertStringNotContainsString('El lugar cuenta con', $html);
        $this->assertStringNotContainsString('La empresa puede ofrecer bajo solicitud', $html);
    }

    public function test_una_vacante_sin_ajustes_ni_declaracion_lo_dice(): void
    {
        $this->assertStringContainsString('La empresa aún no declara condiciones de accesibilidad.', $this->get('/vacantes/7')->getContent());
    }

    public function test_el_salario_se_muestra_aunque_no_se_muestre_al_candidato_con_la_aclaracion(): void
    {
        // La vacante 4 tiene salario de $8,000 a $9,000 pero no lo muestra a los candidatos.
        $html = $this->get('/vacantes/4')->getContent();

        $this->assertStringContainsString('$8,000 a $9,000 MXN', $html);
        $this->assertStringContainsString('No se muestra a los candidatos.', $html);
        $this->assertStringContainsString('No se pide formación mínima', $this->get('/vacantes/7')->getContent());
        $this->assertMatchesRegularExpression('/<dt>Salario<\/dt>\s*<dd>\s*<span class="texto-suave">No registrado<\/span>/', $this->get('/vacantes/7')->getContent());
    }

    public function test_el_detalle_enlaza_la_empresa_y_el_motivo_de_una_suspendida(): void
    {
        $html = $this->get('/vacantes/203')->getContent();

        $this->assertMatchesRegularExpression('/<a href="[^"]*\/empresas\/3">ConCentro<\/a>/', $html);
        $this->assertStringContainsString('<dt>Motivo</dt><dd>Solicita pagos a los candidatos.</dd>', $html);
    }

    public function test_el_detalle_no_muestra_datos_de_candidatos(): void
    {
        $html = $this->get('/vacantes/1')->getContent();

        foreach (['Mariana', 'Jorge', '@correo.mx', 'necesidades'] as $texto) {
            $this->assertStringNotContainsString($texto, $html);
        }
    }

    public function test_una_vacante_que_no_existe_muestra_404(): void
    {
        $this->get('/vacantes/9999')->assertStatus(404)->assertSee('La vacante no existe.');
        $this->patch('/vacantes/9999/estado', ['estado' => 'suspendida', 'motivo' => 'x'])->assertStatus(404);
    }

    // --- Moderación ---

    #[DataProvider('botonesPorEstado')]
    public function test_las_acciones_dependen_del_estado(int $id, array $botones, array $ausentes): void
    {
        $html = $this->get("/vacantes/{$id}")->getContent();
        preg_match('/<div class="encabezado-acciones">.*?<\/div>/s', $html, $acciones);

        foreach ($botones as $boton) {
            $this->assertMatchesRegularExpression('/<button[^>]*>'.$boton.'<\/button>/', $acciones[0] ?? '', $boton);
        }
        foreach ($ausentes as $boton) {
            $this->assertStringNotContainsString('>'.$boton.'</button>', $html, $boton);
        }
    }

    public static function botonesPorEstado(): array
    {
        return [
            'publicada' => [1, ['Suspender'], ['Reactivar']],
            'pausada' => [201, ['Suspender'], ['Reactivar']],
            'suspendida' => [203, ['Reactivar'], ['Suspender']],
            'cerrada' => [202, [], ['Suspender', 'Reactivar']],
            'borrador' => [7, [], ['Suspender', 'Reactivar']],
        ];
    }

    public function test_suspender_pide_motivo_y_la_confirmacion_explica_los_avisos_y_reactivar_no_pide_motivo(): void
    {
        $publicada = $this->get('/vacantes/1')->getContent();
        $this->assertMatchesRegularExpression('/id="vacante-1-suspender-motivo"[^>]*required/', $publicada);
        $this->assertStringContainsString('Se avisará al reclutador y a las personas postuladas.', $publicada);
        $this->assertStringContainsString('<input type="hidden" name="estado" value="suspendida">', $publicada);
        $this->assertStringContainsString('name="_method" value="PATCH"', $publicada);

        $suspendida = $this->get('/vacantes/203')->getContent();
        $this->assertStringNotContainsString('vacante-203-reactivar-motivo', $suspendida);
        $this->assertStringContainsString('<input type="hidden" name="estado" value="publicada">', $suspendida);
    }

    public function test_suspender_una_publicada_o_pausada_con_motivo_cambia_el_estado_y_se_conserva(): void
    {
        $this->patch('/vacantes/201/estado', ['estado' => 'suspendida', 'motivo' => 'Prueba de una pausada.'])->assertRedirect('/vacantes/201');
        $this->assertSame(['suspendida', 'Prueba de una pausada.'], [$this->vacante(201)['estado'], $this->vacante(201)['motivo_estado']]);

        $this->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'Solicita pagos a los candidatos.'])->assertRedirect('/vacantes/1');
        $this->assertSame(['suspendida', 'Solicita pagos a los candidatos.'], [$this->vacante(1)['estado'], $this->vacante(1)['motivo_estado']]);
        $html = $this->get('/vacantes/1')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se suspendió la vacante «Técnico de soporte de TI». Se avisará al reclutador y a las personas postuladas.'), $html);
        $this->assertStringContainsString('<dt>Motivo</dt><dd>Solicita pagos a los candidatos.</dd>', $html);
        $this->assertStringContainsString('>Reactivar</button>', $html);
    }

    public function test_suspender_baja_las_vacantes_publicadas_del_dashboard(): void
    {
        $antes = $this->get('/dashboard')->getContent();
        $this->assertMatchesRegularExpression('/data-indicador="vacantes_publicadas">.*?indicador-valor">8</s', $antes);

        $this->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => 'Prueba.']);

        $this->assertMatchesRegularExpression('/data-indicador="vacantes_publicadas">.*?indicador-valor">7</s', $this->get('/dashboard')->getContent());
    }

    public function test_reactivar_una_suspendida_la_deja_publicada_y_limpia_el_motivo(): void
    {
        $this->patch('/vacantes/203/estado', ['estado' => 'publicada'])->assertRedirect('/vacantes/203');

        $this->assertSame(['publicada', null], [$this->vacante(203)['estado'], $this->vacante(203)['motivo_estado']]);
        $html = $this->get('/vacantes/203')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se reactivó la vacante «Operador de montacargas». Quedó publicada.'), $html);
        $this->assertStringContainsString('data-estado="publicada"', $html);
        $this->assertStringNotContainsString('<dt>Motivo</dt>', $html);
    }

    public function test_suspender_sin_motivo_vuelve_a_abrir_la_confirmacion_y_no_cambia_nada(): void
    {
        $this->from('/vacantes/1')->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => ' ', 'modal' => 'vacante-1-suspender'])
            ->assertRedirect('/vacantes/1')->assertSessionHasErrors(['motivo' => 'Escribe el motivo de la suspensión.'])->assertSessionHas('abrir_modal', 'vacante-1-suspender');

        $this->assertSame('publicada', $this->vacante(1)['estado']);
        $html = $this->get('/vacantes/1')->getContent();
        $this->assertStringContainsString('Escribe el motivo de la suspensi\\u00f3n.', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
    }

    public function test_un_motivo_de_mas_de_255_caracteres_se_rechaza(): void
    {
        $this->from('/vacantes/1')->patch('/vacantes/1/estado', ['estado' => 'suspendida', 'motivo' => str_repeat('a', 256), 'modal' => 'vacante-1-suspender'])
            ->assertSessionHasErrors(['motivo' => 'El motivo debe tener máximo 255 caracteres.']);
        $this->assertSame('publicada', $this->vacante(1)['estado']);
    }

    #[DataProvider('transicionesInvalidas')]
    public function test_una_transicion_invalida_muestra_el_mensaje_del_409_y_no_cambia_nada(string $estado, int $id, string $antes): void
    {
        $this->from("/vacantes/{$id}")->patch("/vacantes/{$id}/estado", ['estado' => $estado, 'motivo' => 'x'])->assertRedirect("/vacantes/{$id}");

        $this->get("/vacantes/{$id}")->assertSee($this->enAvisos('Solo se suspende una vacante publicada o pausada y solo se reactiva una suspendida.'), false);
        $this->assertSame($antes, $this->vacante($id)['estado']);
    }

    public static function transicionesInvalidas(): array
    {
        return [
            'suspender una suspendida' => ['suspendida', 203, 'suspendida'],
            'suspender una cerrada' => ['suspendida', 202, 'cerrada'],
            'suspender un borrador' => ['suspendida', 7, 'borrador'],
            'reactivar una publicada' => ['publicada', 1, 'publicada'],
            'reactivar una pausada' => ['publicada', 201, 'pausada'],
            'reactivar una cerrada' => ['publicada', 202, 'cerrada'],
        ];
    }

    public function test_un_estado_que_no_existe_no_cambia_nada(): void
    {
        $this->from('/vacantes/1')->patch('/vacantes/1/estado', ['estado' => 'oculta', 'motivo' => 'x'])->assertSessionHasErrors('estado');
        $this->assertSame('publicada', $this->vacante(1)['estado']);
    }
}
