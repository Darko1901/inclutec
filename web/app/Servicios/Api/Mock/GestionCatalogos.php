<?php

namespace App\Servicios\Api\Mock;

use App\Servicios\Api\ApiError;

/**
 * Reglas de /admin/categorias, /admin/habilidades y /admin/catalogos/{tipo} sobre el estado del mock
 * (WEB-06 y WEB-07). Los registros viven en `catalogos_admin` (con `activo` y los campos propios de
 * cada tipo); después de cada cambio se reconstruye `catalogos`, que es lo que leen vacantes,
 * empresas, reportes y estadísticas. Los errores se lanzan antes de guardar.
 */
class GestionCatalogos
{
    /** Tipos de GET /admin/catalogos/{tipo}. Entidades y municipios no se editan desde el panel. */
    public const TIPOS = ['modalidades', 'jornadas', 'tipos-contrato', 'niveles-educativos', 'sectores', 'tamanos-empresa', 'ajustes', 'motivos-reporte'];

    public const CATEGORIAS_AJUSTE = ['movilidad', 'visual', 'auditiva', 'comunicacion', 'cognitiva_psicosocial', 'general'];

    public const APLICA_A = ['vacante', 'empresa', 'candidato', 'todos'];

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    // --- Categorías (WEB-06) ---

