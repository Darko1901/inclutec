import type { EmpresaResumen } from '../../../api';

/** «3 vacantes activas», «1 vacante activa» o «Sin vacantes activas». */
export function textoVacantesActivas(cantidad: number): string {
  if (cantidad === 0) return 'Sin vacantes activas';
  return `${cantidad} ${cantidad === 1 ? 'vacante activa' : 'vacantes activas'}`;
}

/**
 * Lo que lee el lector de pantalla en una tarjeta del directorio, por ejemplo «TecnoQro, empresa
 * validada, Tecnologías de la información, 2 vacantes activas».
 */
export function resumenAccesibleEmpresa(empresa: EmpresaResumen): string {
  return [
    empresa.nombre_comercial,
    'empresa validada',
    empresa.sector.nombre,
    textoVacantesActivas(empresa.vacantes_publicadas),
  ].join(', ');
}

export const MENSAJE_REPORTE_EMPRESA = 'Gracias, revisaremos tu reporte';
export const SIN_PRACTICAS = 'Esta empresa aún no ha compartido sus prácticas de inclusión.';

/** Muestra solo el dominio de la liga: «https://www.tecnoqro.mx/inicio» → «tecnoqro.mx». */
export function dominioDe(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#].*$/, '');
}
