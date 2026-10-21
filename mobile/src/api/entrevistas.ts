import { cliente } from './cliente';
import type { ConsultaAgenda, DiaAgenda, Entrevista, ResultadoEntrevista } from './tipos';

/** Entrevistas (sección «Horarios y entrevistas» del contrato). */
export interface EntrevistasServicio {
  /** DELETE /entrevistas/{id} (candidato): solo con al menos 24 h de anticipación. */
  cancelar(id: number, motivo?: string | null): Promise<void>;
  /** GET /entrevistas/me (reclutador): horarios libres y agendados agrupados por día. */
  miAgenda(consulta?: ConsultaAgenda): Promise<DiaAgenda[]>;
  /** PATCH /entrevistas/{id} (reclutador): realizada, no_asistio o cancelada con motivo. */
  registrarResultado(id: number, datos: ResultadoEntrevista): Promise<Entrevista>;
}

export class EntrevistasHttp implements EntrevistasServicio {
  async cancelar(id: number, motivo?: string | null) {
    await cliente.delete(`/entrevistas/${id}`, { data: { motivo: motivo ?? null } });
  }

  async miAgenda(consulta?: ConsultaAgenda) {
    return (await cliente.get<DiaAgenda[]>('/entrevistas/me', { params: consulta })).data;
  }

  async registrarResultado(id: number, datos: ResultadoEntrevista) {
    return (await cliente.patch<Entrevista>(`/entrevistas/${id}`, datos)).data;
  }
}
