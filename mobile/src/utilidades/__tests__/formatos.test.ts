import {
  capitalizar,
  duracionCorta,
  duracionHablada,
  formatearPorcentaje,
  porcentajeHablado,
} from '../formatos';

describe('formatos comunes', () => {
  it('los porcentajes se ven «88 %» y se dicen «88 por ciento»', () => {
    expect(formatearPorcentaje(88)).toBe('88 %');
    expect(porcentajeHablado(88)).toBe('88 por ciento');
    expect(formatearPorcentaje(0)).toBe('0 %');
  });

  it('la duración se ve «45 min» y se dice «45 minutos»', () => {
    expect(duracionCorta(45)).toBe('45 min');
    expect(duracionHablada(45)).toBe('45 minutos');
  });

  it('capitalizar solo cambia la primera letra', () => {
    expect(capitalizar('jueves 22 de octubre')).toBe('Jueves 22 de octubre');
    expect(capitalizar('')).toBe('');
  });
});