    /**
     * @param  array<string, mixed>  $estado
     * @return list<array<string, mixed>>
     */
    public static function categorias(array $estado, ?string $q): array
    {
        $registros = self::filtrarPorNombre($estado['catalogos_admin']['categorias'], $q);

        return array_map(fn (array $c) => self::categoriaAdmin($estado, $c), $registros);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function crearCategoria(array &$estado, array $datos): array
    {
        $limpios = self::validarCategoria($datos);
        self::exigirNombreLibre($estado, 'categorias', $limpios['nombre'], null, 'Ya existe una categoría con ese nombre.');
        $registro = ['id' => self::siguienteId($estado, 'categorias'), 'nombre' => $limpios['nombre'], 'activo' => true, 'descripcion' => $limpios['descripcion']];
        $estado['catalogos_admin']['categorias'][] = $registro;
        self::reconstruir($estado);

        return self::categoriaAdmin($estado, $registro);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function editarCategoria(array &$estado, int $id, array $datos): array
    {
        $indice = self::indice($estado, 'categorias', $id, 'La categoría no existe.');
        $limpios = self::validarCategoria($datos);
        self::exigirNombreLibre($estado, 'categorias', $limpios['nombre'], $id, 'Ya existe una categoría con ese nombre.');
        $estado['catalogos_admin']['categorias'][$indice] = $limpios + $estado['catalogos_admin']['categorias'][$indice];
        self::reconstruir($estado);

        return self::categoriaAdmin($estado, $estado['catalogos_admin']['categorias'][$indice]);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function activarCategoria(array &$estado, int $id, bool $activo): array
    {
        $indice = self::indice($estado, 'categorias', $id, 'La categoría no existe.');
        $estado['catalogos_admin']['categorias'][$indice]['activo'] = $activo;

        return self::categoriaAdmin($estado, $estado['catalogos_admin']['categorias'][$indice]);
    }

    /** @param  array<string, mixed>  $estado */
    public static function eliminarCategoria(array &$estado, int $id): void
    {
        $indice = self::indice($estado, 'categorias', $id, 'La categoría no existe.');
        $c = self::categoriaAdmin($estado, $estado['catalogos_admin']['categorias'][$indice]);
        if ($c['habilidades'] > 0 || $c['vacantes'] > 0) {
            throw new ApiError(409, 'en_uso', 'La categoría está en uso; solo se puede desactivar.');
        }
        array_splice($estado['catalogos_admin']['categorias'], $indice, 1);
        self::reconstruir($estado);
    }

    // --- Habilidades (WEB-06) ---

    /**
     * @param  array<string, mixed>  $estado
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public static function habilidades(array $estado, ?string $q, ?int $categoriaId, int $page, int $size): array
    {
        $campos = [];
        if ($page < 1) {
            $campos['page'] = 'La página empieza en 1.';
        }
        if ($size < 1 || $size > 100) {
            $campos['size'] = 'El tamaño de página va de 1 a 100.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $registros = array_values(array_filter(self::filtrarPorNombre($estado['catalogos_admin']['habilidades'], $q), fn (array $h) => $categoriaId === null || $h['categoria_id'] === $categoriaId));

        return [
            'items' => array_map(fn (array $h) => self::habilidadAdmin($estado, $h), array_slice($registros, ($page - 1) * $size, $size)),
            'total' => count($registros),
            'page' => $page,
            'size' => $size,
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function crearHabilidad(array &$estado, array $datos): array
    {
        $limpios = self::validarHabilidad($estado, $datos);
        self::exigirNombreLibre($estado, 'habilidades', $limpios['nombre'], null, 'Ya existe una habilidad con ese nombre.');
        $registro = ['id' => self::siguienteId($estado, 'habilidades'), 'nombre' => $limpios['nombre'], 'activo' => true, 'categoria_id' => $limpios['categoria_id']];
        $estado['catalogos_admin']['habilidades'][] = $registro;
        self::reconstruir($estado);

        return self::habilidadAdmin($estado, $registro);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function editarHabilidad(array &$estado, int $id, array $datos): array
    {
        $indice = self::indice($estado, 'habilidades', $id, 'La habilidad no existe.');
        $limpios = self::validarHabilidad($estado, $datos);
        self::exigirNombreLibre($estado, 'habilidades', $limpios['nombre'], $id, 'Ya existe una habilidad con ese nombre.');
        $estado['catalogos_admin']['habilidades'][$indice] = $limpios + $estado['catalogos_admin']['habilidades'][$indice];
        self::reconstruir($estado);

        return self::habilidadAdmin($estado, $estado['catalogos_admin']['habilidades'][$indice]);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function activarHabilidad(array &$estado, int $id, bool $activo): array
    {
        $indice = self::indice($estado, 'habilidades', $id, 'La habilidad no existe.');
        $estado['catalogos_admin']['habilidades'][$indice]['activo'] = $activo;

        return self::habilidadAdmin($estado, $estado['catalogos_admin']['habilidades'][$indice]);
    }

    /** @param  array<string, mixed>  $estado */
    public static function eliminarHabilidad(array &$estado, int $id): void
    {
        $indice = self::indice($estado, 'habilidades', $id, 'La habilidad no existe.');
        $h = self::habilidadAdmin($estado, $estado['catalogos_admin']['habilidades'][$indice]);
        if ($h['candidatos'] > 0 || $h['vacantes'] > 0) {
            throw new ApiError(409, 'en_uso', 'La habilidad está en uso; solo se puede desactivar.');
        }
        array_splice($estado['catalogos_admin']['habilidades'], $indice, 1);
        self::reconstruir($estado);
    }

    // --- Catálogos genéricos (WEB-07) ---

    /**
     * @param  array<string, mixed>  $estado
     * @return list<array<string, mixed>>
     */
    public static function catalogo(array $estado, string $tipo): array
    {
        self::exigirTipo($tipo);

        return array_map(fn (array $r) => self::catalogoAdmin($estado, $tipo, $r), self::ordenados($estado['catalogos_admin'][$tipo], $tipo));
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function crearElemento(array &$estado, string $tipo, array $datos): array
    {
        self::exigirTipo($tipo);
        $limpios = self::validarElemento($tipo, $datos);
        self::exigirNombreLibre($estado, $tipo, $limpios['nombre'], null, 'Ya existe un elemento con ese nombre en el catálogo.');
        $registro = ['id' => self::siguienteId($estado, $tipo), 'activo' => true] + $limpios;
        $estado['catalogos_admin'][$tipo][] = $registro;
        self::reconstruir($estado);

        return self::catalogoAdmin($estado, $tipo, $registro);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function editarElemento(array &$estado, string $tipo, int $id, array $datos): array
    {
        self::exigirTipo($tipo);
        $indice = self::indice($estado, $tipo, $id, 'El elemento no existe.');
        $limpios = self::validarElemento($tipo, $datos);
        self::exigirNombreLibre($estado, $tipo, $limpios['nombre'], $id, 'Ya existe un elemento con ese nombre en el catálogo.');
        $estado['catalogos_admin'][$tipo][$indice] = $limpios + $estado['catalogos_admin'][$tipo][$indice];
        self::reconstruir($estado);

        return self::catalogoAdmin($estado, $tipo, $estado['catalogos_admin'][$tipo][$indice]);
    }

    /**
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function activarElemento(array &$estado, string $tipo, int $id, bool $activo): array
    {
        self::exigirTipo($tipo);
        $indice = self::indice($estado, $tipo, $id, 'El elemento no existe.');
        $estado['catalogos_admin'][$tipo][$indice]['activo'] = $activo;

        return self::catalogoAdmin($estado, $tipo, $estado['catalogos_admin'][$tipo][$indice]);
    }

    /** @param  array<string, mixed>  $estado */
    public static function eliminarElemento(array &$estado, string $tipo, int $id): void
    {
        self::exigirTipo($tipo);
        $indice = self::indice($estado, $tipo, $id, 'El elemento no existe.');
        if (self::usos($estado, $tipo, $id) > 0) {
            throw new ApiError(409, 'en_uso', 'El elemento está en uso; solo se puede desactivar.');
        }
        array_splice($estado['catalogos_admin'][$tipo], $indice, 1);
        self::reconstruir($estado);
    }

    /**
     * GET /catalogos/{tipo} (público): solo los registros activos, ordenados por nombre. Devuelve null si el
     * tipo no está en `catalogos_admin` (entidades y municipios se leen de `catalogos`).
     *
     * @param  array<string, mixed>  $estado
     * @return list<array<string, mixed>>|null
     */
    public static function activos(array $estado, string $tipo): ?array
    {
        if (! isset($estado['catalogos_admin'][$tipo])) {
            return null;
        }
        $items = array_filter($estado['catalogos_admin'][$tipo], fn (array $r) => $r['activo']);
        $items = array_map(fn (array $r) => array_diff_key($r, ['activo' => 1]), self::ordenados($items, $tipo));

        return array_values($items);
    }

    // --- Piezas internas ---

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $c
     * @return array<string, mixed>
     */
    private static function categoriaAdmin(array $estado, array $c): array
    {
        return [
            'id' => $c['id'], 'nombre' => $c['nombre'], 'descripcion' => $c['descripcion'], 'activo' => $c['activo'],
            'habilidades' => count(array_filter($estado['catalogos_admin']['habilidades'], fn (array $h) => $h['categoria_id'] === $c['id'])),
            'vacantes' => count(array_filter($estado['vacantes'], fn (array $v) => $v['categoria_id'] === $c['id'])),
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $h
     * @return array<string, mixed>
     */
    private static function habilidadAdmin(array $estado, array $h): array
    {
        $categoria = collect($estado['catalogos_admin']['categorias'])->firstWhere('id', $h['categoria_id']);

        return [
            'id' => $h['id'], 'nombre' => $h['nombre'], 'categoria' => ['id' => $categoria['id'], 'nombre' => $categoria['nombre']], 'activo' => $h['activo'],
            'candidatos' => count(array_filter($estado['candidatos'], fn (array $c) => in_array($h['id'], $c['habilidades'], true))),
            'vacantes' => count(array_filter($estado['vacantes'], fn (array $v) => in_array($h['id'], $v['habilidades'], true))),
        ];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $r
     * @return array<string, mixed>
     */
    private static function catalogoAdmin(array $estado, string $tipo, array $r): array
    {
        return ['id' => $r['id'], 'nombre' => $r['nombre'], 'activo' => $r['activo'], 'en_uso' => self::usos($estado, $tipo, $r['id'])]
            + array_diff_key($r, ['id' => 1, 'nombre' => 1, 'activo' => 1]);
    }

    /**
     * Cuántos registros usan un elemento (`en_uso` de CatalogoAdmin).
     *
     * @param  array<string, mixed>  $estado
     */
    private static function usos(array $estado, string $tipo, int $id): int
    {
        $vacantes = $estado['vacantes'];
        $campo = fn (string $llave) => count(array_filter($vacantes, fn (array $v) => ($v[$llave] ?? null) === $id));

        return match ($tipo) {
            'modalidades' => $campo('modalidad_id'),
            'jornadas' => $campo('jornada_id'),
            'tipos-contrato' => $campo('tipo_contrato_id'),
            'niveles-educativos' => $campo('nivel_educativo_id'),
            'sectores' => count(array_filter($estado['empresas'], fn (array $e) => $e['sector_id'] === $id)),
            'tamanos-empresa' => count(array_filter($estado['empresas'], fn (array $e) => $e['tamano_empresa_id'] === $id)),
            // Vacantes que declaran el ajuste y candidatos que lo registraron como necesidad.
            'ajustes' => count(array_filter($vacantes, fn (array $v) => in_array($id, array_column($v['ajustes'], 0), true)))
                + count(array_filter($estado['candidatos'], fn (array $c) => in_array($id, $c['necesidades'], true))),
            'motivos-reporte' => count(array_filter($estado['reportes'], fn (array $r) => $r['motivo_reporte_id'] === $id)),
            default => 0,
        };
    }

    /**
     * Rehace `catalogos` (lo que leen vacantes, empresas, reportes y estadísticas) con los registros
     * administrables, incluidos los inactivos: lo ya guardado sigue mostrándose con su nombre.
     *
     * @param  array<string, mixed>  $estado
     */
    private static function reconstruir(array &$estado): void
    {
        $a = $estado['catalogos_admin'];
        $nombres = fn (array $lista): array => array_column($lista, 'nombre', 'id');
        $por = fn (array $lista, callable $f): array => array_combine(array_column($lista, 'id'), array_map($f, $lista));

        $estado['catalogos'] = [
            'modalidades' => $nombres($a['modalidades']),
            'categorias' => $nombres($a['categorias']),
            'habilidades' => $nombres($a['habilidades']),
            'ajustes' => $nombres($a['ajustes']),
            'sectores' => $nombres($a['sectores']),
            'tamanos' => $por($a['tamanos-empresa'], fn (array $t) => [$t['nombre'], $t['rango']]),
            'jornadas' => $nombres($a['jornadas']),
            'tipos_contrato' => $nombres($a['tipos-contrato']),
            'niveles' => $por($a['niveles-educativos'], fn (array $n) => [$n['nombre'], $n['orden']]),
            'ajustes_detalle' => $por($a['ajustes'], fn (array $x) => [$x['categoria'], $x['descripcion']]),
            'motivos_reporte' => $por($a['motivos-reporte'], fn (array $m) => [$m['nombre'], $m['aplica_a']]),
        ] + $estado['catalogos'];
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array{nombre: string, descripcion: ?string}
     */
    private static function validarCategoria(array $datos): array
    {
        $nombre = self::texto($datos, 'nombre');
        $descripcion = self::texto($datos, 'descripcion');
        $campos = [];
        if ($nombre === '' || mb_strlen($nombre) > 80) {
            $campos['nombre'] = $nombre === '' ? 'Escribe el nombre.' : 'Debe tener máximo 80 caracteres.';
        }
        if (mb_strlen($descripcion) > 255) {
            $campos['descripcion'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        return ['nombre' => $nombre, 'descripcion' => $descripcion === '' ? null : $descripcion];
    }

    /**
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array{nombre: string, categoria_id: int}
     */
    private static function validarHabilidad(array $estado, array $datos): array
    {
        $nombre = self::texto($datos, 'nombre');
        $categoria = isset($datos['categoria_id']) && is_numeric($datos['categoria_id']) ? (int) $datos['categoria_id'] : null;
        $campos = [];
        if ($nombre === '' || mb_strlen($nombre) > 80) {
            $campos['nombre'] = $nombre === '' ? 'Escribe el nombre.' : 'Debe tener máximo 80 caracteres.';
        }
        if ($categoria === null || ! collect($estado['catalogos_admin']['categorias'])->contains('id', $categoria)) {
            $campos['categoria_id'] = 'Elige una categoría de la lista.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        return ['nombre' => $nombre, 'categoria_id' => $categoria];
    }

    /**
     * Valida un CatalogoEntrada según el tipo y devuelve solo los campos que ese tipo guarda.
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private static function validarElemento(string $tipo, array $datos): array
    {
        $nombre = self::texto($datos, 'nombre');
        $descripcion = self::texto($datos, 'descripcion');
        $categoria = self::texto($datos, 'categoria');
        $rango = self::texto($datos, 'rango');
        $aplicaA = self::texto($datos, 'aplica_a');
        $orden = isset($datos['orden']) && $datos['orden'] !== '' && is_numeric($datos['orden']) && (string) (int) $datos['orden'] === (string) $datos['orden'] ? (int) $datos['orden'] : null;

        $campos = [];
        if ($nombre === '' || mb_strlen($nombre) > 100) {
            $campos['nombre'] = $nombre === '' ? 'Escribe el nombre.' : 'Debe tener máximo 100 caracteres.';
        }
        if ($tipo === 'ajustes') {
            if ($descripcion === '' || mb_strlen($descripcion) > 255) {
                $campos['descripcion'] = $descripcion === '' ? 'Escribe la descripción en lenguaje claro.' : 'Debe tener máximo 255 caracteres.';
            }
            if (! in_array($categoria, self::CATEGORIAS_AJUSTE, true)) {
                $campos['categoria'] = 'Elige una categoría de la lista.';
            }
        }
        if ($tipo === 'niveles-educativos' && $orden === null) {
            $campos['orden'] = 'Escribe el orden como un número entero.';
        }
        if ($tipo === 'tamanos-empresa' && ($rango === '' || mb_strlen($rango) > 40)) {
            $campos['rango'] = $rango === '' ? 'Escribe el rango de trabajadores.' : 'Debe tener máximo 40 caracteres.';
        }
        if ($tipo === 'motivos-reporte' && ! in_array($aplicaA, self::APLICA_A, true)) {
            $campos['aplica_a'] = 'Elige a qué aplica el motivo.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        return ['nombre' => $nombre] + match ($tipo) {
            'ajustes' => ['descripcion' => $descripcion, 'categoria' => $categoria],
            'niveles-educativos' => ['orden' => $orden],
            'tamanos-empresa' => ['rango' => $rango],
            'motivos-reporte' => ['aplica_a' => $aplicaA],
            default => [],
        };
    }

    /**
     * @param  list<array<string, mixed>>  $registros
     * @return list<array<string, mixed>>
     */
    private static function filtrarPorNombre(array $registros, ?string $q): array
    {
        $busqueda = mb_strtolower(trim((string) $q));
        $filtrados = array_values(array_filter($registros, fn (array $r) => $busqueda === '' || str_contains(mb_strtolower($r['nombre']), $busqueda)));
        usort($filtrados, fn (array $a, array $b) => mb_strtolower($a['nombre']) <=> mb_strtolower($b['nombre']));

        return $filtrados;
    }

    /**
     * Por nombre; los niveles educativos, por su orden.
     *
     * @param  list<array<string, mixed>>  $registros
     * @return list<array<string, mixed>>
     */
    private static function ordenados(array $registros, string $tipo): array
    {
        $registros = array_values($registros);
        usort($registros, fn (array $a, array $b) => $tipo === 'niveles-educativos'
            ? [$a['orden'], $a['id']] <=> [$b['orden'], $b['id']]
            : [mb_strtolower($a['nombre']), $a['id']] <=> [mb_strtolower($b['nombre']), $b['id']]);

        return $registros;
    }

    /** @param  array<string, mixed>  $estado */
    private static function exigirNombreLibre(array $estado, string $clave, string $nombre, ?int $exceptoId, string $mensaje): void
    {
        foreach ($estado['catalogos_admin'][$clave] as $registro) {
            if (mb_strtolower($registro['nombre']) === mb_strtolower($nombre) && $registro['id'] !== $exceptoId) {
                throw new ApiError(409, 'nombre_duplicado', $mensaje);
            }
        }
    }

    private static function exigirTipo(string $tipo): void
    {
        if (! in_array($tipo, self::TIPOS, true)) {
            throw new ApiError(404, 'no_encontrado', 'El tipo de catálogo no existe.');
        }
    }

    /** @param  array<string, mixed>  $estado */
    private static function siguienteId(array $estado, string $clave): int
    {
        return max(array_column($estado['catalogos_admin'][$clave], 'id') ?: [0]) + 1;
    }

    /** @param  array<string, mixed>  $estado */
    private static function indice(array $estado, string $clave, int $id, string $mensaje): int
    {
        foreach ($estado['catalogos_admin'][$clave] as $indice => $registro) {
            if ($registro['id'] === $id) {
                return $indice;
            }
        }

        throw new ApiError(404, 'no_encontrado', $mensaje);
    }

    /** @param  array<string, mixed>  $datos */
    private static function texto(array $datos, string $campo): string
    {
        return is_string($datos[$campo] ?? null) ? trim($datos[$campo]) : '';
    }
}
