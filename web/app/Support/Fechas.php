<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/** Fechas del API (UTC) en hora de la Ciudad de México, como las ve el administrador. */
class Fechas
{
    /** «21/10/2026». */
    public static function dia(?string $fechaHora): string
    {
        return $fechaHora === null ? '' : self::local($fechaHora)->format('d/m/Y');
    }

    /** «21/10/2026, 09:00». */
    public static function diaYHora(?string $fechaHora): string
    {
        return $fechaHora === null ? '' : self::local($fechaHora)->format('d/m/Y, H:i');
    }

    private static function local(string $fechaHora): CarbonImmutable
    {
        return CarbonImmutable::parse($fechaHora)->setTimezone(config('app.timezone'));
    }
}
