import type { Horario } from '../../../api';
import {
  claveDia,
  etiquetaDia,
  formatearDiaCorto,
  formatearFechaHoraHablada,
  formatearFechaLarga,
  formatearHoraHablada,
} from '../../../utilidades/fechas';
import { duracionHablada } from '../../../utilidades/formatos';

export const TEXTO_HORARIO_OCUPADO = 'Ese horario acaba de ser tomado, elige otro.';
export const TEXTO_SIN_HORARIOS =
  'La empresa aún no publica horarios. Te avisaremos cuando lo haga.';
export const ACLARACION_CANCELAR = 'Puedes cancelar hasta 24 h antes.';
export const EXPLICACION_CANCELACION_TARDIA =
  'Ya no puedes cancelar desde la app porque faltan menos de 24 h para la entrevista. Si no puedes asistir, avísale a la empresa.';

interface GrupoHorarios {
  clave: string;
  /** «Hoy», «Mañana» o «jue 22 oct». */
  titulo: string;
  /** Lo que lee el lector de pantalla: «Hoy», «Mañana» o «jueves 22 de octubre de 2026». */
  tituloAccesible: string;
  horarios: Horario[];
}

/** Agrupa los horarios por día (en hora de la Ciudad de México), del más próximo al más lejano. */
export function agruparPorDia(horarios: Horario[], ahora: Date = new Date()): GrupoHorarios[] {
  const grupos = new Map<string, GrupoHorarios>();
  for (const horario of [...horarios].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const clave = claveDia(horario.inicio);
    let grupo = grupos.get(clave);
    if (!grupo) {
      const titulo = etiquetaDia(horario.inicio, ahora);
      grupo = {
        clave,
        titulo,
        tituloAccesible:
          titulo === formatearDiaCorto(horario.inicio)
            ? formatearFechaLarga(horario.inicio)
            : titulo,
        horarios: [],
      };
      grupos.set(clave, grupo);
    }
    grupo.horarios.push(horario);
  }
  return [...grupos.values()];
}

/** «Agendar, jueves 22 de octubre de 2026, a las 10:30 de la mañana, 45 minutos». */
export function etiquetaAgendar(horario: Horario): string {
  return `Agendar, ${formatearFechaHoraHablada(horario.inicio)}, ${duracionHablada(horario.duracion_min)}`;
}

/** «jueves 22 de octubre de 2026, a las 10:30 de la mañana, 45 minutos». */
export function descripcionHorario(inicio: string, minutos: number): string {
  return `${formatearFechaHoraHablada(inicio)}, ${duracionHablada(minutos)}`;
}

export { formatearHoraHablada };
