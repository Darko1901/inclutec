import type { VacanteEntrada } from '../tipos';
import { CATALOGOS, existeEnCatalogo } from './catalogos.datos';
import { lanzarSiHayCampos, type Campos } from './candidatos.validacion';
import { fallo } from './simulador';

// Validaciones de VacanteEntrada con las reglas y los límites del contrato. Guardar como borrador
// solo revisa formatos; publicar exige además lo que valida `camposFaltantesParaPublicar`.

const esTexto = (valor: unknown): valor is string => typeof valor === 'string';
const esNumeroOpcional = (valor: unknown) =>
  valor === null || valor === undefined || (typeof valor === 'number' && valor >= 0);

const esPresencialOHibrida = (modalidadId: number) =>
  ['Presencial', 'Híbrido'].includes(
    CATALOGOS.modalidades.find((m) => m.id === modalidadId)?.nombre ?? '',
  );

/** Formatos: lo que se revisa aunque la vacante se guarde como borrador. */
function validarVacante(datos: VacanteEntrada): Campos {
  const campos: Campos = {};
  if (!esTexto(datos?.titulo) || datos.titulo.trim() === '') {
    campos.titulo = 'Escribe el título de la vacante.';
  } else if (datos.titulo.length > 120) {
    campos.titulo = 'Usa máximo 120 caracteres.';
  }
  if (!existeEnCatalogo('categorias', datos?.categoria_id)) {
    campos.categoria_id = 'Elige una categoría.';
  }
  if (!esTexto(datos?.descripcion) || datos.descripcion.trim() === '') {
    campos.descripcion = 'Describe la vacante.';
  } else if (datos.descripcion.length > 2000) {
    campos.descripcion = 'Usa máximo 2000 caracteres.';
  }
  if (!existeEnCatalogo('jornadas', datos?.jornada_id)) campos.jornada_id = 'Elige la jornada.';
  if (!existeEnCatalogo('tipos-contrato', datos?.tipo_contrato_id)) {
    campos.tipo_contrato_id = 'Elige el tipo de contrato.';
  }
  if (!Number.isInteger(datos?.plazas) || datos.plazas < 1) {
    campos.plazas = 'Escribe cuántas plazas hay (mínimo 1).';
  }
  if (!existeEnCatalogo('modalidades', datos?.modalidad_id)) {
    campos.modalidad_id = 'Elige la modalidad.';
  }
  if (!existeEnCatalogo('municipios', datos?.municipio_id)) {
    campos.municipio_id = 'Elige el municipio.';
  }
  if (datos?.direccion != null && (!esTexto(datos.direccion) || datos.direccion.length > 255)) {
    campos.direccion = 'Usa máximo 255 caracteres.';
  }
  if (!esNumeroOpcional(datos?.salario_min)) campos.salario_min = 'Escribe un monto válido.';
  if (!esNumeroOpcional(datos?.salario_max)) campos.salario_max = 'Escribe un monto válido.';
  if (
    !campos.salario_min &&
    !campos.salario_max &&
    datos?.salario_min != null &&
    datos?.salario_max != null &&
    datos.salario_max < datos.salario_min
  ) {
    campos.salario_max = 'El salario máximo no puede ser menor que el mínimo.';
  }
  if (typeof datos?.mostrar_salario !== 'boolean') {
    campos.mostrar_salario = 'Indica si se muestra el salario.';
  }
  if (
    datos?.nivel_educativo_id != null &&
    !existeEnCatalogo('niveles-educativos', datos.nivel_educativo_id)
  ) {
    campos.nivel_educativo_id = 'Elige una formación válida.';
  }
  if (
    !Number.isInteger(datos?.experiencia_anios) ||
    datos.experiencia_anios < 0 ||
    datos.experiencia_anios > 50
  ) {
    campos.experiencia_anios = 'Escribe un número de años de 0 a 50.';
  }

  const habilidades = datos?.habilidades;
  if (!Array.isArray(habilidades)) {
    campos.habilidades = 'Revisa las habilidades.';
  } else {
    const ids = habilidades.map((h) => h?.habilidad_id);
    if (
      habilidades.some(
        (h) =>
          !existeEnCatalogo('habilidades', h?.habilidad_id) || typeof h.obligatoria !== 'boolean',
      ) ||
      new Set(ids).size !== ids.length
    ) {
      campos.habilidades = 'Hay habilidades que no existen o están repetidas.';
    }
  }

  const ajustes = datos?.ajustes;
  if (!Array.isArray(ajustes)) {
    campos.ajustes = 'Revisa los ajustes.';
  } else {
    const ids = ajustes.map((a) => a?.ajuste_id);
    if (
      ajustes.some(
        (a) =>
          !existeEnCatalogo('ajustes', a?.ajuste_id) ||
          !['existente', 'bajo_solicitud'].includes(a.tipo),
      ) ||
      new Set(ids).size !== ids.length
    ) {
      campos.ajustes = 'Hay ajustes que no existen o están en los dos grupos.';
    } else if (datos.sin_condiciones_accesibilidad === true && ajustes.length > 0) {
      campos.ajustes = 'Quita los ajustes o desmarca «Por ahora no contamos con condiciones».';
    }
  }
  if (typeof datos?.sin_condiciones_accesibilidad !== 'boolean') {
    campos.sin_condiciones_accesibilidad = 'Indica si cuentas con condiciones de accesibilidad.';
  }
  const notas = datos?.notas_accesibilidad;
  if (notas != null && (!esTexto(notas) || notas.length > 500)) {
    campos.notas_accesibilidad = 'Usa máximo 500 caracteres.';
  }
  if (!['borrador', 'publicada'].includes(datos?.estado)) {
    campos.estado = 'El estado puede ser «borrador» o «publicada».';
  }
  return campos;
}

export function lanzarSiVacanteInvalida(datos: VacanteEntrada): void {
  lanzarSiHayCampos(validarVacante(datos));
}

type DatosPublicables = Pick<
  VacanteEntrada,
  'habilidades' | 'direccion' | 'modalidad_id' | 'ajustes' | 'sin_condiciones_accesibilidad'
>;

/** Lo que falta para publicar, con el mismo nombre de campo que usa el 422 `vacante_incompleta`. */
function camposFaltantesParaPublicar(datos: DatosPublicables): Campos {
  const faltantes: Campos = {};
  if (!datos.habilidades.some((h) => h.obligatoria)) {
    faltantes.habilidades = 'Agrega al menos una habilidad obligatoria.';
  }
  if (esPresencialOHibrida(datos.modalidad_id) && !datos.direccion?.trim()) {
    faltantes.direccion = 'Escribe la dirección: la vacante es presencial o híbrida.';
  }
  if (datos.ajustes.length === 0 && !datos.sin_condiciones_accesibilidad) {
    faltantes.ajustes =
      'Indica las condiciones de accesibilidad o marca que por ahora no cuentas con ellas.';
  }
  return faltantes;
}

export function exigirVacanteCompleta(datos: DatosPublicables): void {
  const faltantes = camposFaltantesParaPublicar(datos);
  if (Object.keys(faltantes).length > 0) {
    throw fallo(422, 'vacante_incompleta', 'Faltan datos para publicar la vacante.', {
      campos: faltantes,
    });
  }
}
