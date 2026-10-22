<?php

namespace App\Support;

/**
 * Cambios de estado que el administrador puede hacer sobre un usuario (WEB-03, RF-05). El API los
 * recibe como `estado` (activo, suspendido o eliminado); aquí viven los textos de cada acción.
 */
class AccionesUsuario
{
    /**
     * Acción → destino y textos. El motivo es obligatorio salvo al reactivar.
     *
     * @return array<string, array{estado: string, boton: string, titulo: string, mensaje: string, etiquetaMotivo: ?string, confirmar: string, variante: string, exito: string}>
     */
    public static function todas(): array
    {
        return [
            'suspender' => [
                'estado' => 'suspendido', 'boton' => 'Suspender', 'titulo' => '¿Suspender a :nombre?',
                'mensaje' => 'No podrá iniciar sesión hasta que lo reactives.', 'etiquetaMotivo' => 'Motivo de la suspensión',
                'confirmar' => 'Suspender', 'variante' => 'peligro', 'exito' => 'Se suspendió a :nombre.',
            ],
            'reactivar' => [
                'estado' => 'activo', 'boton' => 'Reactivar', 'titulo' => '¿Reactivar a :nombre?',
                'mensaje' => 'Podrá iniciar sesión de nuevo.', 'etiquetaMotivo' => null,
                'confirmar' => 'Reactivar', 'variante' => 'primario', 'exito' => 'Se reactivó a :nombre.',
            ],
            'baja' => [
                'estado' => 'eliminado', 'boton' => 'Dar de baja', 'titulo' => '¿Dar de baja a :nombre?',
                'mensaje' => 'La cuenta deja de funcionar, pero sus datos se conservan: nunca se borra a nadie.', 'etiquetaMotivo' => 'Motivo de la baja',
                'confirmar' => 'Dar de baja', 'variante' => 'peligro', 'exito' => 'Se dio de baja a :nombre.',
            ],
        ];
    }

    /**
     * Acciones disponibles según el estado actual: un usuario activo se suspende o se da de baja, uno
     * suspendido se reactiva o se da de baja y uno dado de baja solo se puede reactivar.
     *
     * @return list<string>
     */
    public static function disponibles(string $estado): array
    {
        return match ($estado) {
            'activo' => ['suspender', 'baja'],
            'suspendido' => ['reactivar', 'baja'],
            'eliminado' => ['reactivar'],
            default => [],
        };
    }

    /** Acción que lleva al estado `$estado` (activo → reactivar). */
    public static function paraEstado(string $estado): ?string
    {
        foreach (self::todas() as $clave => $accion) {
            if ($accion['estado'] === $estado) {
                return $clave;
            }
        }

        return null;
    }
}
