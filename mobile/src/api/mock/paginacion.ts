import { fallo } from './simulador';

export const TAMANO_MAXIMO = 100;

/** Lanza el 422 de validación si hay mensajes por campo. */
export function lanzarSiHayCampos(campos: Record<string, string>): void {
  if (Object.keys(campos).length > 0) {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
  }
}

/** `page` desde 1 y `size` de 1 a 100 (20 por omisión), como en la sección «Paginación» del contrato. */
export function leerPagina(consulta: { page?: number; size?: number }) {
  const page = consulta.page ?? 1;
  const size = consulta.size ?? 20;
  const campos: Record<string, string> = {};
  if (!Number.isInteger(page) || page < 1) campos.page = 'La página empieza en 1.';
  if (!Number.isInteger(size) || size < 1 || size > TAMANO_MAXIMO) {
    campos.size = `El tamaño de página va de 1 a ${TAMANO_MAXIMO}.`;
  }
  lanzarSiHayCampos(campos);
  return { page, size };
}

export function paginar<T>(items: T[], page: number, size: number) {
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, size };
}
