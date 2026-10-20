import {
  claveDia,
  etiquetaDia,
  formatearDiaCorto,
  formatearFecha,
  formatearFechaCorta,
  formatearFechaHora,
  formatearFechaHoraHablada,
  formatearFechaLarga,
  formatearHora,
  formatearRelativo,
} from '../fechas';

// 15:00 UTC = 9:00 a.m. en la Ciudad de México (UTC-6 en octubre).
const ahora = new Date('2026-10-23T15:00:00Z');

function textos() {
  return {
    diaCorto: formatearDiaCorto('2026-10-25T16:00:00Z'),
    diaCortoJueves: formatearDiaCorto('2026-10-22T17:00:00Z'),
    fechaLarga: formatearFechaLarga('2026-10-25T16:00:00Z'),
    fechaLargaSinHora: formatearFechaLarga('2026-03-01'),
    fecha: formatearFecha('2026-10-06T17:00:00Z'),
    fechaSoloDia: formatearFecha('2023-02-01'),
    fechaCorta: formatearFechaCorta('2026-10-12T17:20:00Z', ahora),
    fechaCortaOtroAnio: formatearFechaCorta('2025-12-31T17:20:00Z', ahora),
    hora: formatearHora('2026-10-25T16:30:00Z'),
    horaTarde: formatearHora('2026-10-25T21:05:00Z'),
    fechaHora: formatearFechaHora('2026-10-06T16:30:00Z'),
    hablada: formatearFechaHoraHablada('2026-10-25T16:30:00Z'),
    hoy: etiquetaDia('2026-10-23T22:00:00Z', ahora),
    manana: etiquetaDia('2026-10-24T17:00:00Z', ahora),
    domingo: etiquetaDia('2026-10-25T17:00:00Z', ahora),
    relativo: formatearRelativo('2026-10-01T12:00:00Z', ahora),
  };
}

describe('fechas: salidas exactas', () => {
  it('arma los textos con nombres fijos en español', () => {
    expect(textos()).toEqual({
      diaCorto: 'dom 25 oct',
      diaCortoJueves: 'jue 22 oct',
      fechaLarga: 'domingo 25 de octubre de 2026',
      fechaLargaSinHora: 'domingo 1 de marzo de 2026',
      fecha: '6 oct 2026',
      fechaSoloDia: '1 feb 2023',
      fechaCorta: '12 oct',
      fechaCortaOtroAnio: '31 dic 2025',
      hora: '10:30 a.m.',
      horaTarde: '3:05 p.m.',
      fechaHora: '6 oct 2026, 10:30 a.m.',
      hablada: 'domingo 25 de octubre de 2026, a las 10:30 de la mañana',
      hoy: 'Hoy',
      manana: 'Mañana',
      domingo: 'dom 25 oct',
      relativo: '1 oct 2026',
    });
  });

  it('respeta el día de la Ciudad de México en el cambio de año', () => {
    // 05:30 UTC del 1 de enero todavía es la noche del 31 de diciembre en la Ciudad de México.
    const iso = '2027-01-01T05:30:00Z';
    expect(claveDia(iso)).toBe('2026-12-31');
    expect(formatearDiaCorto(iso)).toBe('jue 31 dic');
    expect(formatearFechaLarga(iso)).toBe('jueves 31 de diciembre de 2026');
    expect(formatearFecha(iso)).toBe('31 dic 2026');

    const finDeAnio = new Date('2026-12-31T18:00:00Z');
    expect(etiquetaDia('2027-01-01T18:00:00Z', finDeAnio)).toBe('Mañana');
    expect(etiquetaDia('2027-01-02T18:00:00Z', finDeAnio)).toBe('sáb 2 ene');
    expect(formatearFechaCorta('2027-01-02T18:00:00Z', finDeAnio)).toBe('2 ene 2027');
  });

  it('devuelve cadena vacía con fechas inválidas', () => {
    expect(formatearDiaCorto('no es fecha')).toBe('');
    expect(formatearFechaLarga('2026-13-45')).toBe('');
    expect(formatearFecha('')).toBe('');
  });
});

describe('fechas: no dependen de los nombres que da Intl', () => {
  const original = Intl.DateTimeFormat.prototype.formatToParts;

  afterEach(() => {
    Intl.DateTimeFormat.prototype.formatToParts = original;
  });

  it('da los mismos textos si formatToParts devuelve partes como Hermes en iOS', () => {
    const esperado = textos();
    const pedidosConNombres: string[] = [];

    // Como Hermes: los formatos numéricos funcionan; si piden nombres de día o mes, el día de la
    // semana sale completo con mayúscula y no hay parte `month`.
    Intl.DateTimeFormat.prototype.formatToParts = function (this: Intl.DateTimeFormat, fecha) {
      const { weekday, month } = this.resolvedOptions();
      if (weekday || (month && month !== '2-digit' && month !== 'numeric')) {
        pedidosConNombres.push(`${weekday ?? ''}/${month ?? ''}`);
        return [
          { type: 'weekday', value: 'Domingo' },
          { type: 'literal', value: ' ' },
          { type: 'day', value: undefined as unknown as string },
          { type: 'literal', value: ' ' },
          { type: 'literal', value: 'oct.' },
        ];
      }
      return original.call(this, fecha);
    };

    expect(textos()).toEqual(esperado);
    expect(pedidosConNombres).toEqual([]);
  });
});
