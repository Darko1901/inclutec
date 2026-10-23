<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PaginasDelPanel;
use Tests\TestCase;

/**
 * Qué ve el administrador cuando el API falla: apagado, 401, 403, 404 y 5xx en todas las pantallas
 * (con INCLUTEC_API_MOCK=false). Nunca una excepción de Laravel.
 */
class ErroresDelApiTest extends TestCase
{
    use PaginasDelPanel;

    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    /** Pantallas del panel que piden datos al API (el perfil y los formularios de alta no llaman al API para dibujarse). */
    private const PANTALLAS_CON_API = [
        '/dashboard', '/usuarios', '/usuarios/3', '/usuarios/3/editar', '/empresas', '/empresas/4', '/empresas/1/editar', '/empresas/nueva', '/usuarios/nuevo',
        '/vacantes', '/vacantes/1', '/reportes', '/reportes/1', '/habilidades', '/habilidades?seccion=habilidades', '/catalogos', '/catalogos?tipo=sectores',
        '/dashboard/exportar?formato=pdf', '/empresas/4/constancia',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    private function administrador(): array
    {
        return ['id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => 'Admin', 'apellidos' => 'IncluTec', 'telefono' => null, 'rol' => 'administrador', 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null];
    }

    /** Todo lo demás del API responde `$respuesta`; /auth/me responde bien salvo que se indique. */
    private function conApi(mixed $respuesta, bool $meFunciona = true)
    {
        Http::fake([
            '*/auth/me' => $meFunciona ? Http::response($this->administrador()) : $respuesta,
            '*' => $respuesta,
        ]);

        return $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN]);
    }

    private function apagado(): \Closure
    {
        return fn () => throw new ConnectionException('Connection refused');
    }

    public static function pantallasConApi(): array
    {
        return array_combine(self::PANTALLAS_CON_API, array_map(fn ($ruta) => [$ruta], self::PANTALLAS_CON_API));
    }

    // --- API apagado ---

    #[DataProvider('pantallasConApi')]
    public function test_con_el_api_apagado_cada_pantalla_muestra_la_pagina_de_error_con_reintentar(string $ruta): void
    {
        $respuesta = $this->conApi($this->apagado())->get($ruta);

        $respuesta->assertStatus(503);
        $html = $respuesta->getContent();
        $this->assertStringContainsString('El servicio no está disponible; intenta más tarde.', $html);
        $this->assertStringContainsString('<title>El servicio no está disponible · IncluTec Admin</title>', $html);
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringContainsString('role="alert"', $html);
        $this->assertMatchesRegularExpression('/<a href="[^"]*" class="btn btn-primary">Reintentar<\/a>/', $html);
        $this->assertStringContainsString('Volver al inicio', $html);
        // Ni rastros de una excepción de Laravel.
        foreach (['Illuminate\\', 'ConnectionException', 'Stack trace', 'vendor/laravel', 'Whoops', 'cURL error'] as $texto) {
            $this->assertStringNotContainsString($texto, $html, "{$ruta}: {$texto}");
        }
    }

    public function test_reintentar_vuelve_a_pedir_la_misma_pantalla(): void
    {
        $html = $this->conApi($this->apagado())->get('/reportes?estado=resuelto&page=2')->getContent();

        preg_match('/<a href="([^"]*)" class="btn btn-primary">Reintentar<\/a>/', $html, $m);
        $this->assertSame(url('/reportes?estado=resuelto&page=2'), html_entity_decode($m[1]));
    }

    public function test_con_el_api_apagado_desde_el_primer_paso_tambien_se_ve_la_pagina_de_error(): void
    {
        $respuesta = $this->conApi($this->apagado(), meFunciona: false)->get('/dashboard');

        $respuesta->assertStatus(503)->assertSee('Reintentar');
    }

    public function test_si_falla_al_enviar_un_formulario_reintentar_regresa_a_la_pantalla_anterior(): void
    {
        $html = $this->conApi($this->apagado())->from('/usuarios/3')->patch('/usuarios/3/estado', ['estado' => 'suspendido', 'motivo' => 'x'])->getContent();

        preg_match('/<a href="([^"]*)" class="btn btn-primary">Reintentar<\/a>/', $html, $m);
        $this->assertSame(url('/usuarios/3'), html_entity_decode($m[1]));
    }

