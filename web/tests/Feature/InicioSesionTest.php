<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class InicioSesionTest extends TestCase
{
    private const CONTRASENA = 'Inclutec2026';

    private const RUTAS_DEL_PANEL = ['/dashboard', '/usuarios', '/empresas', '/vacantes', '/habilidades', '/catalogos', '/reportes', '/perfil'];

    private function entrar(string $correo, string $contrasena = self::CONTRASENA)
    {
        return $this->from('/login')->post('/login', ['correo' => $correo, 'contrasena' => $contrasena]);
    }

    public function test_el_formulario_de_inicio_de_sesion_carga_sin_credenciales_ni_cdn(): void
    {
        $respuesta = $this->get('/login')->assertOk()->assertSee('Iniciar sesión en el panel de administración');

        $html = $respuesta->getContent();
        $this->assertStringNotContainsString(self::CONTRASENA, $html);
        $this->assertStringNotContainsString('admin@inclutec.mx', $html);
        $this->assertStringNotContainsString('cdn.jsdelivr.net', $html);
        $this->assertStringContainsString('name="_token"', $html);
        $this->assertStringContainsString('<main', $html);
        $this->assertStringContainsString('<h1', $html);
    }

    public function test_la_raiz_lleva_al_login_sin_sesion_y_al_dashboard_con_sesion(): void
    {
        $this->get('/')->assertRedirect('/login');

        $this->entrar('admin@inclutec.mx');
        $this->get('/')->assertRedirect('/dashboard');
    }

    public function test_el_administrador_entra_al_dashboard(): void
    {
        $this->entrar('admin@inclutec.mx')->assertRedirect('/dashboard');

        $this->assertNotNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/dashboard')->assertOk()->assertSee('Dashboard');
        $this->get('/login')->assertRedirect('/dashboard');
    }

    #[DataProvider('cuentasSinAcceso')]
    public function test_candidata_y_reclutadora_ven_el_mensaje_de_acceso_y_no_quedan_con_sesion(string $correo): void
    {
        $this->entrar($correo)->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Esta cuenta no tiene acceso al panel. Usa la aplicación móvil.');
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public static function cuentasSinAcceso(): array
    {
        return [
            'Mariana (candidata)' => ['mariana.lopez@correo.mx'],
            'Laura (reclutadora)' => ['rh@tecnoqro.mx'],
        ];
    }

    public function test_contrasena_incorrecta_muestra_el_resumen_con_foco_y_marca_los_campos(): void
    {
        $this->entrar('admin@inclutec.mx', 'ContrasenaMala1')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')
            ->assertSee('role="alert"', false)
            ->assertSee('tabindex="-1"', false)
            ->assertSee('Correo o contraseña incorrectos.')
            ->assertSee('aria-invalid="true"', false)
            ->assertSee('value="admin@inclutec.mx"', false)
            ->assertDontSee('ContrasenaMala1');
    }

    public function test_cuenta_suspendida_muestra_su_mensaje(): void
    {
        $this->entrar('suspendida@correo.mx')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu cuenta está suspendida.');
    }

    public function test_el_sexto_intento_responde_429_aunque_la_contrasena_sea_correcta(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->entrar('admin@inclutec.mx', 'ContrasenaMala1');
            $this->get('/login')->assertSee('Correo o contraseña incorrectos.');
        }

        $this->entrar('admin@inclutec.mx')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Demasiados intentos. Intenta de nuevo en 15 minutos.');
    }

    public function test_los_datos_con_formato_incorrecto_se_validan_en_el_servidor(): void
    {
        $this->entrar('no-es-un-correo', 'corta')->assertRedirect('/login')->assertSessionHasErrors(['correo', 'contrasena']);

        $this->get('/login')
            ->assertSee('Revisa los datos marcados.')
            ->assertSee('Escribe un correo válido', false)
            ->assertSee('La contraseña debe tener al menos 8 caracteres.')
            ->assertSee('aria-describedby="error-correo"', false);
    }

    public function test_cualquier_ruta_del_panel_sin_sesion_lleva_al_login(): void
    {
        foreach (self::RUTAS_DEL_PANEL as $ruta) {
            $this->get($ruta)->assertRedirect('/login');
        }
    }

    public function test_un_401_del_api_durante_la_navegacion_cierra_la_sesion(): void
    {
        $this->entrar('admin@inclutec.mx');

        // Un token vencido: el API responde 401 no_autenticado.
        $this->withSession([ApiHttp::SESION_TOKEN => ApiMock::crearToken(1, 'administrador', time() - 9 * 3600)]);

        $this->get('/usuarios')->assertRedirect('/login');
        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/login')->assertSee('Tu sesión expiró. Inicia sesión de nuevo');
    }

    public function test_cerrar_sesion_borra_la_sesion(): void
    {
        $this->entrar('admin@inclutec.mx');
        $this->get('/dashboard')->assertOk();

        $this->post('/logout')->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_cerrar_sesion_es_un_formulario_post_y_no_un_enlace(): void
    {
        $this->entrar('admin@inclutec.mx');

        $this->get('/dashboard')
            ->assertSee('method="POST" action="'.route('logout').'"', false)
            ->assertDontSee('href="/"', false);
        $this->get('/logout')->assertStatus(405);
    }

    public function test_el_token_no_aparece_en_el_html_ni_en_las_cookies(): void
    {
        $this->entrar('admin@inclutec.mx');
        $token = session(ApiHttp::SESION_TOKEN);
        $this->assertNotEmpty($token);

        foreach (['/dashboard', '/usuarios', '/login'] as $ruta) {
            $respuesta = $this->get($ruta);
            $this->assertStringNotContainsString($token, $respuesta->getContent());
            $this->assertStringNotContainsString(explode('.', $token)[1], $respuesta->getContent());

            foreach ($respuesta->headers->getCookies() as $cookie) {
                $this->assertStringNotContainsString($token, (string) $cookie->getValue());
            }
        }

        $respuesta = $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => self::CONTRASENA]);
        foreach ($respuesta->headers->getCookies() as $cookie) {
            $this->assertStringNotContainsString($token, (string) $cookie->getValue());
            $this->assertStringNotContainsString('access_token', (string) $cookie->getValue());
        }
    }

    public function test_las_pantallas_no_cargan_alpine_desde_internet(): void
    {
        $this->entrar('admin@inclutec.mx');

        foreach (['/dashboard', '/usuarios', '/habilidades'] as $ruta) {
            $this->get($ruta)->assertDontSee('cdn.jsdelivr.net', false)->assertDontSee('unpkg.com', false);
        }
    }
}
