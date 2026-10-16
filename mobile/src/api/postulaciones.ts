import { cliente } from './cliente';
import type {
  ConsultaPostulaciones,
  Entrevista,
  PaginaPostulaciones,
  PostulacionDetalle,
  PostulacionEntrada,
} from './tipos';

/** Postulaciones del candidato (sección «Postulaciones» del contrato). */
export interface PostulacionesServicio {
  /** POST /postulaciones */
  crear(datos: PostulacionEntrada): Promise<PostulacionDetalle>;
  /** GET /postulaciones/me */
  mias(consulta?: ConsultaPostulaciones): Promise<PaginaPostulaciones>;
  /** GET /postulaciones/{id} */
  detalle(id: number): Promise<PostulacionDetalle>;
  /** PATCH /postulaciones/{id}/retirar */
  retirar(id: number): Promise<PostulacionDetalle>;
  /** POST /postulaciones/{id}/entrevista */
  agendarEntrevista(id: number, horarioId: number): Promise<Entrevista>;
}

export class PostulacionesHttp implements PostulacionesServicio {
  async crear(datos: PostulacionEntrada) {
    return (await cliente.post<PostulacionDetalle>('/postulaciones', datos)).data;
  }

  async mias(consulta?: ConsultaPostulaciones) {
    return (await cliente.get<PaginaPostulaciones>('/postulaciones/me', { params: consulta })).data;
  }

  async detalle(id: number) {
    return (await cliente.get<PostulacionDetalle>(`/postulaciones/${id}`)).data;
  }

  async retirar(id: number) {
    return (await cliente.patch<PostulacionDetalle>(`/postulaciones/${id}/retirar`)).data;
  }

  async agendarEntrevista(id: number, horarioId: number) {
    return (
      await cliente.post<Entrevista>(`/postulaciones/${id}/entrevista`, { horario_id: horarioId })
    ).data;
  }
}
