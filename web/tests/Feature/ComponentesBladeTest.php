<?php

namespace Tests\Feature;

use App\Support\Estados;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;
use Tests\TestCase;

/** Pruebas de render de los componentes de resources/views/components. */
class ComponentesBladeTest extends TestCase
{
    private function renderizar(string $plantilla, array $errores = [], array $datos = []): string
    {
        $bolsa = new ViewErrorBag;
        $bolsa->put('default', new MessageBag($errores));
        view()->share('errors', $bolsa);

        return Blade::render($plantilla, $datos);
    }

    private function conPeticion(string $url): void
    {
        $peticion = Request::create($url);
        $peticion->setLaravelSession($this->app['session.store']);
        $this->app->instance('request', $peticion);
    }

    // --- insignia-estado ---

    public function test_la_insignia_muestra_texto_e_icono_para_cada_estado(): void
    {
        foreach (Estados::todos() as $entidad => $valores) {
            foreach ($valores as $valor => $estado) {
                $html = $this->renderizar('<x-insignia-estado :entidad="$e" :valor="$v" />', [], ['e' => $entidad, 'v' => $valor]);

                $this->assertStringContainsString('>'.e($estado['texto']).'</span>', $html, "{$entidad}.{$valor}");
                $this->assertStringContainsString('<svg', $html, "{$entidad}.{$valor}");
                $this->assertStringContainsString('aria-hidden="true"', $html);
                $this->assertStringContainsString('data-estado="'.$valor.'"', $html);
            }
        }
    }

    public function test_la_insignia_usa_la_clase_de_la_variante(): void
    {
        $this->assertStringContainsString('badge-active', $this->renderizar('<x-insignia-estado entidad="empresa" valor="validada" />'));
        $this->assertStringContainsString('badge-pending', $this->renderizar('<x-insignia-estado entidad="empresa" valor="pendiente" />'));
        $this->assertStringContainsString('badge-banned', $this->renderizar('<x-insignia-estado entidad="empresa" valor="rechazada" />'));
        $this->assertStringContainsString('badge-info', $this->renderizar('<x-insignia-estado entidad="entrevista" valor="agendada" />'));
        $this->assertStringContainsString('badge-neutral', $this->renderizar('<x-insignia-estado entidad="vacante" valor="borrador" />'));
    }

    public function test_un_valor_desconocido_se_muestra_en_gris_sin_romper_la_pantalla(): void
    {
        $html = $this->renderizar('<x-insignia-estado entidad="usuario" valor="otro_valor" />');

        $this->assertStringContainsString('badge-neutral', $html);
        $this->assertStringContainsString('Otro valor', $html);
    }

    // --- encabezado-pagina ---

    public function test_el_encabezado_tiene_un_h1_descripcion_y_acciones(): void
    {
        $html = $this->renderizar('<x-encabezado-pagina titulo="Usuarios" descripcion="Administra las cuentas."><a href="/nuevo">Nuevo</a></x-encabezado-pagina>');

        $this->assertSame(1, substr_count($html, '<h1'));
        $this->assertStringContainsString('>Usuarios</h1>', $html);
        $this->assertStringContainsString('Administra las cuentas.', $html);
        $this->assertStringContainsString('class="encabezado-acciones"', $html);
        $this->assertStringContainsString('<a href="/nuevo">Nuevo</a>', $html);
    }

    public function test_el_encabezado_sin_descripcion_ni_acciones_no_deja_huecos(): void
    {
        $html = $this->renderizar('<x-encabezado-pagina titulo="Usuarios" />');

        $this->assertStringNotContainsString('descripcion', $html);
        $this->assertStringNotContainsString('encabezado-acciones', $html);
    }

    // --- tabla ---

