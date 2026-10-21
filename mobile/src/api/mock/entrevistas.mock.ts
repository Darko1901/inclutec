import type { EntrevistasServicio } from '../entrevistas';
import type { ConsultaAgenda, ResultadoEntrevista } from '../tipos';
import { agendaDelReclutador, registrarResultado } from './agenda.logica';
import { exigirSesion, obtenerEstado } from './datos';
import { cancelarEntrevista } from './entrevistas.logica';
import { fallo, simular } from './simulador';
import { vistaDeEntrevista } from './vistas';

const LONGITUD_MAX_MOTIVO = 255;

export class EntrevistasMock implements EntrevistasServicio {
  miAgenda(consulta: ConsultaAgenda = {}) {
    return simular(() => agendaDelReclutador(consulta));
  }

  registrarResultado(id: number, datos: ResultadoEntrevista) {
    return simular(() => registrarResultado(id, datos));
  }

  cancelar(id: number, motivo?: string | null) {
    return simular((): void => {
      const usuario = exigirSesion(['candidato']);
      const estado = obtenerEstado();
      // Solo ve las entrevistas de sus propias postulaciones.
      const entrevista = estado.entrevistas.find(
        (e) =>
          e.id === id &&
          estado.postulaciones.some(
            (p) => p.id === e.postulacion_id && p.candidato_id === usuario.usuario.id,
          ),
      );
      if (!entrevista) throw fallo(404, 'no_encontrado', 'No encontramos esa entrevista.');

      if (motivo != null && (typeof motivo !== 'string' || motivo.length > LONGITUD_MAX_MOTIVO)) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
          campos: { motivo: `El motivo puede tener hasta ${LONGITUD_MAX_MOTIVO} caracteres.` },
        });
      }
      if (entrevista.estado !== 'agendada') {
        throw fallo(409, 'estado_invalido', 'Esta entrevista ya no está agendada.');
      }
      if (!vistaDeEntrevista(entrevista).puede_cancelar) {
        throw fallo(
          409,
          'cancelacion_tardia',
          'Solo puedes cancelar con al menos 24 horas de anticipación.',
        );
      }
      cancelarEntrevista(entrevista, motivo?.trim() ? motivo.trim() : null);
    });
  }
}
