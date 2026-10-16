<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LayoutTest extends TestCase
{
    private const PANTALLAS = [
        '/dashboard' => 'Dashboard',
        '/usuarios' => 'Usuarios',
        '/empresas' => 'Empresas',
        '/vacantes' => 'Vacantes',
        '/habilidades' => 'Categorías y habilidades',
        '/catalogos' => 'Catálogos',
        '/reportes' => 'Reportes',
        '/perfil' => 'Cambiar contraseña',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    public function test_cada_pagina_tiene_un_solo_main_y_un_solo_h1(): void
    {
        foreach (array_keys(self::PANTALLAS) as $ruta) {
            $html = $this->get($ruta)->assertOk()->getContent();

            $this->assertSame(1, substr_count($html, '<main'), "{$ruta}: <main>");
            $this->assertSame(1, substr_count($html, 'id="contenido"'), "{$ruta}: id=contenido");
            $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html), "{$ruta}: <h1>");
            $this->assertSame(1, substr_count($html, '<header'), "{$ruta}: <header>");
            $this->assertStringContainsString('<main id="contenido" class="content-body" tabindex="-1">', $html);
        }
    }

    public function test_cada_pagina_tiene_su_propio_titulo(): void
    {
        $titulos = [];
        foreach (self::PANTALLAS as $ruta => $titulo) {
            $this->get($ruta)->assertSee('<title>'.e($titulo).' · IncluTec</title>', false);
            $titulos[] = $titulo;
        }

        $this->assertCount(count(self::PANTALLAS), array_unique($titulos));
    }

    public function test_saltar_al_contenido_es_el_primer_elemento_enfocable_y_apunta_al_main(): void
    {
        $html = $this->get('/dashboard')->getContent();
        $cuerpo = substr($html, strpos($html, '<body'));

        preg_match('/<(a|button|input|select|textarea)\b/', $cuerpo, $primero, PREG_OFFSET_CAPTURE);
        $this->assertSame('a', $primero[1][0]);
        $this->assertMatchesRegularExpression('/^<a href="#contenido" class="saltar-contenido">Saltar al contenido<\/a>/', substr($cuerpo, $primero[0][1]));
    }

    public function test_el_menu_principal_tiene_los_siete_enlaces_en_orden_y_marca_la_pagina_actual(): void
    {
        $esperado = ['Dashboard', 'Usuarios', 'Empresas', 'Vacantes', 'Categorías y habilidades', 'Catálogos', 'Reportes'];

        foreach (['/dashboard', '/usuarios', '/habilidades'] as $ruta) {
            $html = $this->get($ruta)->getContent();

            $this->assertStringContainsString('<nav class="sidebar-nav" aria-label="Menú principal">', $html);
            preg_match('/<nav class="sidebar-nav".*?<\/nav>/s', $html, $nav);
            preg_match_all('/<a href="[^"]+" class="sidebar-link"[^>]*>(.*?)<\/a>/s', $nav[0], $enlaces);
            $textos = array_map(fn ($t) => trim(preg_replace('/\s+/', ' ', strip_tags($t))), $enlaces[1]);
            $this->assertSame($esperado, $textos, $ruta);

            // Solo la página actual lleva aria-current.
            $this->assertSame(1, substr_count($nav[0], 'aria-current="page"'), $ruta);
            $this->assertMatchesRegularExpression('/<a href="[^"]*'.preg_quote($ruta, '/').'" class="sidebar-link"\s+aria-current="page"/', $nav[0]);
        }
    }

    public function test_el_boton_del_menu_plegable_apunta_a_un_id_que_existe(): void
    {
        $html = $this->get('/dashboard')->getContent();

        $this->assertMatchesRegularExpression('/class="mobile-menu-btn"[^>]*aria-expanded="false"[^>]*aria-controls="menu-lateral"/s', $html);
        $this->assertStringContainsString('id="menu-lateral"', $html);
        $this->assertSame(1, substr_count($html, 'id="menu-lateral"'));
    }

    public function test_el_menu_de_usuario_es_un_boton_con_cambiar_contrasena_y_cerrar_sesion(): void
    {
        $html = $this->get('/dashboard')->getContent();

        $this->assertMatchesRegularExpression('/<button type="button" class="menu-usuario-boton"[^>]*aria-expanded="false"[^>]*aria-controls="menu-usuario"/s', $html);
        $this->assertStringContainsString('id="menu-usuario"', $html);
        $this->assertStringContainsString('@keydown.escape="if (abierto) { abierto = false; $refs.boton.focus() }"', $html);
        $this->assertStringContainsString('@click.outside="abierto = false"', $html);
        $this->assertStringContainsString('Cambiar contraseña', $html);
        $this->assertStringContainsString('<form method="POST" action="'.route('logout').'">', $html);
        $this->assertStringContainsString('Cerrar sesión', $html);
        // Iniciales en HTML y CSS (Admin IncluTec → AI), sin avatares externos.
        $this->assertStringContainsString('class="avatar-iniciales" aria-hidden="true">AI</span>', $html);
        $this->assertStringNotContainsString('ui-avatars', $html);
    }

    public function test_hay_regiones_de_aviso_de_estado_y_de_alerta(): void
    {
        $html = $this->get('/dashboard')->getContent();

        $this->assertStringContainsString('role="status" aria-live="polite"', $html);
        $this->assertMatchesRegularExpression('/<div class="avisos-zona" role="alert">/', $html);
    }

    public function test_los_mensajes_flash_llegan_a_los_avisos_con_su_tipo(): void
    {
        $html = $this->withSession(['exito' => 'Guardado con éxito.', 'error' => 'No se pudo guardar.'])->get('/dashboard')->getContent();

        $this->assertStringContainsString('\u0022mensaje\u0022:\u0022'.$this->enAvisos('Guardado con éxito.').'\u0022,\u0022tipo\u0022:\u0022exito\u0022', $html);
        $this->assertStringContainsString('\u0022mensaje\u0022:\u0022'.$this->enAvisos('No se pudo guardar.').'\u0022,\u0022tipo\u0022:\u0022error\u0022', $html);
    }

    public function test_sin_mensajes_flash_los_avisos_nacen_vacios(): void
    {
        $this->assertStringContainsString('avisos([])', $this->get('/dashboard')->getContent());
    }

    public function test_el_layout_conserva_el_modo_oscuro_con_aria_pressed(): void
    {
        $this->get('/dashboard')->assertSee('aria-label="Alternar modo oscuro"', false)->assertSee(':aria-pressed="darkMode.toString()"', false);
    }

    public function test_la_pantalla_de_error_del_api_tambien_usa_el_layout(): void
    {
        $this->withSession([ApiHttp::SESION_TOKEN => session(ApiHttp::SESION_TOKEN)]);
        config(['inclutec.mock' => false]);
        Http::fake(['*/auth/me' => Http::response('', 503)]);

        $html = $this->get('/dashboard')->assertStatus(503)->getContent();

        $this->assertSame(1, substr_count($html, '<main'));
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
    }
}
