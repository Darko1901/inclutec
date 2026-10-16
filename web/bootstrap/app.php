<?php

use App\Http\Middleware\ExigirAdministrador;
use App\Servicios\Api\ApiError;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['admin' => ExigirAdministrador::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['contrasena', 'contrasena_actual', 'contrasena_nueva', 'contrasena_nueva_confirmation']);

        // Errores del API fuera del inicio de sesión: token vencido y cuenta suspendida cierran la
        // sesión y regresan al inicio de sesión; cualquier otro se muestra en una pantalla de error.
        $exceptions->render(function (ApiError $error, Request $request) {
            $cierraSesion = [
                'no_autenticado' => 'Tu sesión expiró. Inicia sesión de nuevo.',
                'cuenta_suspendida' => 'Tu cuenta está suspendida.',
            ];

            if (isset($cierraSesion[$error->codigo])) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->with('error', $cierraSesion[$error->codigo]);
            }

            $mensaje = $error->codigo === 'error_interno' ? ApiError::MENSAJE_INTERNO.'.' : $error->detail;

            return response()->view('errors.api', ['mensaje' => $mensaje], $error->status >= 500 ? 503 : $error->status);
        });
    })->create();
