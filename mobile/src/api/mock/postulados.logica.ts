import type {
  CambioEstadoPostulacion,
  ConsultaPostulados,
  EstadoPostulacion,
  Observacion,
  PaginaPostulados,
  Postulado,
  PostuladoDetalle,
  ResultadoCambioEstado,
} from '../tipos';
import { calcularCompatibilidad, entradaDeCandidato, entradaDeVacante } from './compatibilidad';
import { exigirSesion, obtenerEstado, type UsuarioMock } from './datos';
import { empresaDeLaSesion } from './empresas.mock';
import { aIso, type CandidatoMock, type PostulacionMock, type VacanteMock } from './negocio.datos';
import { lanzarSiHayCampos, leerPagina, paginar } from './paginacion';
import { fallo } from './simulador';
import { ajusteRefDe, cvDeCandidato, desgloseDeCompatibilidad, vistaDeEntrevista } from './vistas';

// Lado del reclutador de las postulaciones (REC-04 y REC-05). Regla que no se rompe: aquí nunca
// sale un diagnóstico; las necesidades de ajuste solo se ven si el candidato las compartió en esa
// postulación y jamás cambian el puntaje ni el orden.

const MAX_MENSAJE = 500;
const MAX_OBSERVACION = 1000;
const ESTADOS: EstadoPostulacion[] = [
  'postulada',
  'en_revision',
  'entrevista',
  'aceptada',
  'no_seleccionada',
  'retirada',
];

/** Transiciones que puede pedir el reclutador (sección 2 del contrato). */
const TRANSICIONES: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  postulada: ['en_revision', 'no_seleccionada'],
  en_revision: ['entrevista', 'no_seleccionada'],
  entrevista: ['aceptada', 'no_seleccionada'],
  aceptada: [],
  no_seleccionada: [],
  retirada: [],
};

/** La persona ve el contacto del candidato solo a partir de «entrevista». */
const ESTADOS_CON_CONTACTO: EstadoPostulacion[] = ['entrevista', 'aceptada'];

const sinPermiso = () =>
  fallo(403, 'sin_permiso', 'Esta vacante o postulación no es de tu empresa.');

export const usuarioDe = (id: number): UsuarioMock | undefined =>
  obtenerEstado().usuarios.find((u) => u.usuario.id === id);

/** Vacante de la empresa del reclutador: inexistente → 404; de otra empresa → 403. */
function vacanteAccesible(id: number): VacanteMock {
  const empresa = empresaDeLaSesion();
  const vacante = obtenerEstado().vacantes.find((v) => v.id === id);
  if (!vacante) throw fallo(404, 'no_encontrado', 'La vacante no existe.');
  if (vacante.empresa_id !== empresa.id) throw sinPermiso();
  return vacante;
}

/** Postulación a una vacante de la empresa del reclutador. */
function postulacionAccesible(id: number) {
  const empresa = empresaDeLaSesion();
  const estado = obtenerEstado();
  const postulacion = estado.postulaciones.find((p) => p.id === id);
  if (!postulacion) throw fallo(404, 'no_encontrado', 'La postulación no existe.');
  const vacante = estado.vacantes.find((v) => v.id === postulacion.vacante_id)!;
  if (vacante.empresa_id !== empresa.id) throw sinPermiso();
  const candidato = estado.candidatos.find((c) => c.usuario_id === postulacion.candidato_id)!;
  const usuario = usuarioDe(postulacion.candidato_id)!.usuario;
  return { postulacion, vacante, candidato, usuario };
}

/** Compatibilidad del reclutador: sin el componente A, así que las necesidades no la tocan. */
function compatibilidadReclutador(candidato: CandidatoMock, vacante: VacanteMock) {
  return calcularCompatibilidad(entradaDeCandidato(candidato), entradaDeVacante(vacante));
}

/** El candidato compartió sus necesidades en esta postulación y sigue dando su consentimiento. */
function comparteNecesidades(postulacion: PostulacionMock, candidato: CandidatoMock): boolean {
  return postulacion.comparte_ajustes && candidato.consentimiento_sensibles_en !== null;
}

/** Cómo declara la vacante cada necesidad del candidato. */
function estadoDeNecesidad(vacante: VacanteMock, ajusteId: number) {
  return vacante.ajustes.find((a) => a.ajuste_id === ajusteId)?.tipo ?? 'no_declarada';
}

