import type { EstadoFormacion, Experiencia, Formacion, NivelHabilidad } from '../../../api';
import { periodoAccesible, periodoCorto } from '../../../utilidades/fechasCV';

export type PestanaCV = 'experiencia' | 'formacion' | 'habilidades';

export const PESTANAS_CV: { id: PestanaCV; titulo: string }[] = [
  { id: 'experiencia', titulo: 'Experiencia' },
  { id: 'formacion', titulo: 'Formación' },
  { id: 'habilidades', titulo: 'Habilidades' },
];

export const MAX_HABILIDADES = 30;

export const NOMBRE_ESTADO_FORMACION: Record<EstadoFormacion, string> = {
  concluida: 'Concluida',
  en_curso: 'En curso',
  trunca: 'Trunca',
};

/** Opciones del selector de estado (el selector trabaja con números). */
export const OPCIONES_ESTADO_FORMACION: { id: number; nombre: string; valor: EstadoFormacion }[] = [
  { id: 1, nombre: 'Concluida', valor: 'concluida' },
  { id: 2, nombre: 'En curso', valor: 'en_curso' },
  { id: 3, nombre: 'Trunca', valor: 'trunca' },
];

export const NOMBRE_NIVEL: Record<NivelHabilidad, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const OPCIONES_NIVEL: { id: number; nombre: string; valor: NivelHabilidad }[] = [
  { id: 1, nombre: 'Básico', valor: 'basico' },
  { id: 2, nombre: 'Intermedio', valor: 'intermedio' },
  { id: 3, nombre: 'Avanzado', valor: 'avanzado' },
];

/** «4 de 30», que el lector de pantalla dice como «4 de 30 habilidades». */
export const contadorHabilidades = (cantidad: number) => `${cantidad} de ${MAX_HABILIDADES}`;
export const contadorHabilidadesAccesible = (cantidad: number) =>
  `${cantidad} de ${MAX_HABILIDADES} habilidades`;

export const periodoExperiencia = (e: Experiencia) => periodoCorto(e);

export function etiquetaExperiencia(e: Experiencia): string {
  return `${e.puesto}, ${e.empresa}, ${periodoAccesible(e)}`;
}

export const periodoFormacion = (f: Formacion) => periodoCorto(f);

export function etiquetaFormacion(f: Formacion): string {
  const periodo = periodoAccesible(f);
  return [
    f.nivel_educativo.nombre,
    f.carrera,
    f.institucion,
    NOMBRE_ESTADO_FORMACION[f.estado].toLowerCase(),
    periodo || null,
  ]
    .filter(Boolean)
    .join(', ');
}
