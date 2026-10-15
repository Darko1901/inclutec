<?php

namespace App\Http\Middleware;

use App\Servicios\Api\ApiAdmin;
use App\Servicios\Api\ApiHttp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protege las rutas del panel: exige un token en la sesión del servidor y lo valida con
 * GET /auth/me en cada petición. Si el API responde 401 (token vencido) o 423 (cuenta suspendida),
 * el manejador de errores de bootstrap/app.php cierra la sesión y regresa al inicio de sesión.
 */
class ExigirAdministrador
{
    public function __construct(private readonly ApiAdmin $api) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has(ApiHttp::SESION_TOKEN)) {
            return redirect()->route('login');
        }

        $usuario = $this->api->me();

        if (($usuario['rol'] ?? null) !== 'administrador') {
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Esta cuenta no tiene acceso al panel. Usa la aplicación móvil.');
        }

        return $next($request);
    }
}
