import { ESTADOS } from '../../../componentes';
import type { EstadoPostulacion, Postulado } from '../../../api';
import { formatearFechaCorta } from '../../../utilidades/fechas';

/** Orden del filtro por estado (tabla 3.4 de docs/diseno/pantallas.md). */
export const ESTADOS_FILTRO: EstadoPostulacion[] = [
  'postulada',
  'en_revision',
  'entrevista',
  'aceptada',
  'no_seleccionada',
  'retirada',
];

export const textoEstadoPostulacion = (estado: EstadoPostulacion) =>
  ESTADOS.postulacion[estado].texto;

/** Compatibilidades mínimas del selector (el 0 equivale a «sin mínimo»). */
export const OPCIONES_MINIMA = [
  { id: 0, nombre: 'Todas', etiquetaAccesible: 'Todas, sin mínimo' },
  { id: 50, nombre: '50 % o más', etiquetaAccesible: '50 por ciento o más' },
  { id: 70, nombre: '70 % o más', etiquetaAccesible: '70 por ciento o más' },
  { id: 85, nombre: '85 % o más', etiquetaAccesible: '85 por ciento o más' },
] as const;

export const TEXTO_ORDEN = 'Ordenados de mayor a menor compatibilidad laboral.';
export const TEXTO_SIN_DISCAPACIDAD =
  'La compatibilidad laboral solo considera habilidades, formación y modalidad.';

export const textoCompatibilidad = (puntaje: number) => `Compatibilidad laboral ${puntaje} %`;

export function cantidadPostulados(total: number): string {
  return `${total} ${total === 1 ? 'postulado' : 'postulados'}`;
}

export const ETIQUETA_AJUSTES = 'Ajustes por confirmar';

/** «Se postuló el 30 sep». */
export const textoSePostulo = (creadoEn: string, ahora: Date = new Date()) =>
  `Se postuló el ${formatearFechaCorta(creadoEn, ahora)}`;

/** Todo el resumen de la tarjeta en una frase, para el lector de pantalla. */
export function resumenAccesiblePostulado(postulado: Postulado, ahora?: Date): string {
  const { nombre, apellidos } = postulado.candidato;
  const partes = [
    `${nombre} ${apellidos}`,
    `Compatibilidad laboral ${postulado.compatibilidad} por ciento`,
    `Estado: ${textoEstadoPostulacion(postulado.estado)}`,
    textoSePostulo(postulado.creado_en, ahora),
  ];
  if (postulado.ajustes_por_confirmar) partes.push(ETIQUETA_AJUSTES);
  return partes.join('. ');
}
