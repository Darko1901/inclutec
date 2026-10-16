import { cliente } from './cliente';
import type { Horario } from './tipos';

/** Horarios de entrevista que ve el candidato (sección «Horarios y entrevistas» del contrato). */
export interface HorariosServicio {
  /** GET /horarios-entrevista?vacante_id=…&disponible=true */
  disponibles(vacanteId: number): Promise<Horario[]>;
}

export class HorariosHttp implements HorariosServicio {
  async disponibles(vacanteId: number) {
    return (
      await cliente.get<Horario[]>('/horarios-entrevista', {
        params: { vacante_id: vacanteId, disponible: true },
      })
    ).data;
  }
}
