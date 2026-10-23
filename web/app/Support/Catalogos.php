<?php

namespace App\Support;

/**
 * Definición de los catálogos que administran WEB-06 (categorías y habilidades) y WEB-07 (ocho
 * catálogos): sus textos, sus campos propios (CatalogoEntrada) y cómo se ve cada fila. Un solo
 * conjunto de componentes (`<x-catalogo>`) se arma con esta definición, así las dos pantallas
 * comparten tabla, formulario, activar o desactivar y eliminar.
 *
 * Aquí no hay diagnósticos: el panel solo administra ajustes y condiciones de accesibilidad, nunca
 * tipos de discapacidad ni niveles de soporte (regla «Necesidades de ajuste, nunca diagnósticos»).
 */
class Catalogos
{
    /** WEB-06: sección → nombre de la pestaña. */
    public const SECCIONES = ['categorias' => 'Categorías', 'habilidades' => 'Habilidades'];

    /** WEB-07: tipo → nombre en la lista lateral (el orden del diseño). */
    public const TIPOS = [
        'ajustes' => 'Ajustes y condiciones de accesibilidad',
        'modalidades' => 'Modalidades',
        'jornadas' => 'Jornadas',
        'tipos-contrato' => 'Tipos de contrato',
        'niveles-educativos' => 'Niveles educativos',
        'sectores' => 'Sectores',
        'tamanos-empresa' => 'Tamaños de empresa',
        'motivos-reporte' => 'Motivos de reporte',
    ];

    /** Categorías de un ajuste (CatalogoEntrada.categoria) en el orden de la pantalla. */
    public const CATEGORIAS_AJUSTE = [
        'movilidad' => 'Movilidad',
        'visual' => 'Visual',
        'auditiva' => 'Auditiva',
        'comunicacion' => 'Comunicación',
        'cognitiva_psicosocial' => 'Cognitiva y psicosocial',
        'general' => 'General',
    ];

    public const APLICA_A = ['vacante' => 'Vacantes', 'empresa' => 'Empresas', 'candidato' => 'Candidatos', 'todos' => 'Todos'];

    public static function existe(string $clave): bool
    {
        return isset(self::SECCIONES[$clave]) || isset(self::TIPOS[$clave]);
    }

    /** @return list<string> */
    public static function claves(): array
    {
        return array_merge(array_keys(self::SECCIONES), array_keys(self::TIPOS));
    }

