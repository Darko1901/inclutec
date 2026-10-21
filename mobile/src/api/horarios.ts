import { cliente } from './cliente';
import type { Horario, HorarioEntrada } from './tipos';

/** Horarios de entrevista (sección «Horarios y entrevistas» del contrato). */
export interface HorariosServicio {
  /** GET /horarios-entrevista?vacante_id=…&disponible=true (candidato) */
  disponibles(vacanteId: number): Promise<Horario[]>;
  /** POST /horarios-entrevista (reclutador): fecha futura, 30, 45 o 60 min y liga de Meet o Teams. */
  publicar(datos: HorarioEntrada): Promise<Horario>;
  /** DELETE /horarios-entrevista/{id} (reclutador): solo un horario libre. */
  eliminar(id: number): Promise<void>;
}

export class HorariosHttp implements HorariosServicio {
  async disponibles(vacanteId: number) {
    return (
      await cliente.get<Horario[]>('/horarios-entrevista', {
        params: { vacante_id: vacanteId, disponible: true },
      })
    ).data;
  }

  async publicar(datos: HorarioEntrada) {
    return (await cliente.post<Horario>('/horarios-entrevista', datos)).data;
  }

  async eliminar(id: number) {
    await cliente.delete(`/horarios-entrevista/${id}`);
  }
}
