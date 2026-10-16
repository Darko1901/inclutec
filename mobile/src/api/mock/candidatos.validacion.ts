import type {
  ExperienciaEntrada,
  FormacionEntrada,
  HabilidadesEntrada,
  NecesidadesEntrada,
  PerfilCandidatoEntrada,
} from '../tipos';
import { esTelefonoValido } from '../../utilidades/validaciones';
import { existeEnCatalogo } from './catalogos.datos';
import { fallo } from './simulador';

// Validaciones de los cuerpos de /candidatos/me con las reglas y los límites del contrato.
// Cada función devuelve un mensaje por campo (vacío si todo está bien); `lanzarSiHayCampos` los
// convierte en el 422 de validación.

export type Campos = Record<string, string>;

export const MAX_HABILIDADES = 30;
export const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export function lanzarSiHayCampos(campos: Campos): void {
  if (Object.keys(campos).length > 0) {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
  }
}

const esTexto = (valor: unknown): valor is string => typeof valor === 'string';
const textoObligatorio = (valor: unknown, maximo: number) =>
  esTexto(valor) && valor.trim().length > 0 && valor.length <= maximo;
const textoOpcional = (valor: unknown, maximo: number) =>
  valor === null || valor === undefined || (esTexto(valor) && valor.length <= maximo);

/** «AAAA-MM-DD» que existe en el calendario. */
export function esFechaValida(valor: unknown): valor is string {
  if (!esTexto(valor) || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const sonIdsDe = (tipo: string, ids: unknown) =>
  Array.isArray(ids) && ids.every((id) => existeEnCatalogo(tipo, id));

export function validarPerfil(datos: PerfilCandidatoEntrada): Campos {
  const campos: Campos = {};
  if (!textoObligatorio(datos.nombre, 80)) {
    campos.nombre = 'Escribe tu nombre (máximo 80 caracteres).';
  }
  if (!textoObligatorio(datos.apellidos, 120)) {
    campos.apellidos = 'Escribe tus apellidos (máximo 120 caracteres).';
  }
  if (datos.telefono !== null && !(esTexto(datos.telefono) && esTelefonoValido(datos.telefono))) {
    campos.telefono = 'Escribe un teléfono de 10 dígitos, sin espacios ni guiones.';
  }
  if (datos.municipio_id !== null && !existeEnCatalogo('municipios', datos.municipio_id)) {
    campos.municipio_id = 'Elige un municipio de la lista.';
  }
  if (datos.jornada_id !== null && !existeEnCatalogo('jornadas', datos.jornada_id)) {
    campos.jornada_id = 'Elige una jornada de la lista.';
  }
  if (!textoOpcional(datos.resumen, 500)) campos.resumen = 'Escribe máximo 500 caracteres.';
  if (typeof datos.disponible_reubicacion !== 'boolean') {
    campos.disponible_reubicacion = 'Indica si puedes reubicarte.';
  }
  if (!sonIdsDe('modalidades', datos.modalidad_ids)) {
    campos.modalidad_ids = 'Elige modalidades de la lista.';
  }
  if (!sonIdsDe('categorias', datos.categoria_ids)) {
    campos.categoria_ids = 'Elige categorías de la lista.';
  }
  if (!['preguntar', 'siempre', 'nunca'].includes(datos.compartir_ajustes)) {
    campos.compartir_ajustes = 'Elige una opción para compartir tus necesidades.';
  }
  return campos;
}

export function validarNecesidades(datos: NecesidadesEntrada): Campos {
  const campos: Campos = {};
  if (!sonIdsDe('ajustes', datos.ajuste_ids)) {
    campos.ajuste_ids = 'Elige necesidades de la lista.';
  }
  if (!textoOpcional(datos.nota_ajustes, 300)) {
    campos.nota_ajustes = 'Escribe máximo 300 caracteres.';
  }
  return campos;
}

export function validarExperiencia(datos: ExperienciaEntrada): Campos {
  const campos: Campos = {};
  if (!textoObligatorio(datos.puesto, 100)) {
    campos.puesto = 'Escribe el puesto (máximo 100 caracteres).';
  }
  if (!textoObligatorio(datos.empresa, 120)) {
    campos.empresa = 'Escribe la empresa (máximo 120 caracteres).';
  }
  if (!esFechaValida(datos.fecha_inicio)) campos.fecha_inicio = 'Elige la fecha de inicio.';
  if (typeof datos.actual !== 'boolean') campos.actual = 'Indica si trabajas aquí actualmente.';
  if (datos.actual === true) {
    if (datos.fecha_fin !== null) {
      campos.fecha_fin = 'Déjala vacía si trabajas aquí actualmente.';
    }
  } else if (!esFechaValida(datos.fecha_fin)) {
    campos.fecha_fin = 'Elige la fecha de fin o marca «Trabajo aquí actualmente».';
  } else if (esFechaValida(datos.fecha_inicio) && datos.fecha_fin < datos.fecha_inicio) {
    campos.fecha_fin = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
  if (!textoOpcional(datos.descripcion, 500)) {
    campos.descripcion = 'Escribe máximo 500 caracteres.';
  }
  return campos;
}

export function validarFormacion(datos: FormacionEntrada): Campos {
  const campos: Campos = {};
  if (!existeEnCatalogo('niveles-educativos', datos.nivel_educativo_id)) {
    campos.nivel_educativo_id = 'Elige el nivel educativo.';
  }
  if (!textoObligatorio(datos.institucion, 150)) {
    campos.institucion = 'Escribe la institución (máximo 150 caracteres).';
  }
  if (!textoOpcional(datos.carrera, 150)) campos.carrera = 'Escribe máximo 150 caracteres.';
  if (!['concluida', 'en_curso', 'trunca'].includes(datos.estado)) {
    campos.estado = 'Elige el estado de tus estudios.';
  }
  const inicio = datos.fecha_inicio;
  const fin = datos.fecha_fin;
  if (inicio !== null && !esFechaValida(inicio)) campos.fecha_inicio = 'Elige una fecha válida.';
  if (fin !== null && !esFechaValida(fin)) {
    campos.fecha_fin = 'Elige una fecha válida.';
  } else if (esFechaValida(inicio) && esFechaValida(fin) && fin < inicio) {
    campos.fecha_fin = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
  return campos;
}

/** Habilidades: máximo 30 y sin repetidos (`limite_habilidades`); lo demás es `validacion`. */
export function validarHabilidades(datos: HabilidadesEntrada): void {
  const lista = datos.habilidades;
  if (!Array.isArray(lista)) {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
      campos: { habilidades: 'Envía la lista de habilidades.' },
    });
  }
  const campos: Campos = {};
  lista.forEach((habilidad, indice) => {
    if (!existeEnCatalogo('habilidades', habilidad?.habilidad_id)) {
      campos[`habilidades.${indice}.habilidad_id`] = 'Elige una habilidad de la lista.';
    }
    if (!['basico', 'intermedio', 'avanzado'].includes(habilidad?.nivel)) {
      campos[`habilidades.${indice}.nivel`] = 'Elige básico, intermedio o avanzado.';
    }
  });
  lanzarSiHayCampos(campos);
  if (lista.length > MAX_HABILIDADES) {
    throw fallo(
      422,
      'limite_habilidades',
      `Puedes guardar máximo ${MAX_HABILIDADES} habilidades. Quita algunas para continuar.`,
    );
  }
  if (new Set(lista.map((habilidad) => habilidad.habilidad_id)).size !== lista.length) {
    throw fallo(422, 'limite_habilidades', 'Hay habilidades repetidas. Quita las duplicadas.');
  }
}
