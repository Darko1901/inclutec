import { obtenerEstado } from '../datos';
import { relativaAHoy } from '../fechasS002';

// Lo que hace falta para grabar el video sin preparar nada: todo es relativo a hoy.
const DIA = 24 * 3600 * 1000;
const HORA = 3600 * 1000;
const ms = (iso: string) => Date.parse(iso);

describe('datos para la demostración', () => {
  it('las fechas de S002 se mueven a «hace unos días» y ninguna queda en el futuro', () => {
    const estado = obtenerEstado();
    const ahora = Date.now();
    const pasado = [
      ...estado.notificaciones.map((n) => n.creado_en),
      ...estado.postulaciones.flatMap((p) => [p.creado_en, p.actualizado_en]),
      ...estado.postulaciones.flatMap((p) => p.historial.map((e) => e.creado_en)),
      ...estado.observaciones.map((o) => o.creado_en),
      ...estado.reportes.map((r) => r.creado_en),
      ...estado.entrevistas.map((e) => e.creado_en),
    ];
    for (const fecha of pasado) {
      expect(ms(fecha)).toBeLessThanOrEqual(ahora);
      expect(ahora - ms(fecha)).toBeLessThan(21 * DIA);
    }
    const mariana = estado.postulaciones.find((p) => p.id === 1)!;
    expect(ahora - ms(mariana.creado_en)).toBeGreaterThan(3 * DIA);
  });

  it('relativaAHoy conserva la distancia entre dos fechas de S002', () => {
    const ahora = Date.parse('2027-03-10T12:00:00Z');
    const a = ms(relativaAHoy('2026-09-30T17:20:00Z', ahora));
    const b = ms(relativaAHoy('2026-10-02T16:30:00Z', ahora));
    expect(b - a).toBe(ms('2026-10-02T16:30:00Z') - ms('2026-09-30T17:20:00Z'));
    expect(ms(relativaAHoy('2026-10-05T17:30:00Z', ahora))).toBe(ahora - 2 * HORA);
  });

  it('Mariana tiene una entrevista agendada en los próximos días y horarios libres para reagendar', () => {
    const estado = obtenerEstado();
    const entrevista = estado.entrevistas.find((e) => e.postulacion_id === 1)!;
    const horario = estado.horarios.find((h) => h.id === entrevista.horario_id)!;
    expect(entrevista.estado).toBe('agendada');
    // Se puede cancelar (más de 24 h) y no queda lejana.
    expect(ms(horario.inicio) - Date.now()).toBeGreaterThan(24 * HORA);
    expect(ms(horario.inicio) - Date.now()).toBeLessThan(7 * DIA);

    const libres = estado.horarios.filter(
      (h) => h.vacante_id === 1 && h.estado === 'libre' && ms(h.inicio) > Date.now() + 24 * HORA,
    );
    expect(libres.length).toBeGreaterThanOrEqual(3);
  });

  it('Laura tiene postulados en varios estados', () => {
    const estado = obtenerEstado();
    const estados = new Set(
      estado.postulaciones.filter((p) => p.vacante_id === 1).map((p) => p.estado),
    );
    for (const esperado of [
      'postulada',
      'en_revision',
      'entrevista',
      'aceptada',
      'no_seleccionada',
    ]) {
      expect(estados).toContain(esperado);
    }
  });

  it('hay una notificación sin leer para el candidato y para cada reclutador con actividad', () => {
    const estado = obtenerEstado();
    const sinLeer = (usuarioId: number) =>
      estado.notificaciones.filter((n) => n.usuario_id === usuarioId && !n.leida);
    expect(sinLeer(3)).toHaveLength(1); // Mariana
    expect(sinLeer(2)).toHaveLength(1); // Laura
    expect(sinLeer(5)).toHaveLength(1); // Roberto
    // La de Laura lleva a su agenda (REC-06) y la de Mariana a su postulación (CAN-06).
    expect(sinLeer(2)[0].referencia).toEqual({ tipo: 'entrevista', id: 1 });
    expect(sinLeer(3)[0].referencia).toEqual({ tipo: 'postulacion', id: 1 });
  });
});
