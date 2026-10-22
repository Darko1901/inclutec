<?php

namespace App\Servicios\Api\Mock;

use App\Servicios\Api\ApiError;

/**
 * Reglas de /admin/empresas sobre el estado del mock (WEB-04): listado con la cola de validación,
 * detalle, alta, edición, validar o rechazar y suspender o reactivar. Las funciones que modifican
 * reciben el estado por referencia y lanzan ApiError con los códigos del contrato antes de guardar,
 * así que un cambio rechazado nunca deja datos a medias.
 */
class GestionEmpresas
{
    public const ESTADOS = ['pendiente', 'validada', 'rechazada', 'suspendida'];

    private const RFC = '/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/u';

    private const MENSAJE_VALIDACION = 'Revisa los datos marcados.';

    /** Estados de postulación que cuentan como «postulados» al suspender la empresa. */
    private const POSTULACIONES_ACTIVAS = ['postulada', 'en_revision', 'entrevista'];

    /**
     * @param  array<string, mixed>  $estado
     * @return array{items: list<array<string, mixed>>, total: int, page: int, size: int}
     */
    public static function listar(array $estado, ?string $q, ?string $estadoEmpresa, ?int $sectorId, int $page, int $size): array
    {
        $campos = [];
        if ($estadoEmpresa !== null && $estadoEmpresa !== '' && ! in_array($estadoEmpresa, self::ESTADOS, true)) {
            $campos['estado'] = 'Elige pendiente, validada, rechazada o suspendida.';
        }
        if ($page < 1) {
            $campos['page'] = 'La página empieza en 1.';
        }
        if ($size < 1 || $size > 100) {
            $campos['size'] = 'El tamaño de página va de 1 a 100.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $busqueda = mb_strtolower(trim((string) $q));
        $empresas = array_values(array_filter($estado['empresas'], fn (array $e) => ($busqueda === '' || str_contains(mb_strtolower($e['razon_social'].' '.$e['nombre_comercial'].' '.$e['rfc']), $busqueda))
            && ($estadoEmpresa === null || $estadoEmpresa === '' || $e['estado'] === $estadoEmpresa)
            && ($sectorId === null || $e['sector_id'] === $sectorId)));

        // Las pendientes primero, de la más antigua a la más reciente; después las demás por nombre.
        usort($empresas, fn (array $a, array $b) => [$a['estado'] === 'pendiente' ? 0 : 1, $a['estado'] === 'pendiente' ? $a['creado_en'] : mb_strtolower($a['nombre_comercial'])]
            <=> [$b['estado'] === 'pendiente' ? 0 : 1, $b['estado'] === 'pendiente' ? $b['creado_en'] : mb_strtolower($b['nombre_comercial'])]);

        return [
            'items' => array_map(fn (array $e) => self::empresaAdmin($estado, $e), array_slice($empresas, ($page - 1) * $size, $size)),
            'total' => count($empresas),
            'page' => $page,
            'size' => $size,
        ];
    }

    /**
     * EmpresaAdminDetalle.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function detalle(array $estado, int $id): array
    {
        $empresa = $estado['empresas'][self::indice($estado, $id)];

        $reclutadores = [];
        foreach ($estado['usuarios'] as $cuenta) {
            if ($cuenta['usuario']['rol'] === 'reclutador' && ($cuenta['usuario']['empresa']['id'] ?? null) === $id) {
                $reclutadores[] = [
                    'usuario_id' => $cuenta['usuario']['id'],
                    'nombre' => $cuenta['usuario']['nombre'],
                    'apellidos' => $cuenta['usuario']['apellidos'],
                    'correo' => $cuenta['usuario']['correo'],
                    'puesto' => $cuenta['ficha']['puesto'] ?? '',
                    'estado' => $cuenta['usuario']['estado'],
                ];
            }
        }
        $vacantes = array_column(array_filter($estado['vacantes'], fn (array $v) => $v['empresa_id'] === $id), 'id');

        return [
            'empresa' => self::empresaPropia($estado, $empresa),
            'reclutadores' => $reclutadores,
            'rfc_duplicado' => array_filter($estado['empresas'], fn (array $e) => $e['id'] !== $id && $e['rfc'] === $empresa['rfc']) !== [],
            'reportes' => count(array_filter($estado['reportes'], fn (array $r) => ($r['empresa_id'] ?? null) === $id || in_array($r['vacante_id'] ?? null, $vacantes, true))),
        ];
    }

    /**
     * Ruta del PDF de la constancia (null si no hay).
     *
     * @param  array<string, mixed>  $estado
     */
    public static function documento(array $estado, int $id): ?string
    {
        return $estado['empresas'][self::indice($estado, $id)]['documento_url'];
    }

    /**
     * Crea la empresa ya validada (el administrador no necesita revisarla).
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function crear(array &$estado, array $datos): array
    {
        $limpios = self::validarEntrada($estado, $datos);
        self::exigirRfcLibre($estado, $limpios['rfc'], null);

        $empresa = $limpios + [
            'id' => max(100, ...array_column($estado['empresas'], 'id')) + 1,
            'logo_url' => null, 'documento_url' => null, 'estado' => 'validada', 'motivo_estado' => null,
            'validada_en' => gmdate('Y-m-d\TH:i:s\Z'), 'creado_en' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
        $estado['empresas'][] = $empresa;

        return self::empresaPropia($estado, $empresa);
    }

    /**
     * El administrador sí puede corregir razón social y RFC de una empresa validada.
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public static function editar(array &$estado, int $id, array $datos): array
    {
        $indice = self::indice($estado, $id);
        $limpios = self::validarEntrada($estado, $datos);
        self::exigirRfcLibre($estado, $limpios['rfc'], $id);

        $estado['empresas'][$indice] = $limpios + $estado['empresas'][$indice];
        self::sincronizarReferencias($estado, $estado['empresas'][$indice]);

        return self::empresaPropia($estado, $estado['empresas'][$indice]);
    }

    /**
     * Validar o rechazar una empresa pendiente.
     *
     * @param  array<string, mixed>  $estado
     * @return array<string, mixed>
     */
    public static function validar(array &$estado, int $id, string $decision, ?string $motivo): array
    {
        $indice = self::indice($estado, $id);

        $campos = [];
        if (! in_array($decision, ['validada', 'rechazada'], true)) {
            $campos['decision'] = 'Elige validar o rechazar.';
        }
        $motivo = $motivo === null ? null : trim($motivo);
        if ($decision === 'rechazada' && ($motivo === null || $motivo === '')) {
            $campos['motivo'] = 'Escribe el motivo del rechazo.';
        } elseif ($motivo !== null && mb_strlen($motivo) > 255) {
            $campos['motivo'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }
        if ($estado['empresas'][$indice]['estado'] !== 'pendiente') {
            throw new ApiError(409, 'estado_invalido', 'La empresa no está pendiente.');
        }

        $empresa = &$estado['empresas'][$indice];
        $empresa['estado'] = $decision;
        $empresa['motivo_estado'] = $decision === 'rechazada' ? $motivo : null;
        $empresa['validada_en'] = $decision === 'validada' ? gmdate('Y-m-d\TH:i:s\Z') : null;
        self::sincronizarReferencias($estado, $empresa);

        return self::empresaPropia($estado, $empresa);
    }

    /**
     * Suspender una empresa validada (sus vacantes publicadas pasan a «suspendida») o reactivar una
     * suspendida (sus vacantes siguen suspendidas hasta que se reactiven una por una).
     *
     * @param  array<string, mixed>  $estado
     * @return array{empresa: array<string, mixed>, vacantes_suspendidas: int, postulados_notificados: int}
     */
    public static function cambiarEstado(array &$estado, int $id, string $nuevo, ?string $motivo): array
    {
        $indice = self::indice($estado, $id);

        $campos = [];
        if (! in_array($nuevo, ['suspendida', 'validada'], true)) {
            $campos['estado'] = 'Elige suspendida o validada.';
        }
        $motivo = $motivo === null ? null : trim($motivo);
        if ($nuevo === 'suspendida' && ($motivo === null || $motivo === '')) {
            $campos['motivo'] = 'Escribe el motivo de la suspensión.';
        } elseif ($motivo !== null && mb_strlen($motivo) > 255) {
            $campos['motivo'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        $actual = $estado['empresas'][$indice]['estado'];
        if (($nuevo === 'suspendida' && $actual !== 'validada') || ($nuevo === 'validada' && $actual !== 'suspendida')) {
            throw new ApiError(409, 'transicion_invalida', 'Solo se suspende una empresa validada y solo se reactiva una suspendida.');
        }

        $suspendidas = [];
        if ($nuevo === 'suspendida') {
            foreach ($estado['vacantes'] as &$vacante) {
                if ($vacante['empresa_id'] === $id && $vacante['estado'] === 'publicada') {
                    $vacante['estado'] = 'suspendida';
                    $suspendidas[] = $vacante['id'];
                }
            }
            unset($vacante);
        }
        $notificados = array_unique(array_column(array_filter(
            $estado['postulaciones'],
            fn (array $p) => in_array($p['vacante_id'], $suspendidas, true) && in_array($p['estado'], self::POSTULACIONES_ACTIVAS, true),
        ), 'candidato_id'));

        $empresa = &$estado['empresas'][$indice];
        $empresa['estado'] = $nuevo;
        $empresa['motivo_estado'] = $nuevo === 'suspendida' ? $motivo : null;
        self::sincronizarReferencias($estado, $empresa);

        return [
            'empresa' => self::empresaPropia($estado, $empresa),
            'vacantes_suspendidas' => count($suspendidas),
            'postulados_notificados' => count($notificados),
        ];
    }

    /**
     * Valida un EmpresaAdminEntrada y devuelve los campos limpios, con los nombres del estado del mock.
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private static function validarEntrada(array $estado, array $datos): array
    {
        $texto = fn (string $campo): string => is_string($datos[$campo] ?? null) ? trim($datos[$campo]) : '';
        $opcional = fn (string $campo): ?string => $texto($campo) === '' ? null : $texto($campo);
        $entero = fn (string $campo): ?int => isset($datos[$campo]) && is_numeric($datos[$campo]) ? (int) $datos[$campo] : null;

        $razon = $texto('razon_social');
        $comercial = $texto('nombre_comercial');
        $rfc = mb_strtoupper($texto('rfc'));
        $sector = $entero('sector_id');
        $tamano = $entero('tamano_empresa_id');
        $municipio = $entero('municipio_id');
        $sitio = $opcional('sitio_web');

        $campos = [];
        if ($razon === '' || mb_strlen($razon) > 200) {
            $campos['razon_social'] = $razon === '' ? 'Escribe la razón social.' : 'Debe tener máximo 200 caracteres.';
        }
        if ($comercial === '' || mb_strlen($comercial) > 150) {
            $campos['nombre_comercial'] = $comercial === '' ? 'Escribe el nombre comercial.' : 'Debe tener máximo 150 caracteres.';
        }
        if (! preg_match(self::RFC, $rfc)) {
            $campos['rfc'] = 'El RFC debe tener 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave.';
        }
        if (! isset($estado['catalogos']['sectores'][$sector])) {
            $campos['sector_id'] = 'Elige un sector de la lista.';
        }
        if (! isset($estado['catalogos']['tamanos'][$tamano])) {
            $campos['tamano_empresa_id'] = 'Elige un tamaño de la lista.';
        }
        if (! isset($estado['catalogos']['municipios'][$municipio])) {
            $campos['municipio_id'] = 'Elige un municipio de la lista.';
        }
        foreach (['descripcion', 'practicas_inclusion'] as $campo) {
            if (mb_strlen($texto($campo)) > 1000) {
                $campos[$campo] = 'Debe tener máximo 1000 caracteres.';
            }
        }
        if ($sitio !== null && ! preg_match('#^https?://\S+$#i', $sitio)) {
            $campos['sitio_web'] = 'Escribe la dirección completa, por ejemplo https://empresa.mx.';
        }
        if ($campos !== []) {
            throw new ApiError(422, 'validacion', self::MENSAJE_VALIDACION, $campos);
        }

        return [
            'razon_social' => $razon,
            'nombre_comercial' => $comercial,
            'rfc' => $rfc,
            'sector_id' => $sector,
            'tamano_empresa_id' => $tamano,
            'municipio_id' => $municipio,
            'direccion' => $opcional('direccion'),
            'descripcion' => $opcional('descripcion'),
            'sitio_web' => $sitio,
            'practicas_inclusion' => $opcional('practicas_inclusion'),
        ];
    }

    /** @param  array<string, mixed>  $estado */
    private static function exigirRfcLibre(array $estado, string $rfc, ?int $exceptoId): void
    {
        foreach ($estado['empresas'] as $empresa) {
            if ($empresa['rfc'] === $rfc && $empresa['id'] !== $exceptoId) {
                throw new ApiError(409, 'rfc_duplicado', 'Otra empresa ya registró ese RFC.');
            }
        }
    }

    /**
     * Los usuarios guardan una referencia a su empresa (nombre y estado); se mantiene al día.
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $empresa
     */
    private static function sincronizarReferencias(array &$estado, array $empresa): void
    {
        foreach ($estado['usuarios'] as &$cuenta) {
            if (($cuenta['usuario']['empresa']['id'] ?? null) === $empresa['id']) {
                $cuenta['usuario']['empresa'] = ['id' => $empresa['id'], 'nombre_comercial' => $empresa['nombre_comercial'], 'estado' => $empresa['estado']];
            }
        }
    }

    /**
     * EmpresaAdmin (una fila del listado).
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $e
     * @return array<string, mixed>
     */
    private static function empresaAdmin(array $estado, array $e): array
    {
        return [
            'id' => $e['id'],
            'razon_social' => $e['razon_social'],
            'nombre_comercial' => $e['nombre_comercial'],
            'rfc' => $e['rfc'],
            'sector' => ['id' => $e['sector_id'], 'nombre' => $estado['catalogos']['sectores'][$e['sector_id']]],
            'estado' => $e['estado'],
            'reclutadores' => count(array_filter($estado['usuarios'], fn (array $c) => $c['usuario']['rol'] === 'reclutador' && ($c['usuario']['empresa']['id'] ?? null) === $e['id'])),
            'vacantes_activas' => count(array_filter($estado['vacantes'], fn (array $v) => $v['empresa_id'] === $e['id'] && $v['estado'] === 'publicada')),
            'documento' => $e['documento_url'] !== null,
            'creado_en' => $e['creado_en'],
        ];
    }

    /**
     * EmpresaPropia.
     *
     * @param  array<string, mixed>  $estado
     * @param  array<string, mixed>  $e
     * @return array<string, mixed>
     */
    private static function empresaPropia(array $estado, array $e): array
    {
        [$tamano, $rango] = $estado['catalogos']['tamanos'][$e['tamano_empresa_id']];
        [$municipio, $entidadId] = $estado['catalogos']['municipios'][$e['municipio_id']];

        return [
            'id' => $e['id'],
            'razon_social' => $e['razon_social'],
            'nombre_comercial' => $e['nombre_comercial'],
            'rfc' => $e['rfc'],
            'sector' => ['id' => $e['sector_id'], 'nombre' => $estado['catalogos']['sectores'][$e['sector_id']]],
            'tamano_empresa' => ['id' => $e['tamano_empresa_id'], 'nombre' => $tamano, 'rango' => $rango],
            'municipio' => ['id' => $e['municipio_id'], 'nombre' => $municipio, 'entidad' => ['id' => $entidadId, 'nombre' => $estado['catalogos']['entidades'][$entidadId]]],
            'direccion' => $e['direccion'],
            'descripcion' => $e['descripcion'],
            'sitio_web' => $e['sitio_web'],
            'logo_url' => $e['logo_url'],
            'practicas_inclusion' => $e['practicas_inclusion'],
            'documento_url' => $e['documento_url'],
            'estado' => $e['estado'],
            'motivo_estado' => $e['motivo_estado'],
            'validada_en' => $e['validada_en'],
            // El reclutador ya no puede cambiar razón social ni RFC cuando la empresa está validada.
            'datos_fiscales_editables' => $e['estado'] !== 'validada',
        ];
    }

    /** @param  array<string, mixed>  $estado */
    private static function indice(array $estado, int $id): int
    {
        foreach ($estado['empresas'] as $indice => $empresa) {
            if ($empresa['id'] === $id) {
                return $indice;
            }
        }

        throw new ApiError(404, 'no_encontrado', 'La empresa no existe.');
    }
}
