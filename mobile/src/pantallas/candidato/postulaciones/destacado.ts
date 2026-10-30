import type { Notificacion, PostulacionDetalle } from '../../../api';

/** Parte de CAN-06 que se resalta cuando la persona llega desde una notificación. */
export type Destacado = 'entrevista' | 'horarios' | 'historial';

const TIPOS_DE_ENTREVISTA: Notificacion['tipo'][] = [
  'recordatorio_entrevista',
  'entrevista_cancelada',
  'entrevista_agendada',
];

/**
 * Qué enseñar primero según la notificación: una entrevista agendada si el aviso es de entrevista;
 * «Elige un horario» si la entrevista se canceló y hay que reservar otra; y en cualquier otro caso
 * el último paso del historial (el cambio de estado que provocó el aviso).
 */
export function elementoDestacado(
  tipo: string,
  detalle: Pick<PostulacionDetalle, 'estado' | 'entrevista'>,
): Destacado {
  if (TIPOS_DE_ENTREVISTA.includes(tipo as Notificacion['tipo'])) {
    if (detalle.entrevista?.estado === 'agendada') return 'entrevista';
    if (detalle.estado === 'entrevista' && !detalle.entrevista) return 'horarios';
  }
  return 'historial';
}
