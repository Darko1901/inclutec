<?php

namespace Tests\Feature;

use Tests\TestCase;

/** Ninguna página debe pedir recursos fuera de localhost (los enlaces al propio panel sí valen): ni fuentes, ni avatares, ni scripts. */
class SinInternetTest extends TestCase
{
    public function test_ninguna_pagina_referencia_recursos_externos(): void
    {
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
        $this->app['env'] = 'local';

        $paginas = ['/dashboard', '/usuarios', '/empresas', '/vacantes', '/habilidades', '/catalogos', '/reportes', '/perfil', '/componentes', '/no-existe'];
        foreach ($paginas as $ruta) {
            $html = $this->get($ruta)->getContent();

            $this->assertDoesNotMatchRegularExpression('#(?:src|href|action)=["\']https?://(?!localhost|127\.0\.0\.1)#i', $html, $ruta);
            $this->assertDoesNotMatchRegularExpression('#url\(\s*["\']?https?://(?!localhost|127\.0\.0\.1)#i', $html, $ruta);
            $this->assertStringNotContainsString('@import', $html, $ruta);
            $this->assertStringNotContainsString('fonts.googleapis', $html, $ruta);
        }

        $this->flushSession();
        $html = $this->get('/login')->getContent();
        $this->assertDoesNotMatchRegularExpression('#(?:src|href)=["\']https?://(?!localhost|127\.0\.0\.1)#i', $html);
    }

    public function test_las_hojas_de_estilo_y_el_javascript_no_piden_nada_a_internet(): void
    {
        foreach (glob(resource_path('css/*.css')) as $archivo) {
            $css = file_get_contents($archivo);
            $this->assertDoesNotMatchRegularExpression('#(?:url\(|@import)\s*["\']?https?://#i', $css, basename($archivo));
        }

        foreach (glob(resource_path('js/*.js')) as $archivo) {
            $this->assertDoesNotMatchRegularExpression('#https?://#', file_get_contents($archivo), basename($archivo));
        }
    }

    public function test_la_fuente_y_los_estilos_salen_del_build_de_vite(): void
    {
        $this->assertFileDoesNotExist(public_path('css/admin.css'));
        $this->assertFileExists(resource_path('css/admin.css'));
        $this->assertStringContainsString("@import './fuentes.css'", file_get_contents(resource_path('css/admin.css')));
        $this->assertStringContainsString('@fontsource/inter', file_get_contents(resource_path('css/fuentes.css')));
    }
}
