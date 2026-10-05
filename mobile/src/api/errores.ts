import { AxiosError, isAxiosError } from 'axios';

import type { components } from './esquema';

type CuerpoError = components['schemas']['Error'];

export const MENSAJE_SERVICIO_NO_DISPONIBLE = 'El servicio no está disponible; intenta más tarde';

/** Error de cualquier llamada al API, con la forma de la sección «Errores» del contrato. */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detail: string;
  readonly campos: Record<string, string> | null;
  /** Segundos de espera (encabezado Retry-After) en 429. */
  readonly reintentarEn: number | null;

  constructor(opciones: {
    status: number;
    codigo: string;
    detail: string;
    campos?: Record<string, string> | null;
    reintentarEn?: number | null;
  }) {
    super(opciones.detail);
    this.name = 'ApiError';
    this.status = opciones.status;
    this.codigo = opciones.codigo;
    this.detail = opciones.detail;
    this.campos = opciones.campos ?? null;
    this.reintentarEn = opciones.reintentarEn ?? null;
  }

  /** Red caída, tiempo agotado o 5xx: la app solo muestra el mensaje genérico. */
  static servicioNoDisponible(status = 0): ApiError {
    return new ApiError({
      status,
      codigo: 'error_interno',
      detail: MENSAJE_SERVICIO_NO_DISPONIBLE,
    });
  }

  /** Convierte cualquier error de Axios (o desconocido) en ApiError. */
  static desde(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (!isAxiosError(error)) return ApiError.servicioNoDisponible();
    return ApiError.desdeAxios(error);
  }

  private static desdeAxios(error: AxiosError): ApiError {
    const respuesta = error.response;
    if (!respuesta || respuesta.status >= 500) {
      return ApiError.servicioNoDisponible(respuesta?.status ?? 0);
    }

    const cuerpo: unknown = respuesta.data;
    const reintentarEn = leerReintentarEn(respuesta.headers?.['retry-after']);

    if (esCuerpoError(cuerpo)) {
      return new ApiError({
        status: respuesta.status,
        codigo: cuerpo.codigo,
        detail: cuerpo.detail,
        campos: cuerpo.campos ?? null,
        reintentarEn,
      });
    }

    // FastAPI por omisión responde los 422 con `detail` como arreglo; el API los convierte,
    // pero aquí se tolera para no mostrar texto técnico.
    if (respuesta.status === 422) {
      return new ApiError({
        status: 422,
        codigo: 'validacion',
        detail: 'Revisa los datos marcados.',
      });
    }

    return new ApiError({
      status: respuesta.status,
      codigo: 'error_desconocido',
      detail: 'No pudimos completar la operación. Intenta de nuevo.',
      reintentarEn,
    });
  }
}

function esCuerpoError(cuerpo: unknown): cuerpo is CuerpoError {
  if (typeof cuerpo !== 'object' || cuerpo === null) return false;
  const { detail, codigo } = cuerpo as Record<string, unknown>;
  return typeof detail === 'string' && typeof codigo === 'string';
}

function leerReintentarEn(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}
