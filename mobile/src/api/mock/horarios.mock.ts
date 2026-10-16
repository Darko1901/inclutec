import type { HorariosServicio } from '../horarios';
import type { Horario } from '../tipos';
import { exigirSesion, obtenerEstado } from './datos';
import { fallo, simular } from './simulador';

export class HorariosMock implements HorariosServicio {
  disponibles(vacanteId: number) {
    return simular((): Horario[] => {
      const usuario = exigirSesion(['candidato']);
      const estado = obtenerEstado();
      if (!Number.isInteger(vacanteId)) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
          campos: { vacante_id: 'Indica la vacante.' },
        });
      }
      const enEntrevista = estado.postulaciones.some(
        (p) =>
          p.candidato_id === usuario.usuario.id &&
          p.vacante_id === vacanteId &&
          p.estado === 'entrevista',
      );
      if (!enEntrevista) {
        throw fallo(
          403,
          'sin_permiso',
          'Todavía no estás en etapa de entrevista para esta vacante.',
        );
      }
      // Libres y futuros, del más próximo al más lejano y sin la liga.
      return estado.horarios
        .filter(
          (h) =>
            h.vacante_id === vacanteId &&
            h.estado === 'libre' &&
            new Date(h.inicio).getTime() > Date.now(),
        )
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map((h) => ({
          id: h.id,
          vacante_id: h.vacante_id,
          inicio: h.inicio,
          fin: new Date(new Date(h.inicio).getTime() + h.duracion_min * 60000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z'),
          duracion_min: h.duracion_min,
          estado: h.estado,
          liga: null,
        }));
    });
  }
}
