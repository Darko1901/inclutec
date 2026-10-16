<?php

namespace Tests;

use App\Servicios\Api\Mock\Almacen;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Cada caso parte de los datos iniciales: el mock guarda su estado en un archivo propio.
        config(['inclutec.mock_archivo' => sys_get_temp_dir().'/inclutec-mock-'.bin2hex(random_bytes(6)).'.json']);

        $this->withoutVite();
    }

    /**
     * Los avisos de sesión viajan al navegador dentro de x-data como `JSON.parse('…')` (`@js`), que
     * escapa los acentos como \\uXXXX. Devuelve el texto tal como aparece en el HTML para buscarlo.
     */
    protected function enAvisos(string $texto): string
    {
        $json = trim(json_encode($texto, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT), '"');

        return str_replace('\\', '\\\\', $json);
    }

    protected function tearDown(): void
    {
        Almacen::reiniciar();

        parent::tearDown();
    }
}
