import { fireEvent, render, screen } from '@testing-library/react-native';

import { Interruptor } from '../Interruptor';

describe('Interruptor', () => {
  it('se anuncia como interruptor con su etiqueta y estado', async () => {
    const { rerender } = await render(
      <Interruptor etiqueta="Notificaciones push" valor={false} onCambio={() => undefined} />,
    );
    expect(screen.getByRole('switch', { name: 'Notificaciones push' })).not.toBeChecked();

    await rerender(<Interruptor etiqueta="Notificaciones push" valor onCambio={() => undefined} />);
    expect(screen.getByRole('switch', { name: 'Notificaciones push' })).toBeChecked();
  });

  it('tocar la fila entera cambia el estado', async () => {
    const alCambiar = jest.fn();
    await render(<Interruptor etiqueta="Correo" valor onCambio={alCambiar} />);

    await fireEvent.press(screen.getByRole('switch', { name: 'Correo' }));

    expect(alCambiar).toHaveBeenCalledWith(false);
  });

  it('la etiqueta visible está en pantalla', async () => {
    await render(<Interruptor etiqueta="Correo" valor onCambio={() => undefined} />);
    expect(screen.getByText('Correo', { hidden: true })).toBeOnTheScreen();
  });

  it('deshabilitado no cambia', async () => {
    const alCambiar = jest.fn();
    await render(<Interruptor etiqueta="Correo" valor onCambio={alCambiar} deshabilitado />);

    await fireEvent.press(screen.getByRole('switch', { name: 'Correo' }));

    expect(alCambiar).not.toHaveBeenCalled();
  });
});
