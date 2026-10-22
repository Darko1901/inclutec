<?php

namespace Tests\Feature;

use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use App\Servicios\Api\Mock\Almacen;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class MockConMemoriaTest extends TestCase
{
    private function cambiarContrasenaDelAdministrador(string $nueva): void
    {
        $mock = new ApiMock;
        session([ApiHttp::SESION_TOKEN => $mock->login('admin@inclutec.mx', 'Inclutec2026')['access_token']]);
        $mock->cambiarContrasena('Inclutec2026', $nueva);
    }

    public function test_el_archivo_se_crea_con_los_datos_de_s002_la_primera_vez(): void
    {
        $this->assertFileDoesNotExist(Almacen::ruta());

        $estado = Almacen::leer();

        $this->assertFileExists(Almacen::ruta());
        $this->assertCount(60, $estado['usuarios']);
        $this->assertSame('admin@inclutec.mx', $estado['usuarios'][0]['usuario']['correo']);
        $this->assertSame([], $estado['intentos_login']);
    }

    public function test_un_cambio_se_conserva_entre_peticiones_nuevas(): void
    {
        $this->cambiarContrasenaDelAdministrador('NuevaClave2026');

        // «Otra petición»: instancias nuevas, el estado sale del archivo.
        $this->assertSame(1, (new ApiMock)->login('admin@inclutec.mx', 'NuevaClave2026')['usuario']['id']);
        $this->expectException(ApiError::class);
        (new ApiMock)->login('admin@inclutec.mx', 'Inclutec2026');
    }

    public function test_los_intentos_fallidos_tambien_se_conservan(): void
    {
        for ($i = 0; $i < 5; $i++) {
            try {
                (new ApiMock)->login('rh@tecnoqro.mx', 'ContrasenaMala1');
            } catch (ApiError) {
            }
        }

        $this->assertSame(5, Almacen::leer()['intentos_login'][sha1('rh@tecnoqro.mx')]['fallidos']);
        try {
            (new ApiMock)->login('rh@tecnoqro.mx', 'Inclutec2026');
            $this->fail('Debió responder 429.');
        } catch (ApiError $error) {
            $this->assertSame([429, 'demasiados_intentos'], [$error->status, $error->codigo]);
        }
    }

    public function test_el_comando_vuelve_a_los_datos_iniciales(): void
    {
        $this->cambiarContrasenaDelAdministrador('NuevaClave2026');
        try {
            (new ApiMock)->login('rh@tecnoqro.mx', 'ContrasenaMala1');
        } catch (ApiError) {
        }

        $this->artisan('inclutec:mock-reiniciar')->expectsOutputToContain('reiniciados')->assertSuccessful();

        $this->assertSame(1, (new ApiMock)->login('admin@inclutec.mx', 'Inclutec2026')['usuario']['id']);
        $this->assertSame([], Almacen::leer()['intentos_login']);
    }

    public function test_cada_caso_parte_de_los_datos_iniciales(): void
    {
        // Si el estado de otro caso se filtrara, la contraseña original ya no serviría.
        $this->assertSame(1, (new ApiMock)->login('admin@inclutec.mx', 'Inclutec2026')['usuario']['id']);
        $this->assertStringContainsString(sys_get_temp_dir(), Almacen::ruta());
    }

    public function test_un_archivo_viejo_se_completa_con_las_llaves_nuevas_de_datos_php(): void
    {
        file_put_contents(Almacen::ruta(), json_encode(['usuarios' => Almacen::inicial()['usuarios']]));

        $this->assertSame([], Almacen::leer()['intentos_login']);
    }

    public function test_un_archivo_danado_se_reemplaza_por_los_datos_iniciales(): void
    {
        file_put_contents(Almacen::ruta(), '{no es json');

        $this->assertCount(60, Almacen::leer()['usuarios']);
    }

    public function test_el_archivo_del_mock_esta_fuera_de_git(): void
    {
        $this->assertSame(storage_path('app/mock-api.json'), (function () {
            config(['inclutec.mock_archivo' => storage_path('app/mock-api.json')]);

            return Almacen::ruta();
        })());

        exec('git -C '.escapeshellarg(base_path()).' check-ignore -q storage/app/mock-api.json', $salida, $codigo);
        $this->assertSame(0, $codigo, 'storage/app/mock-api.json debe estar ignorado por git.');
    }

    public function test_el_comando_existe(): void
    {
        $this->assertArrayHasKey('inclutec:mock-reiniciar', Artisan::all());
    }
}
