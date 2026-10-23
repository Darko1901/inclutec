<?php

namespace Tests\Feature;

use App\Servicios\Api\Mock\Almacen;
use App\Support\Estados;
use App\Support\Reportes;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** WEB-08 · Reportes e incidencias con el mock (39 reportes: 5 abiertos, 1 en revisión, 31 resueltos y 2 descartados). */
class ReportesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-21 12:00:00');
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    private function reporte(int $id): array
    {
        return collect(Almacen::leer()['reportes'])->firstWhere('id', $id);
    }

    private function estadoDe(string $coleccion, int $id): string
    {
        return collect(Almacen::leer()[$coleccion])->firstWhere('id', $id)['estado'];
    }

    /** Folios de la tabla, en orden. @return list<int> */
    private function folios(string $html): array
    {
        preg_match_all('/<td class="celda-nombre">#(\d+)<\/td>/', $html, $m);

        return array_map('intval', $m[1]);
    }

    // --- Bandeja ---

    public function test_sin_sesion_las_rutas_de_reportes_llevan_a_login(): void
    {
        $this->post('/logout');

        $this->get('/reportes')->assertRedirect('/login');
        $this->get('/reportes/1')->assertRedirect('/login');
        $this->patch('/reportes/1', ['estado' => 'en_revision'])->assertRedirect('/login');
        $this->patch('/reportes/1/suspension', ['motivo' => 'x'])->assertRedirect('/login');
    }

    public function test_por_omision_abre_los_abiertos_del_mas_antiguo_al_mas_reciente(): void
    {
        $html = $this->get('/reportes')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertSame([105, 106, 1, 102, 103], $this->folios($html));
        foreach (['Folio', 'Tipo', 'Elemento reportado', 'Motivo', 'Quién reporta', 'Fecha', 'Estado', 'Acciones'] as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html);
        }
        // Folio, tipo, elemento, motivo, quién reporta, fecha y estado del reporte 1.
        $this->assertMatchesRegularExpression('/#1<\/td>\s*<td>Vacante<\/td>\s*<td>Ejecutivo de atención telefónica · ConCentro<\/td>\s*<td>Información falsa<\/td>\s*<td>Jorge Ramírez Soto<\/td>\s*<td>18\/10\/2026<\/td>/', $html);
        $this->assertStringContainsString('Revisar<span class="visually-hidden"> el reporte 1</span>', $html);
    }

    public function test_el_orden_por_recientes_invierte_la_bandeja(): void
    {
        $html = $this->get('/reportes?orden=recientes')->getContent();

        $this->assertSame([103, 102, 1, 106, 105], $this->folios($html));
        $this->assertMatchesRegularExpression('/<option value="recientes" selected>Más recientes primero<\/option>/', $html);
        $this->assertMatchesRegularExpression('/<option value="antiguos"[^>]*>Más antiguos primero<\/option>/', $html);
    }

    public function test_las_pestanas_son_enlaces_con_su_numero_y_marcan_la_actual(): void
    {
        $html = $this->get('/reportes?estado=resuelto')->getContent();

        preg_match('/<nav class="pestanas".*?<\/nav>/s', $html, $nav);
        $this->assertSame(4, substr_count($nav[0], '<a href='));
        $this->assertSame(1, substr_count($nav[0], 'aria-current="page"'));
        $this->assertMatchesRegularExpression('/<a href="[^"]*estado=resuelto"[^>]*aria-current="page"\s*>\s*Resueltos <span class="pestana-total">\(31\)<\/span>/', $nav[0]);
        foreach (['Abiertos' => 5, 'En revisión' => 1, 'Descartados' => 2] as $nombre => $total) {
            $this->assertMatchesRegularExpression('/'.$nombre.' <span class="pestana-total">\('.$total.'\)<\/span>/', $nav[0]);
        }
    }

    public function test_las_pestanas_siguen_a_los_estados_del_mapa(): void
    {
        $this->assertSame(Estados::valores('reporte'), array_keys(Reportes::PESTANAS));
    }

    #[DataProvider('pestanas')]
    public function test_cada_pestana_filtra_por_su_estado(string $estado, array $folios): void
    {
        $html = $this->get('/reportes?estado='.$estado)->getContent();

        $this->assertSame($folios, array_slice($this->folios($html), 0, count($folios)));
        $this->assertSame(count($this->folios($html)), substr_count($html, 'data-estado="'.$estado.'"'));
    }

    public static function pestanas(): array
    {
        return [
            'abierto' => ['abierto', [105, 106, 1, 102, 103]],
            'en revisión' => ['en_revision', [101]],
            'descartado' => ['descartado', [110, 109]],
            'resuelto' => ['resuelto', [228]],
        ];
    }

    public function test_un_estado_que_no_existe_abre_los_abiertos(): void
    {
        $this->assertSame([105, 106, 1, 102, 103], $this->folios($this->get('/reportes?estado=cerrado')->getContent()));
    }

    public function test_paginacion_de_25_en_la_pestana_de_resueltos(): void
    {
        $this->assertCount(25, $this->folios($this->get('/reportes?estado=resuelto')->getContent()));
        $dos = $this->get('/reportes?estado=resuelto&page=2')->getContent();
        $this->assertCount(6, $this->folios($dos));
        $this->assertStringContainsString('Mostrando 26 a 31 de 31', $dos);
        $this->assertMatchesRegularExpression('/href="[^"]*reportes\?estado=resuelto&amp;page=1"/', $dos);
    }

    #[DataProvider('filtros')]
    public function test_los_filtros_de_tipo_y_motivo_se_aplican(string $consulta, array $folios): void
    {
        $this->assertSame($folios, $this->folios($this->get('/reportes?estado=abierto&'.$consulta)->getContent()));
    }

    public static function filtros(): array
    {
        return [
            'vacantes' => ['tipo=vacante', [1, 102, 103]],
            'empresas' => ['tipo=empresa', [105]],
            'candidatos' => ['tipo=candidato', [106]],
            'información falsa' => ['motivo_reporte_id=2', [1]],
            'pago al candidato' => ['motivo_reporte_id=4', [102]],
            'tipo y motivo' => ['tipo=vacante&motivo_reporte_id=3', [103]],
            'sin coincidencias' => ['tipo=empresa&motivo_reporte_id=2', []],
        ];
    }

    public function test_los_filtros_se_conservan_en_las_pestanas_y_los_totales_los_respetan(): void
    {
        $html = $this->get('/reportes?estado=abierto&tipo=vacante&orden=recientes')->getContent();

        $this->assertMatchesRegularExpression('/<option value="vacante" selected>Vacante<\/option>/', $html);
        $this->assertMatchesRegularExpression('/Abiertos <span class="pestana-total">\(3\)<\/span>/', $html);
        $this->assertMatchesRegularExpression('/En revisión <span class="pestana-total">\(1\)<\/span>/', $html);
        $this->assertMatchesRegularExpression('/href="[^"]*estado=resuelto&amp;tipo=vacante&amp;orden=recientes"/', $html);
        $this->assertMatchesRegularExpression('/<input type="hidden" name="estado" value="abierto">/', $html);
    }

    public function test_un_filtro_que_no_existe_se_ignora(): void
    {
        $this->assertCount(5, $this->folios($this->get('/reportes?tipo=usuario&motivo_reporte_id=99&orden=azar')->getContent()));
    }

    public function test_sin_resultados_muestra_un_mensaje_y_la_busqueda_lo_anuncia(): void
    {
        $this->get('/reportes?tipo=empresa&motivo_reporte_id=2')->assertSee('No hay reportes con esos filtros en esta pestaña.')->assertSee('No se encontraron resultados.', false);
    }

    public function test_los_estados_salen_del_mapa_con_texto_e_icono(): void
    {
        $html = $this->get('/reportes?estado=en_revision')->getContent();

        $this->assertMatchesRegularExpression('/<span class="badge badge-info" data-estado="en_revision"><svg[^>]*>.*?<\/svg><span>En revisión<\/span>/s', $html);
        $this->assertStringContainsString('<span>Abierto</span>', $this->get('/reportes')->getContent());
    }

    public function test_los_tres_tipos_de_elemento_aparecen_en_la_bandeja(): void
    {
        $html = $this->get('/reportes?estado=resuelto')->getContent();

        foreach (['<td>Vacante</td>', '<td>Empresa</td>', '<td>Candidato</td>'] as $tipo) {
            $this->assertStringContainsString($tipo, $html);
        }
    }

    // --- Detalle ---

    public function test_el_detalle_muestra_datos_elemento_reportes_previos_e_historial(): void
    {
        $html = $this->get('/reportes/1')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('<h1>Reporte #1</h1>', $html);
        foreach (['Información falsa', 'El salario publicado no coincide con lo que me dijeron por teléfono.', 'Jorge Ramírez Soto'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        // El elemento reportado, con su estado actual y el enlace a su pantalla.
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/vacantes\/5">Ejecutivo de atención telefónica · ConCentro/', $html);
        $this->assertMatchesRegularExpression('/<dt>Estado actual<\/dt><dd><span class="badge badge-active" data-estado="publicada">/', $html);
        // El reporte 103 es otro reporte contra la misma vacante.
        $this->assertStringContainsString('Reportes anteriores contra este elemento: 1', $html);
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/reportes\/103">#103<\/a>/', $html);
        // Historial.
        $this->assertStringContainsString('Historial de cambios', $html);
        $this->assertStringContainsString('Se creó como', $html);
        $this->assertStringContainsString('Quien reportó', $html);
    }

    public function test_cada_tipo_de_elemento_enlaza_a_su_pantalla(): void
    {
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/empresas\/2">LogiBajío/', $this->get('/reportes/105')->getContent());
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/usuarios\/109">Cristian Martínez Herrera/', $this->get('/reportes/106')->getContent());
        $this->assertMatchesRegularExpression('/<a href="[^"]*\/vacantes\/2">Auxiliar de almacén/', $this->get('/reportes/101')->getContent());
        $this->get('/empresas/2')->assertOk();
        $this->get('/usuarios/109')->assertOk();
        $this->get('/vacantes/5')->assertOk();
    }

    public function test_el_estado_actual_del_elemento_sale_del_mapa_de_su_tipo(): void
    {
        $this->assertStringContainsString('data-estado="validada"', $this->get('/reportes/105')->getContent());
        $this->assertStringContainsString('data-estado="activo"', $this->get('/reportes/106')->getContent());
        $this->assertStringContainsString('data-estado="suspendida"', $this->get('/reportes/104')->getContent());
        $this->assertStringContainsString('data-estado="suspendido"', $this->get('/reportes/108')->getContent());
    }

    public function test_el_historial_de_un_reporte_en_revision_trae_el_cambio_y_su_comentario(): void
    {
        $html = $this->get('/reportes/101')->getContent();

        $this->assertStringContainsString('Se pidió información a la empresa.', $html);
        $this->assertMatchesRegularExpression('/data-estado="abierto".*?pasó a.*?data-estado="en_revision"/s', $html);
        $this->assertStringContainsString('<dt>Atendido por</dt><dd>Admin IncluTec</dd>', $html);
    }

    public function test_un_reporte_cerrado_muestra_resolucion_accion_y_fecha_de_cierre_y_no_tiene_botones(): void
    {
        $html = $this->get('/reportes/104')->getContent();

        $this->assertStringContainsString('<dt>Resolución</dt><dd>Se confirmó la solicitud de pago y se suspendió la vacante.</dd>', $html);
        $this->assertStringContainsString('<dt>Acción tomada</dt><dd>Suspensión del elemento reportado</dd>', $html);
        $this->assertStringContainsString('<dt>Cerrado el</dt>', $html);
        $this->assertDoesNotMatchRegularExpression('/<button[^>]*>(Tomar en revisión|Resolver|Descartar|Suspender vacante)<\/button>/', $html);
        $this->assertStringContainsString('Este elemento no tiene otros reportes.', $html);
    }

    public function test_el_detalle_no_pide_datos_de_necesidades_de_ajuste(): void
    {
        $html = $this->get('/reportes/106')->getContent();

        foreach (['necesidades', 'Acceso con rampa', 'consentimiento'] as $texto) {
            $this->assertStringNotContainsString($texto, $html);
        }
    }

    public function test_un_reporte_que_no_existe_muestra_404(): void
    {
        $this->get('/reportes/9999')->assertStatus(404)->assertSee('El reporte no existe.');
        $this->patch('/reportes/9999', ['estado' => 'en_revision'])->assertStatus(404);
        $this->patch('/reportes/9999/suspension', ['motivo' => 'x'])->assertStatus(404);
    }

    // --- Botones según el estado ---

    #[DataProvider('botonesPorEstado')]
    public function test_los_botones_dependen_del_estado(int $id, array $botones, array $ausentes): void
    {
        $html = $this->get("/reportes/{$id}")->getContent();
        preg_match('/<div class="encabezado-acciones">.*?<\/div>/s', $html, $acciones);

        foreach ($botones as $boton) {
            $this->assertMatchesRegularExpression('/<button[^>]*>'.$boton.'<\/button>/', $acciones[0] ?? '', $boton);
        }
        foreach ($ausentes as $boton) {
            $this->assertStringNotContainsString('>'.$boton.'</button>', $acciones[0] ?? '', $boton);
        }
    }

    public static function botonesPorEstado(): array
    {
        return [
            'abierto' => [1, ['Tomar en revisión', 'Descartar'], ['Resolver']],
            'en revisión' => [101, ['Resolver', 'Descartar'], ['Tomar en revisión']],
            'resuelto' => [104, [], ['Tomar en revisión', 'Resolver', 'Descartar']],
            'descartado' => [109, [], ['Tomar en revisión', 'Resolver', 'Descartar']],
        ];
    }

    public function test_resolver_y_descartar_piden_resolucion_y_resolver_pide_la_accion_tomada(): void
    {
        $html = $this->get('/reportes/101')->getContent();

        $this->assertMatchesRegularExpression('/id="reporte-101-resolver-motivo"[^>]*name="resolucion"|name="resolucion"[^>]*id="reporte-101-resolver-motivo"/', $html);
        $this->assertMatchesRegularExpression('/id="reporte-101-resolver-motivo"[^>]*required/', $html);
        $this->assertMatchesRegularExpression('/id="reporte-101-descartar-motivo"[^>]*required/', $html);
        $this->assertStringContainsString('maxlength="1000"', $html);
        $this->assertMatchesRegularExpression('/<select[^>]*id="reporte-101-resolver-accion"/', $html);
        $this->assertStringNotContainsString('reporte-101-descartar-accion', $html);
        $this->assertStringContainsString('<input type="hidden" name="estado" value="resuelto">', $html);
        $this->assertStringNotContainsString('reporte-1-tomar-motivo', $this->get('/reportes/1')->getContent());
    }

    public function test_la_confirmacion_de_resolver_avisa_de_la_resolucion_y_no_del_motivo(): void
    {
        $html = $this->get('/reportes/101')->getContent();

        $this->assertStringContainsString('mensajeVacio', $html);
        $this->assertStringContainsString('Escribe la resoluci\\u00f3n para cerrar el reporte.', $html);
    }

    // --- Seguimiento ---

    public function test_tomar_en_revision_cambia_el_estado_y_agrega_al_historial(): void
    {
        $this->patch('/reportes/1', ['estado' => 'en_revision'])->assertRedirect('/reportes/1');

        $this->assertSame('en_revision', $this->reporte(1)['estado']);
        $this->assertCount(2, $this->reporte(1)['historial']);
        $this->assertSame(1, $this->reporte(1)['atendido_por']);
        $html = $this->get('/reportes/1')->getContent();
        $this->assertStringContainsString($this->enAvisos('El reporte #1 quedó en revisión.'), $html);
        $this->assertStringContainsString('>Resolver</button>', $html);
        $this->assertStringContainsString('<dt>Atendido por</dt>', $html);
    }

    public function test_resolver_con_resolucion_y_accion_cierra_el_reporte_y_avisa_que_se_notifico(): void
    {
        $this->patch('/reportes/101', ['estado' => 'resuelto', 'resolucion' => 'La empresa corrigió la dirección.', 'accion' => 'ninguna'])->assertRedirect('/reportes/101');

        $reporte = $this->reporte(101);
        $this->assertSame(['resuelto', 'La empresa corrigió la dirección.', 'ninguna'], [$reporte['estado'], $reporte['resolucion'], $reporte['accion']]);
        $this->assertNotNull($reporte['cerrado_en']);
        $this->assertCount(3, $reporte['historial']);
        $html = $this->get('/reportes/101')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se resolvió el reporte #101. Se notificó a quien lo reportó.'), $html);
        $this->assertStringContainsString('<dt>Resolución</dt><dd>La empresa corrigió la dirección.</dd>', $html);
        $this->assertStringNotContainsString('Se suspendió', $html);
    }

    public function test_resolver_sin_elegir_accion_guarda_ninguna_y_con_suspension_la_registra(): void
    {
        $this->patch('/reportes/101', ['estado' => 'resuelto', 'resolucion' => 'Se suspendió la vacante.', 'accion' => 'suspension'])->assertRedirect();

        $this->assertSame('suspension', $this->reporte(101)['accion']);
        $this->patch('/reportes/1', ['estado' => 'en_revision']);
        $this->patch('/reportes/1', ['estado' => 'resuelto', 'resolucion' => 'Listo.']);
        $this->assertSame('ninguna', $this->reporte(1)['accion']);
    }

    public function test_descartar_un_reporte_abierto_con_resolucion_lo_cierra_sin_sancion(): void
    {
        $this->patch('/reportes/1', ['estado' => 'descartado', 'resolucion' => 'No incumple las reglas.', 'accion' => 'suspension'])->assertRedirect('/reportes/1');

        $this->assertSame(['descartado', 'ninguna'], [$this->reporte(1)['estado'], $this->reporte(1)['accion']]);
        $this->get('/reportes/1')->assertSee($this->enAvisos('Se descartó el reporte #1. Se notificó a quien lo reportó.'), false);
    }

    #[DataProvider('cierresSinResolucion')]
    public function test_no_se_puede_cerrar_sin_resolucion_y_se_vuelve_a_abrir_la_confirmacion(string $estado, int $id, string $clave): void
    {
        $modal = "reporte-{$id}-{$clave}";
        $this->from("/reportes/{$id}")->patch("/reportes/{$id}", ['estado' => $estado, 'resolucion' => '   ', 'modal' => $modal])
            ->assertRedirect("/reportes/{$id}")->assertSessionHasErrors(['resolucion' => 'Escribe la resolución para cerrar el reporte.'])->assertSessionHas('abrir_modal', $modal);

        $this->assertNotContains($this->reporte($id)['estado'], ['resuelto', 'descartado']);
        $html = $this->get("/reportes/{$id}")->getContent();
        $this->assertStringContainsString('Escribe la resoluci\\u00f3n para cerrar el reporte.', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
    }

    public static function cierresSinResolucion(): array
    {
        return [
            'resolver' => ['resuelto', 101, 'resolver'],
            'descartar un abierto' => ['descartado', 1, 'descartar'],
            'descartar uno en revisión' => ['descartado', 101, 'descartar'],
        ];
    }

    public function test_una_resolucion_de_mas_de_1000_caracteres_se_rechaza(): void
    {
        $this->from('/reportes/101')->patch('/reportes/101', ['estado' => 'resuelto', 'resolucion' => str_repeat('a', 1001), 'modal' => 'reporte-101-resolver'])
            ->assertSessionHasErrors(['resolucion' => 'La resolución debe tener máximo 1000 caracteres.']);
        $this->assertSame('en_revision', $this->reporte(101)['estado']);
    }

    #[DataProvider('transicionesInvalidas')]
    public function test_una_transicion_fuera_del_contrato_muestra_el_mensaje_del_409_y_no_cambia_nada(int $id, string $estado, string $mensaje): void
    {
        $antes = $this->reporte($id)['estado'];

        $this->from("/reportes/{$id}")->patch("/reportes/{$id}", ['estado' => $estado, 'resolucion' => 'Algo.'])->assertRedirect("/reportes/{$id}");

        $this->get("/reportes/{$id}")->assertSee($this->enAvisos($mensaje), false);
        $this->assertSame($antes, $this->reporte($id)['estado']);
        $this->assertCount(count($this->reporte($id)['historial']), $this->reporte($id)['historial']);
    }

    public static function transicionesInvalidas(): array
    {
        $cerrado = 'El reporte ya está cerrado.';
        $abierto = 'Un reporte abierto primero se toma en revisión o se descarta; solo uno en revisión se resuelve.';

        return [
            'abierto → resuelto' => [1, 'resuelto', $abierto],
            'en revisión → en revisión' => [101, 'en_revision', $abierto],
            'resuelto → en revisión' => [104, 'en_revision', $cerrado],
            'resuelto → descartado' => [104, 'descartado', $cerrado],
            'descartado → resuelto' => [109, 'resuelto', $cerrado],
        ];
    }

    public function test_un_estado_que_no_existe_no_cambia_nada(): void
    {
        $this->from('/reportes/1')->patch('/reportes/1', ['estado' => 'archivado'])->assertSessionHasErrors('estado');
        $this->assertSame('abierto', $this->reporte(1)['estado']);
    }

    public function test_cada_cambio_queda_en_el_historial_en_orden(): void
    {
        $this->patch('/reportes/1', ['estado' => 'en_revision']);
        $this->patch('/reportes/1', ['estado' => 'resuelto', 'resolucion' => 'Se corrigió.']);

        $historial = $this->reporte(1)['historial'];
        $this->assertSame([[null, 'abierto'], ['abierto', 'en_revision'], ['en_revision', 'resuelto']], array_map(fn ($h) => [$h[0], $h[1]], $historial));
        $this->assertSame([null, 1, 1], array_column($historial, 3));
    }

    // --- Suspender el elemento reportado ---

    public function test_suspender_la_vacante_reportada_desde_el_detalle_y_el_cambio_se_ve_en_su_pantalla(): void
    {
        $html = $this->get('/reportes/1')->getContent();
        $this->assertStringContainsString('>Suspender vacante</button>', $html);
        $this->assertStringContainsString('Se avisará al reclutador y a las personas postuladas. Los candidatos dejarán de ver la vacante.', $html);
        $this->assertMatchesRegularExpression('/id="reporte-1-suspender-motivo"[^>]*required/', $html);

        $this->patch('/reportes/1/suspension', ['motivo' => 'Información falsa en el salario.'])->assertRedirect('/reportes/1');

        $this->assertSame('suspendida', $this->estadoDe('vacantes', 5));
        $detalle = $this->get('/reportes/1')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se suspendió la vacante «Ejecutivo de atención telefónica». Se avisará al reclutador y a las personas postuladas.'), $detalle);
        $this->assertStringContainsString('data-estado="suspendida"', $detalle);
        $this->assertStringNotContainsString('>Suspender vacante</button>', $detalle);
        $vacante = $this->get('/vacantes/5')->getContent();
        $this->assertStringContainsString('<dt>Motivo</dt><dd>Información falsa en el salario.</dd>', $vacante);
    }

    public function test_suspender_la_empresa_reportada_dice_cuantas_vacantes_y_postulados(): void
    {
        $this->patch('/reportes/105/suspension', ['motivo' => 'Lenguaje ofensivo en sus correos.'])->assertRedirect('/reportes/105');

        $this->assertSame('suspendida', $this->estadoDe('empresas', 2));
        $this->get('/reportes/105')->assertSee($this->enAvisos('Se suspendió a LogiBajío: 2 vacantes suspendidas y 2 personas postuladas notificadas.'), false);
        $this->assertStringContainsString('data-estado="suspendida"', $this->get('/empresas/2')->getContent());
        $this->assertSame('suspendida', $this->estadoDe('vacantes', 2));
    }

    public function test_suspender_el_usuario_reportado_lo_deja_suspendido(): void
    {
        $this->assertStringContainsString('>Suspender usuario</button>', $this->get('/reportes/106')->getContent());

        $this->patch('/reportes/106/suspension', ['motivo' => 'Comentarios discriminatorios.'])->assertRedirect('/reportes/106');

        $this->assertSame('suspendido', collect(Almacen::leer()['usuarios'])->firstWhere('usuario.id', 109)['usuario']['estado']);
        $this->get('/reportes/106')->assertSee($this->enAvisos('Se suspendió a Cristian Martínez Herrera.'), false);
        $this->assertStringContainsString('<dt>Motivo del estado</dt><dd>Comentarios discriminatorios.</dd>', $this->get('/usuarios/109')->getContent());
    }

    public function test_suspender_sin_motivo_vuelve_a_abrir_la_confirmacion_y_no_cambia_nada(): void
    {
        $this->from('/reportes/1')->patch('/reportes/1/suspension', ['motivo' => ' ', 'modal' => 'reporte-1-suspender'])
            ->assertRedirect('/reportes/1')->assertSessionHasErrors(['motivo' => 'Escribe el motivo de la suspensión.'])->assertSessionHas('abrir_modal', 'reporte-1-suspender');

        $this->assertSame('publicada', $this->estadoDe('vacantes', 5));
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $this->get('/reportes/1')->getContent()));
    }

    public function test_un_elemento_que_ya_no_se_puede_suspender_no_ofrece_el_boton_ni_acepta_la_peticion(): void
    {
        Almacen::modificar(function (array &$estado) {
            foreach ($estado['vacantes'] as &$vacante) {
                if ($vacante['id'] === 5) {
                    $vacante['estado'] = 'cerrada';
                }
            }
        });

        $html = $this->get('/reportes/1')->getContent();
        $this->assertStringNotContainsString('>Suspender vacante</button>', $html);
        $this->assertStringContainsString('Este elemento ya no se puede suspender desde aquí', $html);

        $this->from('/reportes/1')->patch('/reportes/1/suspension', ['motivo' => 'x'])->assertRedirect('/reportes/1');
        $this->get('/reportes/1')->assertSee($this->enAvisos('Este elemento ya no se puede suspender: revisa su estado actual.'), false);
    }

    public function test_un_reporte_cerrado_ya_no_ofrece_suspender_el_elemento(): void
    {
        // La vacante del reporte 109 está publicada, pero el reporte ya se descartó.
        $this->assertStringNotContainsString('>Suspender vacante</button>', $this->get('/reportes/109')->getContent());
    }

    public function test_la_pantalla_de_vacantes_sigue_sin_enlazar_los_reportes_abiertos(): void
    {
        $html = $this->get('/vacantes?con_reportes=1')->getContent();

        $this->assertStringContainsString('class="reportes-resaltados"', $html);
        $this->assertDoesNotMatchRegularExpression('/<a[^>]*>\s*<span class="reportes-resaltados"/', $html);
        $this->assertStringNotContainsString('/reportes?', html_entity_decode($html));
    }

    public function test_el_dashboard_enlaza_a_los_reportes_abiertos(): void
    {
        $this->get('/dashboard')->assertSee('/reportes?estado=abierto', false);
        $this->assertCount(5, $this->folios($this->get('/reportes?estado=abierto')->getContent()));
    }
}
