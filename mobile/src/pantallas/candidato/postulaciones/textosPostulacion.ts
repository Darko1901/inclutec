import { ESTADOS } from '../../../componentes';
import type { EstadoPostulacion, PostulacionResumen } from '../../../api';
import {
  formatearFechaCorta,
  formatearFechaHoraHablada,
  formatearFechaLarga,
  formatearHora,
} from '../../../utilidades/fechas';

export type PestanaPostulaciones = 'activas' | 'finalizadas';

/** Estados que corresponden a cada pestaña (sección «Transiciones de estado» del contrato). */
export const ESTADOS_POR_PESTANA: Record<PestanaPostulaciones, EstadoPostulacion[]> = {
  activas: ['postulada', 'en_revision', 'entrevista'],
  finalizadas: ['aceptada', 'no_seleccionada', 'retirada'],
};

export const TITULO_PESTANA: Record<PestanaPostulaciones, string> = {
  activas: 'Activas',
  finalizadas: 'Finalizadas',
};

export const textoEstado = (estado: EstadoPostulacion) => ESTADOS.postulacion[estado].texto;

/** «Te postulaste el 12 oct». */
export function textoPostulaste(creadoEn: string, ahora: Date = new Date()): string {
  return `Te postulaste el ${formatearFechaCorta(creadoEn, ahora)}`;
}

/** «Entrevista el 6 oct, 10:00 a.m.». */
export function textoEntrevista(inicio: string, ahora: Date = new Date()): string {
  return `Entrevista el ${formatearFechaCorta(inicio, ahora)}, ${formatearHora(inicio)}`;
}

/** «2 postulaciones» / «1 postulación»: lo que dice el lector de pantalla en cada pestaña. */
export function cantidadPostulaciones(total: number): string {
  return `${total} ${total === 1 ? 'postulación' : 'postulaciones'}`;
}

/**
 * Lo que lee el lector de pantalla en una tarjeta de CAN-05: es un solo elemento con todo el
 * resumen, por ejemplo «Técnico de soporte de TI, TecnoQro. Te postulaste el miércoles 30 de
 * septiembre de 2026. Estado: Entrevista. Entrevista agendada el jueves 22 de octubre de 2026, a
 * las 10:30 de la mañana».
 */
export function resumenAccesiblePostulacion(postulacion: PostulacionResumen): string {
  const partes = [
    `${postulacion.vacante.titulo}, ${postulacion.vacante.empresa.nombre_comercial}`,
    `Te postulaste el ${formatearFechaLarga(postulacion.creado_en)}`,
    `Estado: ${textoEstado(postulacion.estado)}`,
  ];
  if (postulacion.entrevista_inicio) {
    partes.push(
      `Entrevista agendada el ${formatearFechaHoraHablada(postulacion.entrevista_inicio)}`,
    );
  }
  return partes.join('. ');
}
