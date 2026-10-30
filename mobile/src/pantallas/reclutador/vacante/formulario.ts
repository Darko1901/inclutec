import type { VacanteDetalle, VacanteEntrada } from '../../../api';

export const TOTAL_PASOS = 4;
export type Paso = 1 | 2 | 3 | 4;
export const TITULOS_PASO: Record<Paso, string> = {
  1: 'Datos generales',
  2: 'Requisitos',
  3: 'Modalidad',
  4: 'Accesibilidad',
};

export const MAX_TITULO = 120;
export const MAX_DESCRIPCION = 2000;
export const MAX_NOTAS = 500;
export const MAX_DIRECCION = 255;

interface HabilidadElegida {
  id: number;
  nombre: string;
  obligatoria: boolean;
}

/** Lo que captura el formulario; los números van como texto mientras se escriben. */
export interface FormularioVacante {
  titulo: string;
  categoriaId: number | null;
  descripcion: string;
  jornadaId: number | null;
  tipoContratoId: number | null;
  plazas: string;
  municipioId: number | null;
  salarioMin: string;
  salarioMax: string;
  mostrarSalario: boolean;
  habilidades: HabilidadElegida[];
  nivelEducativoId: number | null;
  experiencia: string;
  modalidadId: number | null;
  direccion: string;
  /** «El lugar ya cuenta con». */
  existentes: number[];
  /** «Podemos ofrecer bajo solicitud». */
  bajoSolicitud: number[];
  sinCondiciones: boolean;
  notas: string;
}

export function formularioVacio(): FormularioVacante {
  return {
    titulo: '',
    categoriaId: null,
    descripcion: '',
    jornadaId: null,
    tipoContratoId: null,
    plazas: '1',
    municipioId: null,
    salarioMin: '',
    salarioMax: '',
    mostrarSalario: true,
    habilidades: [],
    nivelEducativoId: null,
    experiencia: '0',
    modalidadId: null,
    direccion: '',
    existentes: [],
    bajoSolicitud: [],
    sinCondiciones: false,
    notas: '',
  };
}

const comoTexto = (numero: number | null | undefined) => (numero == null ? '' : String(numero));

export function desdeDetalle(v: VacanteDetalle): FormularioVacante {
  return {
    titulo: v.titulo,
    categoriaId: v.categoria.id,
    descripcion: v.descripcion,
    jornadaId: v.jornada.id,
    tipoContratoId: v.tipo_contrato.id,
    plazas: String(v.plazas),
    municipioId: v.municipio.id,
    salarioMin: comoTexto(v.salario?.min),
    salarioMax: comoTexto(v.salario?.max),
    mostrarSalario: v.mostrar_salario,
    habilidades: v.habilidades.map((h) => ({
      id: h.id,
      nombre: h.nombre,
      obligatoria: h.obligatoria,
    })),
    nivelEducativoId: v.nivel_educativo?.id ?? null,
    experiencia: String(v.experiencia_anios),
    modalidadId: v.modalidad.id,
    direccion: v.direccion ?? '',
    existentes: v.ajustes.filter((a) => a.tipo === 'existente').map((a) => a.id),
    bajoSolicitud: v.ajustes.filter((a) => a.tipo === 'bajo_solicitud').map((a) => a.id),
    sinCondiciones: v.sin_condiciones_accesibilidad,
    notas: v.notas_accesibilidad ?? '',
  };
}

const aNumero = (texto: string) => (texto.trim() === '' ? null : Number(texto));

/** Cuerpo de POST o PUT /vacantes. Se asume que los pasos 1 a 3 ya se validaron. */
export function aEntrada(f: FormularioVacante, estado: VacanteEntrada['estado']): VacanteEntrada {
  return {
    titulo: f.titulo.trim(),
    categoria_id: f.categoriaId as number,
    descripcion: f.descripcion.trim(),
    jornada_id: f.jornadaId as number,
    tipo_contrato_id: f.tipoContratoId as number,
    plazas: Number(f.plazas),
    modalidad_id: f.modalidadId as number,
    municipio_id: f.municipioId as number,
    direccion: f.direccion.trim() || null,
    salario_min: aNumero(f.salarioMin),
    salario_max: aNumero(f.salarioMax),
    mostrar_salario: f.mostrarSalario,
    nivel_educativo_id: f.nivelEducativoId,
    experiencia_anios: Number(f.experiencia || '0'),
    habilidades: f.habilidades.map((h) => ({ habilidad_id: h.id, obligatoria: h.obligatoria })),
    ajustes: [
      ...f.existentes.map((ajuste_id) => ({ ajuste_id, tipo: 'existente' as const })),
      ...f.bajoSolicitud.map((ajuste_id) => ({ ajuste_id, tipo: 'bajo_solicitud' as const })),
    ],
    sin_condiciones_accesibilidad: f.sinCondiciones,
    notas_accesibilidad: f.notas.trim() || null,
    estado,
  };
}

