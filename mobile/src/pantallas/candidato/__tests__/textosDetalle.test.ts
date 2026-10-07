import { lineasCompatibilidad, explicacionPerfilIncompleto } from '../detalle/textosDetalle';
import type { Compatibilidad, PerfilCandidato } from '../../../api';

const base: Compatibilidad = {
  puntaje: 88,
  componentes: { h: 0.7, a: 1, m: 1, f: 1 },
  habilidades: {
    obligatorias_cumplidas: [
      { id: 4, nombre: 'Soporte técnico' },
      { id: 5, nombre: 'Redes' },
      { id: 11, nombre: 'Comunicación escrita' },
    ],
    obligatorias_faltantes: [{ id: 3, nombre: 'SQL' }],
    deseables_cumplidas: [],
    deseables_faltantes: [],
  },
  necesidades: {
    cubiertas: [
      { id: 1, nombre: 'Acceso con rampa', categoria: 'movilidad', tipo: 'existente' },
      { id: 3, nombre: 'Baño accesible', categoria: 'movilidad', tipo: 'existente' },
    ],
    no_cubiertas: [],
  },
  modalidad: { vacante: { id: 3, nombre: 'Híbrido' }, coincide: true },
  formacion: {
    requerida: { id: 4, nombre: 'Técnico superior universitario', orden: 4 },
    cumple: 'si',
  },
  calculado_en: '2026-09-30T17:20:00Z',
};

const textos = (desglose: Compatibilidad) => lineasCompatibilidad(desglose).map((l) => l.texto);
const niveles = (desglose: Compatibilidad) => lineasCompatibilidad(desglose).map((l) => l.nivel);

describe('lineasCompatibilidad', () => {
  it('reproduce el ejemplo del diseño con 3 de 4 obligatorias y te falta SQL', () => {
    expect(textos(base)).toEqual([
      'Habilidades: 3 de 4 obligatorias · te falta SQL',
      'Tus necesidades de ajuste: 2 de 2 cubiertas',
      'Modalidad: coincide',
      'Formación: cumple',
    ]);
    expect(niveles(base)).toEqual(['parcial', 'bien', 'bien', 'bien']);
  });

  it('usa «te faltan» con varias habilidades y las lista con comas y «y»', () => {
    const desglose: Compatibilidad = {
      ...base,
      habilidades: {
        ...base.habilidades,
        obligatorias_cumplidas: [],
        obligatorias_faltantes: [
          { id: 1, nombre: 'Python' },
          { id: 3, nombre: 'SQL' },
          { id: 6, nombre: 'Excel' },
        ],
      },
    };
    expect(textos(desglose)[0]).toBe(
      'Habilidades: 0 de 3 obligatorias · te faltan Python, SQL y Excel',
    );
    expect(niveles(desglose)[0]).toBe('mal');
  });

  it('dice qué necesidades no cubre la vacante', () => {
    const desglose: Compatibilidad = {
      ...base,
      necesidades: {
        cubiertas: base.necesidades.cubiertas.slice(0, 1),
        no_cubiertas: [
          { id: 6, nombre: 'Intérprete de Lengua de Señas Mexicana', categoria: 'auditiva' },
        ],
      },
    };
    expect(textos(desglose)[1]).toBe(
      'Tus necesidades de ajuste: 1 de 2 cubiertas · no cubre Intérprete de Lengua de Señas Mexicana',
    );
    expect(niveles(desglose)[1]).toBe('parcial');
  });

  it('sin necesidades registradas no dice «0 de 0»', () => {
    const desglose: Compatibilidad = {
      ...base,
      necesidades: { cubiertas: [], no_cubiertas: [] },
    };
    expect(textos(desglose)[1]).toBe(
      'Tus necesidades de ajuste: no tienes necesidades registradas que comparar',
    );
    expect(niveles(desglose)[1]).toBe('neutro');
  });

  it('modalidad: híbrida que no coincide (parcial) y que no coincide (mal)', () => {
    const hibrida: Compatibilidad = {
      ...base,
      componentes: { ...base.componentes, m: 0.5 },
      modalidad: { ...base.modalidad, coincide: false },
    };
    expect(textos(hibrida)[2]).toBe(
      'Modalidad: la vacante es híbrida y no coincide del todo con tus preferencias',
    );
    expect(niveles(hibrida)[2]).toBe('parcial');

    const distinta: Compatibilidad = {
      ...base,
      componentes: { ...base.componentes, m: 0 },
      modalidad: { vacante: { id: 1, nombre: 'Presencial' }, coincide: false },
    };
    expect(textos(distinta)[2]).toBe('Modalidad: no coincide con tus preferencias');
    expect(niveles(distinta)[2]).toBe('mal');
  });

  it('formación: cursando, no cumple y vacante que no exige', () => {
    const requerida = base.formacion.requerida;
    expect(textos({ ...base, formacion: { requerida, cumple: 'cursando' } })[3]).toBe(
      'Formación: la estás cursando (se pide Técnico superior universitario)',
    );
    expect(textos({ ...base, formacion: { requerida, cumple: 'no' } })[3]).toBe(
      'Formación: no cumple (se pide Técnico superior universitario)',
    );
    expect(textos({ ...base, formacion: { requerida: null, cumple: 'si' } })[3]).toBe(
      'Formación: la vacante no pide formación mínima',
    );
  });
});

describe('explicacionPerfilIncompleto', () => {
  const perfil = (parcial: Partial<PerfilCandidato>) =>
    ({ perfil_minimo: false, secciones_pendientes: [], ...parcial }) as PerfilCandidato;

  it('es null si el perfil mínimo está completo', () => {
    expect(explicacionPerfilIncompleto(perfil({ perfil_minimo: true }))).toBeNull();
  });

  it('nombra lo que falta', () => {
    expect(
      explicacionPerfilIncompleto(perfil({ secciones_pendientes: ['formacion', 'foto'] })),
    ).toBe('Para postularte completa tu perfil: te falta al menos una formación académica.');
    expect(
      explicacionPerfilIncompleto(
        perfil({ secciones_pendientes: ['datos_personales', 'habilidades', 'formacion'] }),
      ),
    ).toBe(
      'Para postularte completa tu perfil: te falta tus datos personales (nombre y municipio), al menos una habilidad y al menos una formación académica.',
    );
  });
});
