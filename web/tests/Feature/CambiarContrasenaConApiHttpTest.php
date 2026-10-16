<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiHttp;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CambiarContrasenaConApiHttpTest extends TestCase
{
    private const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiYWRtaW5pc3RyYWRvciIsImV4cCI6MTc5MTA4MDAwMH0.firma';

    protected function setUp(): void
    {
        parent::setUp();
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1']);
    }

    private function conAdministrador(array $respuestas)
    {
        Http::fake(['*/auth/me' => Http::response(['id' => 1, 'correo' => 'admin@inclutec.mx', 'nombre' => 'Admin', 'apellidos' => 'IncluTec', 'telefono' => null, 'rol' => 'administrador', 'estado' => 'activo', 'empresa' => null, 'consentimiento_sensibles' => null])] + $respuestas);

        return $this->withSession([ApiHttp::SESION_TOKEN => self::TOKEN]);
    }

    private function datos(): array
    {
        return ['contrasena_actual' => 'Inclutec2026', 'contrasena_nueva' => 'NuevaClave2026', 'contrasena_nueva_confirmation' => 'NuevaClave2026'];
    }

    public function test_envia_put_auth_password_con_el_cuerpo_y_el_token_del_contrato(): void
    {
        $this->conAdministrador(['*/auth/password' => Http::response('', 204)])->from('/perfil')->put('/perfil', $this->datos())->assertRedirect('/perfil');

        Http::assertSent(fn (Request $p) => $p->url() === 'http://localhost:8000/api/v1/auth/password'
            && $p->method() === 'PUT'
            && $p->data() === ['contrasena_actual' => 'Inclutec2026', 'contrasena_nueva' => 'NuevaClave2026']
            && $p->hasHeader('Authorization', 'Bearer '.self::TOKEN));
        $this->get('/perfil')->assertSee($this->enAvisos('Tu contraseña se actualizó.'), false);
    }

    public function test_400_contrasena_incorrecta(): void
    {
        $this->conAdministrador(['*/auth/password' => Http::response(['detail' => 'La contraseña actual no coincide.', 'codigo' => 'contrasena_incorrecta'], 400)])
            ->from('/perfil')->put('/perfil', $this->datos())->assertSessionHasErrors('contrasena_actual');

        $this->get('/perfil')->assertSee('La contraseña actual no es correcta.');
    }

    public function test_422_del_api_muestra_los_campos_en_el_resumen_y_en_cada_campo(): void
    {
        $this->conAdministrador(['*/auth/password' => Http::response([
            'detail' => 'Revisa los datos marcados.',
            'codigo' => 'validacion',
            'campos' => ['contrasena_nueva' => 'Esa contraseña es muy común.'],
        ], 422)])->from('/perfil')->put('/perfil', $this->datos())->assertSessionHasErrors('contrasena_nueva');

        $html = $this->get('/perfil')->getContent();
        $this->assertStringContainsString('<a href="#contrasena_nueva">Esa contraseña es muy común.</a>', $html);
        $this->assertStringContainsString('id="error-contrasena_nueva"', $html);
    }

    public function test_un_error_interno_del_api_se_avisa_sin_perder_la_pantalla(): void
    {
        $this->conAdministrador(['*/auth/password' => Http::response('', 500)])->from('/perfil')->put('/perfil', $this->datos())->assertRedirect('/perfil');

        $this->get('/perfil')->assertSee($this->enAvisos('El servicio no está disponible; intenta más tarde.'), false);
    }

    public function test_un_401_del_api_cierra_la_sesion(): void
    {
        $this->conAdministrador(['*/auth/password' => Http::response(['detail' => 'Vencido.', 'codigo' => 'no_autenticado'], 401)])
            ->from('/perfil')->put('/perfil', $this->datos())->assertRedirect('/login');

        $this->assertNull(session(ApiHttp::SESION_TOKEN));
    }
}