/** Mensaje por campo, con el mismo nombre de campo que usa el contrato. */
export type Errores = Record<string, string>;

const DINERO = /^\d+(\.\d{1,2})?$/;

/** Valida solo el paso indicado (lo que «Siguiente» exige). Publicar se valida en el API. */
export function validarPaso(paso: Paso, f: FormularioVacante): Errores {
  const errores: Errores = {};
  if (paso === 1) {
    if (f.titulo.trim() === '') errores.titulo = 'Escribe el título de la vacante.';
    if (f.categoriaId === null) errores.categoria_id = 'Elige una categoría.';
    if (f.descripcion.trim() === '') errores.descripcion = 'Describe la vacante.';
    if (f.jornadaId === null) errores.jornada_id = 'Elige la jornada.';
    if (f.tipoContratoId === null) errores.tipo_contrato_id = 'Elige el tipo de contrato.';
    if (!/^\d+$/.test(f.plazas) || Number(f.plazas) < 1) {
      errores.plazas = 'Escribe cuántas plazas hay, con un número de 1 en adelante.';
    }
    if (f.municipioId === null) errores.municipio_id = 'Elige la entidad y el municipio.';
    const min = f.salarioMin.trim();
    const max = f.salarioMax.trim();
    if (min !== '' && !DINERO.test(min)) {
      errores.salario_min = 'Escribe solo números, por ejemplo 14000.';
    }
    if (max !== '' && !DINERO.test(max)) {
      errores.salario_max = 'Escribe solo números, por ejemplo 18000.';
    }
    if (!errores.salario_min && !errores.salario_max && min !== '' && max !== '') {
      if (Number(max) < Number(min)) {
        errores.salario_max = 'El salario máximo no puede ser menor que el mínimo.';
      }
    }
  }
  if (paso === 2) {
    if (!/^\d{1,2}$/.test(f.experiencia) || Number(f.experiencia) > 50) {
      errores.experiencia_anios = 'Escribe los años de experiencia, de 0 a 50.';
    }
  }
  if (paso === 3 && f.modalidadId === null) {
    errores.modalidad_id = 'Elige cómo se trabaja en esta vacante.';
  }
  return errores;
}

const PASO_DE_CAMPO: Record<string, Paso> = {
  titulo: 1,
  categoria_id: 1,
  descripcion: 1,
  jornada_id: 1,
  tipo_contrato_id: 1,
  plazas: 1,
  municipio_id: 1,
  salario_min: 1,
  salario_max: 1,
  mostrar_salario: 1,
  habilidades: 2,
  nivel_educativo_id: 2,
  experiencia_anios: 2,
  modalidad_id: 3,
  direccion: 3,
  ajustes: 4,
  sin_condiciones_accesibilidad: 4,
  notas_accesibilidad: 4,
};

export function pasoDeCampo(campo: string): Paso | null {
  return PASO_DE_CAMPO[campo] ?? null;
}

/** El primer paso (de 1 a 4) que tiene algún campo con error. */
export function primerPasoConError(errores: Errores): Paso | null {
  const pasos = Object.keys(errores)
    .map(pasoDeCampo)
    .filter((paso): paso is Paso => paso !== null);
  return pasos.length > 0 ? (Math.min(...pasos) as Paso) : null;
}

export function hayCambios(inicial: FormularioVacante, actual: FormularioVacante): boolean {
  return JSON.stringify(inicial) !== JSON.stringify(actual);
}

export const TEXTO_RECALCULO = 'La compatibilidad se recalculará y avisaremos a los postulados';

export function textoNotificados(cantidad: number): string {
  return cantidad === 1
    ? 'Avisamos a 1 postulado que cambiaron los requisitos y su compatibilidad.'
    : `Avisamos a ${cantidad} postulados que cambiaron los requisitos y su compatibilidad.`;
}
