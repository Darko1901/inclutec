<?php

namespace App\Servicios\Api;

use Illuminate\Http\Client\Response;
use RuntimeException;

/**
 * Error del API con la forma de la sección «Errores» del contrato:
 * {"detail": "...", "codigo": "...", "campos": {...}}.
 */
class ApiError extends RuntimeException
{
    public const MENSAJE_INTERNO = 'El servicio no está disponible; intenta más tarde';

    /**
     * @param  array<string, string>  $campos  Un mensaje por campo (solo en errores de validación).
     * @param  int|null  $reintentarEn  Segundos del encabezado Retry-After (429).
     */
    public function __construct(
        public readonly int $status,
        public readonly string $codigo,
        public readonly string $detail,
        public readonly array $campos = [],
        public readonly ?int $reintentarEn = null,
    ) {
        parent::__construct($detail, $status);
    }

    /** Falla de red, tiempo agotado o error 5xx. */
    public static function interno(?string $detail = null): self
    {
        return new self(500, 'error_interno', $detail ?? self::MENSAJE_INTERNO);
    }

    /** Convierte una respuesta de error del API; si no trae la forma del contrato, es un error interno. */
    public static function desdeRespuesta(Response $respuesta): self
    {
        if ($respuesta->serverError()) {
            return self::interno();
        }

        $cuerpo = $respuesta->json();
        if (! is_array($cuerpo) || ! isset($cuerpo['codigo'], $cuerpo['detail'])) {
            return self::interno();
        }

        $reintentar = $respuesta->header('Retry-After');

        return new self(
            $respuesta->status(),
            (string) $cuerpo['codigo'],
            (string) $cuerpo['detail'],
            is_array($cuerpo['campos'] ?? null) ? $cuerpo['campos'] : [],
            is_numeric($reintentar) ? (int) $reintentar : null,
        );
    }
}
