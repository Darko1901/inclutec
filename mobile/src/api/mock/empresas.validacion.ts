import type { ArchivoLocal } from '../candidatos';
import type { EmpresaEntrada } from '../tipos';
import { esRfcValido } from '../../utilidades/validaciones';
import { existeEnCatalogo } from './catalogos.datos';
import { lanzarSiHayCampos, type Campos } from './candidatos.validacion';
import { fallo } from './simulador';

// Validaciones de los cuerpos de /empresas/me con las reglas y los límites del contrato.

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_CONSTANCIA_BYTES = 5 * 1024 * 1024;

const esTexto = (valor: unknown): valor is string => typeof valor === 'string';
const textoOpcional = (valor: unknown, maximo: number) =>
  valor === null || valor === undefined || (esTexto(valor) && valor.length <= maximo);

export function validarEmpresa(datos: EmpresaEntrada): Campos {
  const campos: Campos = {};
  const nombre = datos?.nombre_comercial;
  if (!esTexto(nombre) || nombre.trim() === '') {
    campos.nombre_comercial = 'Escribe el nombre comercial.';
  } else if (nombre.length > 150) {
    campos.nombre_comercial = 'Usa máximo 150 caracteres.';
  }
  if (!existeEnCatalogo('sectores', datos?.sector_id)) campos.sector_id = 'Elige un sector.';
  if (!existeEnCatalogo('tamanos-empresa', datos?.tamano_empresa_id)) {
    campos.tamano_empresa_id = 'Elige el tamaño de la empresa.';
  }
  if (!existeEnCatalogo('municipios', datos?.municipio_id)) {
    campos.municipio_id = 'Elige el municipio.';
  }
  if (!textoOpcional(datos?.direccion, 255)) campos.direccion = 'Usa máximo 255 caracteres.';
  if (!textoOpcional(datos?.descripcion, 1000)) campos.descripcion = 'Usa máximo 1000 caracteres.';
  if (!textoOpcional(datos?.practicas_inclusion, 1000)) {
    campos.practicas_inclusion = 'Usa máximo 1000 caracteres.';
  }
  const sitio = datos?.sitio_web;
  if (!textoOpcional(sitio, 255)) {
    campos.sitio_web = 'Usa máximo 255 caracteres.';
  } else if (sitio && !/^https?:\/\/\S+\.\S+$/i.test(sitio)) {
    campos.sitio_web = 'Escribe la dirección completa, por ejemplo https://tuempresa.mx.';
  }
  if (datos?.razon_social !== undefined) {
    if (!esTexto(datos.razon_social) || datos.razon_social.trim() === '') {
      campos.razon_social = 'Escribe la razón social.';
    } else if (datos.razon_social.length > 200) {
      campos.razon_social = 'Usa máximo 200 caracteres.';
    }
  }
  if (datos?.rfc !== undefined && !(esTexto(datos.rfc) && esRfcValido(datos.rfc))) {
    campos.rfc = 'Escribe un RFC de 12 o 13 caracteres, en mayúsculas.';
  }
  return campos;
}

export function lanzarSiEmpresaInvalida(datos: EmpresaEntrada): void {
  lanzarSiHayCampos(validarEmpresa(datos));
}

function extension(archivo: ArchivoLocal): string {
  return (
    /\.([a-z0-9]+)(?:\?.*)?$/i.exec(archivo.nombre ?? archivo.uri ?? '')?.[1] ?? ''
  ).toLowerCase();
}

/** Logotipo: JPG o PNG de hasta 2 MB (422 archivo_invalido). */
export function exigirLogoValido(archivo: ArchivoLocal): void {
  const tipo = archivo?.tipo?.toLowerCase();
  const esImagen = tipo
    ? ['image/jpeg', 'image/jpg', 'image/png'].includes(tipo)
    : ['jpg', 'jpeg', 'png'].includes(extension(archivo));
  if (!archivo?.uri || !esImagen) {
    throw fallo(422, 'archivo_invalido', 'El logotipo debe ser JPG o PNG.');
  }
  if (archivo.tamano !== undefined && archivo.tamano > MAX_LOGO_BYTES) {
    throw fallo(422, 'archivo_invalido', 'El logotipo pesa más de 2 MB. Elige uno más ligero.');
  }
}

/** Constancia de situación fiscal: PDF de hasta 5 MB (422 archivo_invalido). */
export function exigirConstanciaValida(archivo: ArchivoLocal): void {
  const tipo = archivo?.tipo?.toLowerCase();
  const esPdf = tipo ? tipo === 'application/pdf' : extension(archivo) === 'pdf';
  if (!archivo?.uri || !esPdf) {
    throw fallo(422, 'archivo_invalido', 'La constancia debe ser un archivo PDF.');
  }
  if (archivo.tamano !== undefined && archivo.tamano > MAX_CONSTANCIA_BYTES) {
    throw fallo(
      422,
      'archivo_invalido',
      'La constancia pesa más de 5 MB. Elige un PDF más ligero.',
    );
  }
}