    public function test_la_tabla_tiene_caption_oculto_y_encabezados_de_columna(): void
    {
        $html = $this->renderizar('<x-tabla caption="Usuarios" :columnas="[\'Nombre\', \'Correo\']"><tr><td>Laura</td><td>rh@tecnoqro.mx</td></tr></x-tabla>');

        $this->assertStringContainsString('<caption class="visually-hidden">Usuarios</caption>', $html);
        $this->assertSame(2, substr_count($html, '<th scope="col">'));
        $this->assertStringContainsString('<td>Laura</td>', $html);
        $this->assertStringNotContainsString('tabla-vacia', $html);
        $this->assertStringContainsString('role="region"', $html);
        $this->assertStringContainsString('tabindex="0"', $html);
    }

    public function test_la_tabla_sin_filas_muestra_el_estado_vacio(): void
    {
        $html = $this->renderizar('<x-tabla caption="Usuarios" :columnas="[\'Nombre\', \'Correo\', \'Estado\']" mensajeVacio="No se encontraron usuarios." />');

        $this->assertStringContainsString('class="tabla-vacia"', $html);
        $this->assertStringContainsString('<td colspan="3">No se encontraron usuarios.</td>', $html);
    }

    public function test_el_caption_puede_ser_visible(): void
    {
        $html = $this->renderizar('<x-tabla caption="Usuarios" :columnas="[\'A\']" :caption-visible="true" :vacia="false"><tr><td>x</td></tr></x-tabla>');

        $this->assertStringNotContainsString('visually-hidden', $html);
        $this->assertStringContainsString('tabla-caption', $html);
    }

    // --- paginacion ---

    public function test_la_paginacion_marca_la_pagina_actual_y_tiene_anterior_y_siguiente(): void
    {
        $this->conPeticion('/usuarios?page=3');
        $html = $this->renderizar('<x-paginacion :total="120" :page="3" :size="25" />');

        $this->assertStringContainsString('<nav class="pagination" aria-label="Paginación">', $html);
        $this->assertSame(1, substr_count($html, 'aria-current="page"'));
        $this->assertMatchesRegularExpression('/<a class="page-btn active"[^>]*aria-current="page"[^>]*>3<\/a>/', $html);
        $this->assertStringContainsString('rel="prev"', $html);
        $this->assertStringContainsString('rel="next"', $html);
        $this->assertStringContainsString('Mostrando 51 a 75 de 120', $html);
    }

    public function test_la_paginacion_conserva_los_filtros_de_la_url(): void
    {
        $this->conPeticion('/usuarios?q=ana&estado=activo&page=2');
        $html = $this->renderizar('<x-paginacion :total="120" :page="2" :size="25" />');

        $this->assertStringContainsString('q=ana&amp;estado=activo&amp;page=3', $html);
        $this->assertStringContainsString('q=ana&amp;estado=activo&amp;page=1', $html);
    }

    public function test_en_la_primera_y_la_ultima_pagina_se_deshabilita_el_extremo(): void
    {
        $this->conPeticion('/usuarios');
        $primera = $this->renderizar('<x-paginacion :total="120" :page="1" :size="25" />');
        $this->assertStringNotContainsString('rel="prev"', $primera);
        $this->assertStringContainsString('aria-disabled="true"', $primera);

        $ultima = $this->renderizar('<x-paginacion :total="120" :page="5" :size="25" />');
        $this->assertStringNotContainsString('rel="next"', $ultima);
        $this->assertStringContainsString('Mostrando 101 a 120 de 120', $ultima);
    }

    public function test_con_una_sola_pagina_no_se_muestra(): void
    {
        $this->conPeticion('/usuarios');

        $this->assertSame('', trim($this->renderizar('<x-paginacion :total="10" :page="1" :size="25" />')));
        $this->assertSame('', trim($this->renderizar('<x-paginacion :total="0" :page="1" :size="25" />')));
    }

    public function test_la_paginacion_abrevia_con_puntos_suspensivos(): void
    {
        $this->conPeticion('/usuarios');
        $html = $this->renderizar('<x-paginacion :total="1000" :page="10" :size="25" />');

        $this->assertStringContainsString('page-puntos', $html);
        $this->assertStringContainsString('aria-label="Página 40"', $html);
        $this->assertStringContainsString('aria-label="Página 9"', $html);
    }