function ajustesPorConfirmar(
  postulacion: PostulacionMock,
  candidato: CandidatoMock,
  vacante: VacanteMock,
): boolean {
  return (
    comparteNecesidades(postulacion, candidato) &&
    candidato.necesidad_ids.some((id) => estadoDeNecesidad(vacante, id) !== 'existente')
  );
}

export function listarPostulados(vacanteId: number, consulta: ConsultaPostulados = {}) {
  const vacante = vacanteAccesible(vacanteId);
  const { page, size } = leerPagina(consulta);
  const campos: Record<string, string> = {};
  if (consulta.estado !== undefined && !ESTADOS.includes(consulta.estado as EstadoPostulacion)) {
    campos.estado = 'Elige un estado de la lista.';
  }
  const minima = consulta.compatibilidad_min;
  if (minima !== undefined && !(Number.isInteger(minima) && minima >= 0 && minima <= 100)) {
    campos.compatibilidad_min = 'Debe ser un número de 0 a 100.';
  }
  lanzarSiHayCampos(campos);

  const estado = obtenerEstado();
  const filas = estado.postulaciones
    .filter((p) => p.vacante_id === vacante.id)
    // Sin filtro no aparecen las retiradas (ya no son postulados); se piden con estado=retirada.
    .filter((p) => (consulta.estado ? p.estado === consulta.estado : p.estado !== 'retirada'))
    .map((postulacion) => {
      const candidato = estado.candidatos.find((c) => c.usuario_id === postulacion.candidato_id)!;
      const usuario = usuarioDe(postulacion.candidato_id)!.usuario;
      const item: Postulado = {
        postulacion_id: postulacion.id,
        candidato: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          foto_url: candidato.foto_url,
        },
        compatibilidad: compatibilidadReclutador(candidato, vacante).puntaje_reclutador,
        estado: postulacion.estado,
        creado_en: postulacion.creado_en,
        ajustes_por_confirmar: ajustesPorConfirmar(postulacion, candidato, vacante),
      };
      return item;
    })
    .filter((item) => item.compatibilidad >= (minima ?? 0))
    // Mayor compatibilidad primero; en empate, quien se postuló antes.
    .sort(
      (a, b) =>
        b.compatibilidad - a.compatibilidad ||
        a.creado_en.localeCompare(b.creado_en) ||
        a.postulacion_id - b.postulacion_id,
    );
  const pagina: PaginaPostulados = paginar(filas, page, size);
  return pagina;
}

/** La entrevista más reciente que no se canceló (agendada, realizada o sin asistencia). */
function entrevistaDe(postulacionId: number) {
  return obtenerEstado()
    .entrevistas.filter((e) => e.postulacion_id === postulacionId && e.estado !== 'cancelada')
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))[0];
}

export function detalleDePostulado(id: number): PostuladoDetalle {
  const { postulacion, vacante, candidato, usuario } = postulacionAccesible(id);
  const compat = desgloseDeCompatibilidad(vacante, candidato);
  const entrevista = entrevistaDe(postulacion.id);
  const comparte = comparteNecesidades(postulacion, candidato);
  return {
    postulacion: {
      id: postulacion.id,
      estado: postulacion.estado,
      mensaje: postulacion.mensaje,
      creado_en: postulacion.creado_en,
      historial: postulacion.historial.map((e) => ({ ...e })),
    },
    vacante: { id: vacante.id, titulo: vacante.titulo },
    candidato: cvDeCandidato(usuario, candidato, ESTADOS_CON_CONTACTO.includes(postulacion.estado)),
    // Sin el componente A: las necesidades nunca cuentan para el reclutador.
    compatibilidad: {
      puntaje: compatibilidadReclutador(candidato, vacante).puntaje_reclutador,
      componentes: { h: compat.componentes.h, m: compat.componentes.m, f: compat.componentes.f },
      habilidades: compat.habilidades,
      modalidad: compat.modalidad,
      formacion: compat.formacion,
    },
    necesidades: comparte
      ? candidato.necesidad_ids.map((ajusteId) => ({
          ...ajusteRefDe(ajusteId),
          estado: estadoDeNecesidad(vacante, ajusteId),
        }))
      : null,
    nota_ajustes: comparte ? candidato.nota_ajustes : null,
    transiciones_permitidas: TRANSICIONES[postulacion.estado],
    entrevista: entrevista ? { ...vistaDeEntrevista(entrevista), puede_cancelar: false } : null,
  };
}