    /**
     * Textos y campos de un catálogo. `campos` lleva, por cada campo del formulario, su nombre (el mismo del
     * API), etiqueta, tipo, si es obligatorio, su máximo y su ayuda; `extras` son los encabezados de las
     * columnas propias de la tabla, entre «Nombre» y «En uso».
     *
     * @return array{clave: string, titulo: string, entidad: string, nuevo: string, editar: string, singular: string, duplicado: string, campos: list<array<string, mixed>>, extras: list<string>}
     */
    public static function definicion(string $clave): array
    {
        $nombre = fn (int $maximo): array => ['nombre' => 'nombre', 'etiqueta' => 'Nombre', 'tipo' => 'text', 'obligatorio' => true, 'maximo' => $maximo];
        $base = fn (string $nuevo, string $editar, string $singular, string $duplicado, array $campos, array $extras = [], string $entidad = 'catalogo'): array => [
            'clave' => $clave, 'titulo' => self::SECCIONES[$clave] ?? self::TIPOS[$clave], 'entidad' => $entidad, 'nuevo' => $nuevo, 'editar' => $editar,
            'singular' => $singular, 'duplicado' => $duplicado, 'campos' => $campos, 'extras' => $extras,
        ];

        return match ($clave) {
            'categorias' => $base('Nueva categoría', 'Editar categoría', 'la categoría', 'Ya existe una categoría con ese nombre. Usa otro.', [
                $nombre(80),
                ['nombre' => 'descripcion', 'etiqueta' => 'Descripción', 'tipo' => 'textarea', 'maximo' => 255, 'ayuda' => 'Opcional. Explica qué tipo de vacantes agrupa.'],
            ], ['Descripción'], 'categoria'),
            'habilidades' => $base('Nueva habilidad', 'Editar habilidad', 'la habilidad', 'Ya existe una habilidad con ese nombre. Usa otro.', [
                $nombre(80),
                ['nombre' => 'categoria_id', 'etiqueta' => 'Categoría', 'tipo' => 'select', 'obligatorio' => true, 'opciones' => 'categorias'],
            ], ['Categoría'], 'categoria'),
            'ajustes' => $base('Nuevo ajuste', 'Editar ajuste', 'el ajuste', 'Ya existe un ajuste con ese nombre. Usa otro.', [
                $nombre(100),
                ['nombre' => 'categoria', 'etiqueta' => 'Categoría', 'tipo' => 'select', 'obligatorio' => true, 'opciones' => self::CATEGORIAS_AJUSTE],
                ['nombre' => 'descripcion', 'etiqueta' => 'Descripción en lenguaje claro', 'tipo' => 'textarea', 'obligatorio' => true, 'maximo' => 255,
                    'ayuda' => 'Cómo lo leerá una persona candidata, por ejemplo «Entrada y áreas de trabajo accesibles en silla de ruedas».'],
            ], ['Descripción']),
            'modalidades' => $base('Nueva modalidad', 'Editar modalidad', 'la modalidad', 'Ya existe una modalidad con ese nombre. Usa otro.', [$nombre(100)]),
            'jornadas' => $base('Nueva jornada', 'Editar jornada', 'la jornada', 'Ya existe una jornada con ese nombre. Usa otro.', [$nombre(100)]),
            'tipos-contrato' => $base('Nuevo tipo de contrato', 'Editar tipo de contrato', 'el tipo de contrato', 'Ya existe un tipo de contrato con ese nombre. Usa otro.', [$nombre(100)]),
            'niveles-educativos' => $base('Nuevo nivel educativo', 'Editar nivel educativo', 'el nivel educativo', 'Ya existe un nivel educativo con ese nombre. Usa otro.', [
                $nombre(100),
                ['nombre' => 'orden', 'etiqueta' => 'Orden', 'tipo' => 'number', 'obligatorio' => true, 'ayuda' => 'Número entero: a mayor número, más alto el nivel (Primaria 1, Posgrado 6).'],
            ], ['Orden']),
            'sectores' => $base('Nuevo sector', 'Editar sector', 'el sector', 'Ya existe un sector con ese nombre. Usa otro.', [$nombre(100)]),
            'tamanos-empresa' => $base('Nuevo tamaño de empresa', 'Editar tamaño de empresa', 'el tamaño de empresa', 'Ya existe un tamaño de empresa con ese nombre. Usa otro.', [
                $nombre(100),
                ['nombre' => 'rango', 'etiqueta' => 'Rango de trabajadores', 'tipo' => 'text', 'obligatorio' => true, 'maximo' => 40, 'ayuda' => 'Por ejemplo «11 a 50 trabajadores».'],
            ], ['Rango']),
            'motivos-reporte' => $base('Nuevo motivo de reporte', 'Editar motivo de reporte', 'el motivo de reporte', 'Ya existe un motivo de reporte con ese nombre. Usa otro.', [
                $nombre(100),
                ['nombre' => 'aplica_a', 'etiqueta' => 'Aplica a', 'tipo' => 'select', 'obligatorio' => true, 'opciones' => self::APLICA_A, 'ayuda' => 'Qué se puede reportar con este motivo.'],
            ], ['Aplica a']),
            default => throw new \InvalidArgumentException("No hay un catálogo «{$clave}»."),
        };
    }

    /**
     * Reglas de validación de Laravel de un catálogo, con los mismos límites del contrato.
     *
     * @return array<string, list<string>>
     */
    public static function reglas(string $clave): array
    {
        $reglas = [];
        foreach (self::definicion($clave)['campos'] as $campo) {
            $r = [$campo['obligatorio'] ?? false ? 'required' : 'nullable'];
            $r[] = match ($campo['tipo']) {
                'number' => 'integer',
                // Las listas fijas se validan aquí; las que viven en el API (categorías) las valida el API.
                'select' => is_array($campo['opciones']) ? 'in:'.implode(',', array_keys($campo['opciones'])) : 'integer',
                default => 'string',
            };
            if (isset($campo['maximo'])) {
                $r[] = 'max:'.$campo['maximo'];
            }
            $reglas[$campo['nombre']] = $r;
        }

        return $reglas;
    }

