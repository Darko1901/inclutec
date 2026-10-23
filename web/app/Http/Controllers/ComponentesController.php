<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiError;
use App\Support\Estados;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Guía viva de los componentes del panel. Solo existe con APP_ENV=local. Sirve de referencia para
 * armar pantallas y para pasar axe. Los datos de ejemplo viven aquí, no en la vista.
 */
class ComponentesController extends Controller
{
    public function index(Request $request): View
    {
        abort_unless(app()->environment('local'), 404);

        $usuarios = collect([
            ['nombre' => 'Laura Hernández Ruiz', 'correo' => 'rh@tecnoqro.mx', 'estado' => 'activo'],
            ['nombre' => 'Mariana López García', 'correo' => 'mariana.lopez@correo.mx', 'estado' => 'activo'],
            ['nombre' => 'Sofía Cuenta Suspendida', 'correo' => 'suspendida@correo.mx', 'estado' => 'suspendido'],
        ])
            ->when($request->query('q'), fn ($filas, $q) => $filas->filter(
                fn ($fila) => str_contains(mb_strtolower($fila['nombre'].$fila['correo']), mb_strtolower($q))
            ))
            ->when($request->query('estado'), fn ($filas, $estado) => $filas->where('estado', $estado))
            ->values();

        return view('desarrollo.componentes', [
            'estados' => Estados::todos(),
            'usuarios' => $usuarios,
            'opcionesEstado' => collect(Estados::todos()['usuario'])->map(fn ($estado) => $estado['texto'])->all(),
            'modalidades' => ['1' => 'Presencial', '2' => 'Remoto', '3' => 'Híbrido'],
            'pagina' => (int) $request->query('page', 1),
        ]);
    }

    /**
     * Las páginas de error del panel con datos de ejemplo, para revisarlas con axe sin apagar el API:
     * `api` (servicio no disponible, con «Reintentar»), `permiso` (403) y `fuera` (404 con sesión).
     */
    public function error(string $tipo): Response
    {
        abort_unless(app()->environment('local'), 404);

        return match ($tipo) {
            'api' => response()->view('errors.api', [
                'mensaje' => ApiError::MENSAJE_INTERNO.'.', 'titulo' => 'El servicio no está disponible', 'reintentar' => route('dashboard'),
            ], 503),
            'permiso' => response()->view('errors.api', [
                'mensaje' => 'El rol del usuario no tiene acceso a este endpoint.', 'titulo' => 'No tienes permiso', 'reintentar' => null,
            ], 403),
            'fuera' => response()->view('errors.404', ['mensaje' => 'La empresa no existe.'], 404),
            default => abort(404),
        };
    }
}
