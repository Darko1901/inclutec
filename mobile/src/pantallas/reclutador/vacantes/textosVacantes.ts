import { ESTADOS } from '../../../componentes';
import type { EstadoVacante, VacanteReclutador } from '../../../api';
import { formatearFechaCorta } from '../../../utilidades/fechas';

/** Orden del filtro de REC-02 (tabla 3.4 de docs/diseno/pantallas.md). */
export const ESTADOS_FILTRO: EstadoVacante[] = [
  'borrador',
  'publicada',
  'pausada',
  'cerrada',
  'suspendida',
];

export const textoEstadoVacante = (estado: EstadoVacante) => ESTADOS.vacante[estado].texto;

export type AccionVacante = 'editar' | 'publicar' | 'pausar' | 'reanudar' | 'cerrar' | 'duplicar';

export const TITULO_ACCION: Record<AccionVacante, string> = {
  editar: 'Editar',
  publicar: 'Publicar',
  pausar: 'Pausar',
  reanudar: 'Reanudar',
  cerrar: 'Cerrar',
  duplicar: 'Duplicar',
};

/**
 * Acciones del menú ⋮ según el estado (transiciones del contrato): una vacante cerrada ya no se
 * edita ni se reabre y una suspendida solo la reactiva el administrador.
 */
export function accionesDe(estado: EstadoVacante): AccionVacante[] {
  switch (estado) {
    case 'borrador':
      return ['editar', 'publicar', 'duplicar'];
    case 'publicada':
      return ['editar', 'pausar', 'cerrar', 'duplicar'];
    case 'pausada':
      return ['editar', 'reanudar', 'cerrar', 'duplicar'];
    case 'cerrada':
      return ['duplicar'];
    case 'suspendida':
      return [];
  }
}

/** Las acciones que dejan la vacante visible para los candidatos necesitan la empresa validada. */
export const requiereEmpresaValidada = (accion: AccionVacante) =>
  accion === 'publicar' || accion === 'reanudar';

export const TEXTO_SUSPENDIDA = 'Suspendida por el administrador';

/** «14 postulados · 3 nuevos», «1 postulado» o «Sin postulados». */
export function textoPostulados(postulados: number, nuevas: number): string {
  if (postulados === 0) return 'Sin postulados';
  const total = `${postulados} ${postulados === 1 ? 'postulado' : 'postulados'}`;
  return nuevas > 0 ? `${total} · ${nuevas} ${nuevas === 1 ? 'nuevo' : 'nuevos'}` : total;
}

/** «Publicada el 29 sep» o, si nunca se publicó, «Sin publicar». */
export function textoFechaPublicacion(
  publicadaEn: string | null,
  ahora: Date = new Date(),
): string {
  return publicadaEn ? `Publicada el ${formatearFechaCorta(publicadaEn, ahora)}` : 'Sin publicar';
}

/** Todo el resumen de la tarjeta en una frase, para el lector de pantalla. */
export function resumenAccesibleVacante(vacante: VacanteReclutador, ahora?: Date): string {
  const postulados =
    vacante.postulados === 0
      ? 'Sin postulados'
      : `${vacante.postulados} ${vacante.postulados === 1 ? 'postulado' : 'postulados'}, ${vacante.nuevas} ${vacante.nuevas === 1 ? 'nuevo' : 'nuevos'}`;
  const partes = [
    vacante.titulo,
    vacante.modalidad.nombre,
    `Estado: ${textoEstadoVacante(vacante.estado)}`,
    postulados,
    textoFechaPublicacion(vacante.publicada_en, ahora),
  ];
  if (vacante.estado === 'suspendida') partes.push(TEXTO_SUSPENDIDA);
  return `${partes.join('. ')}`;
}

export const AVISO_EMPRESA_SIN_VALIDAR = 'Podrás publicar cuando validemos tu empresa';

/** Mensaje de una acción que salió bien. */
export function mensajeAccionHecha(accion: AccionVacante, titulo: string): string {
  switch (accion) {
    case 'publicar':
      return `«${titulo}» se publicó.`;
    case 'pausar':
      return `«${titulo}» quedó pausada.`;
    case 'reanudar':
      return `«${titulo}» se reanudó.`;
    case 'cerrar':
      return `«${titulo}» se cerró.`;
    default:
      return '';
  }
}

export const CONFIRMACION: Partial<
  Record<AccionVacante, { titulo: string; mensaje: string; boton: string; peligro?: boolean }>
> = {
  publicar: {
    titulo: '¿Publicar esta vacante?',
    mensaje: 'Los candidatos podrán verla y postularse.',
    boton: 'Publicar',
  },
  pausar: {
    titulo: '¿Pausar esta vacante?',
    mensaje: 'Los candidatos dejarán de verla hasta que la reanudes.',
    boton: 'Pausar',
  },
  reanudar: {
    titulo: '¿Reanudar esta vacante?',
    mensaje: 'Los candidatos volverán a verla y podrán postularse.',
    boton: 'Reanudar',
  },
  cerrar: {
    titulo: '¿Cerrar esta vacante?',
    mensaje:
      'Dejará de recibir postulaciones y ya no podrás editarla ni abrirla de nuevo. Puedes duplicarla como borrador.',
    boton: 'Cerrar vacante',
    peligro: true,
  },
};
