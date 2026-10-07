import { leerMarkdown } from '../markdown';

describe('leerMarkdown', () => {
  it('reconoce títulos, secciones, viñetas y párrafos', () => {
    const bloques = leerMarkdown('# Título\n\n## Sección\n\nTexto normal.\n\n- Uno\n- Dos\n');
    expect(bloques.map((b) => b.tipo)).toEqual([
      'titulo',
      'seccion',
      'parrafo',
      'vineta',
      'vineta',
    ]);
  });

  it('separa las negritas dentro de una línea', () => {
    const [bloque] = leerMarkdown('**Si buscas empleo:** nombre y correo.');
    expect(bloque.partes).toEqual([
      { texto: 'Si buscas empleo:', negrita: true },
      { texto: ' nombre y correo.', negrita: false },
    ]);
  });

  it('ignora las líneas vacías', () => {
    expect(leerMarkdown('\n\n  \n')).toEqual([]);
  });
});
