import { render, screen } from '@testing-library/react-native';

import { BarraProgreso } from '../BarraProgreso';

describe('BarraProgreso', () => {
  it('es una barra de progreso con su etiqueta y su valor dicho en voz alta', async () => {
    await render(
      <BarraProgreso etiqueta="Completitud del perfil" valor={90} valorAccesible="90 por ciento" />,
    );

    const barra = screen.getByRole('progressbar', { name: 'Completitud del perfil' });
    expect(barra).toHaveAccessibilityValue({ min: 0, max: 100, now: 90, text: '90 por ciento' });
  });

  it('limita el valor entre 0 y 100', async () => {
    await render(<BarraProgreso etiqueta="Avance" valor={140} valorAccesible="100 por ciento" />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 100 });
  });
});
