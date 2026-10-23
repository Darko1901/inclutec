<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\Mock\Almacen;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\PaginasDelPanel;
use Tests\TestCase;

/** Seguridad básica del panel: encabezados, CSRF, sesión y token del API. */
class SeguridadTest extends TestCase
{
    use PaginasDelPanel;

    private function token(): string
    {
        return session(ApiHttp::SESION_TOKEN);
    }

    // --- Encabezados ---

    public function test_todas_las_respuestas_llevan_los_encabezados_de_seguridad(): void
    {
        $this->entrarComoAdministrador();

        $respuestas = [
            $this->get('/login'), $this->get('/dashboard'), $this->get('/empresas/4'), $this->get('/no-existe'), $this->get('/usuarios/9999'),
            $this->get('/dashboard/exportar?formato=pdf'), $this->get('/empresas/4/constancia'), $this->post('/logout'),
        ];
        foreach ($respuestas as $n => $respuesta) {
            $this->assertSame('DENY', $respuesta->headers->get('X-Frame-Options'), "respuesta {$n}");
            $this->assertSame('nosniff', $respuesta->headers->get('X-Content-Type-Options'), "respuesta {$n}");
            $this->assertSame('same-origin', $respuesta->headers->get('Referrer-Policy'), "respuesta {$n}");
        }
    }

    public function test_la_politica_de_contenido_solo_reporta_y_deja_funcionar_a_alpine(): void
    {
        $respuesta = $this->get('/login');

        $this->assertNull($respuesta->headers->get('Content-Security-Policy'), 'No se bloquea nada.');
        $politica = $respuesta->headers->get('Content-Security-Policy-Report-Only');
        $this->assertStringContainsString("default-src 'self'", $politica);
        $this->assertStringContainsString("script-src 'self' 'unsafe-eval'", $politica);
        $this->assertStringContainsString("frame-ancestors 'none'", $politica);
    }

    // --- CSRF ---

    public function test_todos_los_formularios_que_escriben_llevan_token_csrf_y_metodo_post(): void
    {
        $this->entrarComoAdministrador();

        foreach (array_merge(array_keys(self::PAGINAS), ['/catalogos?tipo=ajustes', '/reportes/101', '/empresas/1', '/vacantes/203', '/usuarios/100']) as $ruta) {
            $html = $this->get($ruta)->assertOk()->getContent();

            preg_match_all('/<form\b[^>]*>.*?<\/form>/s', $html, $formularios);
            foreach ($formularios[0] as $formulario) {
                preg_match('/<form\b[^>]*>/', $formulario, $abre);
                // Los formularios de búsqueda y filtros son GET; todos los demás cambian datos y llevan @csrf.
                if (preg_match('/method="GET"/i', $abre[0])) {
                    $this->assertStringNotContainsString('name="_token"', $formulario, $ruta);

                    continue;
                }
                $this->assertMatchesRegularExpression('/method="POST"/i', $abre[0], "{$ruta}: {$abre[0]}");
                $this->assertStringContainsString('name="_token"', $formulario, "{$ruta}: {$abre[0]}");
            }
        }
        $this->assertStringContainsString('name="_token"', $this->flushSession()->get('/login')->getContent());
    }

    public function test_los_formularios_de_login_logout_y_perfil_tienen_csrf(): void
    {
        $this->entrarComoAdministrador();

        // El cierre de sesión es un POST con token (menú de usuario).
        $this->assertMatchesRegularExpression('/<form method="POST" action="[^"]*logout">\s*<input type="hidden" name="_token"/', $this->get('/dashboard')->getContent());
        $this->assertMatchesRegularExpression('/<form method="POST" action="[^"]*perfil"[^>]*>\s*<input type="hidden" name="_token"/', $this->get('/perfil')->getContent());
    }

    public function test_un_formulario_vencido_regresa_al_formulario_con_un_aviso_y_sin_perder_lo_escrito(): void
    {
        $this->entrarComoAdministrador();
        Route::middleware('web')->post('/_prueba-419', fn () => throw new TokenMismatchException('CSRF token mismatch.'));

        $respuesta = $this->from('/usuarios/nuevo')->post('/_prueba-419', ['nombre' => 'Isay', 'correo' => 'isay@inclutec.mx', 'contrasena' => 'Inclutec2026']);

        $respuesta->assertRedirect('/usuarios/nuevo');
        $this->assertSame('Isay', session()->getOldInput('nombre'));
        $this->assertSame('isay@inclutec.mx', session()->getOldInput('correo'));
        $this->assertNull(session()->getOldInput('contrasena'), 'La contraseña nunca se vuelve a mostrar.');
        $this->get('/usuarios/nuevo')->assertSee($this->enAvisos('Tu formulario venció. Revisa los datos y vuelve a enviarlo.'), false)->assertSee('value="Isay"', false);
    }

