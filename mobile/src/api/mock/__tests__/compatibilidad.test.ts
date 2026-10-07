import { calcularCompatibilidad, entradaDeCandidato, entradaDeVacante } from '../compatibilidad';
import { obtenerEstado } from '../datos';
import { COMPATIBILIDAD_GUARDADA } from '../negocio.datos';

function calcular(candidatoId: number, vacanteId: number) {
  const { candidatos, vacantes } = obtenerEstado();
  const candidato = candidatos.find((c) => c.usuario_id === candidatoId)!;
  const vacante = vacantes.find((v) => v.id === vacanteId)!;
  return calcularCompatibilidad(entradaDeCandidato(candidato), entradaDeVacante(vacante));
}

describe('motor de compatibilidad', () => {
  it('reproduce las 12 filas de compatibilidad de S002 (componentes y los dos puntajes)', () => {
    expect(COMPATIBILIDAD_GUARDADA).toHaveLength(12);
    for (const fila of COMPATIBILIDAD_GUARDADA) {
      const resultado = calcular(fila.candidato_id, fila.vacante_id);
      expect({
        candidato: fila.candidato_id,
        vacante: fila.vacante_id,
        h: resultado.h,
        a: resultado.a,
        m: resultado.m,
        f: resultado.f,
        candidato_puntaje: resultado.puntaje_candidato,
        reclutador_puntaje: resultado.puntaje_reclutador,
      }).toEqual({
        candidato: fila.candidato_id,
        vacante: fila.vacante_id,
        h: fila.h,
        a: fila.a,
        m: fila.m,
        f: fila.f,
        candidato_puntaje: fila.puntaje_candidato,
        reclutador_puntaje: fila.puntaje_reclutador,
      });
    }
  });

  it('da 88 / 83 para Mariana con la vacante 1 y 79 / 70 para Jorge con la 3', () => {
    expect(calcular(3, 1)).toMatchObject({ puntaje_candidato: 88, puntaje_reclutador: 83 });
    expect(calcular(4, 3)).toMatchObject({ puntaje_candidato: 79, puntaje_reclutador: 70 });
  });

  it('coincide con lo que calcula P002 en SQL para los borradores (vacantes 7 y 8)', () => {
    const esperado: [number, number, number, number][] = [
      [3, 7, 30, 43],
      [3, 8, 30, 43],
      [4, 7, 53, 32],
      [4, 8, 45, 21],
    ];
    for (const [candidato, vacante, paraCandidato, paraReclutador] of esperado) {
      expect(calcular(candidato, vacante)).toMatchObject({
        puntaje_candidato: paraCandidato,
        puntaje_reclutador: paraReclutador,
      });
    }
  });

  it('desglosa habilidades, necesidades, modalidad y formación de Mariana con la vacante 1', () => {
    expect(calcular(3, 1)).toMatchObject({
      obligatorias_cumplidas: [4, 5, 11],
      obligatorias_faltantes: [3],
      deseables_cumplidas: [6],
      deseables_faltantes: [2],
      necesidades_cubiertas: [1, 3],
      necesidades_no_cubiertas: [],
      modalidad_coincide: true,
      formacion_cumple: 'si',
    });
  });

  it('Jorge: formación «cursando» y modalidad híbrida que no coincide', () => {
    expect(calcular(4, 1)).toMatchObject({
      m: 0.5,
      modalidad_coincide: false,
      formacion_cumple: 'cursando',
      necesidades_cubiertas: [],
    });
  });

  it('sin consentimiento no cuentan las necesidades (A = 1)', () => {
    const entrada = calcularCompatibilidad(
      { habilidad_ids: [], necesidad_ids: [], modalidad_ids: [], formaciones: [] },
      { modalidad_id: 1, nivel_educativo_id: null, habilidades: [], ajuste_ids: [] },
    );
    expect(entrada).toMatchObject({ a: 1, h: 1, f: 1, m: 0, puntaje_candidato: 85 });
  });
});
