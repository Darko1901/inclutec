import { ApiError } from '../errores';
import { manejarError } from '../sesionApi';

// Simula el comportamiento del API: latencia, errores con la forma del contrato y respuestas
// que son copias (quien las recibe no puede modificar el estado en memoria).
let latenciaMinMs = 300;
let latenciaMaxMs = 700;

export function configurarLatencia(minMs: number, maxMs: number): void {
  latenciaMinMs = minMs;
  latenciaMaxMs = maxMs;
}

function esperar(): Promise<void> {
  const ms = latenciaMinMs + Math.random() * (latenciaMaxMs - latenciaMinMs);
  return new Promise((resolver) => setTimeout(resolver, ms));
}

export function clonar<T>(valor: T): T {
  return valor === undefined ? valor : (JSON.parse(JSON.stringify(valor)) as T);
}

export function fallo(
  status: number,
  codigo: string,
  detail: string,
  extra: { campos?: Record<string, string>; reintentarEn?: number } = {},
): ApiError {
  return new ApiError({ status, codigo, detail, ...extra });
}

/** Ejecuta una operación del mock como si fuera una llamada HTTP. */
export async function simular<T>(operacion: () => T): Promise<T> {
  await esperar();
  try {
    return clonar(operacion());
  } catch (error) {
    if (error instanceof ApiError) manejarError(error);
    throw error;
  }
}