    public function test_un_formulario_vencido_en_el_login_conserva_el_correo_y_no_muestra_la_pagina_de_laravel(): void
    {
        Route::middleware('web')->post('/_prueba-419-login', fn () => throw new TokenMismatchException('CSRF token mismatch.'));

        $this->from('/login')->post('/_prueba-419-login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026'])->assertRedirect('/login');

        $html = $this->get('/login')->getContent();
        $this->assertStringContainsString('value="admin@inclutec.mx"', $html);
        $this->assertStringContainsString('Tu formulario venció. Revisa los datos y vuelve a enviarlo.', $html);
        $this->assertStringNotContainsString('Page Expired', $html);
        $this->assertStringNotContainsString('Inclutec2026', $html);
    }

    // --- Sesión ---

    public function test_la_sesion_se_regenera_al_iniciar_y_se_invalida_al_cerrar(): void
    {
        $this->get('/login');
        $antes = session()->getId();
        $tokenCsrfAntes = session()->token();

        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026'])->assertRedirect('/dashboard');
        $durante = session()->getId();
        $this->assertNotSame($antes, $durante, 'El identificador de sesión cambia al iniciar sesión.');
        $this->assertNotNull($this->token());

        $this->post('/logout')->assertRedirect('/login');
        $this->assertNotSame($durante, session()->getId(), 'El identificador cambia al cerrar sesión.');
        $this->assertNull(session(ApiHttp::SESION_TOKEN), 'El token del API ya no está en la sesión.');
        $this->assertNotSame($tokenCsrfAntes, session()->token());
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_un_error_del_formulario_de_usuarios_no_deja_la_contrasena_en_la_sesion(): void
    {
        $this->entrarComoAdministrador();

        $this->from('/usuarios/nuevo')->post('/usuarios', ['rol' => 'administrador', 'nombre' => 'Isay', 'apellidos' => 'Guerra', 'correo' => 'rh@tecnoqro.mx', 'contrasena' => 'Inclutec2026'])
            ->assertSessionHasErrors('correo');

        $this->assertSame('Isay', session()->getOldInput('nombre'));
        $this->assertNull(session()->getOldInput('contrasena'));
    }

    public function test_un_inicio_fallido_no_guarda_nada_en_la_sesion(): void
    {
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Equivocada99']);

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_la_cookie_de_sesion_no_se_puede_leer_desde_javascript(): void
    {
        $respuesta = $this->get('/login');

        $cookie = collect($respuesta->headers->getCookies())->first(fn ($c) => str_contains($c->getName(), 'session'));
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
    }

    // --- El token del API nunca sale del servidor ---

    public function test_el_token_del_api_nunca_aparece_en_el_html_ni_en_los_encabezados_ni_en_las_cookies(): void
    {
        $this->entrarComoAdministrador();
        $token = $this->token();
        $this->assertNotEmpty($token);
        $partes = explode('.', $token);

        foreach (array_merge(array_keys(self::PAGINAS), ['/componentes', '/empresas/4/constancia']) as $ruta) {
            $respuesta = $this->get($ruta);
            $html = $respuesta->getContent();

            $this->assertStringNotContainsString($token, $html, $ruta);
            $this->assertStringNotContainsString($partes[1], $html, "{$ruta}: la carga del token");
            $this->assertStringNotContainsString('access_token', $html, $ruta);
            $this->assertStringNotContainsString('Bearer', $html, $ruta);
            foreach ($respuesta->headers->all() as $nombre => $valores) {
                foreach ($valores as $valor) {
                    $this->assertStringNotContainsString($token, (string) $valor, "{$ruta}: encabezado {$nombre}");
                }
            }
            foreach ($respuesta->headers->getCookies() as $cookie) {
                $this->assertStringNotContainsString($partes[1], urldecode((string) $cookie->getValue()), "{$ruta}: cookie {$cookie->getName()}");
            }
        }
    }

    public function test_el_javascript_y_los_estilos_compilados_no_mencionan_el_token_ni_la_api(): void
    {
        foreach (glob(resource_path('js/*.js')) as $archivo) {
            $js = file_get_contents($archivo);
            $this->assertStringNotContainsString('access_token', $js, basename($archivo));
            $this->assertStringNotContainsString('Authorization', $js, basename($archivo));
            $this->assertStringNotContainsString('localStorage.setItem(\'token', $js, basename($archivo));
        }
    }

    public function test_el_navegador_solo_guarda_el_modo_oscuro_en_localstorage(): void
    {
        $this->entrarComoAdministrador();

        $html = $this->get('/dashboard')->getContent();

        $this->assertStringContainsString("localStorage.getItem('darkMode')", $html);
        $this->assertDoesNotMatchRegularExpression('/localStorage\.(?:get|set)Item\(\s*[\'"](?!darkMode)/', $html);
        $this->assertStringNotContainsString('sessionStorage', $html);
    }

    public function test_las_pruebas_dejan_el_mock_como_estaba(): void
    {
        $this->entrarComoAdministrador();

        $this->assertCount(60, Almacen::leer()['usuarios']);
    }
}
