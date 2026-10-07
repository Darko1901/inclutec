import type { VacanteResumen } from '../../../api';
import { formatearFecha, formatearRelativo } from '../../../utilidades/fechas';

/** «88 por ciento»: así lo lee el lector de pantalla; en pantalla se ve «88 %». */
export function porcentajeAccesible(valor: number): string {
  return `${valor} por ciento`;
}

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

export const MAX_AJUSTES_EN_TARJETA = 3;

/**
 * Lo que lee el lector de pantalla en una tarjeta: es un solo elemento con todo el resumen, por
 * ejemplo «Técnico de soporte de TI, TecnoQro, empresa validada, híbrido, Querétaro, compatibilidad
 * 88 por ciento, acceso con rampa, baño accesible, horario flexible. Ya te postulaste».
 */
export function resumenAccesible(vacante: VacanteResumen): string {
  const partes = [vacante.titulo, vacante.empresa.nombre_comercial];
  if (vacante.empresa.validada) partes.push('empresa validada');
  partes.push(minuscula(vacante.modalidad.nombre), vacante.municipio.nombre);
  if (vacante.compatibilidad !== null) {
    partes.push(`compatibilidad ${porcentajeAccesible(vacante.compatibilidad)}`);
  }
  const ajustes = vacante.ajustes.slice(0, MAX_AJUSTES_EN_TARJETA).map((a) => minuscula(a.nombre));
  partes.push(...(ajustes.length > 0 ? ajustes : ['sin ajustes de accesibilidad declarados']));
  const resumen = partes.join(', ');
  return vacante.postulacion_id === null ? resumen : `${resumen}. Ya te postulaste`;
}

/** «Publicada hace 3 días», «Publicada ayer» o «Publicada el 29 sep 2026». */
export function textoPublicada(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return '';
  const relativo = formatearRelativo(iso, ahora);
  if (relativo === 'ahora') return 'Publicada hoy';
  if (relativo.startsWith('hace') || relativo === 'ayer') return `Publicada ${relativo}`;
  return `Publicada el ${formatearFecha(iso)}`;
}

const pesos = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/** «$14,000 a $18,000 MXN»; null si la vacante no trae salario. */
export function textoSalario(salario: { min: number | null; max: number | null } | null) {
  if (!salario || (salario.min === null && salario.max === null)) return null;
  const monto = (valor: number) => `$${pesos.format(valor)}`;
  if (salario.min !== null && salario.max !== null) {
    return salario.min === salario.max
      ? `${monto(salario.min)} MXN`
      : `${monto(salario.min)} a ${monto(salario.max)} MXN`;
  }
  return salario.min !== null
    ? `Desde ${monto(salario.min)} MXN`
    : `Hasta ${monto(salario.max!)} MXN`;
}
