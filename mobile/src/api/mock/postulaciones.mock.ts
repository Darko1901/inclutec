import type { PostulacionesServicio } from '../postulaciones';
import type { PostulacionDetalle, PostulacionEntrada } from '../tipos';
import { exigirSesion, obtenerEstado } from './datos';
import { aIso } from './negocio.datos';
import { fallo, simular } from './simulador';
import { analizarPerfil, candidatoDe, empresaDe, esVisibleParaCandidato } from './vistas';

const LONGITUD_MAX_MENSAJE = 500;

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
}
