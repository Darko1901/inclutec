import { cliente } from './cliente';

/** Entrevistas del candidato (sección «Horarios y entrevistas» del contrato). */
export interface EntrevistasServicio {
  /** DELETE /entrevistas/{id}: solo con al menos 24 h de anticipación. */
  cancelar(id: number, motivo?: string | null): Promise<void>;
}

export class EntrevistasHttp implements EntrevistasServicio {
  async cancelar(id: number, motivo?: string | null) {
    await cliente.delete(`/entrevistas/${id}`, { data: { motivo: motivo ?? null } });
  }
}
