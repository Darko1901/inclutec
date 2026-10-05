import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { CampoTexto } from '../CampoTexto';

describe('CampoTexto', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra la etiqueta visible y el campo se identifica con ella', async () => {
    await render(<CampoTexto etiqueta="Correo" value="" onChangeText={() => undefined} />);

    expect(screen.getByText('Correo', { hidden: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Correo')).toBeOnTheScreen();
  });

  it('muestra el error debajo, lo expone como alerta y lo anuncia al lector de pantalla', async () => {
    const mensaje = 'Escribe un correo válido, por ejemplo nombre@correo.mx.';
    await render(
      <CampoTexto etiqueta="Correo" value="x" onChangeText={() => undefined} error={mensaje} />,
    );

    expect(screen.getByText(mensaje)).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
    expect(screen.getByLabelText('Correo').props.accessibilityHint).toBe(mensaje);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(`Correo: ${mensaje}`);
  });

  it('no anuncia nada cuando no hay error', async () => {
    await render(<CampoTexto etiqueta="Correo" value="" onChangeText={() => undefined} />);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('avisa los cambios de texto', async () => {
    const alCambiar = jest.fn();
    await render(<CampoTexto etiqueta="Correo" value="" onChangeText={alCambiar} />);

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'a@b.mx');

    expect(alCambiar).toHaveBeenCalledWith('a@b.mx');
  });

  it('muestra y oculta la contraseña con un botón accesible', async () => {
    await render(
      <CampoTexto
        etiqueta="Contraseña"
        value="Clave2026"
        onChangeText={() => undefined}
        esContrasena
      />,
    );
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen();
  });

  it('muestra el contador de caracteres', async () => {
    await render(
      <CampoTexto
        etiqueta="Resumen"
        value="Hola"
        onChangeText={() => undefined}
        maxLength={500}
        contador
      />,
    );
    expect(screen.getByText('4 / 500')).toBeOnTheScreen();
  });
});
