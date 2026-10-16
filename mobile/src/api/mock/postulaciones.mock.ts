import type { PostulacionesServicio } from '../postulaciones';
import type {
  ConsultaPostulaciones,
  Entrevista,
  PaginaPostulaciones,
  PostulacionDetalle,
  PostulacionEntrada,
} from '../tipos';
import { exigirSesion, obtenerEstado } from './datos';
import { retirarPostulacion } from './entrevistas.logica';
import { aIso } from './negocio.datos';
import { lanzarSiHayCampos, leerPagina, paginar } from './paginacion';
import { fallo, simular } from './simulador';
import {
  analizarPerfil,
  candidatoDe,
  detalleDePostulacion,
  ESTADOS_ACTIVOS,
  empresaDe,
  entrevistaVigenteDe,
  esVisibleParaCandidato,
  horarioDe,
  resumenDePostulacion,
  vistaDeEntrevista,
} from './vistas';

const LONGITUD_MAX_MENSAJE = 500;
const ESTADOS = [...ESTADOS_ACTIVOS, 'aceptada', 'no_seleccionada', 'retirada'];

/** La postulación debe ser del candidato de la sesión; si no, responde 404 como el API. */
function postulacionPropia(id: number) {
  const usuario = exigirSesion(['candidato']);
  const postulacion = obtenerEstado().postulaciones.find(
    (p) => p.id === id && p.candidato_id === usuario.usuario.id,
  );
  if (!postulacion) {
    throw fallo(404, 'no_encontrado', 'No encontramos esa postulación.');
  }
  return postulacion;
}

