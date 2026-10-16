import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { TextInput } from 'react-native';

import { SeccionDesplegable } from '../SeccionDesplegable';

function Prueba() {
  const [abierta, setAbierta] = useState(false);
  return (
    <SeccionDesplegable
      titulo="Datos personales"
      expandida={abierta}
      onAlternar={() => setAbierta((a) => !a)}
    >
      <TextInput testID="campo" accessibilityLabel="Nombre" />
    </SeccionDesplegable>
  );
}

describe('SeccionDesplegable', () => {
  it('es un botón con estado expandido o contraído y una pista de qué hace', async () => {
    await render(<Prueba />);

    const boton = screen.getByRole('button', { name: 'Datos personales' });
    expect(boton).toBeCollapsed();
    expect(boton).toHaveProp('accessibilityHint', 'Toca para expandir la sección');

    await fireEvent.press(boton);
    expect(screen.getByRole('button', { name: 'Datos personales' })).toBeExpanded();
    expect(screen.getByRole('button', { name: 'Datos personales' })).toHaveProp(
      'accessibilityHint',
      'Toca para contraer la sección',
    );
  });

  it('contraída oculta el contenido del lector de pantalla y conserva lo escrito', async () => {
    await render(<Prueba />);
    expect(screen.queryByLabelText('Nombre')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Datos personales' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Mariana');
    await fireEvent.press(screen.getByRole('button', { name: 'Datos personales' }));
    expect(screen.queryByLabelText('Nombre')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Datos personales' }));
    expect(screen.getByLabelText('Nombre')).toHaveDisplayValue('Mariana');
  });
});
