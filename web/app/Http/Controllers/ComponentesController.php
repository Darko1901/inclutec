<?php

namespace App\Http\Controllers;

use App\Support\Estados;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

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
}
