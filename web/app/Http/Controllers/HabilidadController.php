<?php

namespace App\Http\Controllers;

use App\Servicios\Api\ApiAdmin;
use App\Support\Catalogos;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

/** WEB-06 · Categorías y habilidades (GET /admin/categorias y GET /admin/habilidades). */
class HabilidadController extends Controller
{
    private const TAMANO_PAGINA = 25;

    public function __construct(private readonly ApiAdmin $api) {}

    public function index(Request $request): View
    {
        $seccion = $request->query('seccion');
        $seccion = is_string($seccion) && isset(Catalogos::SECCIONES[$seccion]) ? $seccion : 'categorias';
        $texto = $request->query('q');
        $q = is_string($texto) ? mb_substr(trim($texto), 0, 100) : '';
        $page = max(1, (int) $request->query('page', 1));

        // Las habilidades piden su categoría con la lista completa de categorías (también las inactivas).
        $categorias = $this->api->categorias($seccion === 'categorias' && $q !== '' ? $q : null);
        $todas = $seccion === 'categorias' && $q !== '' ? $this->api->categorias() : $categorias;
        $opcionesCategoria = array_column($todas, 'nombre', 'id');

        $categoriaId = $request->query('categoria_id');
        $categoriaId = is_string($categoriaId) && ctype_digit($categoriaId) && isset($opcionesCategoria[(int) $categoriaId]) ? (int) $categoriaId : null;

        $habilidades = $this->api->habilidades($q ?: null, $categoriaId, $seccion === 'habilidades' ? $page : 1, $seccion === 'habilidades' ? self::TAMANO_PAGINA : 1);

        $pagina = $seccion === 'habilidades' ? $habilidades : ['items' => $categorias, 'total' => count($categorias), 'page' => 1, 'size' => max(1, count($categorias))];

        return view('admin.WEB06_Habilidades', [
            'seccion' => $seccion,
            'filas' => array_map(fn (array $r) => Catalogos::fila($seccion, $r), $pagina['items']),
            'pagina' => $pagina,
            'totales' => ['categorias' => count($categorias), 'habilidades' => $habilidades['total']],
            'opcionesCategoria' => $opcionesCategoria,
            'q' => $q,
        ]);
    }
}
