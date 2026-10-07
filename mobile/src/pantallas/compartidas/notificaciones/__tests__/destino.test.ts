import type { Notificacion, RolUsuario } from '../../../../api';
import { destinoNotificacion } from '../destino';
import { TIPOS_NOTIFICACION } from '../tiposNotificacion';

type Referencia = NonNullable<Notificacion['referencia']>;

const ref = (tipo: Referencia['tipo'], id = 7): Referencia => ({ tipo, id });

describe('destinoNotificacion (tabla de notificaciones del contrato)', () => {
  const casos: [string, RolUsuario, Referencia | null, string | null, object | undefined][] = [
    ['cambio de estado → CAN-06', 'candidato', ref('postulacion'), 'DetallePostulacion', { id: 7 }],
    ['nueva postulación → REC-05', 'reclutador', ref('postulacion'), 'DetallePostulado', { id: 7 }],
    [
      'entrevista agendada → REC-06',
      'reclutador',
      ref('entrevista'),
      'Agenda',
      { entrevista_id: 7 },
    ],
    [
      'entrevista cancelada (candidato) → CAN-06',
      'candidato',
      ref('postulacion'),
      'DetallePostulacion',
      { id: 7 },
    ],
    [
      'entrevista cancelada (reclutador) → REC-06',
      'reclutador',
      ref('entrevista'),
      'Agenda',
      { entrevista_id: 7 },
    ],
    [
      'empresa validada o rechazada → REC-01',
      'reclutador',
      ref('empresa'),
      'Organizacion',
      { empresa_id: 7 },
    ],
    [
      'vacante suspendida (reclutador) → REC-02',
      'reclutador',
      ref('vacante'),
      'MisVacantes',
      { vacante_id: 7 },
    ],
    [
      'vacante suspendida (postulado) → CAN-06',
      'candidato',
      ref('postulacion'),
      'DetallePostulacion',
      { id: 7 },
    ],
  ];

  it.each(casos)('%s', (_nombre, rol, referencia, pantalla, params) => {
    expect(destinoNotificacion(rol, referencia)).toEqual({ pantalla, params });
  });

  it('un reporte resuelto no abre otra pantalla (se queda en MOV-04)', () => {
    expect(destinoNotificacion('candidato', ref('reporte'))).toBeNull();
    expect(destinoNotificacion('reclutador', ref('reporte'))).toBeNull();
  });

  it('sin referencia no hay destino', () => {
    expect(destinoNotificacion('candidato', null)).toBeNull();
  });

  it('todos los tipos de notificación tienen nombre claro e ícono', () => {
    const tipos = Object.keys(TIPOS_NOTIFICACION);
    expect(tipos).toHaveLength(9);
    for (const datos of Object.values(TIPOS_NOTIFICACION)) {
      expect(datos.nombre.length).toBeGreaterThan(5);
      expect(datos.icono).toBeTruthy();
    }
    expect(TIPOS_NOTIFICACION.cambio_estado.nombre).toBe('Cambios en mis postulaciones');
  });
});