export class PostulacionesMock implements PostulacionesServicio {
  crear(datos: PostulacionEntrada) {
    return simular((): PostulacionDetalle => {
      const usuario = exigirSesion(['candidato']);
      const candidato = candidatoDe(usuario);
      const estado = obtenerEstado();

      const campos: Record<string, string> = {};
      if (!Number.isInteger(datos.vacante_id)) campos.vacante_id = 'Indica la vacante.';
      if (
        datos.mensaje !== undefined &&
        datos.mensaje !== null &&
        (typeof datos.mensaje !== 'string' || datos.mensaje.length > LONGITUD_MAX_MENSAJE)
      ) {
        campos.mensaje = `El mensaje puede tener hasta ${LONGITUD_MAX_MENSAJE} caracteres.`;
      }
      if (typeof datos.compartir_ajustes !== 'boolean') {
        campos.compartir_ajustes = 'Indica si compartes tus necesidades de ajuste.';
      }
      if (Object.keys(campos).length > 0) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
      }

      const vacante = estado.vacantes.find((v) => v.id === datos.vacante_id);
      // Los borradores no son visibles para el candidato.
      if (!vacante || vacante.estado === 'borrador') {
        throw fallo(404, 'no_encontrado', 'La vacante no existe o ya no está disponible.');
      }
      if (
        estado.postulaciones.some(
          (p) => p.candidato_id === candidato.usuario_id && p.vacante_id === vacante.id,
        )
      ) {
        throw fallo(409, 'postulacion_duplicada', 'Ya te postulaste a esta vacante.');
      }
      if (!esVisibleParaCandidato(vacante)) {
        throw fallo(409, 'vacante_no_disponible', 'Esta vacante ya no está disponible.');
      }
      const analisis = analizarPerfil(usuario, candidato);
      if (!analisis.perfil_minimo) {
        throw fallo(422, 'perfil_incompleto', 'Completa tu perfil para poder postularte.', {
          campos: analisis.faltantes_minimo,
        });
      }

      const ahora = aIso(new Date());
      const mensaje = datos.mensaje?.trim() ? datos.mensaje.trim() : null;
      const postulacion = {
        id: estado.siguienteIdPostulacion++,
        candidato_id: candidato.usuario_id,
        vacante_id: vacante.id,
        estado: 'postulada' as const,
        mensaje,
        // Sin consentimiento vigente no hay necesidades que compartir.
        comparte_ajustes: datos.compartir_ajustes && candidato.consentimiento_sensibles_en !== null,
        creado_en: ahora,
        actualizado_en: ahora,
        historial: [
          {
            estado_anterior: null,
            estado_nuevo: 'postulada' as const,
            mensaje: null,
            creado_en: ahora,
          },
        ],
      };
      estado.postulaciones.push(postulacion);

      // Avisa a los reclutadores de la empresa (nueva_postulacion → REC-05).
      const { nombre, apellidos } = usuario.usuario;
      estado.usuarios
        .filter((u) => u.usuario.empresa?.id === vacante.empresa_id)
        .forEach((reclutador) =>
          estado.notificaciones.push({
            usuario_id: reclutador.usuario.id,
            id: estado.siguienteIdNotificacion++,
            tipo: 'nueva_postulacion',
            titulo: 'Nueva postulación',
            mensaje: `${nombre} ${apellidos} se postuló a ${vacante.titulo}.`,
            referencia: { tipo: 'postulacion', id: postulacion.id },
            leida: false,
            creado_en: ahora,
          }),
        );

      const empresa = empresaDe(vacante.empresa_id);
      return {
        id: postulacion.id,
        vacante: {
          id: vacante.id,
          titulo: vacante.titulo,
          empresa: {
            id: empresa.id,
            nombre_comercial: empresa.nombre_comercial,
            logo_url: empresa.logo_url,
          },
        },
        estado: postulacion.estado,
        mensaje: postulacion.mensaje,
        comparte_ajustes: postulacion.comparte_ajustes,
        creado_en: ahora,
        actualizado_en: ahora,
        historial: postulacion.historial,
        entrevista: null,
        puede_retirar: true,
      };
    });
  }

  mias(consulta: ConsultaPostulaciones = {}) {
    return simular((): PaginaPostulaciones => {
      const usuario = exigirSesion(['candidato']);
      const { page, size } = leerPagina(consulta);
      const campos: Record<string, string> = {};
      if (consulta.estado !== undefined && !ESTADOS.includes(consulta.estado)) {
        campos.estado = 'Elige un estado de la lista.';
      }
      if (consulta.activas !== undefined && typeof consulta.activas !== 'boolean') {
        campos.activas = 'Debe ser verdadero o falso.';
      }
      lanzarSiHayCampos(campos);

      const propias = obtenerEstado()
        .postulaciones.filter((p) => p.candidato_id === usuario.usuario.id)
        .filter((p) => consulta.estado === undefined || p.estado === consulta.estado)
        .filter(
          (p) =>
            consulta.activas === undefined ||
            ESTADOS_ACTIVOS.includes(p.estado) === consulta.activas,
        )
        // Más recientes primero.
        .sort((a, b) => b.creado_en.localeCompare(a.creado_en) || b.id - a.id);
      return paginar(propias.map(resumenDePostulacion), page, size);
    });
  }

  detalle(id: number) {
    return simular(() => detalleDePostulacion(postulacionPropia(id)));
  }

  retirar(id: number) {
    return simular(() => {
      const postulacion = postulacionPropia(id);
      if (!ESTADOS_ACTIVOS.includes(postulacion.estado)) {
        throw fallo(409, 'transicion_invalida', 'Esta postulación ya está finalizada.');
      }
      retirarPostulacion(postulacion);
      return detalleDePostulacion(postulacion);
    });
  }

  agendarEntrevista(id: number, horarioId: number) {
    return simular((): Entrevista => {
      const postulacion = postulacionPropia(id);
      if (!Number.isInteger(horarioId)) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
          campos: { horario_id: 'Elige un horario.' },
        });
      }
      const estado = obtenerEstado();
      if (postulacion.estado !== 'entrevista' || entrevistaVigenteDe(postulacion.id)) {
        throw fallo(
          409,
          'estado_invalido',
          'Solo puedes agendar una entrevista cuando la empresa te la pide y aún no tienes una.',
        );
      }
      const horario = estado.horarios.find(
        (h) => h.id === horarioId && h.vacante_id === postulacion.vacante_id,
      );
      if (!horario) throw fallo(404, 'no_encontrado', 'Ese horario ya no existe.');

      const tomado = fallo(409, 'horario_ocupado', 'Ese horario acaba de ser tomado, elige otro.');
      if (horario.lo_toma_otro) {
        horario.lo_toma_otro = false;
        horario.estado = 'agendado';
      }
      if (horario.estado !== 'libre' || new Date(horario.inicio).getTime() <= Date.now()) {
        throw tomado;
      }

      const ahora = aIso(new Date());
      horario.estado = 'agendado';
      const entrevista = {
        id: estado.siguienteIdEntrevista++,
        horario_id: horario.id,
        postulacion_id: postulacion.id,
        estado: 'agendada' as const,
        motivo_cancelacion: null,
        creado_en: ahora,
      };
      estado.entrevistas.push(entrevista);

      // Avisa al reclutador que publicó el horario (entrevista_agendada → REC-06).
      const { nombre, apellidos } = exigirSesion(['candidato']).usuario;
      const vacante = estado.vacantes.find((v) => v.id === postulacion.vacante_id)!;
      estado.notificaciones.push({
        usuario_id: horarioDe(horario.id).reclutador_id,
        id: estado.siguienteIdNotificacion++,
        tipo: 'entrevista_agendada',
        titulo: 'Nueva entrevista',
        mensaje: `${nombre} ${apellidos} agendó una entrevista para ${vacante.titulo}.`,
        referencia: { tipo: 'entrevista', id: entrevista.id },
        leida: false,
        creado_en: ahora,
      });
      return vistaDeEntrevista(entrevista);
    });
  }
}
