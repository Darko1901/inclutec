import {
  aFechaApi,
  leerMesAnio,
  mesAnioCorto,
  mesAnioLargo,
  periodoAccesible,
  periodoCorto,
} from '../fechasCV';

describe('fechas del CV', () => {
  it('lee el mes y el año sin importar el día ni la zona horaria', () => {
    expect(leerMesAnio('2025-06-30')).toEqual({ mes: 6, anio: 2025 });
    expect(leerMesAnio('2023-02-01')).toEqual({ mes: 2, anio: 2023 });
    expect(leerMesAnio(null)).toEqual({ mes: null, anio: null });
    expect(leerMesAnio('junio')).toEqual({ mes: null, anio: null });
  });

  it('guarda siempre el día 1 y no arma fechas incompletas', () => {
    expect(aFechaApi({ mes: 7, anio: 2025 })).toBe('2025-07-01');
    expect(aFechaApi({ mes: 12, anio: 2020 })).toBe('2020-12-01');
    expect(aFechaApi({ mes: null, anio: 2025 })).toBeNull();
    expect(aFechaApi({ mes: 7, anio: null })).toBeNull();
  });

  it('da formato corto y largo', () => {
    expect(mesAnioCorto('2023-02-01')).toBe('feb 2023');
    expect(mesAnioLargo('2023-09-01')).toBe('septiembre de 2023');
  });

  it('arma el periodo de la experiencia: con fin, actual o sin datos', () => {
    expect(
      periodoCorto({ fecha_inicio: '2023-02-01', fecha_fin: '2025-06-30', actual: false }),
    ).toBe('feb 2023 – jun 2025');
    expect(periodoCorto({ fecha_inicio: '2023-02-01', fecha_fin: null, actual: true })).toBe(
      'feb 2023 – actual',
    );
    expect(periodoCorto({ fecha_inicio: '2023-09-01', fecha_fin: null })).toBe('sep 2023');
    expect(periodoCorto({ fecha_inicio: null, fecha_fin: null })).toBe('');
  });

  it('dice el periodo en voz alta', () => {
    expect(
      periodoAccesible({ fecha_inicio: '2023-02-01', fecha_fin: '2025-06-30', actual: false }),
    ).toBe('de febrero de 2023 a junio de 2025');
    expect(periodoAccesible({ fecha_inicio: '2023-02-01', fecha_fin: null, actual: true })).toBe(
      'de febrero de 2023 a la fecha',
    );
    expect(periodoAccesible({ fecha_inicio: '2023-09-01', fecha_fin: null })).toBe(
      'desde septiembre de 2023',
    );
  });
});
