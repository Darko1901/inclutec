<?php

namespace Tests\Feature;

use Tests\TestCase;

class ComponentesPaginaTest extends TestCase
{
    private function entrar(): void
    {
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    public function test_fuera_de_local_la_pagina_de_componentes_no_existe(): void
    {
        $this->entrar();

        foreach (['testing', 'production'] as $entorno) {
            $this->app['env'] = $entorno;
            $this->get('/componentes')->assertNotFound();
        }
    }

    public function test_sin_sesion_la_pagina_de_componentes_lleva_al_login(): void
    {
        $this->app['env'] = 'local';

        $this->get('/componentes')->assertRedirect('/login');
    }

    public function test_en_local_muestra_todos_los_componentes(): void
    {
        $this->entrar();
        $this->app['env'] = 'local';

        $html = $this->get('/componentes?page=2')->assertOk()->getContent();

        // Botones, estados (los 32), tabla (con datos y vacía), paginación, filtros, campos, resumen, modal y confirmación.
        $this->assertStringContainsString('Componentes del panel', $html);
        $this->assertSame(35, substr_count($html, 'data-estado='), '32 estados del mapa más 3 insignias de la tabla de ejemplo');
        $this->assertStringContainsString('btn btn-danger', $html);
        $this->assertStringContainsString('btn-texto', $html);
        $this->assertStringContainsString('class="tabla-vacia"', $html);
        $this->assertStringContainsString('<nav class="pagination" aria-label="Paginación">', $html);
        $this->assertMatchesRegularExpression('/<a class="page-btn active"[^>]*aria-current="page"[^>]*>2<\/a>/', $html);
        $this->assertStringContainsString('role="search"', $html);
        $this->assertStringContainsString('class="form-error"', $html);
        $this->assertStringContainsString('resumen-errores', $html);
        $this->assertStringContainsString('role="dialog"', $html);
        $this->assertStringContainsString('data-modal="ejemplo"', $html);
        $this->assertStringContainsString('data-modal="suspender"', $html);
        $this->assertStringContainsString('(obligatorio)', $html);
        $this->assertSame(1, preg_match_all('/<h1[\s>]/', $html));
        $this->assertSame(1, substr_count($html, '<main'));
    }

    public function test_los_filtros_de_la_pagina_de_componentes_filtran_el_ejemplo(): void
    {
        $this->entrar();
        $this->app['env'] = 'local';

        $html = $this->get('/componentes?estado=suspendido')->assertOk()->getContent();

        $this->assertStringContainsString('1 resultado.', $html);
        $this->assertStringContainsString('Sofía Cuenta Suspendida', $html);
        $this->assertStringNotContainsString('Mariana López García', $html);
    }
}
