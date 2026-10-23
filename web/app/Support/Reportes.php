<?php

namespace App\Support;

/**
 * Textos y reglas de WEB-08 que no vienen del API: las pestañas de la bandeja, las acciones de
 * seguimiento y cómo se llega al elemento reportado (vacante, empresa o candidato). Los textos de los
 * estados salen de `Estados` (tabla 3.4).
 */
class Reportes
{
    /** Estado → nombre de la pestaña. */
    public const PESTANAS = [
        'abierto' => 'Abiertos',
        'en_revision' => 'En revisión',
        'resuelto' => 'Resueltos',
        'descartado' => 'Descartados',
    ];

    public const TIPOS = ['vacante' => 'Vacante', 'empresa' => 'Empresa', 'candidato' => 'Candidato'];

    public const ORDENES = ['antiguos' => 'Más antiguos primero', 'recientes' => 'Más recientes primero'];

    /** Acción tomada al resolver (SeguimientoReporte.accion). */
    public const ACCIONES_TOMADAS = ['ninguna' => 'Ninguna', 'suspension' => 'Suspensión del elemento reportado'];

    /**
     * Seguimiento del reporte. `estado` es lo que se envía a PATCH /admin/reportes/{id}; el motivo de
     * la confirmación es la resolución (obligatoria al cerrar).
     *
     * @return array<string, array{estado: string, boton: string, titulo: string, mensaje: string, etiquetaMotivo: ?string, confirmar: string, variante: string, exito: string, pideAccion: bool}>
     */
    public static function acciones(): array
    {
        return [
            'tomar' => [
                'estado' => 'en_revision', 'boton' => 'Tomar en revisión', 'titulo' => '¿Tomar el reporte #:folio en revisión?',
                'mensaje' => 'Quedará en revisión a tu nombre. Después podrás resolverlo o descartarlo.',
                'etiquetaMotivo' => null, 'confirmar' => 'Tomar en revisión', 'variante' => 'primario', 'pideAccion' => false,
                'exito' => 'El reporte #:folio quedó en revisión.',
            ],
            'resolver' => [
                'estado' => 'resuelto', 'boton' => 'Resolver', 'titulo' => '¿Resolver el reporte #:folio?',
                'mensaje' => 'Escribe qué se hizo. Se notificará a quien reportó, sin detalles de la sanción.',
                'etiquetaMotivo' => 'Resolución', 'confirmar' => 'Resolver', 'variante' => 'primario', 'pideAccion' => true,
                'exito' => 'Se resolvió el reporte #:folio. Se notificó a quien lo reportó.',
            ],
            'descartar' => [
                'estado' => 'descartado', 'boton' => 'Descartar', 'titulo' => '¿Descartar el reporte #:folio?',
                'mensaje' => 'Escribe por qué no procede. Se notificará a quien reportó, sin detalles de ninguna sanción.',
                'etiquetaMotivo' => 'Resolución', 'confirmar' => 'Descartar', 'variante' => 'peligro', 'pideAccion' => false,
                'exito' => 'Se descartó el reporte #:folio. Se notificó a quien lo reportó.',
            ],
        ];
    }

    /**
     * Un reporte abierto se toma en revisión o se descarta; uno en revisión se resuelve o se descarta;
     * los cerrados ya no cambian.
     *
     * @return list<string>
     */
    public static function disponibles(string $estado): array
    {
        return match ($estado) {
            'abierto' => ['tomar', 'descartar'],
            'en_revision' => ['resolver', 'descartar'],
            default => [],
        };
    }

    /** Acción de seguimiento que lleva al estado `$estado` (resuelto → resolver). */
    public static function paraEstado(string $estado): string
    {
        foreach (self::acciones() as $clave => $accion) {
            if ($accion['estado'] === $estado) {
                return $clave;
            }
        }

        throw new \InvalidArgumentException("No hay acción de seguimiento para «{$estado}».");
    }

    /**
     * Cómo se trata cada tipo de elemento: entidad del mapa de estados, ruta de su pantalla, textos y la
     * acción de suspensión que le toca (la clave en AccionesVacante, Empresas o AccionesUsuario).
     *
     * @return array{entidad: string, ruta: string, ver: string, suspender: string, suspendible: bool}
     */
    public static function elemento(string $tipo, string $estadoActual): array
    {
        return match ($tipo) {
            'vacante' => ['entidad' => 'vacante', 'ruta' => 'vacantes.ver', 'ver' => 'Ver la vacante', 'suspender' => 'Suspender vacante', 'suspendible' => in_array('suspender', AccionesVacante::disponibles($estadoActual), true)],
            'empresa' => ['entidad' => 'empresa', 'ruta' => 'empresas.ver', 'ver' => 'Ver la empresa', 'suspender' => 'Suspender empresa', 'suspendible' => in_array('suspender', Empresas::disponibles($estadoActual), true)],
            default => ['entidad' => 'usuario', 'ruta' => 'usuarios.ver', 'ver' => 'Ver al usuario', 'suspender' => 'Suspender usuario', 'suspendible' => in_array('suspender', AccionesUsuario::disponibles($estadoActual), true)],
        };
    }
}
