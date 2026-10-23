<?php

namespace Tests\Concerns;

/** Todas las páginas que muestra el panel con los datos de prueba, para las pruebas que las recorren. */
trait PaginasDelPanel
{
    /** @var array<string, string> Ruta → pantalla (código del diseño). */
    protected const PAGINAS = [
        '/dashboard' => 'WEB-02',
        '/dashboard?periodo=90' => 'WEB-02',
        '/usuarios' => 'WEB-03',
        '/usuarios/3' => 'WEB-03',
        '/usuarios/nuevo' => 'WEB-03',
        '/usuarios/3/editar' => 'WEB-03',
        '/empresas' => 'WEB-04',
        '/empresas/4' => 'WEB-04',
        '/empresas/nueva' => 'WEB-04',
        '/empresas/1/editar' => 'WEB-04',
        '/vacantes' => 'WEB-05',
        '/vacantes/1' => 'WEB-05',
        '/habilidades' => 'WEB-06',
        '/habilidades?seccion=habilidades' => 'WEB-06',
        '/catalogos' => 'WEB-07',
        '/catalogos?tipo=niveles-educativos' => 'WEB-07',
        '/reportes' => 'WEB-08',
        '/reportes/1' => 'WEB-08',
        '/perfil' => 'Perfil',
    ];

    protected function entrarComoAdministrador(): void
    {
        $this->from('/login')->post('/login', ['correo' => 'admin@inclutec.mx', 'contrasena' => 'Inclutec2026']);
    }
}
