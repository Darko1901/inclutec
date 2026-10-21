// El API manda fecha-hora en UTC (ISO 8601); la app la muestra en hora de la Ciudad de México.
// Los nombres de días y meses salen de arreglos fijos: Intl no los da igual en todos los motores
// (Hermes en iOS devuelve otras partes que Node), así que de Intl solo se toman números.
const ZONA = 'America/Mexico_City';

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function aFecha(iso: string): Date | null {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

const partesEnZona = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});

function partes(fecha: Date) {
  const valores: Record<string, number> = {};
  for (const { type, value } of partesEnZona.formatToParts(fecha)) {
    if (type !== 'literal') valores[type] = Number(value);
  }
  return valores;
}

interface Calendario {
  anio: number;
  mes: number; // 1 a 12
  dia: number;
  diaSemana: number; // 0 = domingo
}

/** Año, mes, día y día de la semana. «AAAA-MM-DD» se toma tal cual; una fecha-hora, en hora de la Ciudad de México. */
function calendario(iso: string): Calendario | null {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  let anio: number;
  let mes: number;
  let dia: number;
  if (soloFecha) {
    [anio, mes, dia] = [Number(soloFecha[1]), Number(soloFecha[2]), Number(soloFecha[3])];
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  } else {
    const fecha = aFecha(iso);
    if (!fecha) return null;
    ({ year: anio, month: mes, day: dia } = partes(fecha));
  }
  return { anio, mes, dia, diaSemana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() };
}

/** "AAAA-MM-DD" o fecha-hora ISO → "6 oct 2026". */
export function formatearFecha(iso: string): string {
  const c = calendario(iso);
  return c ? `${c.dia} ${MESES_CORTOS[c.mes - 1]} ${c.anio}` : '';
}

/** "10:30 a.m." en hora de la Ciudad de México. */
export function formatearHora(iso: string): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const { hour, minute } = partes(fecha);
  const h = hour % 24;
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(minute).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

/** "6 oct 2026, 10:30 a.m." */
export function formatearFechaHora(iso: string): string {
  const fecha = formatearFecha(iso);
  const hora = formatearHora(iso);
  return fecha && hora ? `${fecha}, ${hora}` : '';
}

function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Texto para listas: "hace 2 horas", "ayer", "hace 3 días" o la fecha. */
export function formatearRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${plural(minutos, 'minuto', 'minutos')}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${plural(horas, 'hora', 'horas')}`;
  if (horas < 48) return 'ayer';
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${plural(dias, 'día', 'días')}`;
  return formatearFecha(iso);
}

/** Número de día del calendario (en hora de la Ciudad de México), para comparar días. */
function numeroDeDia(fecha: Date): number {
  const { year, month, day } = partes(fecha);
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** "AAAA-MM-DD" o fecha-hora ISO → "12 oct" (con el año si no es el actual: "12 oct 2025"). */
export function formatearFechaCorta(iso: string, ahora: Date = new Date()): string {
  const c = calendario(iso);
  if (!c) return '';
  const texto = `${c.dia} ${MESES_CORTOS[c.mes - 1]}`;
  return c.anio === partes(ahora).year ? texto : `${texto} ${c.anio}`;
}

/** "jue 22 oct": día de la semana, día y mes abreviados. */
export function formatearDiaCorto(iso: string): string {
  const c = calendario(iso);
  return c ? `${DIAS_CORTOS[c.diaSemana]} ${c.dia} ${MESES_CORTOS[c.mes - 1]}` : '';
}

/** "Hoy", "Mañana" o "jue 22 oct": encabezado de los horarios agrupados por día. */
export function etiquetaDia(iso: string, ahora: Date = new Date()): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const diferencia = numeroDeDia(fecha) - numeroDeDia(ahora);
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Mañana';
  return formatearDiaCorto(iso);
}

/** Identifica el día (en hora de la Ciudad de México) para agrupar por día. */
export function claveDia(iso: string): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const { year, month, day } = partes(fecha);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "jueves 22 de octubre de 2026": así lo lee el lector de pantalla. */
export function formatearFechaLarga(iso: string): string {
  const c = calendario(iso);
  return c ? `${DIAS[c.diaSemana]} ${c.dia} de ${MESES[c.mes - 1]} de ${c.anio}` : '';
}

/** "10:30 de la mañana", "2:05 de la tarde": evita que se lea «a.m.» letra por letra. */
export function formatearHoraHablada(iso: string): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const { hour, minute } = partes(fecha);
  const hora12 = hour % 12 === 0 ? 12 : hour % 12;
  const periodo = hour < 12 ? 'de la mañana' : hour < 19 ? 'de la tarde' : 'de la noche';
  return `${hora12}:${String(minute).padStart(2, '0')} ${periodo}`;
}

/** "jueves 22 de octubre de 2026, a las 10:30 de la mañana". */
export function formatearFechaHoraHablada(iso: string): string {
  const dia = formatearFechaLarga(iso);
  return dia ? `${dia}, a las ${formatearHoraHablada(iso)}` : '';
}

/** Suma días a una fecha «AAAA-MM-DD» sin pasar por la zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Lunes a viernes (los feriados no se consideran). */
export function esDiaHabil(fecha: string): boolean {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

/** Fecha de hoy («AAAA-MM-DD») en hora de la Ciudad de México. */
export const hoyEnMexico = (ahora: Date = new Date()) => claveDia(ahora.toISOString());

/**
 * Instante (ISO, UTC) de una fecha «AAAA-MM-DD» y una hora dadas en hora de la Ciudad de México.
 * México no tiene horario de verano desde 2022: la diferencia con UTC es siempre de 6 horas.
 */
export function iniciarEnMexico(fecha: string, minutosDelDia: number): string {
  const hora = String(Math.floor(minutosDelDia / 60)).padStart(2, '0');
  const minutos = String(minutosDelDia % 60).padStart(2, '0');
  return new Date(`${fecha}T${hora}:${minutos}:00-06:00`).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** «7:00 a.m.» a partir de los minutos desde la medianoche. */
export function textoHoraDelDia(minutosDelDia: number): string {
  const hora = Math.floor(minutosDelDia / 60);
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${hora12}:${String(minutosDelDia % 60).padStart(2, '0')} ${hora < 12 ? 'a.m.' : 'p.m.'}`;
}

/** «7:00 de la mañana», para el lector de pantalla. */
export function textoHoraDelDiaHablada(minutosDelDia: number): string {
  const hora = Math.floor(minutosDelDia / 60);
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  const periodo = hora < 12 ? 'de la mañana' : hora < 19 ? 'de la tarde' : 'de la noche';
  return `${hora12}:${String(minutosDelDia % 60).padStart(2, '0')} ${periodo}`;
}
