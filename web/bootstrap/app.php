<?php

use App\Http\Middleware\EncabezadosSeguridad;
use App\Http\Middleware\ExigirAdministrador;
use App\Servicios\Api\ApiError;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['admin' => ExigirAdministrador::class]);
        // Global: también cubre las rutas que no existen (404).
        $middleware->append(EncabezadosSeguridad::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['contrasena', 'contrasena_actual', 'contrasena_nueva', 'contrasena_nueva_confirmation']);

        // 419: el formulario venció (token CSRF; Laravel ya lo convierte en una HttpException 419). Regresa al
        // formulario con un aviso y sin perder lo escrito.
        $exceptions->render(function (HttpException $error, Request $request) {
            if ($error->getStatusCode() !== 419 || $request->expectsJson()) {
                return null;
            }

            // `withInput` no pasa por `dontFlash`: las contraseñas se quitan aquí para que nunca viajen a la sesión.
            return back()->withInput($request->except(['_token', 'contrasena', 'contrasena_actual', 'contrasena_nueva', 'contrasena_nueva_confirmation']))
                ->with('error', 'Tu formulario venció. Revisa los datos y vuelve a enviarlo.');
        });

        // Errores del API fuera del inicio de sesión: token vencido y cuenta suspendida cierran la
        // sesión y regresan al inicio de sesión; el 404 es la página 404 del panel y cualquier otro
        // se muestra en una pantalla de error con su botón para reintentar.
        $exceptions->render(function (ApiError $error, Request $request) {
            $cierraSesion = [
                'no_autenticado' => 'Tu sesión expiró. Vuelve a iniciar sesión.',
                'cuenta_suspendida' => 'Tu cuenta está suspendida.',
            ];

            if (isset($cierraSesion[$error->codigo])) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->with('error', $cierraSesion[$error->codigo]);
            }

            if ($error->status === 404) {
                return response()->view('errors.404', ['mensaje' => $error->detail], 404);
            }

            $mensaje = $error->codigo === 'error_interno' ? ApiError::MENSAJE_INTERNO.'.' : $error->detail;
            $servicio = $error->status >= 500;

            return response()->view('errors.api', [
                'mensaje' => $mensaje,
                'titulo' => match (true) {
                    $error->status === 403 => 'No tienes permiso',
                    $servicio => 'El servicio no está disponible',
                    default => 'No se pudo completar la acción',
                },
                // Reintentar solo tiene sentido si el problema pudo ser pasajero.
                'reintentar' => $servicio ? ($request->isMethod('GET') ? $request->fullUrl() : url()->previous(route('dashboard'))) : null,
            ], $servicio ? 503 : $error->status);
        });
    })->create();