export function cambiarEstadoDePostulacion(
  id: number,
  datos: CambioEstadoPostulacion,
): ResultadoCambioEstado {
  const { postulacion, vacante } = postulacionAccesible(id);
  const campos: Record<string, string> = {};
  if (!['en_revision', 'entrevista', 'aceptada', 'no_seleccionada'].includes(datos?.estado)) {
    campos.estado = 'Elige el estado al que pasa la postulación.';
  }
  const mensaje = datos?.mensaje;
  if (mensaje != null && (typeof mensaje !== 'string' || mensaje.length > MAX_MENSAJE)) {
    campos.mensaje = `El mensaje puede tener hasta ${MAX_MENSAJE} caracteres.`;
  }
  lanzarSiHayCampos(campos);
  if (!TRANSICIONES[postulacion.estado].includes(datos.estado)) {
    throw fallo(
      409,
      'transicion_invalida',
      'Esa postulación no puede pasar a ese estado desde el que tiene ahora.',
    );
  }

  const estado = obtenerEstado();
  const ahora = aIso(new Date());
  postulacion.historial.push({
    estado_anterior: postulacion.estado,
    estado_nuevo: datos.estado,
    mensaje: mensaje?.trim() ? mensaje.trim() : null,
    creado_en: ahora,
  });
  postulacion.estado = datos.estado;
  postulacion.actualizado_en = ahora;

  // Una persona no seleccionada ya no entrevista: su entrevista agendada se cancela y el horario
  // queda cancelado (el aviso al candidato es el del cambio de estado).
  if (datos.estado === 'no_seleccionada') {
    const entrevista = entrevistaDe(postulacion.id);
    if (entrevista?.estado === 'agendada') {
      const horario = estado.horarios.find((h) => h.id === entrevista.horario_id)!;
      entrevista.estado = 'cancelada';
      entrevista.motivo_cancelacion = 'La postulación cambió de estado.';
      horario.estado = 'cancelado';
    }
  }

  // Avisa al candidato (cambio_estado → CAN-06).
  estado.notificaciones.push({
    usuario_id: postulacion.candidato_id,
    id: estado.siguienteIdNotificacion++,
    tipo: 'cambio_estado',
    titulo: 'Tu postulación avanzó',
    mensaje: `Tu postulación a ${vacante.titulo} pasó a ${itemDeEstado(datos.estado)}.`,
    referencia: { tipo: 'postulacion', id: postulacion.id },
    leida: false,
    creado_en: ahora,
  });

  return {
    id: postulacion.id,
    estado: postulacion.estado,
    historial: postulacion.historial.map((e) => ({ ...e })),
    transiciones_permitidas: TRANSICIONES[postulacion.estado],
  };
}

const TEXTO_ESTADO: Record<EstadoPostulacion, string> = {
  postulada: 'Postulada',
  en_revision: 'En revisión',
  entrevista: 'Entrevista',
  aceptada: 'Aceptada',
  no_seleccionada: 'No seleccionada',
  retirada: 'Retirada',
};
const itemDeEstado = (estado: EstadoPostulacion) => TEXTO_ESTADO[estado];

function vistaDeObservacion(o: {
  id: number;
  autor_id: number;
  texto: string;
  creado_en: string;
}): Observacion {
  const autor = usuarioDe(o.autor_id)?.usuario;
  return {
    id: o.id,
    texto: o.texto,
    autor: {
      id: o.autor_id,
      nombre: autor?.nombre ?? 'Reclutador',
      apellidos: autor?.apellidos ?? '',
    },
    creado_en: o.creado_en,
  };
}

/** Observaciones internas, las más recientes primero. El candidato nunca las ve. */
export function listarObservaciones(postulacionId: number): Observacion[] {
  postulacionAccesible(postulacionId);
  return obtenerEstado()
    .observaciones.filter((o) => o.postulacion_id === postulacionId)
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en) || b.id - a.id)
    .map(vistaDeObservacion);
}

export function agregarObservacionA(postulacionId: number, texto: string): Observacion {
  postulacionAccesible(postulacionId);
  const usuario = exigirSesion(['reclutador']);
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
      campos: { texto: 'Escribe la observación.' },
    });
  }
  if (texto.length > MAX_OBSERVACION) {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
      campos: { texto: `La observación puede tener hasta ${MAX_OBSERVACION} caracteres.` },
    });
  }
  const estado = obtenerEstado();
  const observacion = {
    id: estado.siguienteIdObservacion++,
    postulacion_id: postulacionId,
    autor_id: usuario.usuario.id,
    texto: texto.trim(),
    creado_en: aIso(new Date()),
  };
  estado.observaciones.push(observacion);
  return vistaDeObservacion(observacion);
}
