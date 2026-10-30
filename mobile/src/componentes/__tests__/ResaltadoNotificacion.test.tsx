import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ResaltadoNotificacion } from '../ResaltadoNotificacion';

describe('ResaltadoNotificacion', () => {
  it('activo muestra el texto «Desde tu notificación» (no solo borde ni color) y el contenido', async () => {
    await render(
      <ResaltadoNotificacion activo>
        <Text>Contenido</Text>
      </ResaltadoNotificacion>,
    );

    const marca = screen.getByTestId('marca-notificacion');
    expect(marca.props.accessible).toBe(true);
    expect(marca.props.accessibilityLabel).toBe('Desde tu notificación');
    expect(screen.getByText('Desde tu notificación', { hidden: true })).toBeOnTheScreen();
    expect(screen.getByText('Contenido')).toBeOnTheScreen();
  });

  it('inactivo solo dibuja el contenido', async () => {
    await render(
      <ResaltadoNotificacion activo={false}>
        <Text>Contenido</Text>
      </ResaltadoNotificacion>,
    );

    expect(screen.queryByTestId('marca-notificacion')).toBeNull();
    expect(screen.getByText('Contenido')).toBeOnTheScreen();
  });
});
