import {
  esDiaHabil,
  formatearDiaCorto,
  formatearFechaLarga,
  hoyEnMexico,
  sumarDias,
  textoHoraDelDia,
  textoHoraDelDiaHablada,
} from '../../../utilidades/fechas';

export const DURACIONES = ['30', '45', '60'] as const;
export type DuracionTexto = (typeof DURACIONES)[number];

export const MAX_DIAS_REPETIR = 5;
export const MAX_MOTIVO = 255;
const DIAS_ELEGIBLES = 90;
const INICIO_MINUTOS = 7 * 60;
const FIN_MINUTOS = 20 * 60;

/** Liga genérica de Google Meet o Microsoft Teams (la misma regla que el API). */
export const LIGA_VALIDA = /^https:\/\/(meet\.google\.com|teams\.microsoft\.com)\/\S+$/i;
export const MENSAJE_LIGA = 'Escribe una liga de Google Meet o de Microsoft Teams.';
export const MENSAJE_TRASLAPE = 'Este horario se traslapa con otro.';

/** Horas de inicio posibles: de 7:00 a 20:00 cada 15 minutos, como minutos desde la medianoche. */
export const HORAS_INICIO: number[] = Array.from(
  { length: (FIN_MINUTOS - INICIO_MINUTOS) / 15 + 1 },
  (_, indice) => INICIO_MINUTOS + indice * 15,
);

export const opcionesHora = () =>
  HORAS_INICIO.map((minutos) => ({
    id: minutos,
    nombre: textoHoraDelDia(minutos),
    etiquetaAccesible: textoHoraDelDiaHablada(minutos),
  }));

/** Días que se pueden elegir: hoy y los siguientes 90, con «Hoy» y «Mañana» donde toca. */
export function opcionesDia(hoy: string = hoyEnMexico()) {
  return Array.from({ length: DIAS_ELEGIBLES + 1 }, (_, indice) => {
    const fecha = sumarDias(hoy, indice);
    const prefijo = indice === 0 ? 'Hoy · ' : indice === 1 ? 'Mañana · ' : '';
    return {
      id: indice,
      fecha,
      nombre: `${prefijo}${formatearDiaCorto(fecha)}`,
      etiquetaAccesible: formatearFechaLarga(fecha),
    };
  });
}

/** La fecha elegida y las de los siguientes `dias` días hábiles (lunes a viernes). */
export function fechasConRepeticion(fecha: string, dias: number): string[] {
  const fechas = [fecha];
  let candidata = fecha;
  while (fechas.length < dias + 1) {
    candidata = sumarDias(candidata, 1);
    if (esDiaHabil(candidata)) fechas.push(candidata);
  }
  return fechas;
}
