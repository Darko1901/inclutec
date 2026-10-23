<?php

namespace Tests\Feature;

use Tests\TestCase;

/** Las páginas de error de ejemplo (solo con APP_ENV=local) que usan las verificaciones de accesibilidad. */
class PaginasDeErrorDeEjemploTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }

    public function test_muestran_cada_pagina_de_error_con_su_codigo(): void
    {
        $this->app['env'] = 'local';

        $this->get('/componentes/error/api')->assertStatus(503)->assertSee('El servicio no está disponible')->assertSee('Reintentar');
        $this->get('/componentes/error/permiso')->assertStatus(403)->assertSee('No tienes permiso')->assertDontSee('Reintentar');
        $this->get('/componentes/error/fuera')->assertStatus(404);
        $this->get('/componentes/error/otra')->assertStatus(404);
    }

    public function test_fuera_del_entorno_local_no_existen(): void
    {
        $this->app['env'] = 'production';

        $this->get('/componentes/error/api')->assertStatus(404);
    }
}