    /**
     * Mensajes de validación en español de México de los campos de un catálogo.
     *
     * @return array<string, string>
     */
    public static function mensajes(string $clave): array
    {
        $mensajes = [];
        foreach (self::definicion($clave)['campos'] as $campo) {
            $n = $campo['nombre'];
            $etiqueta = mb_strtolower($campo['etiqueta']);
            $mensajes["{$n}.required"] = match ($n) {
                'nombre' => 'Escribe el nombre.',
                'descripcion' => 'Escribe la descripción en lenguaje claro.',
                'orden' => 'Escribe el orden como un número entero.',
                'rango' => 'Escribe el rango de trabajadores.',
                default => "Elige {$etiqueta}.",
            };
            $mensajes["{$n}.in"] = "Elige {$etiqueta} de la lista.";
            $mensajes["{$n}.integer"] = 'Escribe un número entero, sin decimales.';
            $mensajes["{$n}.max"] = "{$campo['etiqueta']} debe tener máximo ".($campo['maximo'] ?? 255).' caracteres.';
        }

        return $mensajes;
    }

    /**
     * Fila lista para la tabla a partir de un registro del API: su nombre, celdas propias, el texto de
     * «En uso», el total que lo usa y los datos para llenar el formulario de edición.
     *
     * @param  array<string, mixed>  $r  CategoriaAdmin, HabilidadAdmin o CatalogoAdmin.
     * @return array{id: int, nombre: string, activo: bool, celdas: list<string>, uso: string, enUso: int, datos: array<string, mixed>}
     */
    public static function fila(string $clave, array $r): array
    {
        $plural = fn (int $n, string $uno, string $varios): string => $n.' '.($n === 1 ? $uno : $varios);
        $nada = fn (?string $texto): string => $texto === null || $texto === '' ? '—' : $texto;

        [$celdas, $uso, $enUso, $datos] = match ($clave) {
            'categorias' => [
                [$nada($r['descripcion'])],
                $plural($r['habilidades'], 'habilidad', 'habilidades').' · '.$plural($r['vacantes'], 'vacante', 'vacantes'),
                $r['habilidades'] + $r['vacantes'],
                ['nombre' => $r['nombre'], 'descripcion' => (string) $r['descripcion']],
            ],
            'habilidades' => [
                [$r['categoria']['nombre']],
                $plural($r['candidatos'], 'candidato', 'candidatos').' · '.$plural($r['vacantes'], 'vacante', 'vacantes'),
                $r['candidatos'] + $r['vacantes'],
                ['nombre' => $r['nombre'], 'categoria_id' => (string) $r['categoria']['id']],
            ],
            'ajustes' => [[$nada($r['descripcion'] ?? null)], self::usoGeneral($r['en_uso']), $r['en_uso'], ['nombre' => $r['nombre'], 'categoria' => $r['categoria'] ?? '', 'descripcion' => (string) ($r['descripcion'] ?? '')]],
            'niveles-educativos' => [[(string) ($r['orden'] ?? '')], self::usoGeneral($r['en_uso']), $r['en_uso'], ['nombre' => $r['nombre'], 'orden' => (string) ($r['orden'] ?? '')]],
            'tamanos-empresa' => [[$nada($r['rango'] ?? null)], self::usoGeneral($r['en_uso']), $r['en_uso'], ['nombre' => $r['nombre'], 'rango' => (string) ($r['rango'] ?? '')]],
            'motivos-reporte' => [[self::APLICA_A[$r['aplica_a'] ?? ''] ?? '—'], self::usoGeneral($r['en_uso']), $r['en_uso'], ['nombre' => $r['nombre'], 'aplica_a' => (string) ($r['aplica_a'] ?? '')]],
            default => [[], self::usoGeneral($r['en_uso']), $r['en_uso'], ['nombre' => $r['nombre']]],
        };

        return ['id' => $r['id'], 'nombre' => $r['nombre'], 'activo' => $r['activo'], 'celdas' => $celdas, 'uso' => $uso, 'enUso' => $enUso, 'datos' => $datos + ['id' => $r['id']]];
    }

    private static function usoGeneral(int $n): string
    {
        return $n === 0 ? 'Sin uso' : $n.' '.($n === 1 ? 'registro' : 'registros');
    }

    /** Los ajustes agrupados por su categoría, en el orden de la pantalla y sin grupos vacíos. @param list<array<string, mixed>> $registros @return array<string, list<array<string, mixed>>> */
    public static function agruparAjustes(array $registros): array
    {
        $grupos = [];
        foreach (array_keys(self::CATEGORIAS_AJUSTE) as $categoria) {
            $enGrupo = array_values(array_filter($registros, fn (array $r) => ($r['categoria'] ?? null) === $categoria));
            if ($enGrupo !== []) {
                $grupos[$categoria] = $enGrupo;
            }
        }

        return $grupos;
    }
}
