<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** El mismo flujo, pero con ApiHttp y respuestas del contrato simuladas con Http::fake. */
class InicioSesionConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    private function sesion(string $rol, string $nombre = 'Admin'): array
    {
        return [
            'access_token' => self::TOKEN,
            'token_type' => 'bearer',
            'expira_en' => '2026-10-04T02:00:00Z',
            'usuario' => [
                'id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => $nombre, 'apellidos' => 'IncluTec',
                'telefono' => null, 'rol' => $rol, 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null,
            ],
        ];
    }

    private function error(string $codigo, string $detail, array $campos = []): array
    {
        return array_filter(['detail' => $detail, 'codigo' => $codigo, 'campos' => $campos ?: null]);
    }

    private function entrar(string $contrasena = 'Inclutec2026')
    {
        return $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => $contrasena]);
    }

    public function test_el_login_envia_las_credenciales_al_api_y_guarda_el_token_en_la_sesion(): void
    {
        Http::fake([
            '*/auth/login' => Http::response($this->sesion('administrador')),
            '*/auth/me' => Http::response($this->sesion('administrador')['usuario']),
        ]);

        $this->entrar()->assertRedirect('/dashboard');
        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/auth/login'
            && $p->method() === 'POST'
            && $p->data() === ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']
            && $p->hasHeader('Accept', 'application/json')
            && ! $p->hasHeader('Authorization'));

        // Las peticiones siguientes llevan el Bearer con el token guardado en la sesión.
        $this->get('/vacantes')->assertOk();
        Http::assertSent(fn (Request $p) => str_ends_with($p->url(), '/auth/me')
            && $p->method() === 'GET'
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN)
            && $p->hasHeader('Accept', 'application/json'));
    }

    public function test_un_rol_distinto_de_administrador_no_guarda_la_sesion(): void
    {
        Http::fake(['*/auth/login' => Http::response($this->sesion('candidato', 'Mariana'))]);

        $this->entrar()->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Esta cuenta no tiene acceso al panel. Usa la aplicación móvil.');
    }

    #[DataProvider('erroresDelApi')]
    public function test_errores_del_api_se_muestran_con_su_mensaje(int $status, array|string $cuerpo, array $encabezados, string $mensaje): void
    {
        Http::fake(['*/auth/login' => Http::response($cuerpo, $status, $encabezados)]);

        $this->entrar()->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee($mensaje);
    }

    public static function erroresDelApi(): array
    {
        $interno = 'El servicio no está disponible; intenta más tarde.';

        return [
            '401' => [401, ['detail' => 'Correo o contraseña incorrectos.', 'codigo' => 'credenciales_invalidas'], [], 'Correo o contraseña incorrectos.'],
            '423' => [423, ['detail' => 'La cuenta está suspendida.', 'codigo' => 'cuenta_suspendida'], [], 'Tu cuenta está suspendida.'],
            '429 (840 s)' => [429, ['detail' => 'Cinco intentos fallidos.', 'codigo' => 'demasiados_intentos'], ['Retry-After' => '840'], 'Demasiados intentos. Intenta de nuevo en 14 minutos.'],
            '429 (45 s)' => [429, ['detail' => 'Cinco intentos fallidos.', 'codigo' => 'demasiados_intentos'], ['Retry-After' => '45'], 'Demasiados intentos. Intenta de nuevo en 1 minuto.'],
            '500' => [500, ['detail' => 'Falla no prevista.', 'codigo' => 'error_interno'], [], $interno],
            '502 sin JSON' => [502, '<html>Bad gateway</html>', [], $interno],
            '422 con campos' => [422, ['detail' => 'Revisa los datos marcados.', 'codigo' => 'validacion', 'campos' => ['correo' => 'Debe ser un correo válido.']], [], 'Revisa los datos marcados.'],
        ];
    }

    public function test_si_el_api_no_responde_se_muestra_el_error_interno(): void
    {
        Http::fake(['*/auth/login' => fn () => throw new ConnectionException('timeout')]);

        $this->entrar()->assertRedirect('/login');
        $this->get('/login')->assertSee('El servicio no está disponible; intenta más tarde.');
    }

    public function test_un_401_del_api_en_una_ruta_del_panel_cierra_la_sesion(): void
    {
        Http::fake(['*/auth/me' => Http::response($this->error('no_autenticado', 'Falta el token, es inválido o ya venció.'), 401)]);

        $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN])->get('/dashboard')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu sesión expiró. Inicia sesión de nuevo');
    }

    public function test_un_5xx_del_api_en_una_ruta_del_panel_muestra_la_pantalla_de_error_sin_cerrar_la_sesion(): void
    {
        Http::fake(['*/auth/me' => Http::response('', 503)]);

        $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN])
            ->get('/dashboard')
            ->assertStatus(503)
            ->assertSee('El servicio no está disponible; intenta más tarde.');

        $this->assertSame(self::TOKEN, session(ApiHttp::SESION_TOKEN));
    }

    public function test_cerrar_sesion_avisa_al_api_con_el_token_y_borra_la_sesion(): void
    {
        Http::fake(['*/auth/logout' => Http::response('', 204)]);

        $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN])->post('/logout')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        Http::assertSent(fn (Request $p) => str_ends_with($p->url(), '/auth/logout') && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
    }

    public function test_cerrar_sesion_funciona_aunque_el_token_ya_haya_vencido(): void
    {
        Http::fake(['*/auth/logout' => Http::response($this->error('no_autenticado', 'Vencido.'), 401)]);

        $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN])->post('/logout')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }

    public function test_los_datos_invalidos_no_llegan_al_api(): void
    {
        Http::fake();

        $this->entrar('corta')->assertSessionHasErrors('contrasena');

        Http::assertNothingSent();
    }
}
