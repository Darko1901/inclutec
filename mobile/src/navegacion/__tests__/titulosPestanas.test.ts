import { TITULOS_CANDIDATO, TITULOS_RECLUTADOR, tituloDePestana } from '../opcionesPestanas';

describe('título de las pantallas con barra inferior', () => {
  it('sin pestaña activa usa «Mis vacantes» para el reclutador, no el nombre interno', () => {
    const ruta = { key: 'a', name: 'ReclutadorTabs' };

    expect(tituloDePestana(ruta, TITULOS_RECLUTADOR, 'Mis vacantes')).toBe('Mis vacantes');
  });

  it('sigue a la pestaña activa y la nombra como la barra', () => {
    const agenda = {
      key: 'a',
      name: 'ReclutadorTabs',
      state: { index: 1, routes: [{ name: 'MisVacantes' }, { name: 'Agenda' }] },
    };
    const organizacion = { key: 'a', name: 'ReclutadorTabs', params: { screen: 'Organizacion' } };

    expect(tituloDePestana(agenda as never, TITULOS_RECLUTADOR, 'Mis vacantes')).toBe('Agenda');
    expect(tituloDePestana(organizacion, TITULOS_RECLUTADOR, 'Mis vacantes')).toBe('Organización');
  });

  it('el candidato regresa a «Vacantes» o a la pestaña de donde vino', () => {
    const ruta = { key: 'a', name: 'CandidatoTabs' };
    const perfil = { key: 'a', name: 'CandidatoTabs', params: { screen: 'Perfil' } };

    expect(tituloDePestana(ruta, TITULOS_CANDIDATO, 'Vacantes')).toBe('Vacantes');
    expect(tituloDePestana(perfil, TITULOS_CANDIDATO, 'Vacantes')).toBe('Perfil');
  });

  it('ningún título es un nombre interno en CamelCase', () => {
    for (const titulo of [
      ...Object.values(TITULOS_CANDIDATO),
      ...Object.values(TITULOS_RECLUTADOR),
    ]) {
      expect(titulo).not.toMatch(/[a-z][A-Z]/);
    }
  });
});
