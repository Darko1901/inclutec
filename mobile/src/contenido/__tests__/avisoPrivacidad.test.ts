import { readFileSync } from 'fs';
import { join } from 'path';

import { leerMarkdown } from '../../utilidades/markdown';
import { AVISO_PRIVACIDAD } from '../avisoPrivacidad';

describe('aviso de privacidad', () => {
  it('es idéntico a docs/legal/aviso-privacidad.md', () => {
    const original = readFileSync(
      join(__dirname, '../../../../docs/legal/aviso-privacidad.md'),
      'utf8',
    );
    expect(AVISO_PRIVACIDAD).toBe(original);
  });

  it('se divide en un título y secciones con encabezado', () => {
    const bloques = leerMarkdown(AVISO_PRIVACIDAD);
    expect(bloques.filter((b) => b.tipo === 'titulo')).toHaveLength(1);
    expect(bloques.filter((b) => b.tipo === 'seccion').map((b) => b.partes[0].texto)).toEqual([
      'Quién es responsable de tus datos',
      'Qué datos tratamos',
      'Para qué usamos tus datos',
      'Con quién compartimos tus datos',
      'Tu consentimiento para datos sensibles',
      'Tus derechos',
      'Cómo protegemos tus datos',
      'Cambios a este aviso',
    ]);
  });
});
