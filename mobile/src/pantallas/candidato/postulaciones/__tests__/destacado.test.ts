import type { PostulacionDetalle } from '../../../../api';
import { elementoDestacado } from '../destacado';

type Parte = Pick<PostulacionDetalle, 'estado' | 'entrevista'>;
const agendada = { estado: 'agendada' } as NonNullable<PostulacionDetalle['entrevista']>;

const conEntrevista: Parte = { estado: 'entrevista', entrevista: agendada };
const sinEntrevista: Parte = { estado: 'entrevista', entrevista: null };
const aceptada: Parte = { estado: 'aceptada', entrevista: null };

describe('elementoDestacado (qué resalta CAN-06 al llegar desde una notificación)', () => {
  it('un aviso de entrevista con entrevista agendada resalta la tarjeta de la entrevista', () => {
    expect(elementoDestacado('recordatorio_entrevista', conEntrevista)).toBe('entrevista');
    expect(elementoDestacado('entrevista_agendada', conEntrevista)).toBe('entrevista');
  });

  it('una entrevista cancelada deja a la persona sin horario: resalta «Elige un horario»', () => {
    expect(elementoDestacado('entrevista_cancelada', sinEntrevista)).toBe('horarios');
  });

  it('un cambio de estado resalta el último paso del historial', () => {
    expect(elementoDestacado('cambio_estado', aceptada)).toBe('historial');
    expect(elementoDestacado('cambio_estado', conEntrevista)).toBe('historial');
    expect(elementoDestacado('vacante_suspendida', aceptada)).toBe('historial');
  });

  it('si el aviso era de entrevista pero ya no hay nada que hacer, cae en el historial', () => {
    expect(elementoDestacado('recordatorio_entrevista', aceptada)).toBe('historial');
  });
});
