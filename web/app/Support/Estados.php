<?php

namespace App\Support;

/**
 * Mapa único de estados (tabla 3.4 de docs/diseno/pantallas.md): valor de la base de datos →
 * texto en pantalla, ícono y variante de color. El API manda siempre el valor de BD
 * (`en_revision`); el texto lo pone el panel. Nunca se comunica un estado solo con color.
 *
 * Variantes: exito, advertencia, error, info y neutro.
 */
class Estados
{
    public const VARIANTES = ['exito', 'advertencia', 'error', 'info', 'neutro'];

    /** @var array<string, array<string, array{texto: string, icono: string, variante: string}>>|null */
    private static ?array $mapa = null;

    /** @return array{texto: string, icono: string, variante: string} */
    public static function de(string $entidad, string $valor): array
    {
        return self::mapa()[$entidad][$valor]
            ?? throw new \InvalidArgumentException("No hay un estado «{$valor}» para «{$entidad}».");
    }

    public static function existe(string $entidad, string $valor): bool
    {
        return isset(self::mapa()[$entidad][$valor]);
    }

    /** Valores de BD de una entidad, en el orden de la tabla 3.4. @return list<string> */
    public static function valores(string $entidad): array
    {
        return array_keys(self::mapa()[$entidad] ?? throw new \InvalidArgumentException("No hay estados para «{$entidad}»."));
    }

    /** @return list<string> */
    public static function entidades(): array
    {
        return array_keys(self::mapa());
    }

    /** @return array<string, array<string, array{texto: string, icono: string, variante: string}>> */
    public static function todos(): array
    {
        return self::mapa();
    }

    /** @return array<string, array<string, array{texto: string, icono: string, variante: string}>> */
    private static function mapa(): array
    {
        $e = fn (string $texto, string $icono, string $variante): array => compact('texto', 'icono', 'variante');

        return self::$mapa ??= [
            'usuario' => [
                'activo' => $e('Activo', 'check-circulo', 'exito'),
                'suspendido' => $e('Suspendido', 'pausa', 'advertencia'),
                'eliminado' => $e('Eliminado', 'papelera', 'neutro'),
            ],
            'empresa' => [
                'pendiente' => $e('Pendiente de validación', 'reloj', 'advertencia'),
                'validada' => $e('Validada', 'check-circulo', 'exito'),
                'rechazada' => $e('Rechazada', 'x-circulo', 'error'),
                'suspendida' => $e('Suspendida', 'prohibido', 'error'),
            ],
            'vacante' => [
                'borrador' => $e('Borrador', 'lapiz', 'neutro'),
                'publicada' => $e('Publicada', 'check-circulo', 'exito'),
                'pausada' => $e('Pausada', 'pausa', 'advertencia'),
                'cerrada' => $e('Cerrada', 'candado', 'neutro'),
                'suspendida' => $e('Suspendida', 'prohibido', 'error'),
            ],
            'postulacion' => [
                'postulada' => $e('Postulada', 'bandeja', 'info'),
                'en_revision' => $e('En revisión', 'ojo', 'advertencia'),
                'entrevista' => $e('Entrevista', 'calendario', 'info'),
                'aceptada' => $e('Aceptada', 'check-circulo', 'exito'),
                'no_seleccionada' => $e('No seleccionada', 'x-circulo', 'error'),
                'retirada' => $e('Retirada', 'menos-circulo', 'neutro'),
            ],
            'entrevista' => [
                'agendada' => $e('Agendada', 'calendario', 'info'),
                'realizada' => $e('Realizada', 'check-circulo', 'exito'),
                'no_asistio' => $e('No asistió', 'x-circulo', 'error'),
                'cancelada' => $e('Cancelada', 'prohibido', 'neutro'),
            ],
            'horario' => [
                'libre' => $e('Libre', 'circulo', 'exito'),
                'agendado' => $e('Agendado', 'calendario', 'info'),
                'cancelado' => $e('Cancelado', 'prohibido', 'neutro'),
            ],
            'reporte' => [
                'abierto' => $e('Abierto', 'alerta', 'advertencia'),
                'en_revision' => $e('En revisión', 'ojo', 'info'),
                'resuelto' => $e('Resuelto', 'check-circulo', 'exito'),
                'descartado' => $e('Descartado', 'menos-circulo', 'neutro'),
            ],
            // vacante_ajuste.tipo; `no_declarada` es el valor del contrato para una necesidad que la vacante no declara.
            'ajuste' => [
                'existente' => $e('El lugar cuenta con', 'check-circulo', 'exito'),
                'bajo_solicitud' => $e('Podemos ofrecer bajo solicitud', 'info', 'info'),
                'no_declarada' => $e('No declarada', 'menos-circulo', 'neutro'),
            ],
        ];
    }
}
