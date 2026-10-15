<?php

namespace App\Servicios\Api;

use Illuminate\Support\Facades\Cache;

/**
 * Implementación con datos simulados (Mock/datos.php). Responde con la forma del contrato y con
 * los mismos códigos de error que dará el API. Su estado (intentos fallidos de inicio de sesión)
 * vive en la caché de archivo, así sobrevive entre peticiones.
 */
class ApiMock implements ApiAdmin
{
    private const MAX_INTENTOS_FALLIDOS = 5;

    private const BLOQUEO_SEGUNDOS = 15 * 60;

    private const VIGENCIA_TOKEN_SEGUNDOS = 8 * 60 * 60;

    private const FIRMA_SIMULADA = 'firma-simulada';

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    public function login(string $correo, string $contrasena): array
    {
        $this->simularLatencia();

        $campos = [];
        if (! filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $campos['correo'] = 'Escribe un correo válido.';
        }
        if (mb_strlen($contrasena) < 8 || mb_strlen($contrasena) > 64) {
            $campos['contrasena'] = 'Debe tener de 8 a 64 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $llave = 'mock.login.'.sha1(mb_strtolower(trim($correo)));
        $intentos = Cache::get($llave, ['fallidos' => 0, 'bloqueado_hasta' => null]);

        // Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos,
        // aunque la contraseña sea correcta.
        if ($intentos['bloqueado_hasta'] !== null && $intentos['bloqueado_hasta'] > time()) {
            throw new ApiError(
                429,
                'demasiados_intentos',
                'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
                [],
                $intentos['bloqueado_hasta'] - time(),
            );
        }
        if ($intentos['bloqueado_hasta'] !== null) {
            $intentos = ['fallidos' => 0, 'bloqueado_hasta' => null];
        }

        $cuenta = $this->buscarPorCorreo($correo);
        if ($cuenta === null || $cuenta['contrasena'] !== $contrasena) {
            $intentos['fallidos']++;
            if ($intentos['fallidos'] >= self::MAX_INTENTOS_FALLIDOS) {
                $intentos['bloqueado_hasta'] = time() + self::BLOQUEO_SEGUNDOS;
            }
            Cache::put($llave, $intentos, self::BLOQUEO_SEGUNDOS);

            throw new ApiError(401, 'credenciales_invalidas', 'Correo o contraseña incorrectos.');
        }

        Cache::forget($llave);
        if ($cuenta['usuario']['estado'] !== 'activo') {
            throw new ApiError(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
        }

        return $this->sesionPara($cuenta['usuario']);
    }

    public function me(): array
    {
        $this->simularLatencia();

        return $this->exigirSesion();
    }

    public function logout(): void
    {
        $this->simularLatencia();
        $this->exigirSesion();
    }

    /** Crea un token con la misma carga que el JWT del contrato: sub, rol y exp (no se firma). */
    public static function crearToken(int $usuarioId, string $rol, ?int $ahora = null): string
    {
        $carga = ['sub' => (string) $usuarioId, 'rol' => $rol, 'exp' => ($ahora ?? time()) + self::VIGENCIA_TOKEN_SEGUNDOS];

        return implode('.', [
            self::base64Url(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])),
            self::base64Url(json_encode($carga)),
            self::FIRMA_SIMULADA,
        ]);
    }

    /**
     * Devuelve el usuario del token de la sesión del servidor.
     *
     * @return array<string, mixed>
     *
     * @throws ApiError 401 si falta el token, no es del mock o venció; 423 si la cuenta se suspendió.
     */
    private function exigirSesion(): array
    {
        $carga = $this->leerToken(session(ApiHttp::SESION_TOKEN));
        $cuenta = $carga === null ? null : $this->buscarPorId((int) $carga['sub']);
        if ($cuenta === null) {
            throw new ApiError(401, 'no_autenticado', 'Tu sesión expiró. Inicia sesión de nuevo.');
        }
        if ($cuenta['usuario']['estado'] !== 'activo') {
            throw new ApiError(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
        }

        return $cuenta['usuario'];
    }

    /** @return array{sub: string, rol: string, exp: int}|null */
    private function leerToken(?string $token): ?array
    {
        $partes = $token === null ? [] : explode('.', $token);
        if (count($partes) !== 3 || $partes[2] !== self::FIRMA_SIMULADA) {
            return null;
        }

        $carga = json_decode(base64_decode(strtr($partes[1], '-_', '+/')), true);
        if (! is_array($carga) || ! isset($carga['sub'], $carga['exp']) || $carga['exp'] <= time()) {
            return null;
        }

        return $carga;
    }

    /**
     * @param  array<string, mixed>  $usuario
     * @return array<string, mixed>
     */
    private function sesionPara(array $usuario): array
    {
        $token = self::crearToken($usuario['id'], $usuario['rol']);
        $carga = $this->leerToken($token);

        return [
            'access_token' => $token,
            'token_type' => 'bearer',
            'expira_en' => gmdate('Y-m-d\TH:i:s\Z', $carga['exp']),
            'usuario' => $usuario,
        ];
    }

    /** @return array{contrasena: string, usuario: array<string, mixed>}|null */
    private function buscarPorCorreo(string $correo): ?array
    {
        $correo = mb_strtolower(trim($correo));
        foreach ($this->usuarios() as $cuenta) {
            if ($cuenta['usuario']['correo'] === $correo) {
                return $cuenta;
            }
        }

        return null;
    }

    /** @return array{contrasena: string, usuario: array<string, mixed>}|null */
    private function buscarPorId(int $id): ?array
    {
        foreach ($this->usuarios() as $cuenta) {
            if ($cuenta['usuario']['id'] === $id) {
                return $cuenta;
            }
        }

        return null;
    }

    /** @return list<array{contrasena: string, usuario: array<string, mixed>}> */
    private function usuarios(): array
    {
        return (require __DIR__.'/Mock/datos.php')['usuarios'];
    }

    /** Latencia corta para que el panel se sienta como con un API real (no se aplica en pruebas). */
    private function simularLatencia(): void
    {
        if (! app()->runningUnitTests()) {
            usleep(random_int(80, 200) * 1000);
        }
    }

    private static function base64Url(string $texto): string
    {
        return rtrim(strtr(base64_encode($texto), '+/', '-_'), '=');
    }
}
