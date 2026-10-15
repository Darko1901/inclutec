<?php

namespace Tests\Unit;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use App\Servicios\Api\ApiMock;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ApiServiciosTest extends TestCase
{
    public function test_el_proveedor_elige_la_implementacion_segun_inclutec_mock(): void
    {
        config(['inclutec.mock' => true]);
        $this->assertInstanceOf(ApiMock::class, app(ApiAdmin::class));

        config(['inclutec.mock' => false]);
        $this->assertInstanceOf(ApiHttp::class, app(ApiAdmin::class));
    }

    public function test_el_mock_devuelve_la_sesion_con_la_forma_del_contrato(): void
    {
        $sesion = (new ApiMock)->login('mariana.lopez@correo.mx', 'Inclutec2026');

        $this->assertSame(['access_token', 'token_type', 'expira_en', 'usuario'], array_keys($sesion));
        $this->assertSame('bearer', $sesion['token_type']);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $sesion['expira_en']);
        $this->assertSame(
            ['id', 'correo', 'nombre', 'apellidos', 'telefono', 'rol', 'estado', 'empresa', 'consentimiento_sensibles'],
            array_keys($sesion['usuario']),
        );
        $this->assertSame(3, $sesion['usuario']['id']);
        $this->assertSame('candidato', $sesion['usuario']['rol']);
        $this->assertCount(3, explode('.', $sesion['access_token']));
    }

    public function test_el_mock_tiene_los_siete_usuarios_de_la_semilla_y_la_cuenta_suspendida(): void
    {
        $correos = [
            'admin@inclutec.mx', 'rh@tecnoqro.mx', 'mariana.lopez@correo.mx', 'jorge.ramirez@correo.mx',
            'rh@logibajio.mx', 'talento@concentro.mx', 'contacto@estudiotrazo.mx',
        ];

        foreach ($correos as $correo) {
            $this->assertSame($correo, (new ApiMock)->login($correo, 'Inclutec2026')['usuario']['correo']);
        }

        $laura = (new ApiMock)->login('rh@tecnoqro.mx', 'Inclutec2026')['usuario'];
        $this->assertSame(['id' => 1, 'nombre_comercial' => 'TecnoQro', 'estado' => 'validada'], $laura['empresa']);
    }

    public function test_el_mock_responde_423_para_la_cuenta_suspendida_con_id_100(): void
    {
        try {
            (new ApiMock)->login('suspendida@correo.mx', 'Inclutec2026');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame([423, 'cuenta_suspendida'], [$error->status, $error->codigo]);
        }
    }

    public function test_el_mock_bloquea_con_429_y_retry_after_al_sexto_intento(): void
    {
        $mock = new ApiMock;
        for ($i = 0; $i < 5; $i++) {
            try {
                $mock->login('rh@logibajio.mx', 'ContrasenaMala1');
            } catch (ApiError $error) {
                $this->assertSame([401, 'credenciales_invalidas'], [$error->status, $error->codigo]);
            }
        }

        try {
            $mock->login('rh@logibajio.mx', 'Inclutec2026');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame([429, 'demasiados_intentos'], [$error->status, $error->codigo]);
            $this->assertEqualsWithDelta(900, $error->reintentarEn, 2);
        }

        // Otro correo no se ve afectado.
        $this->assertSame(1, $mock->login('admin@inclutec.mx', 'Inclutec2026')['usuario']['id']);
    }

    public function test_el_mock_valida_el_formato_con_422_y_campos(): void
    {
        try {
            (new ApiMock)->login('no-es-correo', 'corta');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame([422, 'validacion'], [$error->status, $error->codigo]);
            $this->assertSame(['correo', 'contrasena'], array_keys($error->campos));
        }
    }

    public function test_el_mock_exige_token_valido_en_me_y_logout(): void
    {
        $mock = new ApiMock;

        foreach (['me', 'logout'] as $operacion) {
            try {
                $mock->{$operacion}();
                $this->fail('Debió lanzar ApiError.');
            } catch (ApiError $error) {
                $this->assertSame([401, 'no_autenticado'], [$error->status, $error->codigo]);
            }
        }

        $sesion = $mock->login('admin@inclutec.mx', 'Inclutec2026');
        session([ApiHttp::SESION_TOKEN => $sesion['access_token']]);
        $this->assertSame('administrador', $mock->me()['rol']);
        $mock->logout();

        // Token vencido.
        session([ApiHttp::SESION_TOKEN => ApiMock::crearToken(1, 'administrador', time() - 9 * 3600)]);
        $this->expectException(ApiError::class);
        $mock->me();
    }

    public function test_api_http_convierte_las_respuestas_de_error_del_contrato(): void
    {
        config(['inclutec.mock' => false, 'inclutec.api_url' => 'http://localhost:8000/api/v1/']);
        Http::fake([
            '*/auth/login' => Http::response(
                ['detail' => 'Revisa los datos marcados.', 'codigo' => 'validacion', 'campos' => ['telefono' => 'Debe tener 10 dígitos.']],
                422,
            ),
        ]);

        try {
            (new ApiHttp)->login('a@b.mx', 'Inclutec2026');
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame(422, $error->status);
            $this->assertSame('validacion', $error->codigo);
            $this->assertSame('Revisa los datos marcados.', $error->detail);
            $this->assertSame(['telefono' => 'Debe tener 10 dígitos.'], $error->campos);
        }
    }

    public function test_api_http_trata_las_fallas_de_red_y_los_5xx_como_error_interno(): void
    {
        config(['inclutec.mock' => false]);

        Http::fake(['*' => fn () => throw new ConnectionException('sin red')]);
        $this->assertErrorInterno(fn () => (new ApiHttp)->me());

        Http::fake(['*' => Http::response(['detail' => 'x', 'codigo' => 'otro'], 500)]);
        $this->assertErrorInterno(fn () => (new ApiHttp)->me());
    }

    private function assertErrorInterno(callable $llamada): void
    {
        try {
            $llamada();
            $this->fail('Debió lanzar ApiError.');
        } catch (ApiError $error) {
            $this->assertSame('error_interno', $error->codigo);
            $this->assertSame('El servicio no está disponible; intenta más tarde', $error->detail);
        }
    }
}
