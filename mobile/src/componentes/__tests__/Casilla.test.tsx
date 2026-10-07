import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Casilla } from '../Casilla';

describe('Casilla', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('es una casilla accesible con su texto como nombre y su estado', async () => {
    const { rerender } = await render(
      <Casilla texto="Acepto el aviso de privacidad" marcada={false} onCambio={() => undefined} />,
    );
    const casilla = screen.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' });
    expect(casilla).not.toBeChecked();

    await rerender(
      <Casilla texto="Acepto el aviso de privacidad" marcada onCambio={() => undefined} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' })).toBeChecked();
  });

  it('tocar el texto invierte el estado', async () => {
    const alCambiar = jest.fn();
    await render(<Casilla texto="Acepto" marcada={false} onCambio={alCambiar} />);

    await fireEvent.press(screen.getByText('Acepto', { hidden: true }));
    expect(alCambiar).toHaveBeenLastCalledWith(true);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Acepto' }));
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });

  it('desmarca cuando ya estaba marcada', async () => {
    const alCambiar = jest.fn();
    await render(<Casilla texto="Acepto" marcada onCambio={alCambiar} />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Acepto' }));

    expect(alCambiar).toHaveBeenCalledWith(false);
  });

  it('la ayuda se lee como pista de la casilla', async () => {
    await render(
      <Casilla
        texto="Autorizo"
        ayuda="Se usa para recomendarte vacantes."
        marcada={false}
        onCambio={() => undefined}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Autorizo' }).props.accessibilityHint).toBe(
      'Se usa para recomendarte vacantes.',
    );
  });

  it('muestra y anuncia el error', async () => {
    const mensaje = 'Debes aceptar el aviso de privacidad para crear tu cuenta.';
    await render(
      <Casilla texto="Acepto" marcada={false} onCambio={() => undefined} error={mensaje} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(mensaje);
  });

  it('deshabilitada no cambia', async () => {
    const alCambiar = jest.fn();
    await render(<Casilla texto="Acepto" marcada={false} onCambio={alCambiar} deshabilitada />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Acepto' }));

    expect(alCambiar).not.toHaveBeenCalled();
  });
});
