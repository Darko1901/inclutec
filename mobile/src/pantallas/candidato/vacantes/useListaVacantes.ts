import { vacantes, type ConsultaVacantes, type VacanteResumen } from '../../../api';
import { useListaPaginada } from '../../../utilidades/useListaPaginada';

const traer = (criterio: ConsultaVacantes | null, page: number, size: number) =>
  criterio ? vacantes.buscar({ ...criterio, page, size }) : vacantes.recomendadas({ page, size });

const identificar = (vacante: VacanteResumen) => vacante.id;

/** Lista paginada de CAN-01. Sin criterios pide las recomendadas; con criterios, la búsqueda. */
export function useListaVacantes(consulta: ConsultaVacantes | null) {
  return useListaPaginada(traer, consulta, identificar);
}
