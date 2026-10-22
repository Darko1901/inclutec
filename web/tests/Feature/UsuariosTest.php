<?php

namespace Tests\Feature;

use App\Servicios\Api\Mock\Almacen;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** WEB-03 · Gestión de usuarios con el mock (60 usuarios: 3 páginas de 25). */
class UsuariosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-21 12:00:00');
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    /** Id de la cuenta con ese correo en el mock. */
    private function id(string $correo): int
    {
        foreach (Almacen::leer()['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['correo'] === $correo) {
                return $cuenta['usuario']['id'];
            }
        }
        $this->fail("No hay usuario {$correo}.");
    }

    private function usuario(int $id): array
    {
        foreach (Almacen::leer()['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['id'] === $id) {
                return $cuenta;
            }
        }
        $this->fail("No hay usuario {$id}.");
    }

    private function datos(array $cambios = []): array
    {
        return $cambios + [
            'rol' => 'administrador', 'nombre' => 'Isay', 'apellidos' => 'Guerra López', 'correo' => 'isay@inclutec.mx',
            'telefono' => '', 'contrasena' => 'Inclutec2026', 'empresa_id' => '', 'puesto' => '',
        ];
    }

    // --- Acceso ---

    public function test_sin_sesion_todas_las_rutas_de_usuarios_llevan_a_login(): void
    {
        $this->post('/logout');

        foreach (['/usuarios', '/usuarios/nuevo', '/usuarios/3', '/usuarios/3/editar'] as $ruta) {
            $this->get($ruta)->assertRedirect('/login');
        }
        $this->post('/usuarios', $this->datos())->assertRedirect('/login');
        $this->put('/usuarios/3', $this->datos())->assertRedirect('/login');
        $this->patch('/usuarios/3/estado', ['estado' => 'suspendido', 'motivo' => 'x'])->assertRedirect('/login');
    }

    // --- Listado ---

    public function test_el_listado_muestra_la_primera_pagina_de_25_mas_recientes_primero(): void
    {
        $html = $this->get('/usuarios')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertSame(25, substr_count($html, '<td class="celda-nombre">'));
        foreach (['Nombre', 'Correo', 'Rol', 'Empresa', 'Fecha de registro', 'Estado', 'Acciones'] as $columna) {
            $this->assertStringContainsString('<th scope="col">'.$columna.'</th>', $html);
        }
        $this->assertStringContainsString('Mostrando 1 a 25 de 60', $html);
        // El usuario 152 es el más reciente y el administrador (registrado hace 60 días) cae en la última página.
        $this->assertStringContainsString('20/10/2026', $html);
        $this->assertStringNotContainsString('admin@inclutec.mx', $html);
        $this->assertStringContainsString('60 resultados.', $html);
    }

    public function test_hay_tres_paginas_y_la_ultima_trae_10(): void
    {
        $this->assertSame(25, substr_count($this->get('/usuarios?page=2')->getContent(), '<td class="celda-nombre">'));
        $ultima = $this->get('/usuarios?page=3')->getContent();
        $this->assertSame(10, substr_count($ultima, '<td class="celda-nombre">'));
        $this->assertStringContainsString('admin@inclutec.mx', $ultima);
        $this->assertStringContainsString('Mostrando 51 a 60 de 60', $ultima);
    }

    public function test_los_filtros_y_la_busqueda_se_conservan_al_cambiar_de_pagina(): void
    {
        $html = $this->get('/usuarios?rol=candidato&q=a')->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/<option value="candidato" selected>Candidato<\/option>/', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*name="q"[^>]*value="a"/', $html);
        $this->assertMatchesRegularExpression('/href="[^"]*usuarios\?rol=candidato&amp;q=a&amp;page=2"/', $html);
    }

    public function test_filtra_por_rol_estado_y_busca_por_nombre_o_correo(): void
    {
        $reclutadores = $this->get('/usuarios?rol=reclutador&size=100')->getContent();
        $this->assertStringNotContainsString('>Candidato</td>', $reclutadores);
        $this->assertStringContainsString('rh@tecnoqro.mx', $reclutadores);

        $suspendidos = $this->get('/usuarios?estado=suspendido')->getContent();
        $this->assertSame(substr_count($suspendidos, '<td class="celda-nombre">'), substr_count($suspendidos, 'data-estado="suspendido"'));
        $this->assertStringContainsString('suspendida@correo.mx', $suspendidos);

        $this->get('/usuarios?q=MARIANA')->assertSee('mariana.lopez@correo.mx');
        $this->get('/usuarios?q=tecnoqro&rol=candidato')->assertSee('No se encontraron usuarios con esos filtros.');
        $this->get('/usuarios?q=tecnoqro')->assertSee('rh@tecnoqro.mx');
    }

    public function test_un_filtro_que_no_existe_se_ignora(): void
    {
        $this->get('/usuarios?rol=superadmin&estado=bloqueado')->assertOk()->assertSee('Mostrando 1 a 25 de 60');
    }

    public function test_solo_existen_los_estados_activo_suspendido_y_eliminado(): void
    {
        $html = $this->get('/usuarios?size=100')->getContent();

        preg_match_all('/data-estado="([^"]+)"/', $html, $estados);
        $this->assertEqualsCanonicalizing(['activo', 'suspendido', 'eliminado'], array_unique($estados[1]));
        $this->assertMatchesRegularExpression('/<select[^>]*id="estado".*?<\/select>/s', $html);
        preg_match('/<select[^>]*id="estado".*?<\/select>/s', $html, $select);
        $this->assertSame(['', 'activo', 'suspendido', 'eliminado'], $this->valoresDe($select[0]));
        foreach (['Revisión', 'Bloqueado', 'Aprobar'] as $texto) {
            $this->assertStringNotContainsString($texto, $html);
        }
    }

    public function test_los_estados_salen_del_mapa_con_texto_e_icono(): void
    {
        $html = $this->get('/usuarios?q=suspendida')->getContent();

        $this->assertStringContainsString('<span>Suspendido</span>', $html);
        $this->assertMatchesRegularExpression('/<span class="badge badge-pending" data-estado="suspendido"><svg/', $html);
    }

    public function test_las_acciones_de_cada_fila_dependen_del_estado(): void
    {
        $activo = $this->get('/usuarios?q=mariana')->getContent();
        $this->assertStringContainsString('Ver<span class="visually-hidden"> a Mariana López García</span>', $activo);
        $this->assertStringContainsString('Editar<span class="visually-hidden"> a Mariana López García</span>', $activo);
        $this->assertStringContainsString('Suspender<span class="visually-hidden"> a Mariana López García</span>', $activo);
        $this->assertStringContainsString('Dar de baja<span class="visually-hidden"> a Mariana López García</span>', $activo);
        $this->assertStringNotContainsString('Reactivar<span', $activo);

        $suspendido = $this->get('/usuarios?q=suspendida')->getContent();
        $this->assertStringContainsString('Reactivar<span class="visually-hidden"> a Sofía Cuenta Suspendida</span>', $suspendido);
        $this->assertStringContainsString('Dar de baja<span', $suspendido);
        $this->assertStringNotContainsString('Suspender<span', $suspendido);
    }

    public function test_suspender_y_dar_de_baja_piden_motivo_y_reactivar_no(): void
    {
        $activo = $this->get('/usuarios?q=mariana')->getContent();
        $this->assertMatchesRegularExpression('/id="estado-3-suspender-motivo"[^>]*required/', $activo);
        $this->assertMatchesRegularExpression('/id="estado-3-baja-motivo"[^>]*required/', $activo);
        $this->assertStringContainsString('<input type="hidden" name="estado" value="suspendido">', $activo);
        $this->assertStringContainsString('name="_method" value="PATCH"', $activo);

        $suspendido = $this->get('/usuarios?q=suspendida')->getContent();
        $this->assertStringContainsString('data-modal="estado-100-reactivar"', $suspendido);
        $this->assertStringNotContainsString('estado-100-reactivar-motivo', $suspendido);
    }

    public function test_la_busqueda_anuncia_el_numero_de_resultados(): void
    {
        $this->get('/usuarios?q=tecnoqro')->assertSee('1 resultado.', false);
        $this->get('/usuarios?q=zzzz')->assertSee('No se encontraron resultados.', false);
    }

    // --- Alta ---

    public function test_el_formulario_de_alta_tiene_etiquetas_y_los_campos_del_contrato(): void
    {
        $html = $this->get('/usuarios/nuevo')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        foreach (['rol', 'nombre', 'apellidos', 'correo', 'telefono', 'contrasena', 'empresa_id', 'puesto'] as $campo) {
            $this->assertMatchesRegularExpression('/<label class="form-label" for="'.$campo.'">/', $html, $campo);
        }
        $this->assertMatchesRegularExpression('/<input[^>]*type="password"[^>]*id="contrasena"/', $html);
        $this->assertSame(['', 'candidato', 'reclutador', 'administrador'], $this->valoresDe($this->select($html, 'rol')));
        // Las empresas salen del API con su estado del mapa.
        $this->assertStringContainsString('TecnoQro · Validada', $html);
        $this->assertStringContainsString('Estudio Trazo · Pendiente de validación', $html);
    }

    public function test_crear_un_administrador_lo_agrega_al_listado_y_se_conserva_al_recargar(): void
    {
        $this->post('/usuarios', $this->datos())->assertRedirect();

        $id = $this->id('isay@inclutec.mx');
        $this->get("/usuarios/{$id}")->assertOk()->assertSee('Isay Guerra López')->assertSee($this->enAvisos('Se creó a Isay Guerra López.'), false);
        $this->get('/usuarios?q=isay')->assertSee('isay@inclutec.mx')->assertSee('Administrador');
        $this->assertSame(61, count(Almacen::leer()['usuarios']));
        $this->assertSame('activo', $this->usuario($id)['usuario']['estado']);
    }

    public function test_un_candidato_creado_empieza_sin_consentimiento_y_sin_empresa(): void
    {
        $this->post('/usuarios', $this->datos(['rol' => 'candidato', 'correo' => 'nuevo@correo.mx', 'telefono' => '4421112233']))->assertRedirect();

        $cuenta = $this->usuario($this->id('nuevo@correo.mx'));
        $this->assertFalse($cuenta['usuario']['consentimiento_sensibles']);
        $this->assertNull($cuenta['usuario']['empresa']);
        $this->assertSame('4421112233', $cuenta['usuario']['telefono']);
        $this->assertSame('Inclutec2026', $cuenta['contrasena']);
    }

    public function test_crear_un_reclutador_lo_liga_a_su_empresa_y_guarda_el_puesto(): void
    {
        $this->post('/usuarios', $this->datos(['rol' => 'reclutador', 'correo' => 'rh@nueva.mx', 'empresa_id' => '2', 'puesto' => 'Gerente de Talento']))->assertRedirect();

        $id = $this->id('rh@nueva.mx');
        $html = $this->get("/usuarios/{$id}")->getContent();
        $this->assertStringContainsString('LogiBajío', $html);
        $this->assertStringContainsString('Gerente de Talento', $html);
    }

    public function test_al_crear_un_administrador_no_viajan_empresa_ni_puesto(): void
    {
        $this->post('/usuarios', $this->datos(['empresa_id' => '2', 'puesto' => 'Algo']))->assertRedirect();

        $cuenta = $this->usuario($this->id('isay@inclutec.mx'));
        $this->assertNull($cuenta['usuario']['empresa']);
        $this->assertNull($cuenta['ficha']['puesto']);
    }

    public function test_un_correo_duplicado_se_marca_en_el_campo_correo_y_no_crea_nada(): void
    {
        $this->from('/usuarios/nuevo')->post('/usuarios', $this->datos(['correo' => 'Rh@TecnoQro.mx']))
            ->assertRedirect('/usuarios/nuevo')->assertSessionHasErrors(['correo' => 'Ya existe un usuario con ese correo. Usa otro.']);

        $html = $this->get('/usuarios/nuevo')->getContent();
        $this->assertStringContainsString('<a href="#correo">Ya existe un usuario con ese correo. Usa otro.</a>', $html);
        $this->assertStringContainsString('id="error-correo"', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="correo"[^>]*aria-invalid="true"/', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="correo"[^>]*value="Rh@TecnoQro.mx"/', $html);
        $this->assertSame(60, count(Almacen::leer()['usuarios']));
    }

    #[DataProvider('entradasNoValidas')]
    public function test_los_datos_no_validos_se_marcan_en_su_campo(array $cambios, string $campo, string $mensaje): void
    {
        $this->from('/usuarios/nuevo')->post('/usuarios', $this->datos($cambios))->assertRedirect('/usuarios/nuevo');

        $html = $this->get('/usuarios/nuevo')->getContent();
        $this->assertStringContainsString('<a href="#'.$campo.'">'.$mensaje.'</a>', $html);
        $this->assertMatchesRegularExpression('/<[^>]*id="'.$campo.'"[^>]*aria-invalid="true"/', $html);
        $this->assertSame(60, count(Almacen::leer()['usuarios']));
    }

    public static function entradasNoValidas(): array
    {
        return [
            'sin rol' => [['rol' => ''], 'rol', 'Elige el rol del usuario.'],
            'sin nombre' => [['nombre' => ''], 'nombre', 'Escribe el nombre.'],
            'nombre largo' => [['nombre' => str_repeat('a', 81)], 'nombre', 'El nombre debe tener máximo 80 caracteres.'],
            'sin apellidos' => [['apellidos' => ''], 'apellidos', 'Escribe los apellidos.'],
            'correo inválido' => [['correo' => 'no-es-correo'], 'correo', 'Escribe un correo válido, por ejemplo nombre@empresa.mx.'],
            'teléfono corto' => [['telefono' => '12345'], 'telefono', 'El teléfono debe tener 10 dígitos, sin espacios ni guiones.'],
            'sin contraseña' => [['contrasena' => ''], 'contrasena', 'Escribe una contraseña para la cuenta.'],
            'contraseña corta' => [['contrasena' => 'Corta1'], 'contrasena', 'La contraseña debe tener al menos 8 caracteres.'],
            'reclutador sin empresa' => [['rol' => 'reclutador', 'puesto' => 'RH'], 'empresa_id', 'Elige la empresa del reclutador.'],
            'reclutador sin puesto' => [['rol' => 'reclutador', 'empresa_id' => '1'], 'puesto', 'Escribe el puesto del reclutador.'],
        ];
    }

    public function test_los_errores_422_del_mock_llegan_a_su_campo(): void
    {
        // Una empresa que no existe pasa la validación de Laravel y la rechaza el API con 422.
        $this->from('/usuarios/nuevo')->post('/usuarios', $this->datos(['rol' => 'reclutador', 'empresa_id' => '999', 'puesto' => 'RH', 'correo' => 'x@y.mx']))
            ->assertRedirect('/usuarios/nuevo')->assertSessionHasErrors(['empresa_id' => 'Elige una empresa de la lista.']);
    }

    public function test_el_formulario_conserva_lo_escrito_pero_nunca_la_contrasena(): void
    {
        $this->from('/usuarios/nuevo')->post('/usuarios', $this->datos(['nombre' => '', 'contrasena' => 'SecretaClave99']));

        $html = $this->get('/usuarios/nuevo')->getContent();
        $this->assertStringContainsString('value="Guerra López"', $html);
        $this->assertStringNotContainsString('SecretaClave99', $html);
    }

    // --- Edición ---

    public function test_editar_cambia_los_datos_y_se_conserva_al_recargar(): void
    {
        $id = $this->id('jorge.ramirez@correo.mx');

        $this->put("/usuarios/{$id}", $this->datos(['rol' => 'candidato', 'nombre' => 'Jorge Luis', 'apellidos' => 'Ramírez Soto', 'correo' => 'jorge.ramirez@correo.mx', 'telefono' => '4420001111']))
            ->assertRedirect("/usuarios/{$id}");

        $html = $this->get("/usuarios/{$id}")->getContent();
        $this->assertStringContainsString('Jorge Luis Ramírez Soto', $html);
        $this->assertStringContainsString('4420001111', $html);
        $this->assertStringContainsString($this->enAvisos('Se guardaron los cambios de Jorge Luis Ramírez Soto.'), $html);
    }

    public function test_el_formulario_de_edicion_trae_los_datos_actuales_sin_pedir_contrasena(): void
    {
        $html = $this->get('/usuarios/2/editar')->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/<input[^>]*id="nombre"[^>]*value="Laura"/', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="puesto"[^>]*value="Coordinadora de Recursos Humanos"/', $html);
        $this->assertMatchesRegularExpression('/<option value="reclutador" selected>/', $html);
        $this->assertMatchesRegularExpression('/<option value="1" selected>TecnoQro/', $html);
        $this->assertStringNotContainsString('id="contrasena"', $html);
        $this->assertStringContainsString('name="_method" value="PUT"', $html);
    }

    public function test_editar_con_un_correo_ajeno_responde_409_en_el_campo_correo(): void
    {
        $this->from('/usuarios/3/editar')->put('/usuarios/3', $this->datos(['rol' => 'candidato', 'correo' => 'rh@tecnoqro.mx']))
            ->assertRedirect('/usuarios/3/editar')->assertSessionHasErrors(['correo' => 'Ya existe un usuario con ese correo. Usa otro.']);
    }

    public function test_conservar_el_propio_correo_no_es_un_duplicado(): void
    {
        $this->put('/usuarios/3', $this->datos(['rol' => 'candidato', 'correo' => 'mariana.lopez@correo.mx']))->assertRedirect('/usuarios/3');
    }

    public function test_cambiar_el_rol_de_un_candidato_con_postulaciones_responde_409_en_uso(): void
    {
        $this->from('/usuarios/3/editar')->put('/usuarios/3', $this->datos(['rol' => 'administrador', 'correo' => 'mariana.lopez@correo.mx']))
            ->assertRedirect('/usuarios/3/editar')
            ->assertSessionHasErrors(['rol' => 'No se puede cambiar el rol: esta persona ya tiene postulaciones o vacantes.']);

        $html = $this->get('/usuarios/3/editar')->getContent();
        $this->assertStringContainsString('<a href="#rol">No se puede cambiar el rol', $html);
        $this->assertSame('candidato', $this->usuario(3)['usuario']['rol']);
    }

    public function test_cambiar_el_rol_de_un_reclutador_con_vacantes_responde_409_en_uso(): void
    {
        $this->from('/usuarios/2/editar')->put('/usuarios/2', $this->datos(['rol' => 'administrador', 'correo' => 'rh@tecnoqro.mx']))
            ->assertSessionHasErrors('rol');
        $this->assertSame('reclutador', $this->usuario(2)['usuario']['rol']);
    }

    public function test_un_usuario_sin_postulaciones_ni_vacantes_si_puede_cambiar_de_rol_y_se_desvincula_de_su_empresa(): void
    {
        $reclutador = collect(Almacen::leer()['usuarios'])->first(fn ($c) => $c['usuario']['rol'] === 'reclutador' && $c['usuario']['id'] > 106);
        $id = $reclutador['usuario']['id'];

        $this->put("/usuarios/{$id}", $this->datos(['rol' => 'administrador', 'correo' => $reclutador['usuario']['correo']]))->assertRedirect("/usuarios/{$id}");

        $actual = $this->usuario($id);
        $this->assertSame('administrador', $actual['usuario']['rol']);
        $this->assertNull($actual['usuario']['empresa']);
        $this->assertNull($actual['ficha']['puesto']);
    }

    public function test_editar_un_usuario_que_no_existe_muestra_la_pantalla_de_error_404(): void
    {
        $this->get('/usuarios/9999/editar')->assertStatus(404)->assertSee('No se pudo completar la acción');
        $this->put('/usuarios/9999', $this->datos())->assertStatus(404);
    }

    // --- Detalle ---

    public function test_el_detalle_de_un_candidato_muestra_totales_y_el_aviso_de_privacidad(): void
    {
        $html = $this->get('/usuarios/3')->assertOk()->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('<h1>Mariana López García</h1>', $html);
        $this->assertStringContainsString('Por privacidad, las necesidades de ajuste de los candidatos no se muestran en el panel.', $html);
        $this->assertStringContainsString('mariana.lopez@correo.mx', $html);
        $this->assertMatchesRegularExpression('/<dt>Postulaciones<\/dt><dd class="detalle-cifra">2<\/dd>/', $html);
        $this->assertStringNotContainsString('<dt>Vacantes</dt>', $html);
        $this->assertMatchesRegularExpression('/<dt>Reportes hechos<\/dt><dd class="detalle-cifra">1<\/dd>/', $html);
        $this->assertStringContainsString('data-estado="activo"', $html);
    }

    public function test_el_detalle_nunca_muestra_necesidades_de_ajuste(): void
    {
        $html = $this->get('/usuarios/3')->getContent();

        // Mariana registró rampa y baño accesible: no deben aparecer en ninguna parte.
        foreach (['Acceso con rampa', 'Baño accesible', 'necesidades_', 'consentimiento'] as $texto) {
            $this->assertStringNotContainsString($texto, $html);
        }
    }

    public function test_el_detalle_de_un_reclutador_muestra_empresa_puesto_y_vacantes(): void
    {
        $html = $this->get('/usuarios/2')->getContent();

        $this->assertStringContainsString('TecnoQro', $html);
        $this->assertStringContainsString('Coordinadora de Recursos Humanos', $html);
        $this->assertMatchesRegularExpression('/<dt>Vacantes<\/dt><dd class="detalle-cifra">4<\/dd>/', $html);
        $this->assertStringNotContainsString('<dt>Postulaciones</dt>', $html);
    }

    public function test_el_detalle_de_un_suspendido_muestra_el_motivo_y_reactivar(): void
    {
        $html = $this->get('/usuarios/100')->getContent();

        $this->assertStringContainsString('<dt>Motivo del estado</dt><dd>Publicó información falsa en su perfil.</dd>', $html);
        $this->assertStringContainsString('data-estado="suspendido"', $html);
        $this->assertStringContainsString('data-modal="estado-100-reactivar"', $html);
    }

    public function test_un_detalle_inexistente_muestra_404(): void
    {
        $this->get('/usuarios/9999')->assertStatus(404)->assertSee('El usuario no existe.');
    }

    // --- Cambio de estado ---

    public function test_suspender_con_motivo_cambia_el_estado_y_se_conserva_al_recargar(): void
    {
        $this->from('/usuarios?rol=candidato&page=2')->patch('/usuarios/3/estado', ['estado' => 'suspendido', 'motivo' => 'Publicó información falsa.'])
            ->assertRedirect('/usuarios?rol=candidato&page=2');

        $this->assertSame('suspendido', $this->usuario(3)['usuario']['estado']);
        $this->get('/usuarios/3')->assertSee($this->enAvisos('Se suspendió a Mariana López García.'), false)
            ->assertSee('Publicó información falsa.')->assertSee('data-estado="suspendido"', false);
    }

    public function test_un_usuario_suspendido_ya_no_puede_iniciar_sesion(): void
    {
        $this->patch('/usuarios/3/estado', ['estado' => 'suspendido', 'motivo' => 'Prueba.']);
        $this->post('/logout');

        $this->from('/login')->post('/login', ['correo' => 'mariana.lopez@correo.mx', 'contrasena' => 'Inclutec2026'])->assertRedirect('/login');
        $this->get('/login')->assertSee('Tu cuenta está suspendida.');
    }

    public function test_reactivar_no_pide_motivo_y_limpia_el_motivo_anterior(): void
    {
        $this->patch('/usuarios/100/estado', ['estado' => 'activo'])->assertRedirect();

        $this->assertNull($this->usuario(100)['ficha']['motivo_estado']);
        $this->get('/usuarios/100')->assertSee($this->enAvisos('Se reactivó a Sofía Cuenta Suspendida.'), false)
            ->assertDontSee('Motivo del estado')->assertSee('data-estado="activo"', false);
    }

    public function test_dar_de_baja_con_motivo_deja_al_usuario_eliminado_sin_borrarlo(): void
    {
        $this->patch('/usuarios/4/estado', ['estado' => 'eliminado', 'motivo' => 'Baja solicitada.'])->assertRedirect();

        $this->assertSame('eliminado', $this->usuario(4)['usuario']['estado']);
        $this->assertSame(60, count(Almacen::leer()['usuarios']));
        $html = $this->get('/usuarios/4')->getContent();
        $this->assertStringContainsString('Baja solicitada.', $html);
        $this->assertStringContainsString('data-modal="estado-4-reactivar"', $html);
        $this->assertStringNotContainsString('estado-4-baja', $html);
    }

    #[DataProvider('estadosQuePidenMotivo')]
    public function test_suspender_y_dar_de_baja_sin_motivo_vuelven_a_abrir_la_confirmacion_con_el_error(string $estado, string $modal): void
    {
        $this->from('/usuarios')->patch('/usuarios/3/estado', ['estado' => $estado, 'motivo' => '  ', 'modal' => $modal])
            ->assertRedirect('/usuarios')->assertSessionHasErrors(['motivo' => 'Escribe el motivo.'])->assertSessionHas('abrir_modal', $modal);

        $this->assertSame('activo', $this->usuario(3)['usuario']['estado']);
        $html = $this->get('/usuarios?q=mariana')->getContent();
        // La confirmación que se envió llega con `abierto = true`; las demás siguen cerradas.
        $this->assertMatchesRegularExpression('/data-modal="'.$modal.'"/', $html);
        $this->assertMatchesRegularExpression('/x-data="modal\([^"]*'.$modal.'[^"]*, true\)"/', $html);
        $this->assertSame(1, preg_match_all('/x-data="modal\([^"]*, true\)"/', $html));
        $this->assertStringContainsString('Escribe el motivo.', $html);
    }

    public static function estadosQuePidenMotivo(): array
    {
        return ['suspender' => ['suspendido', 'estado-3-suspender'], 'dar de baja' => ['eliminado', 'estado-3-baja']];
    }

    public function test_un_motivo_de_mas_de_255_caracteres_se_rechaza(): void
    {
        $this->from('/usuarios')->patch('/usuarios/3/estado', ['estado' => 'suspendido', 'motivo' => str_repeat('a', 256), 'modal' => 'estado-3-suspender'])
            ->assertSessionHasErrors(['motivo' => 'El motivo debe tener máximo 255 caracteres.']);
        $this->assertSame('activo', $this->usuario(3)['usuario']['estado']);
    }

    public function test_un_administrador_no_puede_suspenderse_ni_darse_de_baja_a_si_mismo(): void
    {
        foreach (['suspendido', 'eliminado'] as $estado) {
            $this->from('/usuarios/1')->patch('/usuarios/1/estado', ['estado' => $estado, 'motivo' => 'Prueba.'])->assertRedirect('/usuarios/1');
            $this->get('/usuarios/1')->assertSee($this->enAvisos('Un administrador no puede suspenderse a sí mismo.'), false);
        }
        $this->assertSame('activo', $this->usuario(1)['usuario']['estado']);
    }

    public function test_un_estado_que_no_existe_no_cambia_nada(): void
    {
        $this->from('/usuarios')->patch('/usuarios/3/estado', ['estado' => 'bloqueado', 'motivo' => 'x'])->assertSessionHasErrors('estado');
        $this->assertSame('activo', $this->usuario(3)['usuario']['estado']);
    }

    public function test_cambiar_el_estado_de_un_usuario_que_no_existe_responde_404(): void
    {
        $this->patch('/usuarios/9999/estado', ['estado' => 'suspendido', 'motivo' => 'x'])->assertStatus(404);
    }

    public function test_los_cambios_de_estado_se_pueden_hacer_desde_el_detalle_y_regresan_al_detalle(): void
    {
        $this->from('/usuarios/4')->patch('/usuarios/4/estado', ['estado' => 'suspendido', 'motivo' => 'Prueba.'])->assertRedirect('/usuarios/4');
    }

    private function select(string $html, string $id): string
    {
        $this->assertSame(1, preg_match('/<select[^>]*id="'.$id.'".*?<\/select>/s', $html, $m));

        return $m[0];
    }

    /** @return list<string> */
    private function valoresDe(string $select): array
    {
        preg_match_all('/<option value="([^"]*)"/', $select, $m);

        return $m[1];
    }
}
