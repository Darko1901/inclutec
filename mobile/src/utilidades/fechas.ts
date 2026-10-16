// El API manda fecha-hora en UTC (ISO 8601); la app la muestra en hora de la Ciudad de México.
const ZONA = 'America/Mexico_City';
const LOCALE = 'es-MX';

function aFecha(iso: string): Date | null {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** "AAAA-MM-DD" o fecha-hora ISO → "6 de oct de 2026". */
export function formatearFecha(iso: string): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const fecha = aFecha(soloFecha ? `${iso}T12:00:00Z` : iso);
  if (!fecha) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: soloFecha ? 'UTC' : ZONA,
  })
    .format(fecha)
    .replace(/\./g, '');
}

/** "10:30 a.m." en hora de la Ciudad de México. */
export function formatearHora(iso: string): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONA,
  }).format(fecha);
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

/** Número de día del calendario (en hora de la Ciudad de México), para comparar días. */
function numeroDeDia(fecha: Date): number {
  const { year, month, day } = partes(fecha);
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** "AAAA-MM-DD" o fecha-hora ISO → "12 oct" (con el año si no es el actual: "12 oct 2025"). */
export function formatearFechaCorta(iso: string, ahora: Date = new Date()): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const mismoAnio = partes(fecha).year === partes(ahora).year;
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    ...(mismoAnio ? {} : { year: 'numeric' as const }),
    timeZone: ZONA,
  })
    .format(fecha)
    .replace(/\./g, '');
}

/** "jue 22 oct": día de la semana, día y mes abreviados (se arma por partes: el orden y los «de» varían según el motor). */
export function formatearDiaCorto(iso: string): string {
  const fecha = aFecha(iso);
  if (!fecha) return '';
  const valores: Record<string, string> = {};
  const formato = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: ZONA,
  });
  for (const { type, value } of formato.formatToParts(fecha)) valores[type] = value;
  return `${valores.weekday} ${valores.day} ${valores.month}`.replace(/\./g, '');
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
  const fecha = aFecha(iso);
  if (!fecha) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA,
  })
    .format(fecha)
    .replace(/,/g, '');
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
