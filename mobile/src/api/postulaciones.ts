import { cliente } from './cliente';
import type {
  CambioEstadoPostulacion,
  ConsultaPostulaciones,
  ConsultaPostulados,
  Entrevista,
  Observacion,
  PaginaPostulaciones,
  PaginaPostulados,
  PostulacionDetalle,
  PostulacionEntrada,
  PostuladoDetalle,
  ResultadoCambioEstado,
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

  /** GET /vacantes/{id}/postulaciones (reclutador): ordenadas por compatibilidad del reclutador. */
  postuladosDe(vacanteId: number, consulta?: ConsultaPostulados): Promise<PaginaPostulados>;
  /** GET /postulaciones/{id}/candidato (reclutador) */
  detallePostulado(id: number): Promise<PostuladoDetalle>;
  /** PATCH /postulaciones/{id}/estado (reclutador) */
  cambiarEstado(id: number, datos: CambioEstadoPostulacion): Promise<ResultadoCambioEstado>;
  /** GET /postulaciones/{id}/observaciones (reclutador): más recientes primero. */
  observaciones(id: number): Promise<Observacion[]>;
  /** POST /postulaciones/{id}/observaciones (reclutador) */
  agregarObservacion(id: number, texto: string): Promise<Observacion>;
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

  async postuladosDe(vacanteId: number, consulta?: ConsultaPostulados) {
    return (
      await cliente.get<PaginaPostulados>(`/vacantes/${vacanteId}/postulaciones`, {
        params: consulta,
      })
    ).data;
  }

  async detallePostulado(id: number) {
    return (await cliente.get<PostuladoDetalle>(`/postulaciones/${id}/candidato`)).data;
  }

  async cambiarEstado(id: number, datos: CambioEstadoPostulacion) {
    return (await cliente.patch<ResultadoCambioEstado>(`/postulaciones/${id}/estado`, datos)).data;
  }

  async observaciones(id: number) {
    return (await cliente.get<Observacion[]>(`/postulaciones/${id}/observaciones`)).data;
  }

  async agregarObservacion(id: number, texto: string) {
    return (await cliente.post<Observacion>(`/postulaciones/${id}/observaciones`, { texto })).data;
  }
}
