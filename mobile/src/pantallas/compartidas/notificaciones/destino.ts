import type { Notificacion, RolUsuario } from '../../../api';

interface DestinoNotificacion {
  pantalla: string;
  params: Record<string, number | string> | undefined;
}

/**
 * Pantalla que se abre al tocar una notificación (tabla de notificaciones de la sección 2 del
 * contrato). Devuelve null si no hay pantalla relacionada: solo se marca como leída. Con el
 * `tipo` de la notificación, CAN-06 sabe qué parte resaltar («Desde tu notificación»).
 */
export function destinoNotificacion(
  rol: RolUsuario,
  referencia: Notificacion['referencia'],
  tipoNotificacion?: Notificacion['tipo'],
): DestinoNotificacion | null {
  if (!referencia) return null;
  const { tipo, id } = referencia;
  const esReclutador = rol === 'reclutador';

  switch (tipo) {
    case 'postulacion':
      // Candidato: CAN-06. Reclutador: REC-05.
      return esReclutador
        ? { pantalla: 'DetallePostulado', params: { id } }
        : {
            pantalla: 'DetallePostulacion',
            params: tipoNotificacion ? { id, desde: tipoNotificacion } : { id },
          };
    case 'entrevista':
      return esReclutador ? { pantalla: 'Agenda', params: { entrevista_id: id } } : null;
    case 'empresa':
      return esReclutador ? { pantalla: 'Organizacion', params: { empresa_id: id } } : null;
    case 'vacante':
      return esReclutador
        ? { pantalla: 'MisVacantes', params: { vacante_id: id } }
        : { pantalla: 'DetalleVacante', params: { id } };
    default:
      // reporte: no tiene pantalla propia; se queda en MOV-04.
      return null;
  }
}
