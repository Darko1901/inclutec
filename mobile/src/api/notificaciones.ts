import { cliente } from './cliente';
import type {
  ConsultaNotificaciones,
  Dispositivo,
  PaginaNotificaciones,
  PreferenciaNotificacion,
  ResumenNotificaciones,
} from './tipos';

/** Notificaciones del candidato y del reclutador (sección «Notificaciones» del contrato). */
export interface NotificacionesServicio {
  /** POST /dispositivos */
  registrarDispositivo(datos: Dispositivo): Promise<void>;
  /** GET /notificaciones */
  listar(consulta?: ConsultaNotificaciones): Promise<PaginaNotificaciones>;
  /** GET /notificaciones/resumen */
  resumen(): Promise<ResumenNotificaciones>;
  /** PATCH /notificaciones/{id}/leida */
  marcarLeida(id: number): Promise<void>;
  /** PATCH /notificaciones/leidas */
  marcarTodasLeidas(): Promise<void>;
  /** GET /notificaciones/preferencias */
  obtenerPreferencias(): Promise<PreferenciaNotificacion[]>;
  /** PUT /notificaciones/preferencias */
  guardarPreferencias(preferencias: PreferenciaNotificacion[]): Promise<PreferenciaNotificacion[]>;
}

export class NotificacionesHttp implements NotificacionesServicio {
  async registrarDispositivo(datos: Dispositivo) {
    await cliente.post('/dispositivos', datos);
  }

  async listar(consulta?: ConsultaNotificaciones) {
    return (await cliente.get<PaginaNotificaciones>('/notificaciones', { params: consulta })).data;
  }

  async resumen() {
    return (await cliente.get<ResumenNotificaciones>('/notificaciones/resumen')).data;
  }

  async marcarLeida(id: number) {
    await cliente.patch(`/notificaciones/${id}/leida`);
  }

  async marcarTodasLeidas() {
    await cliente.patch('/notificaciones/leidas');
  }

  async obtenerPreferencias() {
    return (await cliente.get<PreferenciaNotificacion[]>('/notificaciones/preferencias')).data;
  }

  async guardarPreferencias(preferencias: PreferenciaNotificacion[]) {
    return (
      await cliente.put<PreferenciaNotificacion[]>('/notificaciones/preferencias', preferencias)
    ).data;
  }
}
