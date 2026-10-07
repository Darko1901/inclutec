import { cliente } from './cliente';
import type { PostulacionDetalle, PostulacionEntrada } from './tipos';

/** Postulaciones del candidato (sección «Postulaciones» del contrato). */
export interface PostulacionesServicio {
  /** POST /postulaciones */
  crear(datos: PostulacionEntrada): Promise<PostulacionDetalle>;
}

export class PostulacionesHttp implements PostulacionesServicio {
  async crear(datos: PostulacionEntrada) {
    return (await cliente.post<PostulacionDetalle>('/postulaciones', datos)).data;
  }
}
