import { cliente } from './cliente';
import type {
  Compatibilidad,
  ConsultaRecomendadas,
  ConsultaVacantes,
  EstadoVacante,
  PaginaVacantes,
  VacanteDetalle,
  VacanteEntrada,
  VacanteGuardada,
} from './tipos';

/** Vacantes que ve el candidato (sección «Vacantes y compatibilidad» del contrato). */
export interface VacantesServicio {
  /** GET /vacantes/recomendadas */
  recomendadas(consulta?: ConsultaRecomendadas): Promise<PaginaVacantes>;
  /** GET /vacantes */
  buscar(consulta?: ConsultaVacantes): Promise<PaginaVacantes>;
  /** GET /vacantes/{id}; el reclutador ve cualquier estado de las vacantes de su empresa. */
  detalle(id: number): Promise<VacanteDetalle>;
  /** GET /vacantes/{id}/compatibilidad */
  compatibilidad(id: number): Promise<Compatibilidad>;

  /** POST /vacantes (reclutador): `estado` borrador o publicada. */
  crear(datos: VacanteEntrada): Promise<VacanteGuardada>;
  /** PUT /vacantes/{id} (reclutador) */
  editar(id: number, datos: VacanteEntrada): Promise<VacanteGuardada>;
  /** PATCH /vacantes/{id}/estado (reclutador): publicar, pausar, reanudar o cerrar. */
  cambiarEstado(
    id: number,
    estado: Extract<EstadoVacante, 'publicada' | 'pausada' | 'cerrada'>,
  ): Promise<VacanteDetalle>;
  /** POST /vacantes/{id}/duplicar (reclutador): copia como borrador. */
  duplicar(id: number): Promise<VacanteDetalle>;
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

  async crear(datos: VacanteEntrada) {
    return (await cliente.post<VacanteGuardada>('/vacantes', datos)).data;
  }

  async editar(id: number, datos: VacanteEntrada) {
    return (await cliente.put<VacanteGuardada>(`/vacantes/${id}`, datos)).data;
  }

  async cambiarEstado(
    id: number,
    estado: Extract<EstadoVacante, 'publicada' | 'pausada' | 'cerrada'>,
  ) {
    return (await cliente.patch<VacanteDetalle>(`/vacantes/${id}/estado`, { estado })).data;
  }

  async duplicar(id: number) {
    return (await cliente.post<VacanteDetalle>(`/vacantes/${id}/duplicar`)).data;
  }
}
