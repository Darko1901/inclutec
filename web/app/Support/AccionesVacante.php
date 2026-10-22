<?php

namespace App\Support;

/**
 * Moderación de una vacante (WEB-05, RF-04): suspender una publicada o pausada y reactivar una
 * suspendida. El API recibe `estado` suspendida o publicada; aquí viven los textos de cada acción y
 * los de la sección de accesibilidad, que son los mismos que ve el candidato en la app.
 */
class AccionesVacante
{
    /**
     * @return array<string, array{estado: string, boton: string, titulo: string, mensaje: string, etiquetaMotivo: ?string, confirmar: string, variante: string, exito: string}>
     */
    public static function todas(): array
    {
        return [
            'suspender' => [
                'estado' => 'suspendida', 'boton' => 'Suspender', 'titulo' => '¿Suspender la vacante «:titulo»?',
                'mensaje' => 'Se avisará al reclutador y a las personas postuladas. Los candidatos dejarán de verla hasta que la reactives.',
                'etiquetaMotivo' => 'Motivo de la suspensión', 'confirmar' => 'Suspender', 'variante' => 'peligro',
                'exito' => 'Se suspendió la vacante «:titulo». Se avisará al reclutador y a las personas postuladas.',
            ],
            'reactivar' => [
                'estado' => 'publicada', 'boton' => 'Reactivar', 'titulo' => '¿Reactivar la vacante «:titulo»?',
                'mensaje' => 'Vuelve a quedar publicada y los candidatos la verán de nuevo.',
                'etiquetaMotivo' => null, 'confirmar' => 'Reactivar', 'variante' => 'primario',
                'exito' => 'Se reactivó la vacante «:titulo». Quedó publicada.',
            ],
        ];
    }

    /**
     * Solo se suspende una publicada o pausada y solo se reactiva una suspendida; las demás no tienen acciones.
     *
     * @return list<string>
     */
    public static function disponibles(string $estado): array
    {
        return match ($estado) {
            'publicada', 'pausada' => ['suspender'],
            'suspendida' => ['reactivar'],
            default => [],
        };
    }

    /** Textos de la sección «Accesibilidad» (los mismos que en CAN-02). */
    public const ACCESIBILIDAD = [
        'existente' => 'El lugar cuenta con',
        'bajo_solicitud' => 'La empresa puede ofrecer bajo solicitud',
        'sin_condiciones' => 'La empresa declaró que el lugar no cuenta con condiciones de accesibilidad',
        'sin_declarar' => 'La empresa aún no declara condiciones de accesibilidad.',
        'notas' => 'Notas de la empresa',
    ];

    /** «2 años de experiencia» (igual que la app). */
    public static function experiencia(int $anios): string
    {
        return $anios <= 0 ? 'No se requiere experiencia previa' : $anios.' '.($anios === 1 ? 'año' : 'años').' de experiencia';
    }

    public static function plazas(int $plazas): string
    {
        return $plazas.' '.($plazas === 1 ? 'plaza' : 'plazas');
    }

    /** «$14,000 a $18,000 MXN», «Desde $14,000 MXN» o null sin salario. */
    public static function salario(?array $salario): ?string
    {
        if ($salario === null || ($salario['min'] === null && $salario['max'] === null)) {
            return null;
        }
        $monto = fn (float|int $valor): string => '$'.number_format($valor);
        if ($salario['min'] !== null && $salario['max'] !== null) {
            return $salario['min'] === $salario['max'] ? $monto($salario['min']).' MXN' : $monto($salario['min']).' a '.$monto($salario['max']).' MXN';
        }

        return $salario['min'] !== null ? 'Desde '.$monto($salario['min']).' MXN' : 'Hasta '.$monto($salario['max']).' MXN';
    }
}
