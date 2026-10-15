<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiError;
use App\Servicios\Api\ApiHttp;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SesionController extends Controller
{
    public const MENSAJE_SIN_ACCESO = 'Esta cuenta no tiene acceso al panel. Usa la aplicación móvil.';

    public function __construct(private readonly ApiAdmin $api) {}

    /** La raíz lleva al dashboard si hay sesión o al inicio de sesión si no. */
    public function inicio(Request $request): RedirectResponse
    {
        return redirect()->route($request->session()->has(ApiHttp::SESION_TOKEN) ? 'dashboard' : 'login');
    }

    public function formulario(Request $request): View|RedirectResponse
    {
        if ($request->session()->has(ApiHttp::SESION_TOKEN)) {
            return redirect()->route('dashboard');
        }

        return view('auth.WEB01_Login');
    }

    public function entrar(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'correo' => ['required', 'email:rfc', 'max:254'],
            'contrasena' => ['required', 'string', 'min:8', 'max:64'],
        ], [
            'correo.required' => 'Escribe tu correo electrónico.',
            'correo.email' => 'Escribe un correo válido, por ejemplo nombre@dominio.mx.',
            'correo.max' => 'El correo debe tener máximo 254 caracteres.',
            'contrasena.required' => 'Escribe tu contraseña.',
            'contrasena.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'contrasena.max' => 'La contraseña debe tener máximo 64 caracteres.',
        ]);

        try {
            $sesion = $this->api->login($datos['correo'], $datos['contrasena']);
        } catch (ApiError $error) {
            return $this->rechazar($request, $error);
        }

        // Solo entra el administrador; con cualquier otro rol no se guarda nada en la sesión.
        if (($sesion['usuario']['rol'] ?? null) !== 'administrador') {
            return $this->volver($request, self::MENSAJE_SIN_ACCESO);
        }

        $request->session()->regenerate();
        $request->session()->put(ApiHttp::SESION_TOKEN, $sesion['access_token']);

        return redirect()->route('dashboard');
    }

    public function salir(Request $request): RedirectResponse
    {
        if ($request->session()->has(ApiHttp::SESION_TOKEN)) {
            try {
                $this->api->logout();
            } catch (ApiError) {
                // Con el token vencido o el API caído la sesión local se cierra igual.
            }
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /** Traduce el error del API al mensaje del resumen de errores del formulario. */
    private function rechazar(Request $request, ApiError $error): RedirectResponse
    {
        if ($error->codigo === 'validacion' && $error->campos !== []) {
            return $this->volver($request, 'Revisa los datos marcados.')->withErrors($error->campos);
        }

        $mensaje = match ($error->codigo) {
            'credenciales_invalidas' => 'Correo o contraseña incorrectos.',
            'cuenta_suspendida' => 'Tu cuenta está suspendida.',
            'demasiados_intentos' => $this->mensajeDemasiadosIntentos($error->reintentarEn),
            'error_interno' => ApiError::MENSAJE_INTERNO.'.',
            default => $error->detail,
        };

        $respuesta = $this->volver($request, $mensaje);

        // En un 401 no se sabe cuál de los dos datos falló: se marcan ambos.
        return $error->codigo === 'credenciales_invalidas'
            ? $respuesta->with('campos_invalidos', ['correo', 'contrasena'])
            : $respuesta;
    }

    private function mensajeDemasiadosIntentos(?int $segundos): string
    {
        $minutos = max(1, (int) ceil(($segundos ?? 900) / 60));

        return 'Demasiados intentos. Intenta de nuevo en '.$minutos.($minutos === 1 ? ' minuto.' : ' minutos.');
    }

    private function volver(Request $request, string $mensaje): RedirectResponse
    {
        return redirect()->route('login')
            ->withInput($request->only('correo'))
            ->with('error', $mensaje);
    }
}
