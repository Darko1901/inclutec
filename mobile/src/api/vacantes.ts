import { cliente } from './cliente';
import type {
  Compatibilidad,
  ConsultaRecomendadas,
  ConsultaVacantes,
  PaginaVacantes,
  VacanteDetalle,
} from './tipos';

/** Vacantes que ve el candidato (sección «Vacantes y compatibilidad» del contrato). */
export interface VacantesServicio {
  /** GET /vacantes/recomendadas */
  recomendadas(consulta?: ConsultaRecomendadas): Promise<PaginaVacantes>;
  /** GET /vacantes */
  buscar(consulta?: ConsultaVacantes): Promise<PaginaVacantes>;
  /** GET /vacantes/{id} */
  detalle(id: number): Promise<VacanteDetalle>;
  /** GET /vacantes/{id}/compatibilidad */
  compatibilidad(id: number): Promise<Compatibilidad>;
}

export class VacantesHttp implements VacantesServicio {
  async recomendadas(consulta?: ConsultaRecomendadas) {
    return (await cliente.get<PaginaVacantes>('/vacantes/recomendadas', { params: consulta })).data;
  }

  async buscar(consulta?: ConsultaVacantes) {
    return (
      await cliente.get<PaginaVacantes>('/vacantes', {
        params: consulta,
        // El contrato repite el parámetro: ajuste_id=1&ajuste_id=6 (sin corchetes).
        paramsSerializer: { indexes: null },
      })
    ).data;
  }

  async detalle(id: number) {
    return (await cliente.get<VacanteDetalle>(`/vacantes/${id}`)).data;
  }

  async compatibilidad(id: number) {
    return (await cliente.get<Compatibilidad>(`/vacantes/${id}/compatibilidad`)).data;
  }
}
