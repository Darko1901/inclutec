import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '../../api';
import { ErrorCatalogo } from '../ErrorCatalogo';

const falla = (detail: string) => new ApiError({ status: 500, codigo: 'error_interno', detail });

describe('ErrorCatalogo', () => {
  it('sin errores no dibuja nada', async () => {
    await render(<ErrorCatalogo catalogos={[{ error: null, recargar: jest.fn() }]} />);

    expect(screen.queryByTestId('error-catalogo')).toBeNull();
  });

  it('con un error lo explica y «Reintentar» recarga solo los catálogos que fallaron', async () => {
    const recargarA = jest.fn();
    const recargarB = jest.fn();
    const recargarC = jest.fn();
    await render(
      <ErrorCatalogo
        catalogos={[
          {
            error: falla('El servicio no está disponible; intenta más tarde'),
            recargar: recargarA,
          },
          { error: null, recargar: recargarB },
          { error: falla('Otro error'), recargar: recargarC },
        ]}
      />,
    );

    expect(screen.getByRole('alert')).toHaveAccessibleName(
      'Error: El servicio no está disponible; intenta más tarde',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(recargarA).toHaveBeenCalledTimes(1);
    expect(recargarC).toHaveBeenCalledTimes(1);
    expect(recargarB).not.toHaveBeenCalled();
  });
});
