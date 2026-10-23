<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Encabezados de seguridad de todas las respuestas del panel (también las de error).
 *
 * La política de contenido va en modo «solo reporte»: el navegador avisa en su consola de lo que
 * bloquearía, pero no bloquea nada. Alpine.js evalúa expresiones del HTML (`x-data`, `@click`), por
 * eso la política permite `unsafe-eval` en scripts; una política que bloqueara de verdad rompería el panel.
 */
class EncabezadosSeguridad
{
    private const POLITICA_DE_CONTENIDO = "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    public function handle(Request $request, Closure $next): Response
    {
        $respuesta = $next($request);

        $respuesta->headers->set('X-Frame-Options', 'DENY');
        $respuesta->headers->set('X-Content-Type-Options', 'nosniff');
        $respuesta->headers->set('Referrer-Policy', 'same-origin');
        $respuesta->headers->set('Content-Security-Policy-Report-Only', self::POLITICA_DE_CONTENIDO);

        return $respuesta;
    }
}
