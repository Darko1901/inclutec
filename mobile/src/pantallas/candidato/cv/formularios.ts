import type {
  EstadoFormacion,
  Experiencia,
  ExperienciaEntrada,
  Formacion,
  FormacionEntrada,
} from '../../../api';
import { aFechaApi, leerMesAnio, SIN_FECHA, type MesAnio } from '../../../utilidades/fechasCV';

// Estado de los formularios de CAN-04, su validación en el teléfono y su conversión al cuerpo del
// API. La app pide mes y año y guarda siempre el día 1.

export const MAX_PUESTO = 100;
export const MAX_EMPRESA = 120;
export const MAX_DESCRIPCION = 500;
export const MAX_INSTITUCION = 150;
export const MAX_CARRERA = 150;

const ANTERIOR = 'La fecha de fin no puede ser anterior a la de inicio.';
const INICIO = 'Elige el mes y el año de inicio.';

/** Una fecha de mes y año está completa si tiene las dos partes. */
const completa = (fecha: MesAnio) => aFechaApi(fecha) !== null;

// ———— Experiencia ————

export interface FormExperiencia {
  puesto: string;
  empresa: string;
  inicio: MesAnio;
  fin: MesAnio;
  actual: boolean;
  descripcion: string;
}

export type CampoExperiencia = 'puesto' | 'empresa' | 'fecha_inicio' | 'fecha_fin' | 'descripcion';
export type ErroresExperiencia = Partial<Record<CampoExperiencia, string>>;

export function formularioDeExperiencia(experiencia?: Experiencia): FormExperiencia {
  return {
    puesto: experiencia?.puesto ?? '',
    empresa: experiencia?.empresa ?? '',
    inicio: leerMesAnio(experiencia?.fecha_inicio ?? null),
    fin: leerMesAnio(experiencia?.fecha_fin ?? null),
    actual: experiencia?.actual ?? false,
    descripcion: experiencia?.descripcion ?? '',
  };
}

export function validarExperiencia(formulario: FormExperiencia): ErroresExperiencia {
  const errores: ErroresExperiencia = {};
  if (formulario.puesto.trim() === '') errores.puesto = 'Escribe el puesto.';
  if (formulario.empresa.trim() === '') errores.empresa = 'Escribe el nombre de la empresa.';
  if (!completa(formulario.inicio)) errores.fecha_inicio = INICIO;
  if (!formulario.actual) {
    const inicio = aFechaApi(formulario.inicio);
    const fin = aFechaApi(formulario.fin);
    if (fin === null) {
      errores.fecha_fin = 'Elige el mes y el año de fin, o marca «Trabajo aquí actualmente».';
    } else if (inicio !== null && fin < inicio) {
      errores.fecha_fin = ANTERIOR;
    }
  }
  return errores;
}

export function entradaDeExperiencia(formulario: FormExperiencia): ExperienciaEntrada {
  const descripcion = formulario.descripcion.trim();
  return {
    puesto: formulario.puesto.trim(),
    empresa: formulario.empresa.trim(),
    fecha_inicio: aFechaApi(formulario.inicio) ?? '',
    fecha_fin: formulario.actual ? null : aFechaApi(formulario.fin),
    actual: formulario.actual,
    descripcion: descripcion === '' ? null : descripcion,
  };
}

// ———— Formación ————

export interface FormFormacion {
  nivelId: number | null;
  institucion: string;
  carrera: string;
  estado: EstadoFormacion | null;
  inicio: MesAnio;
  fin: MesAnio;
}

export type CampoFormacion =
  'nivel_educativo_id' | 'institucion' | 'carrera' | 'estado' | 'fecha_inicio' | 'fecha_fin';
export type ErroresFormacion = Partial<Record<CampoFormacion, string>>;

export function formularioDeFormacion(formacion?: Formacion): FormFormacion {
  return {
    nivelId: formacion?.nivel_educativo.id ?? null,
    institucion: formacion?.institucion ?? '',
    carrera: formacion?.carrera ?? '',
    estado: formacion?.estado ?? null,
    inicio: leerMesAnio(formacion?.fecha_inicio ?? null),
    fin: leerMesAnio(formacion?.fecha_fin ?? null),
  };
}

export function validarFormacion(formulario: FormFormacion): ErroresFormacion {
  const errores: ErroresFormacion = {};
  if (formulario.nivelId === null) errores.nivel_educativo_id = 'Elige el nivel educativo.';
  if (formulario.institucion.trim() === '') {
    errores.institucion = 'Escribe el nombre de la institución.';
  }
  if (formulario.estado === null) {
    errores.estado = 'Elige si la concluiste, sigues en curso o quedó trunca.';
  }
  if (!completa(formulario.inicio)) errores.fecha_inicio = INICIO;
  const inicio = aFechaApi(formulario.inicio);
  const fin = aFechaApi(formulario.fin);
  // Si sigue en curso, la fecha de fin es opcional.
  if (fin === null && formulario.estado !== null && formulario.estado !== 'en_curso') {
    errores.fecha_fin = 'Elige el mes y el año de fin.';
  } else if (fin !== null && inicio !== null && fin < inicio) {
    errores.fecha_fin = ANTERIOR;
  }
  return errores;
}

export function entradaDeFormacion(formulario: FormFormacion): FormacionEntrada {
  const carrera = formulario.carrera.trim();
  return {
    nivel_educativo_id: formulario.nivelId ?? 0,
    institucion: formulario.institucion.trim(),
    carrera: carrera === '' ? null : carrera,
    estado: formulario.estado ?? 'concluida',
    fecha_inicio: aFechaApi(formulario.inicio),
    fecha_fin: aFechaApi(formulario.fin),
  };
}

export { SIN_FECHA };
