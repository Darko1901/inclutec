import type { ConsultaVacantes } from '../../../api';

export interface Filtros {
  modalidad_id?: number;
  categoria_id?: number;
  entidad_id?: number;
  municipio_id?: number;
  jornada_id?: number;
  salario_min?: number;
  compatibilidad_min?: number;
  ajuste_ids: number[];
}

export const SIN_FILTROS: Filtros = { ajuste_ids: [] };

/** Valores del filtro «compatibilidad mínima». */
export const OPCIONES_COMPATIBILIDAD = [20, 40, 60, 80] as const;

/**
 * Número que muestra el botón «Filtros (n)»: cada criterio del panel cuenta uno (entidad y
 * municipio son uno solo: la ubicación) y cada ajuste elegido cuenta por separado. El chip
 * «Solo las que cubren mis necesidades» no cuenta: se ve y se apaga aparte.
 */
export function contarFiltros(filtros: Filtros): number {
  const criterios = [
    filtros.modalidad_id,
    filtros.categoria_id,
    filtros.entidad_id ?? filtros.municipio_id,
    filtros.jornada_id,
    filtros.salario_min,
    filtros.compatibilidad_min,
  ];
  return criterios.filter((valor) => valor !== undefined).length + filtros.ajuste_ids.length;
}

/** Parámetros de GET /vacantes; null cuando no hay ningún criterio y toca la lista de recomendadas. */
export function aConsulta(
  texto: string,
  filtros: Filtros,
  soloCubren: boolean,
): ConsultaVacantes | null {
  const { ajuste_ids: ajustes, ...simples } = filtros;
  const consulta: ConsultaVacantes = {};
  if (texto) consulta.q = texto;
  Object.assign(
    consulta,
    Object.fromEntries(Object.entries(simples).filter(([, valor]) => valor !== undefined)),
  );
  if (ajustes.length > 0) consulta.ajuste_id = ajustes;
  if (soloCubren) consulta.cubre_mis_necesidades = true;
  return Object.keys(consulta).length > 0 ? consulta : null;
}
