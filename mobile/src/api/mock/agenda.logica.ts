import type {
  ConsultaAgenda,
  DiaAgenda,
  Entrevista,
  Horario,
  HorarioEntrada,
  ResultadoEntrevista,
} from '../tipos';
import { claveDia } from '../../utilidades/fechas';
import { exigirSesion, obtenerEstado } from './datos';
import { empresaDeLaSesion } from './empresas.mock';
import { aIso, type HorarioMock } from './negocio.datos';
import { fallo } from './simulador';
import { vistaDeEntrevista } from './vistas';
import { lanzarSiHayCampos } from './paginacion';
import { usuarioDe } from './postulados.logica';

// Lado del reclutador de los horarios y las entrevistas (REC-06).

const DURACIONES = [30, 45, 60];
const MAX_MOTIVO = 255;
const LIGA_VALIDA = /^https:\/\/(meet\.google\.com|teams\.microsoft\.com)\/\S+$/i;
const MINUTO_MS = 60000;
const DIA_MS = 24 * 3600 * 1000;
const UTC_MEXICO = '-06:00';

const finDe = (h: HorarioMock) => new Date(h.inicio).getTime() + h.duracion_min * MINUTO_MS;
const iso = (ms: number) => aIso(new Date(ms));

/** Horario de la empresa del reclutador; uno ajeno responde como si no existiera. */
function horarioPropio(id: number): HorarioMock {
  const empresa = empresaDeLaSesion();
  const estado = obtenerEstado();
  const horario = estado.horarios.find((h) => h.id === id);
  const vacante = horario && estado.vacantes.find((v) => v.id === horario.vacante_id);
  if (!horario || !vacante || vacante.empresa_id !== empresa.id) {
    throw fallo(404, 'no_encontrado', 'Ese horario no existe.');
  }
  return horario;
}

function vistaDeHorario(h: HorarioMock): Horario {
  return {
    id: h.id,
    vacante_id: h.vacante_id,
    inicio: h.inicio,
    fin: iso(finDe(h)),
    duracion_min: h.duracion_min,
    estado: h.estado,
    liga: h.liga,
  };
}

export function publicarHorario(datos: HorarioEntrada): Horario {
  const empresa = empresaDeLaSesion();
  const usuario = exigirSesion(['reclutador']);
  const estado = obtenerEstado();

  const campos: Record<string, string> = {};
  const inicio = Date.parse(datos?.inicio);
  if (Number.isNaN(inicio)) campos.inicio = 'Elige la fecha y la hora de inicio.';
  else if (inicio <= Date.now()) campos.inicio = 'Elige una fecha y una hora que aún no pasen.';
  if (!DURACIONES.includes(datos?.duracion_min)) {
    campos.duracion_min = 'La duración puede ser de 30, 45 o 60 minutos.';
  }
  if (typeof datos?.liga !== 'string' || !LIGA_VALIDA.test(datos.liga.trim())) {
    campos.liga = 'Escribe una liga de Google Meet o de Microsoft Teams.';
  }
  const vacante = estado.vacantes.find((v) => v.id === datos?.vacante_id);
  if (!vacante || vacante.empresa_id !== empresa.id) {
    throw fallo(404, 'no_encontrado', 'La vacante no existe.');
  }
  if (vacante.estado !== 'publicada') campos.vacante_id = 'Elige una vacante publicada.';
  lanzarSiHayCampos(campos);

  const fin = inicio + datos.duracion_min * MINUTO_MS;
  const traslapa = estado.horarios.some(
    (h) =>
      h.reclutador_id === usuario.usuario.id &&
      h.estado !== 'cancelado' &&
      new Date(h.inicio).getTime() < fin &&
      finDe(h) > inicio,
  );
  if (traslapa) {
    throw fallo(409, 'horario_traslapado', 'Este horario se traslapa con otro.');
  }

  const horario: HorarioMock = {
    id: estado.siguienteIdHorario++,
    vacante_id: vacante.id,
    reclutador_id: usuario.usuario.id,
    inicio: iso(inicio),
    duracion_min: datos.duracion_min as HorarioMock['duracion_min'],
    liga: datos.liga.trim(),
    estado: 'libre',
  };
  estado.horarios.push(horario);
  return vistaDeHorario(horario);
}

export function eliminarHorario(id: number): void {
  const horario = horarioPropio(id);
  if (horario.estado !== 'libre') {
    throw fallo(
      409,
      'estado_invalido',
      'Solo se puede eliminar un horario libre. Si ya está agendado, cancela la entrevista.',
    );
  }
  const estado = obtenerEstado();
  estado.horarios = estado.horarios.filter((h) => h.id !== id);
}

const fechaValida = (texto: unknown): texto is string =>
  typeof texto === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(texto) &&
  !Number.isNaN(Date.parse(`${texto}T00:00:00Z`)) &&
  new Date(`${texto}T00:00:00Z`).toISOString().slice(0, 10) === texto;

/** Suma días a una fecha «AAAA-MM-DD» sin pasar por la zona horaria. */
export const sumarDias = (fecha: string, dias: number) =>
  new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

