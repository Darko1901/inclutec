<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Support\Catalogos;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

/** WEB-07 · Catálogos (GET /admin/catalogos/{tipo}). */
class CatalogoController extends Controller
{
    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $tipo = $request->query('tipo');
        $tipo = is_string($tipo) && isset(Catalogos::TIPOS[$tipo]) ? $tipo : 'ajustes';

        $registros = $this->api->catalogoAdmin($tipo);

        return view('admin.WEB07_Catalogos', [
            'tipo' => $tipo,
            'filas' => array_map(fn (array $r) => Catalogos::fila($tipo, $r), $registros),
            // Los ajustes se muestran agrupados por su categoría.
            'grupos' => $tipo === 'ajustes'
                ? array_map(fn (array $grupo) => array_map(fn (array $r) => Catalogos::fila('ajustes', $r), $grupo), Catalogos::agruparAjustes($registros))
                : null,
        ]);
    }
}
