import { colores, espaciado, tipografia } from '..';

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('tema', () => {
  it.each([
    ['texto', 'fondo'],
    ['texto', 'fondoSuave'],
    ['textoSecundario', 'fondo'],
    ['primario', 'fondo'],
    ['secundario', 'fondo'],
    ['exito', 'fondo'],
    ['advertencia', 'fondo'],
    ['error', 'fondo'],
    ['sobrePrimario', 'primario'],
    ['sobrePrimario', 'error'],
    ['primario', 'fondoSuave'],
    ['infoTexto', 'infoFondo'],
    ['exitoTexto', 'exitoFondo'],
    ['advertenciaTexto', 'advertenciaFondo'],
    ['errorTexto', 'errorFondo'],
    ['neutroTexto', 'neutroFondo'],
    ['secundarioTexto', 'secundarioFondo'],
    ['errorTexto', 'fondo'],
  ] as const)('%s sobre %s cumple 4.5:1 (AA)', (texto, fondo) => {
    expect(contraste(colores[texto], colores[fondo])).toBeGreaterThanOrEqual(4.5);
  });

  it('el borde de los campos cumple 3:1 sobre el fondo (WCAG 1.4.11)', () => {
    expect(contraste(colores.borde, colores.fondo)).toBeGreaterThanOrEqual(3);
  });

  it('el espaciado va en múltiplos de 4', () => {
    for (const valor of Object.values(espaciado)) expect(valor % 4).toBe(0);
  });

  it('la escala tipográfica no baja de 14 y el cuerpo es de 16', () => {
    expect(tipografia.cuerpo.fontSize).toBe(16);
    for (const estilo of Object.values(tipografia))
      expect(estilo.fontSize).toBeGreaterThanOrEqual(14);
  });
});
