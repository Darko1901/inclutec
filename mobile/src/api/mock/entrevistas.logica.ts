import { obtenerEstado, type UsuarioMock } from './datos';
import { aIso, type EntrevistaMock, type PostulacionMock } from './negocio.datos';
import { ESTADOS_ACTIVOS, entrevistaVigenteDe, horarioDe } from './vistas';

// Reglas compartidas por «retirar postulación», «cancelar entrevista» y «eliminar cuenta»:
// el horario vuelve a quedar libre y se avisa al reclutador (tabla de notificaciones del contrato).

function usuarioDe(id: number): UsuarioMock | undefined {
  return obtenerEstado().usuarios.find((u) => u.usuario.id === id);
}

/** Cancela la entrevista agendada: queda `cancelada`, el horario `libre` y se avisa al reclutador. */
export function cancelarEntrevista(entrevista: EntrevistaMock, motivo: string | null): void {
  const estado = obtenerEstado();
  const horario = horarioDe(entrevista.horario_id);
  const postulacion = estado.postulaciones.find((p) => p.id === entrevista.postulacion_id)!;
  const vacante = estado.vacantes.find((v) => v.id === horario.vacante_id)!;
  const candidato = usuarioDe(postulacion.candidato_id)?.usuario;

  entrevista.estado = 'cancelada';
  entrevista.motivo_cancelacion = motivo;
  horario.estado = 'libre';

  estado.notificaciones.push({
    usuario_id: horario.reclutador_id,
    id: estado.siguienteIdNotificacion++,
    tipo: 'entrevista_cancelada',
    titulo: 'Entrevista cancelada',
    mensaje: `${candidato ? `${candidato.nombre} ${candidato.apellidos}` : 'El candidato'} canceló la entrevista de ${vacante.titulo}.`,
    referencia: { tipo: 'entrevista', id: entrevista.id },
    leida: false,
    creado_en: aIso(new Date()),
  });
}

/**
 * Pasa la postulación a «retirada», la anota en el historial y, si tenía una entrevista agendada,
 * la cancela. Quien llama ya comprobó que la postulación sigue activa.
 */
export function retirarPostulacion(postulacion: PostulacionMock): void {
  if (!ESTADOS_ACTIVOS.includes(postulacion.estado)) return;
  const ahora = aIso(new Date());
  const entrevista = entrevistaVigenteDe(postulacion.id);
  if (entrevista?.estado === 'agendada') cancelarEntrevista(entrevista, null);

  postulacion.historial.push({
    estado_anterior: postulacion.estado,
    estado_nuevo: 'retirada',
    mensaje: null,
    creado_en: ahora,
  });
  postulacion.estado = 'retirada';
  postulacion.actualizado_en = ahora;
}
