<?php

namespace App\Support;

/**
 * Textos y reglas de WEB-04 que no vienen del API: las pestañas del listado, las acciones sobre el
 * estado de una empresa y la revisión del formato del RFC. Los textos de los estados mismos salen de
 * `Estados` (tabla 3.4).
 */
class Empresas
{
    /** Patrón del RFC según EmpresaAdminEntrada del contrato. */
    public const RFC = '/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/u';

    /** Estado → nombre de la pestaña. Siguen el orden de la cola: primero lo que hay que revisar. */
    public const PESTANAS = [
        'pendiente' => 'Pendientes',
        'validada' => 'Validadas',
        'rechazada' => 'Rechazadas',
        'suspendida' => 'Suspendidas',
    ];

    public static function rfcValido(string $rfc): bool
    {
        return (bool) preg_match(self::RFC, $rfc);
    }

    /**
     * Acciones sobre el estado de una empresa. `ruta` es la ruta del panel, `campo` y `valor` lo que se
     * envía al API (validación o estado) y `etiquetaMotivo` es null cuando no se pide motivo.
     *
     * @return array<string, array{ruta: string, campo: string, valor: string, boton: string, titulo: string, mensaje: string, etiquetaMotivo: ?string, confirmar: string, variante: string, exito: string}>
     */
    public static function acciones(): array
    {
        return [
            'validar' => [
                'ruta' => 'empresas.validacion', 'campo' => 'decision', 'valor' => 'validada', 'boton' => 'Validar',
                'titulo' => '¿Validar a :nombre?', 'mensaje' => 'La empresa podrá publicar vacantes y se avisará a sus reclutadores.',
                'etiquetaMotivo' => null, 'confirmar' => 'Validar', 'variante' => 'primario', 'exito' => 'Se validó a :nombre. Ya puede publicar vacantes.',
            ],
            'rechazar' => [
                'ruta' => 'empresas.validacion', 'campo' => 'decision', 'valor' => 'rechazada', 'boton' => 'Rechazar',
                'titulo' => '¿Rechazar a :nombre?', 'mensaje' => 'Se avisará a sus reclutadores con el motivo que escribas.',
                'etiquetaMotivo' => 'Motivo del rechazo', 'confirmar' => 'Rechazar', 'variante' => 'peligro', 'exito' => 'Se rechazó a :nombre.',
            ],
            'suspender' => [
                'ruta' => 'empresas.estado', 'campo' => 'estado', 'valor' => 'suspendida', 'boton' => 'Suspender',
                'titulo' => '¿Suspender a :nombre?', 'mensaje' => 'Sus vacantes publicadas se suspenderán y se avisará a las personas postuladas.',
                'etiquetaMotivo' => 'Motivo de la suspensión', 'confirmar' => 'Suspender', 'variante' => 'peligro', 'exito' => 'Se suspendió a :nombre.',
            ],
            'reactivar' => [
                'ruta' => 'empresas.estado', 'campo' => 'estado', 'valor' => 'validada', 'boton' => 'Reactivar',
                'titulo' => '¿Reactivar a :nombre?', 'mensaje' => 'La empresa vuelve a estar validada. Sus vacantes siguen suspendidas hasta que las reactives una por una.',
                'etiquetaMotivo' => null, 'confirmar' => 'Reactivar', 'variante' => 'primario', 'exito' => 'Se reactivó a :nombre.',
            ],
        ];
    }

    /**
     * Acciones según el estado: una pendiente se valida o se rechaza, una validada se suspende y una
     * suspendida se reactiva. Una rechazada no tiene acciones (vuelve a pendiente cuando el reclutador
     * sube otra constancia).
     *
     * @return list<string>
     */
    public static function disponibles(string $estado): array
    {
        return match ($estado) {
            'pendiente' => ['validar', 'rechazar'],
            'validada' => ['suspender'],
            'suspendida' => ['reactivar'],
            default => [],
        };
    }

    /** `(n)` vacante(s) / persona(s): texto con la concordancia en singular o plural. */
    public static function plural(int $n, string $singular, string $plural): string
    {
        return $n.' '.($n === 1 ? $singular : $plural);
    }
}