/** Horarios del reclutador (libres y agendados) por día; por omisión, de hoy a 30 días. */
export function agendaDelReclutador(consulta: ConsultaAgenda = {}): DiaAgenda[] {
  const usuario = exigirSesion(['reclutador']);
  const campos: Record<string, string> = {};
  const hoy = claveDia(new Date().toISOString());
  const desde = consulta.desde ?? hoy;
  const hasta = consulta.hasta ?? (fechaValida(desde) ? sumarDias(desde, 30) : desde);
  if (!fechaValida(desde)) campos.desde = 'Usa el formato AAAA-MM-DD.';
  if (!fechaValida(hasta)) campos.hasta = 'Usa el formato AAAA-MM-DD.';
  if (!campos.desde && !campos.hasta && desde > hasta) {
    campos.hasta = 'La fecha final no puede ser anterior a la inicial.';
  }
  if (consulta.vacante_id !== undefined && !Number.isInteger(consulta.vacante_id)) {
    campos.vacante_id = 'Debe ser un número.';
  }
  lanzarSiHayCampos(campos);

  const desdeMs = Date.parse(`${desde}T00:00:00${UTC_MEXICO}`);
  const hastaMs = Date.parse(`${hasta}T23:59:59.999${UTC_MEXICO}`);
  const estado = obtenerEstado();
  const horarios = estado.horarios
    .filter((h) => h.reclutador_id === usuario.usuario.id && h.estado !== 'cancelado')
    .filter((h) => consulta.vacante_id === undefined || h.vacante_id === consulta.vacante_id)
    .filter((h) => {
      const inicio = new Date(h.inicio).getTime();
      return inicio >= desdeMs && inicio <= hastaMs;
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const dias = new Map<string, DiaAgenda>();
  for (const h of horarios) {
    const vacante = estado.vacantes.find((v) => v.id === h.vacante_id)!;
    const entrevista = estado.entrevistas.find(
      (e) => e.horario_id === h.id && e.estado !== 'cancelada',
    );
    const postulacion =
      entrevista && estado.postulaciones.find((p) => p.id === entrevista.postulacion_id);
    const candidato = postulacion && usuarioDe(postulacion.candidato_id)?.usuario;
    const fecha = claveDia(h.inicio);
    const dia = dias.get(fecha) ?? { fecha, horarios: [] };
    dia.horarios.push({
      id: h.id,
      inicio: h.inicio,
      fin: iso(finDe(h)),
      duracion_min: h.duracion_min,
      liga: h.liga,
      estado: h.estado,
      vacante: { id: vacante.id, titulo: vacante.titulo },
      entrevista:
        entrevista && postulacion && candidato
          ? {
              id: entrevista.id,
              estado: entrevista.estado,
              postulacion_id: postulacion.id,
              candidato: {
                id: candidato.id,
                nombre: candidato.nombre,
                apellidos: candidato.apellidos,
              },
            }
          : null,
    });
    dias.set(fecha, dia);
  }
  return [...dias.values()];
}

export function registrarResultado(id: number, datos: ResultadoEntrevista): Entrevista {
  const empresa = empresaDeLaSesion();
  const estado = obtenerEstado();
  const entrevista = estado.entrevistas.find((e) => e.id === id);
  const horario = entrevista && estado.horarios.find((h) => h.id === entrevista.horario_id);
  const vacante = horario && estado.vacantes.find((v) => v.id === horario.vacante_id);
  if (!entrevista || !horario || !vacante || vacante.empresa_id !== empresa.id) {
    throw fallo(404, 'no_encontrado', 'Esa entrevista no existe.');
  }

  const campos: Record<string, string> = {};
  if (!['realizada', 'no_asistio', 'cancelada'].includes(datos?.estado)) {
    campos.estado = 'Elige realizada, no asistió o cancelada.';
  }
  const motivo = datos?.motivo_cancelacion?.trim() ?? '';
  if (datos?.estado === 'cancelada') {
    if (motivo === '') campos.motivo_cancelacion = 'Escribe el motivo de la cancelación.';
    else if (motivo.length > MAX_MOTIVO) {
      campos.motivo_cancelacion = `El motivo puede tener hasta ${MAX_MOTIVO} caracteres.`;
    }
  }
  lanzarSiHayCampos(campos);

  if (entrevista.estado !== 'agendada') {
    throw fallo(409, 'transicion_invalida', 'Esta entrevista ya tiene un resultado o se canceló.');
  }
  if (datos.estado !== 'cancelada' && new Date(horario.inicio).getTime() > Date.now()) {
    throw fallo(
      409,
      'transicion_invalida',
      'La entrevista aún no empieza: podrás registrar el resultado después de la hora de inicio.',
    );
  }

  entrevista.estado = datos.estado;
  if (datos.estado === 'cancelada') {
    entrevista.motivo_cancelacion = motivo;
    // El horario queda cancelado (ya no se ofrece) y el candidato puede elegir otro.
    horario.estado = 'cancelado';
    const postulacion = estado.postulaciones.find((p) => p.id === entrevista.postulacion_id)!;
    estado.notificaciones.push({
      usuario_id: postulacion.candidato_id,
      id: estado.siguienteIdNotificacion++,
      tipo: 'entrevista_cancelada',
      titulo: 'Entrevista cancelada',
      mensaje: `${empresa.nombre_comercial} canceló tu entrevista de ${vacante.titulo}. Motivo: ${motivo}`,
      referencia: { tipo: 'postulacion', id: postulacion.id },
      leida: false,
      creado_en: aIso(new Date()),
    });
  }
  return { ...vistaDeEntrevista(entrevista), puede_cancelar: false };
}
