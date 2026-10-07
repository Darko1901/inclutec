import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { CampoCodigo } from '../CampoCodigo';

describe('CampoCodigo', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('para el lector de pantalla es un único campo llamado «Código de 6 dígitos»', async () => {
    await render(<CampoCodigo value="" onChangeText={() => undefined} />);

    expect(screen.getAllByLabelText('Código de 6 dígitos')).toHaveLength(1);
    // Las seis casillas son solo dibujo: no se exponen al lector de pantalla.
    expect(screen.queryAllByRole('text')).toHaveLength(0);
  });

  it('es numérico, de 6 dígitos y acepta el código del SMS o del correo', async () => {
    await render(<CampoCodigo value="" onChangeText={() => undefined} />);
    const campo = screen.getByLabelText('Código de 6 dígitos');

    expect(campo.props.keyboardType).toBe('number-pad');
    expect(campo.props.maxLength).toBe(6);
    expect(campo.props.textContentType).toBe('oneTimeCode');
    expect(campo.props.autoComplete).toBe('sms-otp');
  });

  it('solo deja pasar dígitos y recorta a 6', async () => {
    const alCambiar = jest.fn();
    await render(<CampoCodigo value="" onChangeText={alCambiar} />);
    const campo = screen.getByLabelText('Código de 6 dígitos');

    await fireEvent.changeText(campo, '12a 34-5678');

    expect(alCambiar).toHaveBeenCalledWith('123456');
  });

  it('dibuja cada dígito en su casilla', async () => {
    await render(<CampoCodigo value="123" onChangeText={() => undefined} />);

    for (const digito of ['1', '2', '3']) {
      expect(screen.getByText(digito, { hidden: true })).toBeOnTheScreen();
    }
  });

  it('muestra el error como alerta, lo anuncia y lo ofrece como pista', async () => {
    const mensaje = 'Código incorrecto. Te quedan 4 intentos.';
    await render(<CampoCodigo value="111111" onChangeText={() => undefined} error={mensaje} />);

    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
    expect(screen.getByLabelText('Código de 6 dígitos').props.accessibilityHint).toBe(mensaje);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      `Código de 6 dígitos: ${mensaje}`,
    );
  });
});
