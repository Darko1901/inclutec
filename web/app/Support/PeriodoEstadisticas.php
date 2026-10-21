<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Periodo del dashboard (WEB-02, RF-05), tal como viaja en la URL: `?periodo=7|30|90` o
 * `?periodo=personalizado&desde=AAAA-MM-DD&hasta=AAAA-MM-DD`. Por omisión, los últimos 30 días.
 * Si la consulta no es válida se usa el periodo por omisión y se guardan los mensajes de error.
 */
final class PeriodoEstadisticas
{
    public const PERSONALIZADO = 'personalizado';

    public const POR_OMISION = '30';

    /** Días que abarca un periodo personalizado como máximo (12 meses). */
    public const MAX_DIAS = 366;

    /** @var array<string, string> */
    public const OPCIONES = [
        '7' => 'Últimos 7 días',
        '30' => 'Últimos 30 días',
        '90' => 'Últimos 90 días',
        self::PERSONALIZADO => 'Fechas personalizadas',
    ];

    /**
     * @param  string  $clave  Opción elegida: 7, 30, 90 o personalizado.
     * @param  string  $desde  AAAA-MM-DD, inclusive.
     * @param  string  $hasta  AAAA-MM-DD, inclusive.
     * @param  array<string, string>  $errores  Un mensaje por campo (`periodo`, `desde`, `hasta`).
     * @param  array<string, string>  $entrada  Lo que escribió la persona, para volver a mostrarlo.
     */
    public function __construct(
        public readonly string $clave,
        public readonly string $desde,
        public readonly string $hasta,
        public readonly array $errores = [],
        public readonly array $entrada = [],
    ) {}

    /**
     * @param  array<string, mixed>  $consulta  Parámetros de la URL.
     * @param  CarbonImmutable|null  $hoy  Fecha de hoy en la zona del panel (para las pruebas).
     */
    public static function desdeConsulta(array $consulta, ?CarbonImmutable $hoy = null): self
    {
        $hoy ??= CarbonImmutable::now(config('app.timezone'));
        $texto = fn (string $campo): string => is_string($consulta[$campo] ?? null) ? trim($consulta[$campo]) : '';

        $desde = $texto('desde');
        $hasta = $texto('hasta');
        // Fechas sueltas en la URL equivalen a un periodo personalizado.
        $clave = $texto('periodo') ?: (($desde !== '' || $hasta !== '') ? self::PERSONALIZADO : self::POR_OMISION);
        $entrada = array_filter(['periodo' => $clave, 'desde' => $desde, 'hasta' => $hasta], fn (string $v) => $v !== '');

        if (! array_key_exists($clave, self::OPCIONES)) {
            return self::porOmision($hoy, ['periodo' => 'Elige un periodo de la lista.'], $entrada);
        }

        if ($clave !== self::PERSONALIZADO) {
            return new self($clave, $hoy->subDays((int) $clave)->format('Y-m-d'), $hoy->format('Y-m-d'));
        }

        $errores = [];
        $inicio = self::fecha($desde);
        $fin = self::fecha($hasta);
        if ($desde === '') {
            $errores['desde'] = 'Escribe la fecha de inicio.';
        } elseif (! $inicio) {
            $errores['desde'] = 'Escribe la fecha de inicio como AAAA-MM-DD.';
        }
        if ($hasta === '') {
            $errores['hasta'] = 'Escribe la fecha final.';
        } elseif (! $fin) {
            $errores['hasta'] = 'Escribe la fecha final como AAAA-MM-DD.';
        }
        if ($errores === [] && $inicio > $fin) {
            $errores['hasta'] = 'La fecha final no puede ser anterior a la inicial.';
        } elseif ($errores === [] && $inicio->diffInDays($fin) > self::MAX_DIAS) {
            $errores['hasta'] = 'El periodo puede abarcar como máximo 12 meses. Acorta las fechas.';
        }

        return $errores === []
            ? new self($clave, $inicio->format('Y-m-d'), $fin->format('Y-m-d'), [], $entrada)
            : self::porOmision($hoy, $errores, $entrada);
    }

    /** Parámetros para conservar el periodo en la URL (filtros, exportación). @return array<string, string> */
    public function parametros(): array
    {
        return $this->clave === self::PERSONALIZADO
            ? ['periodo' => $this->clave, 'desde' => $this->desde, 'hasta' => $this->hasta]
            : ['periodo' => $this->clave];
    }

    /** «Del 21 de septiembre de 2026 al 21 de octubre de 2026». */
    public function texto(): string
    {
        $formato = fn (string $fecha) => CarbonImmutable::parse($fecha)->locale('es_MX')->isoFormat('D [de] MMMM [de] YYYY');

        return 'Del '.$formato($this->desde).' al '.$formato($this->hasta);
    }

    /** @param  array<string, string>  $errores */
    private static function porOmision(CarbonImmutable $hoy, array $errores, array $entrada): self
    {
        return new self(self::POR_OMISION, $hoy->subDays((int) self::POR_OMISION)->format('Y-m-d'), $hoy->format('Y-m-d'), $errores, $entrada);
    }

    private static function fecha(string $texto): ?CarbonImmutable
    {
        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $texto);

        return $fecha && $fecha->format('Y-m-d') === $texto ? CarbonImmutable::instance($fecha) : null;
    }
}
