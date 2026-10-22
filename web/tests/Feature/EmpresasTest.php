<?php

namespace Tests\Feature;

use App\Servicios\Api\Mock\Almacen;
use App\Support\Empresas;
use App\Support\Estados;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** WEB-04 · Empresas y validación con el mock (4 de S002 y 6 más: 3 pendientes, 3 validadas, 2 rechazadas y 2 suspendidas). */
class EmpresasTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-21 12:00:00');
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    private function empresa(int $id): array
    {
        foreach (Almacen::leer()['empresas'] as $empresa) {
            if ($empresa['id'] === $id) {
                return $empresa;
            }
        }
        $this->fail("No hay empresa {$id}.");
    }

    private function vacante(int $id): array
    {
        return collect(Almacen::leer()['vacantes'])->firstWhere('id', $id);
    }

    private function entrada(array $cambios = []): array
    {
        return $cambios + [
            'razon_social' => 'Tecnologías Nuevas S.A. de C.V.', 'nombre_comercial' => 'TecNueva', 'rfc' => 'TNU200101AB1', 'sector_id' => '4',
            'tamano_empresa_id' => '2', 'municipio_id' => '3', 'direccion' => '', 'sitio_web' => '', 'descripcion' => '', 'practicas_inclusion' => '',
        ];
    }

    /** Nombres comerciales que salen en la tabla, en orden. @return list<string> */
    private function nombres(string $html): array
    {
        preg_match_all('/<td class="celda-nombre">[^<]*<\/td>\s*<td>([^<]*)<\/td>/', $html, $m);

        return $m[1];
    }

    // --- Acceso y listado ---

    public function test_sin_sesion_todas_las_rutas_de_empresas_llevan_a_login(): void
    {
        $this->post('/logout');

        foreach (['/empresas', '/empresas/nueva', '/empresas/4', '/empresas/4/editar', '/empresas/4/constancia'] as $ruta) {
            $this->get($ruta)->assertRedirect('/login');
        }
        $this->post('/empresas', $this->entrada())->assertRedirect('/login');
        $this->put('/empresas/4', $this->entrada())->assertRedirect('/login');
        $this->patch('/empresas/4/validacion', ['decision' => 'validada'])->assertRedirect('/login');
        $this->patch('/empresas/4/estado', ['estado' => 'suspendida', 'motivo' => 'x'])->assertRedirect('/login');
    }

    public function test_por_omision_abre_la_pestana_de_pendientes_con_la_cola_por_antiguedad(): void
    {
        $html = $this->get('/empresas')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        // MediBajío lleva 20 días esperando, OficiosDigitales 12 y Estudio Trazo 6.
        $this->assertSame(['MediBajío', 'OficiosDigitales', 'Estudio Trazo'], $this->nombres($html));
        foreach (['Razón social', 'Nombre comercial', 'RFC', 'Sector', 'Reclutadores', 'Vacantes activas', 'Fecha de solicitud', 'Estado', 'Acciones'] as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html);
        }
        $this->assertStringContainsString('01/10/2026', $html);
        $this->assertStringContainsString('SMB120918JK5', $html);
    }

    public function test_las_pestanas_son_enlaces_con_su_numero_y_marcan_la_actual(): void
    {
        $html = $this->get('/empresas?estado=rechazada')->getContent();

        preg_match('/<nav class="pestanas".*?<\/nav>/s', $html, $nav);
        $this->assertSame(4, substr_count($nav[0], '<a href='));
        $this->assertSame(1, substr_count($nav[0], 'aria-current="page"'));
        $this->assertMatchesRegularExpression('/<a href="[^"]*estado=rechazada"[^>]*aria-current="page"\s*>\s*Rechazadas <span class="pestana-total">\(2\)<\/span>/', $nav[0]);
        foreach (['Pendientes' => 3, 'Validadas' => 3, 'Suspendidas' => 2] as $nombre => $total) {
            $this->assertMatchesRegularExpression('/'.$nombre.' <span class="pestana-total">\('.$total.'\)<\/span>/', $nav[0]);
        }
    }

    public function test_las_pestanas_de_estado_siguen_a_los_estados_del_mapa(): void
    {
        $this->assertSame(Estados::valores('empresa'), array_keys(Empresas::PESTANAS));
    }

    #[DataProvider('pestanas')]
    public function test_cada_pestana_filtra_por_su_estado(string $estado, array $nombres): void
    {
        $html = $this->get('/empresas?estado='.$estado)->getContent();

        $this->assertSame($nombres, $this->nombres($html));
        $this->assertSame(count($nombres), substr_count($html, 'data-estado="'.$estado.'"'));
        $this->assertSame(count($nombres), substr_count($html, '<td class="celda-nombre">'));
    }

    public static function pestanas(): array
    {
        return [
            'pendiente' => ['pendiente', ['MediBajío', 'OficiosDigitales', 'Estudio Trazo']],
            'validada' => ['validada', ['ConCentro', 'LogiBajío', 'TecnoQro']],
            'rechazada' => ['rechazada', ['GobDigital', 'RápidaMx']],
            'suspendida' => ['suspendida', ['ConsultNorte', 'PlastiMarqués']],
        ];
    }

    public function test_un_estado_que_no_existe_abre_pendientes(): void
    {
        $this->assertSame(['MediBajío', 'OficiosDigitales', 'Estudio Trazo'], $this->nombres($this->get('/empresas?estado=bloqueada')->getContent()));
    }

    public function test_los_estados_salen_del_mapa_con_texto_e_icono(): void
    {
        $html = $this->get('/empresas?estado=suspendida')->getContent();

        $this->assertMatchesRegularExpression('/<span class="badge badge-banned" data-estado="suspendida"><svg[^>]*>.*?<\/svg><span>Suspendida<\/span>/s', $html);
        $this->assertStringContainsString('<span>Pendiente de validación</span>', $this->get('/empresas')->getContent());
    }

    public function test_la_busqueda_encuentra_por_razon_social_nombre_comercial_o_rfc_y_se_conserva_en_las_pestanas(): void
    {
        $this->assertSame(['Estudio Trazo'], $this->nombres($this->get('/empresas?q=ETR2101119P4')->getContent()));
        $this->assertSame(['Estudio Trazo'], $this->nombres($this->get('/empresas?q=trazo+dise')->getContent()));
        $this->assertSame(['MediBajío'], $this->nombres($this->get('/empresas?q=medibajío')->getContent()));

        // Los números de las pestañas respetan la búsqueda y sus enlaces la conservan.
        $html = $this->get('/empresas?estado=validada&q=baj')->getContent();
        $this->assertSame(['LogiBajío'], $this->nombres($html));
        $this->assertMatchesRegularExpression('/Pendientes <span class="pestana-total">\(1\)<\/span>/', $html);
        $this->assertMatchesRegularExpression('/Validadas <span class="pestana-total">\(1\)<\/span>/', $html);
        $this->assertMatchesRegularExpression('/href="[^"]*estado=pendiente&amp;q=baj"/', $html);
        $this->assertMatchesRegularExpression('/<input type="hidden" name="estado" value="validada">/', $html);
    }

    public function test_sin_resultados_muestra_un_mensaje(): void
    {
        $this->get('/empresas?q=zzzz')->assertSee('No se encontraron empresas con esa búsqueda.');
        Almacen::modificar(function (array &$estado) {
            $estado['empresas'] = array_values(array_filter($estado['empresas'], fn ($e) => $e['estado'] !== 'rechazada'));
        });
        $this->get('/empresas?estado=rechazada')->assertSee('No hay empresas en esta pestaña.');
    }

    public function test_los_reclutadores_y_las_vacantes_activas_se_calculan(): void
    {
        $html = $this->get('/empresas?estado=validada&q=tecnoqro')->getContent();

        // TecnoQro: reclutadores ligados a la empresa 1 y tres vacantes publicadas (1, 6 y 101).
        preg_match('/TQU150312AB1<\/td>\s*<td>[^<]*<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>/', $html, $m);
        $this->assertSame('3', $m[2]);
        $this->assertGreaterThanOrEqual(1, (int) $m[1]);
    }

    public function test_las_acciones_de_la_fila_dicen_revisar_o_ver(): void
    {
        $this->assertStringContainsString('Revisar<span class="visually-hidden"> a Estudio Trazo</span>', $this->get('/empresas')->getContent());
        $this->assertStringContainsString('Ver<span class="visually-hidden"> a TecnoQro</span>', $this->get('/empresas?estado=validada')->getContent());
        $this->assertStringContainsString('Editar<span class="visually-hidden"> a TecnoQro</span>', $this->get('/empresas?estado=validada')->getContent());
    }

    // --- Revisión ---

    public function test_la_revision_muestra_datos_reclutadores_y_el_indicador_de_rfc(): void
    {
        $html = $this->get('/empresas/4')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('<h1>Estudio Trazo</h1>', $html);
        foreach (['Estudio Trazo Diseño S.A.S.', 'ETR2101119P4', 'Servicios profesionales', 'Micro (1 a 10 trabajadores)', 'Querétaro, Querétaro', 'Calle 5 de Mayo 40, Centro, Querétaro'] as $texto) {
            $this->assertStringContainsString($texto, $html);
        }
        $this->assertStringContainsString('RFC con formato válido', $html);
        $this->assertStringContainsString('RFC no duplicado', $html);
        $this->assertSame(2, substr_count($html, 'data-verificacion="ok"'));
        $this->assertStringNotContainsString('considera rechazar', $html);
        $this->assertStringContainsString('Daniel Ortiz Vega', $html);
        $this->assertStringContainsString('data-estado="pendiente"', $html);
    }

    public function test_un_rfc_con_formato_invalido_se_marca_y_sugiere_rechazar(): void
    {
        $html = $this->get('/empresas/102')->getContent();

        $this->assertStringContainsString('El RFC no tiene formato válido', $html);
        $this->assertSame(1, substr_count($html, 'data-verificacion="mal"'));
        $this->assertStringContainsString('considera rechazar la solicitud', $html);
        $this->assertStringContainsString('Esta empresa todavía no tiene reclutadores.', $html);
    }

    public function test_un_rfc_duplicado_se_marca(): void
    {
        Almacen::modificar(function (array &$estado) {
            $estado['empresas'][3]['rfc'] = 'TQU150312AB1';
        });

        $html = $this->get('/empresas/4')->getContent();

        $this->assertStringContainsString('Otra empresa ya registró este RFC', $html);
        $this->assertStringContainsString('considera rechazar la solicitud', $html);
    }

    public function test_la_revision_enlaza_la_constancia_de_ejemplo_y_el_pdf_se_abre(): void
    {
        $html = $this->get('/empresas/4')->getContent();

        $this->assertMatchesRegularExpression('/<a class="enlace-constancia" href="[^"]*\/empresas\/4\/constancia" target="_blank" rel="noopener">/', $html);
        $this->assertStringContainsString('Ver constancia de situación fiscal (PDF)', $html);
        $this->assertStringContainsString('(se abre en una pestaña nueva)', $html);

        $pdf = $this->get('/empresas/4/constancia')->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringContainsString('inline', $pdf->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', $pdf->getContent());
        $this->assertFileExists(public_path('mock/constancia-ejemplo.pdf'));
    }

    public function test_sin_constancia_no_hay_enlace_y_la_ruta_responde_404(): void
    {
        $this->get('/empresas/102')->assertSee('Todavía no ha subido su constancia de situación fiscal.')->assertDontSee('Ver constancia de situación fiscal (PDF)');
        $this->get('/empresas/102/constancia')->assertStatus(404);
    }

    public function test_una_empresa_que_no_existe_responde_404(): void
    {
        foreach (['/empresas/9999', '/empresas/9999/editar', '/empresas/9999/constancia'] as $ruta) {
            $this->get($ruta)->assertStatus(404)->assertSee('La empresa no existe.');
        }
    }

    #[DataProvider('botonesPorEstado')]
    public function test_los_botones_dependen_del_estado(int $id, array $botones, array $ausentes): void
    {
        $html = $this->get("/empresas/{$id}")->getContent();
        preg_match('/<div class="encabezado-acciones">.*?<\/div>/s', $html, $acciones);

        foreach ($botones as $boton) {
            $this->assertMatchesRegularExpression('/<button[^>]*>'.$boton.'<\/button>/', $acciones[0], $boton);
        }
        foreach ($ausentes as $boton) {
            $this->assertStringNotContainsString('>'.$boton.'</button>', $acciones[0], $boton);
        }
        $this->assertStringContainsString('>Editar</a>', $acciones[0]);
    }

    public static function botonesPorEstado(): array
    {
        return [
            'pendiente' => [4, ['Validar', 'Rechazar'], ['Suspender', 'Reactivar']],
            'validada' => [1, ['Suspender'], ['Validar', 'Rechazar', 'Reactivar']],
            'suspendida' => [105, ['Reactivar'], ['Validar', 'Rechazar', 'Suspender']],
            'rechazada' => [103, [], ['Validar', 'Rechazar', 'Suspender', 'Reactivar']],
        ];
    }

    public function test_rechazar_y_suspender_piden_motivo_y_validar_y_reactivar_no(): void
    {
        $pendiente = $this->get('/empresas/4')->getContent();
        $this->assertMatchesRegularExpression('/id="empresa-4-rechazar-motivo"[^>]*required/', $pendiente);
        $this->assertStringNotContainsString('empresa-4-validar-motivo', $pendiente);
        $this->assertStringContainsString('<input type="hidden" name="decision" value="rechazada">', $pendiente);
        $this->assertStringContainsString('name="_method" value="PATCH"', $pendiente);

        $validada = $this->get('/empresas/1')->getContent();
        $this->assertMatchesRegularExpression('/id="empresa-1-suspender-motivo"[^>]*required/', $validada);
        $this->assertStringContainsString('Sus vacantes publicadas se suspenderán y se avisará a las personas postuladas.', $validada);

        $suspendida = $this->get('/empresas/105')->getContent();
        $this->assertStringNotContainsString('empresa-105-reactivar-motivo', $suspendida);
        $this->assertStringContainsString('Sus vacantes siguen suspendidas hasta que las reactives una por una.', $suspendida);
    }

    // --- Validar y rechazar ---

    public function test_estudio_trazo_se_puede_validar_y_se_conserva_al_recargar(): void
    {
        $this->patch('/empresas/4/validacion', ['decision' => 'validada'])->assertRedirect('/empresas/4');

        $this->assertSame('validada', $this->empresa(4)['estado']);
        $this->assertNotNull($this->empresa(4)['validada_en']);
        $this->get('/empresas/4')->assertSee($this->enAvisos('Se validó a Estudio Trazo. Ya puede publicar vacantes.'), false)->assertSee('data-estado="validada"', false);
        // Sale de la cola de pendientes y aparece en Validadas.
        $this->assertSame(['MediBajío', 'OficiosDigitales'], $this->nombres($this->get('/empresas')->getContent()));
        $this->assertContains('Estudio Trazo', $this->nombres($this->get('/empresas?estado=validada')->getContent()));
    }

    public function test_rechazar_pide_motivo_y_lo_muestra_en_la_empresa(): void
    {
        $this->patch('/empresas/4/validacion', ['decision' => 'rechazada', 'motivo' => 'La constancia no es legible.'])->assertRedirect('/empresas/4');

        $this->assertSame('rechazada', $this->empresa(4)['estado']);
        $html = $this->get('/empresas/4')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se rechazó a Estudio Trazo.'), $html);
        $this->assertStringContainsString('<dt>Motivo</dt><dd>La constancia no es legible.</dd>', $html);
        $this->assertStringNotContainsString('>Rechazar</button>', $html);
    }

    public function test_rechazar_sin_motivo_vuelve_a_abrir_la_confirmacion_y_no_cambia_nada(): void
    {
        $this->from('/empresas/4')->patch('/empresas/4/validacion', ['decision' => 'rechazada', 'motivo' => '  ', 'modal' => 'empresa-4-rechazar'])
            ->assertRedirect('/empresas/4')->assertSessionHasErrors(['motivo' => 'Escribe el motivo del rechazo.'])->assertSessionHas('abrir_modal', 'empresa-4-rechazar');

        $this->assertSame('pendiente', $this->empresa(4)['estado']);
        $html = $this->get('/empresas/4')->getContent();
        $this->assertStringContainsString('Escribe el motivo del rechazo.', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
        $this->assertMatchesRegularExpression('/x-data="modal\([^"]*empresa-4-rechazar[^"]*, true\)"/', $html);
    }

    public function test_validar_o_rechazar_una_empresa_que_no_esta_pendiente_responde_409_estado_invalido(): void
    {
        foreach ([['validada', 1], ['rechazada', 103], ['validada', 105]] as [$decision, $id]) {
            $this->from("/empresas/{$id}")->patch("/empresas/{$id}/validacion", ['decision' => $decision, 'motivo' => 'x'])->assertRedirect("/empresas/{$id}");
            $this->get("/empresas/{$id}")->assertSee($this->enAvisos('La empresa no está pendiente.'), false);
        }
        $this->assertSame('validada', $this->empresa(1)['estado']);
        $this->assertSame('rechazada', $this->empresa(103)['estado']);
    }

    public function test_una_decision_que_no_existe_no_cambia_nada(): void
    {
        $this->from('/empresas/4')->patch('/empresas/4/validacion', ['decision' => 'aprobar'])->assertSessionHasErrors('decision');
        $this->assertSame('pendiente', $this->empresa(4)['estado']);
    }

    public function test_validar_una_empresa_que_no_existe_responde_404(): void
    {
        $this->patch('/empresas/9999/validacion', ['decision' => 'validada'])->assertStatus(404);
        $this->patch('/empresas/9999/estado', ['estado' => 'validada'])->assertStatus(404);
    }

    // --- Suspender y reactivar ---

    public function test_suspender_pide_motivo_suspende_las_vacantes_publicadas_y_el_aviso_dice_cuantas(): void
    {
        $this->assertSame(8, $this->conteoPublicadas());

        $this->patch('/empresas/1/estado', ['estado' => 'suspendida', 'motivo' => 'Varias vacantes reportadas como engañosas.'])->assertRedirect('/empresas/1');

        $this->assertSame('suspendida', $this->empresa(1)['estado']);
        // Las vacantes 1, 6 y 101 eran de TecnoQro y estaban publicadas; el borrador 7 no cambia.
        foreach ([1, 6, 101] as $id) {
            $this->assertSame('suspendida', $this->vacante($id)['estado'], "vacante {$id}");
        }
        $this->assertSame('borrador', $this->vacante(7)['estado']);
        $this->assertSame('publicada', $this->vacante(2)['estado']);
        $this->assertSame(5, $this->conteoPublicadas());

        // Los postulados con postulación en curso son Mariana y Jorge.
        $html = $this->get('/empresas/1')->getContent();
        $this->assertStringContainsString($this->enAvisos('Se suspendió a TecnoQro: 3 vacantes suspendidas y 2 personas postuladas notificadas.'), $html);
        $this->assertStringContainsString('<dt>Motivo</dt><dd>Varias vacantes reportadas como engañosas.</dd>', $html);
        $this->assertStringContainsString('>Reactivar</button>', $html);
    }

    public function test_el_aviso_usa_el_singular_cuando_es_una_sola(): void
    {
        // ConCentro: vacantes publicadas 4, 5 y 102; dejamos solo la 4 y sin postulaciones en curso.
        Almacen::modificar(function (array &$estado) {
            foreach ($estado['vacantes'] as &$v) {
                if (in_array($v['id'], [5, 102], true)) {
                    $v['estado'] = 'cerrada';
                }
            }
            unset($v);
            $estado['postulaciones'] = array_values(array_filter($estado['postulaciones'], fn ($p) => $p['vacante_id'] !== 4));
            $estado['postulaciones'][] = ['id' => 500, 'candidato_id' => 3, 'vacante_id' => 4, 'estado' => 'en_revision', 'creado_en' => '2026-10-20T10:00:00Z', 'historial' => []];
        });

        $this->patch('/empresas/3/estado', ['estado' => 'suspendida', 'motivo' => 'Prueba.']);

        $this->get('/empresas/3')->assertSee($this->enAvisos('Se suspendió a ConCentro: 1 vacante suspendida y 1 persona postulada notificada.'), false);
    }

    public function test_suspender_sin_motivo_vuelve_a_abrir_la_confirmacion(): void
    {
        $this->from('/empresas/1')->patch('/empresas/1/estado', ['estado' => 'suspendida', 'motivo' => '', 'modal' => 'empresa-1-suspender'])
            ->assertSessionHasErrors(['motivo' => 'Escribe el motivo de la suspensión.'])->assertSessionHas('abrir_modal', 'empresa-1-suspender');

        $this->assertSame('validada', $this->empresa(1)['estado']);
        $this->assertSame('publicada', $this->vacante(1)['estado']);
    }

    public function test_reactivar_deja_la_empresa_validada_y_sus_vacantes_siguen_suspendidas(): void
    {
        $this->patch('/empresas/1/estado', ['estado' => 'suspendida', 'motivo' => 'Prueba.']);

        $this->patch('/empresas/1/estado', ['estado' => 'validada'])->assertRedirect('/empresas/1');

        $this->assertSame('validada', $this->empresa(1)['estado']);
        $this->assertNull($this->empresa(1)['motivo_estado']);
        $this->assertSame('suspendida', $this->vacante(1)['estado']);
        $this->get('/empresas/1')->assertSee($this->enAvisos('Se reactivó a TecnoQro. Sus vacantes siguen suspendidas hasta que las reactives una por una.'), false);
    }

    public function test_solo_se_suspende_una_validada_y_solo_se_reactiva_una_suspendida(): void
    {
        foreach ([['suspendida', 4], ['suspendida', 103], ['suspendida', 105], ['validada', 1], ['validada', 4]] as [$estado, $id]) {
            $this->from("/empresas/{$id}")->patch("/empresas/{$id}/estado", ['estado' => $estado, 'motivo' => 'x'])->assertRedirect("/empresas/{$id}");
            $this->get("/empresas/{$id}")->assertSee($this->enAvisos('Solo se suspende una empresa validada y solo se reactiva una suspendida.'), false);
        }
    }

    public function test_un_estado_que_no_existe_no_cambia_nada(): void
    {
        $this->from('/empresas/1')->patch('/empresas/1/estado', ['estado' => 'cerrada', 'motivo' => 'x'])->assertSessionHasErrors('estado');
        $this->assertSame('validada', $this->empresa(1)['estado']);
    }

    public function test_suspender_actualiza_el_dashboard_y_el_estado_de_la_empresa_de_los_reclutadores(): void
    {
        $this->patch('/empresas/1/estado', ['estado' => 'suspendida', 'motivo' => 'Prueba.']);

        $this->assertSame('suspendida', collect(Almacen::leer()['usuarios'])->firstWhere('usuario.id', 2)['usuario']['empresa']['estado']);
        $this->get('/dashboard')->assertSee('data-indicador="vacantes_publicadas"', false);
    }

    // --- Alta y edición ---

    public function test_el_formulario_de_alta_tiene_etiquetas_y_las_listas_de_los_catalogos(): void
    {
        $html = $this->get('/empresas/nueva')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        foreach (['razon_social', 'nombre_comercial', 'rfc', 'sector_id', 'tamano_empresa_id', 'municipio_id', 'direccion', 'sitio_web', 'descripcion', 'practicas_inclusion'] as $campo) {
            $this->assertMatchesRegularExpression('/<label class="form-label" for="'.$campo.'">/', $html, $campo);
        }
        $this->assertStringContainsString('Tecnologías de la información', $html);
        $this->assertStringContainsString('Micro · 1 a 10 trabajadores', $html);
        $this->assertStringContainsString('Querétaro, Querétaro', $html);
        $this->assertStringContainsString('Monterrey, Nuevo León', $html);
    }

    public function test_crear_una_empresa_la_deja_validada_y_se_conserva(): void
    {
        $this->post('/empresas', $this->entrada(['rfc' => 'tnu200101ab1', 'sitio_web' => 'https://tecnueva.mx']))->assertRedirect();

        $creada = collect(Almacen::leer()['empresas'])->firstWhere('nombre_comercial', 'TecNueva');
        $this->assertSame(['validada', 'TNU200101AB1', 'https://tecnueva.mx'], [$creada['estado'], $creada['rfc'], $creada['sitio_web']]);
        $this->assertNotNull($creada['validada_en']);
        $this->get('/empresas/'.$creada['id'])->assertOk()->assertSee($this->enAvisos('Se creó la empresa TecNueva. Quedó validada.'), false);
        $this->assertContains('TecNueva', $this->nombres($this->get('/empresas?estado=validada')->getContent()));
    }

    public function test_un_rfc_duplicado_se_marca_en_su_campo_y_no_crea_nada(): void
    {
        $this->from('/empresas/nueva')->post('/empresas', $this->entrada(['rfc' => 'etr2101119p4']))->assertRedirect('/empresas/nueva')
            ->assertSessionHasErrors(['rfc' => 'Otra empresa ya registró ese RFC. Revisa que esté bien escrito.']);

        $html = $this->get('/empresas/nueva')->getContent();
        $this->assertStringContainsString('<a href="#rfc">Otra empresa ya registró ese RFC. Revisa que esté bien escrito.</a>', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="rfc"[^>]*aria-invalid="true"/', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="razon_social"[^>]*value="Tecnologías Nuevas S.A. de C.V."/', $html);
        $this->assertCount(10, Almacen::leer()['empresas']);
    }

    #[DataProvider('entradasNoValidas')]
    public function test_los_datos_no_validos_se_marcan_en_su_campo(array $cambios, string $campo, string $mensaje): void
    {
        $this->from('/empresas/nueva')->post('/empresas', $this->entrada($cambios))->assertRedirect('/empresas/nueva');

        $html = $this->get('/empresas/nueva')->getContent();
        $this->assertStringContainsString('<a href="#'.$campo.'">'.$mensaje.'</a>', $html);
        $this->assertMatchesRegularExpression('/<[^>]*id="'.$campo.'"[^>]*aria-invalid="true"/', $html);
        $this->assertCount(10, Almacen::leer()['empresas']);
    }

    public static function entradasNoValidas(): array
    {
        return [
            'sin razón social' => [['razon_social' => ''], 'razon_social', 'Escribe la razón social.'],
            'razón social larga' => [['razon_social' => str_repeat('a', 201)], 'razon_social', 'La razón social debe tener máximo 200 caracteres.'],
            'sin nombre comercial' => [['nombre_comercial' => ''], 'nombre_comercial', 'Escribe el nombre comercial.'],
            'rfc inválido' => [['rfc' => 'ABC123'], 'rfc', 'El RFC debe tener 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave, sin espacios. Ejemplo: TQU150312AB1.'],
            'sin sector' => [['sector_id' => ''], 'sector_id', 'Elige el sector.'],
            'sin tamaño' => [['tamano_empresa_id' => ''], 'tamano_empresa_id', 'Elige el tamaño de la empresa.'],
            'sin municipio' => [['municipio_id' => ''], 'municipio_id', 'Elige el municipio.'],
            'sitio sin https' => [['sitio_web' => 'tecnueva.mx'], 'sitio_web', 'Escribe la dirección completa, por ejemplo https://empresa.mx.'],
            'descripción larga' => [['descripcion' => str_repeat('a', 1001)], 'descripcion', 'La descripción debe tener máximo 1000 caracteres.'],
        ];
    }

    public function test_los_errores_422_del_mock_llegan_a_su_campo(): void
    {
        // Un sector que no existe pasa la validación de Laravel y lo rechaza el API.
        $this->from('/empresas/nueva')->post('/empresas', $this->entrada(['sector_id' => '99']))->assertRedirect('/empresas/nueva')
            ->assertSessionHasErrors(['sector_id' => 'Elige un sector de la lista.']);
    }

    public function test_el_formulario_de_edicion_trae_los_datos_y_avisa_que_se_puede_corregir_una_validada(): void
    {
        $html = $this->get('/empresas/1/editar')->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/<input[^>]*id="rfc"[^>]*value="TQU150312AB1"/', $html);
        $this->assertMatchesRegularExpression('/<option value="4" selected>Tecnologías de la información<\/option>/', $html);
        $this->assertMatchesRegularExpression('/<option value="3" selected>Querétaro, Querétaro<\/option>/', $html);
        $this->assertStringContainsString('name="_method" value="PUT"', $html);
        $this->assertStringContainsString('Como administrador puedes corregir este dato aunque la empresa ya esté validada.', $html);
        $this->assertStringNotContainsString('Como administrador puedes corregir', $this->get('/empresas/4/editar')->getContent());
    }

    public function test_el_administrador_corrige_razon_social_y_rfc_de_una_empresa_validada(): void
    {
        $this->put('/empresas/1', $this->entrada(['razon_social' => 'Tecnologías Querétaro, S.A.P.I. de C.V.', 'nombre_comercial' => 'TecnoQro', 'rfc' => 'TQU150312AB2']))->assertRedirect('/empresas/1');

        $this->assertSame(['validada', 'TQU150312AB2', 'Tecnologías Querétaro, S.A.P.I. de C.V.'], [$this->empresa(1)['estado'], $this->empresa(1)['rfc'], $this->empresa(1)['razon_social']]);
        $this->get('/empresas/1')->assertSee($this->enAvisos('Se guardaron los cambios de TecnoQro.'), false);
    }

    public function test_editar_conserva_el_estado_y_actualiza_el_nombre_en_los_reclutadores(): void
    {
        $this->put('/empresas/4', $this->entrada(['nombre_comercial' => 'Trazo Estudio', 'rfc' => 'ETR2101119P4']))->assertRedirect('/empresas/4');

        $this->assertSame('pendiente', $this->empresa(4)['estado']);
        $this->assertSame('Trazo Estudio', collect(Almacen::leer()['usuarios'])->firstWhere('usuario.id', 7)['usuario']['empresa']['nombre_comercial']);
    }

    public function test_editar_con_el_rfc_de_otra_empresa_responde_409_en_el_campo_rfc(): void
    {
        $this->from('/empresas/1/editar')->put('/empresas/1', $this->entrada(['rfc' => 'LBN180725KQ3']))->assertRedirect('/empresas/1/editar')
            ->assertSessionHasErrors(['rfc' => 'Otra empresa ya registró ese RFC. Revisa que esté bien escrito.']);
        $this->assertSame('TQU150312AB1', $this->empresa(1)['rfc']);
    }

    public function test_conservar_el_propio_rfc_no_es_un_duplicado(): void
    {
        $this->put('/empresas/1', $this->entrada(['rfc' => 'TQU150312AB1']))->assertRedirect('/empresas/1');
    }

    private function conteoPublicadas(): int
    {
        return count(array_filter(Almacen::leer()['vacantes'], fn ($v) => $v['estado'] === 'publicada'));
    }
}
