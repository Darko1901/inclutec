<?php

namespace Tests\Feature;

use Tests\TestCase;

class CambiarContrasenaTest extends TestCase
{
    private function entrar(string $contrasena = 'Inclutec2026')
    {
        return $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => $contrasena]);
    }

    private function cambiar(array $datos)
    {
        return $this->from('/perfil')->put('/perfil', $datos);
    }

    private function datos(array $cambios = []): array
    {
        return array_merge([
            'contrasena_actual' => 'Inclutec2026',
            'contrasena_nueva' => 'NuevaClave2026',
            'contrasena_nueva_confirmation' => 'NuevaClave2026',
        ], $cambios);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->entrar();
    }

    public function test_la_pantalla_es_cambiar_contrasena_con_tres_campos_con_etiqueta(): void
    {
        $html = $this->get('/perfil')->assertOk()->assertSee('Cambiar contraseña')->getContent();

        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        foreach (['contrasena_actual', 'contrasena_nueva', 'contrasena_nueva_confirmation'] as $campo) {
            $this->assertStringContainsString('<label class="form-label" for="'.$campo.'">', $html);
            $this->assertMatchesRegularExpression('/<input[^>]*type="password"[^>]*id="'.$campo.'"/', $html);
        }
        $this->assertStringContainsString('autocomplete="current-password"', $html);
        $this->assertStringContainsString('autocomplete="new-password"', $html);
        $this->assertStringContainsString('De 8 a 64 caracteres, con al menos una letra y un número.', $html);
        $this->assertStringContainsString('name="_method" value="PUT"', $html);
        $this->assertStringContainsString('name="_token"', $html);
    }

    public function test_cambiar_la_contrasena_muestra_el_aviso_y_la_nueva_sirve_para_entrar(): void
    {
        $this->cambiar($this->datos())->assertRedirect('/perfil');

        $this->get('/perfil')->assertSee($this->enAvisos('Tu contraseña se actualizó.'), false);

        $this->post('/logout');
        $this->entrar('Inclutec2026');
        $this->assertNull(session('api_token'), 'La contraseña anterior ya no debe servir.');
        $this->entrar('NuevaClave2026')->assertRedirect('/dashboard');
    }

    public function test_la_contrasena_actual_incorrecta_se_muestra_en_el_resumen_y_en_el_campo(): void
    {
        $this->cambiar($this->datos(['contrasena_actual' => 'Equivocada99']))->assertRedirect('/perfil')->assertSessionHasErrors('contrasena_actual');

        $html = $this->get('/perfil')->getContent();
        $this->assertStringContainsString('role="alert"', $html);
        $this->assertStringContainsString('<a href="#contrasena_actual">La contraseña actual no es correcta.', $html);
        $this->assertStringContainsString('id="error-contrasena_actual"', $html);
        $this->assertMatchesRegularExpression('/<input[^>]*id="contrasena_actual"[^>]*aria-invalid="true"/', $html);
        $this->assertStringNotContainsString('Equivocada99', $html);
    }

    /** @dataProvider contrasenasNoValidas */
    public function test_la_contrasena_nueva_debe_cumplir_la_politica_del_contrato(string $nueva, string $mensaje): void
    {
        $this->cambiar($this->datos(['contrasena_nueva' => $nueva, 'contrasena_nueva_confirmation' => $nueva]))
            ->assertSessionHasErrors('contrasena_nueva');

        $html = $this->get('/perfil')->getContent();
        $this->assertStringContainsString($mensaje, $html);
        $this->assertStringContainsString('id="error-contrasena_nueva"', $html);
        $this->assertStringNotContainsString($nueva, $html);
    }

    public static function contrasenasNoValidas(): array
    {
        return [
            'muy corta' => ['Ab1', 'al menos 8 caracteres'],
            'muy larga' => [str_repeat('a1', 33), 'máximo 64 caracteres'],
            'sin número' => ['SoloLetrasAqui', 'al menos una letra y un número'],
            'sin letra' => ['1234567890', 'al menos una letra y un número'],
        ];
    }

    public function test_la_confirmacion_debe_coincidir(): void
    {
        $this->cambiar($this->datos(['contrasena_nueva_confirmation' => 'Otra123456']))->assertSessionHasErrors('contrasena_nueva');

        $this->get('/perfil')->assertSee('La confirmación no coincide con la contraseña nueva.');
    }

    public function test_faltan_campos(): void
    {
        $this->cambiar([])->assertSessionHasErrors(['contrasena_actual', 'contrasena_nueva', 'contrasena_nueva_confirmation']);

        $html = $this->get('/perfil')->getContent();
        $this->assertStringContainsString('Escribe tu contraseña actual.', $html);
        $this->assertStringContainsString('Revisa los datos marcados.', $html);
    }

    public function test_los_campos_de_contrasena_nunca_se_vuelven_a_mostrar(): void
    {
        $this->cambiar($this->datos(['contrasena_actual' => 'Equivocada99', 'contrasena_nueva' => 'Ab1']));

        $this->get('/perfil')->assertDontSee('Equivocada99')->assertDontSee('value="Ab1"', false);
    }

    public function test_sin_sesion_la_pantalla_lleva_al_login(): void
    {
        $this->post('/logout');

        $this->get('/perfil')->assertRedirect('/login');
        $this->cambiar($this->datos())->assertRedirect('/login');
    }
}