    // --- campo ---

    public function test_el_campo_asocia_la_etiqueta_y_marca_los_obligatorios(): void
    {
        $html = $this->renderizar('<x-campo nombre="nombre" etiqueta="Nombre" obligatorio ayuda="Como en tu identificación." />');

        $this->assertStringContainsString('<label class="form-label" for="nombre">', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="nombre"/', $html);
        $this->assertStringContainsString('required', $html);
        $this->assertStringContainsString('aria-required="true"', $html);
        $this->assertStringContainsString('(obligatorio)', $html);
        $this->assertStringContainsString('aria-describedby="ayuda-nombre"', $html);
        $this->assertStringContainsString('id="ayuda-nombre"', $html);
        $this->assertStringContainsString('aria-invalid="false"', $html);
    }

    public function test_el_campo_con_error_marca_aria_invalid_y_lo_describe(): void
    {
        $html = $this->renderizar('<x-campo nombre="correo" etiqueta="Correo" tipo="email" />', ['correo' => ['Escribe un correo válido.']]);

        $this->assertStringContainsString('aria-invalid="true"', $html);
        $this->assertStringContainsString('aria-describedby="error-correo"', $html);
        $this->assertStringContainsString('id="error-correo"', $html);
        $this->assertStringContainsString('Escribe un correo válido.', $html);
    }

    public function test_el_campo_acepta_un_error_por_propiedad_y_junta_los_ids_de_ayuda_contador_y_error(): void
    {
        $html = $this->renderizar('<x-campo nombre="descripcion" etiqueta="Descripción" tipo="textarea" ayuda="Breve." maximo="255" error="Muy corta." />');

        $this->assertStringContainsString('aria-describedby="ayuda-descripcion contador-descripcion error-descripcion"', $html);
        $this->assertStringContainsString('<textarea', $html);
        $this->assertStringContainsString('maxlength="255"', $html);
        $this->assertStringContainsString('de 255 caracteres', $html);
        $this->assertStringContainsString('x-data="contador(0)"', $html);
    }

    public function test_el_campo_select_marca_la_opcion_seleccionada(): void
    {
        $html = $this->renderizar('<x-campo nombre="modalidad" etiqueta="Modalidad" tipo="select" :opciones="$o" vacio="Todas" valor="2" />', [], ['o' => ['1' => 'Presencial', '2' => 'Remoto']]);

        $this->assertStringContainsString('<option value="">Todas</option>', $html);
        $this->assertStringContainsString('<option value="2" selected>Remoto</option>', $html);
        $this->assertMatchesRegularExpression('/<option value="1"\s*>Presencial<\/option>/', $html);
    }

    public function test_el_campo_reusa_lo_escrito_pero_nunca_una_contrasena(): void
    {
        $this->conPeticion('/x');
        session()->flashInput(['nombre' => 'Laura', 'clave' => 'Secreta123']);
        $this->conPeticion('/x');

        $texto = $this->renderizar('<x-campo nombre="nombre" etiqueta="Nombre" />');
        $clave = $this->renderizar('<x-campo nombre="clave" etiqueta="Clave" tipo="password" />');

        session()->reflash();
        $this->assertStringContainsString('value="Laura"', $texto);
        $this->assertStringNotContainsString('Secreta123', $clave);
        $this->assertStringNotContainsString('value=', $clave);
    }

    // --- boton ---

    public function test_las_variantes_del_boton(): void
    {
        $this->assertStringContainsString('btn btn-primary', $this->renderizar('<x-boton>Guardar</x-boton>'));
        $this->assertStringContainsString('btn btn-outline', $this->renderizar('<x-boton variante="secundario">Cancelar</x-boton>'));
        $this->assertStringContainsString('btn btn-danger', $this->renderizar('<x-boton variante="peligro">Suspender</x-boton>'));
        $this->assertStringContainsString('btn-texto', $this->renderizar('<x-boton variante="texto">Ver más</x-boton>'));
        $this->assertStringContainsString('type="submit"', $this->renderizar('<x-boton tipo="submit">Enviar</x-boton>'));
        $this->assertStringContainsString('type="button"', $this->renderizar('<x-boton>Enviar</x-boton>'));
    }

    public function test_el_boton_deshabilitado_y_el_boton_enlace(): void
    {
        $this->assertMatchesRegularExpression('/<button[^>]*disabled/', $this->renderizar('<x-boton :deshabilitado="true">Guardar</x-boton>'));
        $this->assertStringContainsString('<a href="/usuarios"', $this->renderizar('<x-boton href="/usuarios">Ir</x-boton>'));
        $this->assertStringNotContainsString('<a ', $this->renderizar('<x-boton href="/usuarios" :deshabilitado="true">Ir</x-boton>'));
    }

    public function test_el_boton_mide_al_menos_44_px(): void
    {
        $css = file_get_contents(resource_path('css/admin.css'));

        $this->assertMatchesRegularExpression('/\.btn, \.form-control \{[^}]*min-height: 44px/s', $css);
        $this->assertMatchesRegularExpression('/\.btn-texto \{[^}]*min-height: 44px/s', $css);
    }

    public function test_una_variante_desconocida_del_boton_falla(): void
    {
        $this->expectException(\Throwable::class);
        $this->renderizar('<x-boton variante="fucsia">x</x-boton>');
    }

    // --- modal y confirmacion ---

    public function test_el_modal_es_un_dialogo_accesible(): void
    {
        $html = $this->renderizar('<x-modal id="demo" titulo="Ventana de ejemplo"><p>Contenido</p><x-slot:pie><button>Aceptar</button></x-slot:pie></x-modal>');

        $this->assertStringContainsString('role="dialog"', $html);
        $this->assertStringContainsString('aria-modal="true"', $html);
        $this->assertStringContainsString('aria-labelledby="demo-titulo"', $html);
        $this->assertStringContainsString('id="demo-titulo"', $html);
        $this->assertStringContainsString('Ventana de ejemplo', $html);
        $this->assertStringContainsString('x-trap.noscroll.inert="abierto"', $html);
        $this->assertStringContainsString('@keydown.escape.window="cerrar()"', $html);
        $this->assertStringContainsString('aria-label="Cerrar"', $html);
        $this->assertStringContainsString('abrir-modal', $html);
        $this->assertStringContainsString('Aceptar', $html);
    }

    public function test_el_modal_puede_nacer_abierto(): void
    {
        $this->assertStringContainsString("x-data=\"modal('demo', true)\"", $this->renderizar('<x-modal id="demo" titulo="T" :abierto="true">x</x-modal>'));
        $this->assertStringContainsString("x-data=\"modal('demo', false)\"", $this->renderizar('<x-modal id="demo" titulo="T">x</x-modal>'));
    }

    public function test_la_confirmacion_con_motivo_pide_un_campo_obligatorio(): void
    {
        $html = $this->renderizar('<x-confirmacion id="baja" titulo="¿Dar de baja?" mensaje="No se puede deshacer." textoConfirmar="Dar de baja" pedirMotivo etiquetaMotivo="Motivo de la baja" />');

        $this->assertStringContainsString('role="dialog"', $html);
        $this->assertStringContainsString('¿Dar de baja?', $html);
        $this->assertStringContainsString('No se puede deshacer.', $html);
        $this->assertStringContainsString('<textarea id="baja-motivo" name="motivo"', $html);
        $this->assertStringContainsString('required', $html);
        $this->assertStringContainsString('Motivo de la baja', $html);
        $this->assertStringContainsString('(obligatorio)', $html);
        $this->assertStringContainsString('Dar de baja</button>', $html);
        $this->assertStringContainsString('Cancelar', $html);
        $this->assertStringContainsString('pideMotivo', $html);
    }

    public function test_la_confirmacion_sin_motivo_no_pide_campo_y_con_accion_envia_el_formulario(): void
    {
        $html = $this->renderizar('<x-confirmacion id="cerrar" titulo="¿Cerrar?" accion="/vacantes/1" metodo="PATCH" />');

        $this->assertStringNotContainsString('<textarea', $html);
        $this->assertStringContainsString('action="/vacantes/1"', $html);
        $this->assertStringContainsString('name="_method" value="PATCH"', $html);
        $this->assertStringContainsString('name="_token"', $html);
    }

    // --- resumen-errores ---

    public function test_el_resumen_de_errores_es_una_alerta_con_foco_y_enlaces_a_los_campos(): void
    {
        $html = $this->renderizar('<x-resumen-errores />', ['correo' => ['Escribe un correo válido.'], 'telefono' => ['Debe tener 10 dígitos.']]);

        $this->assertStringContainsString('role="alert"', $html);
        $this->assertStringContainsString('tabindex="-1"', $html);
        $this->assertStringContainsString('$el.focus()', $html);
        $this->assertStringContainsString('Revisa los datos marcados.', $html);
        $this->assertStringContainsString('<a href="#correo">Escribe un correo válido.</a>', $html);
        $this->assertStringContainsString('<a href="#telefono">Debe tener 10 dígitos.</a>', $html);
    }

    public function test_el_resumen_acepta_un_mensaje_y_no_se_muestra_sin_errores(): void
    {
        $this->assertStringContainsString('Tu cuenta está suspendida.', $this->renderizar('<x-resumen-errores mensaje="Tu cuenta está suspendida." />'));
        $this->assertSame('', trim($this->renderizar('<x-resumen-errores />')));
    }

    public function test_el_resumen_acepta_una_lista_propia(): void
    {
        $html = $this->renderizar('<x-resumen-errores :errores="$e" titulo="Faltan datos." />', [], ['e' => ['nombre' => 'Escribe el nombre.']]);

        $this->assertStringContainsString('Faltan datos.', $html);
        $this->assertStringContainsString('<a href="#nombre">Escribe el nombre.</a>', $html);
    }

    // --- filtros ---

    public function test_los_filtros_son_un_formulario_get_con_aplicar_y_limpiar(): void
    {
        $this->conPeticion('/usuarios?q=ana&estado=activo');
        $html = $this->renderizar('<x-filtros buscar="Buscar" :selects="$s" :total="3" />', [], ['s' => [['nombre' => 'estado', 'etiqueta' => 'Estado', 'opciones' => ['activo' => 'Activo', 'suspendido' => 'Suspendido'], 'todas' => 'Todos']]]);

        $this->assertStringContainsString('method="GET"', $html);
        $this->assertStringContainsString('role="search"', $html);
        $this->assertStringContainsString('name="q"', $html);
        $this->assertStringContainsString('value="ana"', $html);
        $this->assertStringContainsString('<option value="activo" selected>Activo</option>', $html);
        $this->assertStringContainsString('<option value="">Todos</option>', $html);
        $this->assertStringContainsString('type="submit"', $html);
        $this->assertStringContainsString('>Aplicar</button>', $html);
        $this->assertMatchesRegularExpression('/<a href="[^"?]*"[^>]*>Limpiar<\/a>/', $html);
    }

    public function test_los_filtros_anuncian_el_numero_de_resultados(): void
    {
        $this->assertStringContainsString('3 resultados.', $this->renderizar('<x-filtros buscar="Buscar" :total="3" />'));
        $this->assertStringContainsString('1 resultado.', $this->renderizar('<x-filtros buscar="Buscar" :total="1" />'));
        $this->assertStringContainsString('No se encontraron resultados.', $this->renderizar('<x-filtros buscar="Buscar" :total="0" />'));
        $this->assertStringContainsString('aria-live="polite"', $this->renderizar('<x-filtros buscar="Buscar" :total="3" />'));
        $this->assertStringNotContainsString('aria-live', $this->renderizar('<x-filtros buscar="Buscar" />'));
    }
}
