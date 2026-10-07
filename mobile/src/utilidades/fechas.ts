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