    public function test_con_el_api_apagado_el_inicio_de_sesion_avisa_en_el_formulario(): void
    {
        Http::fake(['*' => $this->apagado()]);

        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026'])->assertRedirect('/login');

        $this->get('/login')->assertSee('El servicio no está disponible; intenta más tarde.');
    }

    // --- 5xx ---

    #[DataProvider('pantallasConApi')]
    public function test_un_500_del_api_se_trata_como_servicio_no_disponible(string $ruta): void
    {
        $this->conApi(Http::response('<html>Internal Server Error</html>', 500))->get($ruta)->assertStatus(503)->assertSee('Reintentar')->assertDontSee('Internal Server Error');
    }

    // --- 401 ---

    #[DataProvider('pantallasConApi')]
    public function test_un_401_cierra_la_sesion_y_regresa_al_login_con_el_aviso(string $ruta): void
    {
        $respuesta = $this->conApi(Http::response(['detail' => 'Falta el token, es inválido o ya venció.', 'codigo' => 'no_autenticado'], 401))->get($ruta);

        $respuesta->assertRedirect('/login');
        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    // --- 403 ---

    #[DataProvider('pantallasConApi')]
    public function test_un_403_muestra_una_pagina_clara_sin_cerrar_la_sesion(string $ruta): void
    {
        $respuesta = $this->conApi(Http::response(['detail' => 'El rol del usuario no tiene acceso a este endpoint.', 'codigo' => 'sin_permiso'], 403))->get($ruta);

        $respuesta->assertStatus(403)->assertSee('No tienes permiso')->assertSee('El rol del usuario no tiene acceso a este endpoint.');
        $html = $respuesta->getContent();
        $this->assertStringContainsString('<title>No tienes permiso · IncluTec Admin</title>', $html);
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringNotContainsString('Reintentar', $html);
        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    // --- 404 ---

    #[DataProvider('detalles')]
    public function test_un_404_en_un_detalle_muestra_la_pagina_404_del_panel(string $ruta): void
    {
        $respuesta = $this->conApi(Http::response(['detail' => 'El recurso no existe o no es visible para este usuario.', 'codigo' => 'no_encontrado'], 404))->get($ruta);

        $respuesta->assertStatus(404)->assertSee('Página no encontrada')->assertSee('El recurso no existe o no es visible para este usuario.');
        $html = $respuesta->getContent();
        $this->assertStringContainsString('<title>Página no encontrada · IncluTec Admin</title>', $html);
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        // Con sesión conserva el menú del panel.
        $this->assertStringContainsString('<nav class="sidebar-nav" aria-label="Menú principal">', $html);
        $this->assertStringContainsString('Volver al panel', $html);
    }

    public static function detalles(): array
    {
        return [
            'usuario' => ['/usuarios/99'], 'usuario (edición)' => ['/usuarios/99/editar'], 'empresa' => ['/empresas/99'], 'empresa (edición)' => ['/empresas/99/editar'],
            'vacante' => ['/vacantes/99'], 'reporte' => ['/reportes/99'], 'constancia' => ['/empresas/99/constancia'],
        ];
    }

    public function test_una_ruta_que_no_existe_muestra_la_pagina_404_sin_menu_ni_excepcion(): void
    {
        $respuesta = $this->get('/esto-no-existe');

        $respuesta->assertStatus(404)->assertSee('Página no encontrada')->assertSee('Ir al inicio de sesión');
        $html = $respuesta->getContent();
        $this->assertStringContainsString('<title>Página no encontrada · IncluTec Admin</title>', $html);
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertStringNotContainsString('could not be found', $html);
        $this->assertStringNotContainsString('sidebar-nav', $html);
    }

    public function test_un_404_del_api_en_un_envio_de_formulario_tambien_muestra_la_pagina_404(): void
    {
        $this->conApi(Http::response(['detail' => 'El usuario no existe.', 'codigo' => 'no_encontrado'], 404))->patch('/usuarios/99/estado', ['estado' => 'suspendido', 'motivo' => 'x'])
            ->assertStatus(404)->assertSee('Página no encontrada')->assertSee('El usuario no existe.');
    }
}
