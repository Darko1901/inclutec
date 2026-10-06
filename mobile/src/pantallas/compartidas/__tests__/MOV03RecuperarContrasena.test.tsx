import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { auth } from '../../../api';
import MOV03RecuperarContrasena from '../MOV03RecuperarContrasena';

const navegacion = { navigate: jest.fn() };

// Basta con la parte de la navegación que usa la pantalla.
const props = {
  navigation: navegacion,
  route: { key: 'k', name: 'RecuperarContrasena' },
} as unknown as React.ComponentProps<typeof MOV03RecuperarContrasena>;

async function abrir() {
  await render(<MOV03RecuperarContrasena {...props} />);
}

async function enviarCodigo(correo = 'mariana.lopez@correo.mx') {
  await fireEvent.changeText(screen.getByLabelText('Correo'), correo);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
  await screen.findByLabelText('Código de 6 dígitos');
}

describe('MOV-03 · Recuperar contraseña', () => {
  beforeEach(() => {
    navegacion.navigate.mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('paso 1: «Enviar código» se habilita solo con un correo válido', async () => {
    await abrir();
    expect(screen.getByText('Paso 1 de 2')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'mariana.lopez@correo.mx');

    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeEnabled();
  });

  it('muestra siempre el mismo mensaje, exista o no la cuenta', async () => {
    await abrir();
    await enviarCodigo('nadie@correo.mx');

    expect(
      screen.getByText('Si el correo está registrado, te enviamos un código de 6 dígitos.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Paso 2 de 2')).toBeOnTheScreen();
  });

  it('paso 2: la nueva contraseña está bloqueada hasta que el código es correcto', async () => {
    await abrir();
    await enviarCodigo();

    expect(screen.getByLabelText('Nueva contraseña').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('un código incorrecto muestra los intentos restantes', async () => {
    const verificar = jest.spyOn(auth, 'verificarCodigo');
    await abrir();
    await enviarCodigo();

    await fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), '000000');

    expect(await screen.findByText('Código incorrecto. Te quedan 4 intentos.')).toBeOnTheScreen();
    expect(verificar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Nueva contraseña').props.editable).toBe(false);
  });

  it('con el código 123456 se habilita la nueva contraseña y se guarda', async () => {
    const restablecer = jest.spyOn(auth, 'restablecerContrasena');
    await abrir();
    await enviarCodigo();

    await fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), '123456');
    expect(await screen.findByText('Código correcto')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nueva contraseña').props.editable).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'NuevaClave2026');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'OtraClave2026');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(navegacion.navigate).toHaveBeenCalled());
    expect(restablecer).toHaveBeenCalledWith({
      correo: 'mariana.lopez@correo.mx',
      codigo: '123456',
      contrasena: 'NuevaClave2026',
    });
    expect(navegacion.navigate).toHaveBeenCalledWith('InicioSesion', {
      mensajeExito: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.',
    });
    // La contraseña nueva ya sirve para entrar.
    const sesion = await auth.login({
      correo: 'mariana.lopez@correo.mx',
      contrasena: 'NuevaClave2026',
    });
    expect(sesion.usuario.id).toBe(3);
  });

  it('exige una contraseña que cumpla la política', async () => {
    await abrir();
    await enviarCodigo();
    await fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), '123456');
    await screen.findByText('Código correcto');

    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'sololetras');
    await fireEvent(screen.getByLabelText('Nueva contraseña'), 'blur');

    expect(
      screen.getByText('Usa de 8 a 64 caracteres, con al menos una letra y un número.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('tras 5 códigos incorrectos (410) regresa al paso 1 con el aviso', async () => {
    await abrir();
    await enviarCodigo();

    for (const codigo of ['111111', '222222', '333333', '444444', '555555']) {
      await fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), codigo);
      await waitFor(() => expect(screen.queryByText('Verificando código…')).not.toBeOnTheScreen());
    }

    expect(await screen.findByText('Paso 1 de 2')).toBeOnTheScreen();
    expect(screen.getByText('Agotaste los intentos. Pide un código nuevo.')).toBeOnTheScreen();
  });

  it('pedir otro código antes de 60 s muestra el error de reenvío (429) y deja capturar el código', async () => {
    await abrir();
    await enviarCodigo();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar otro correo' }));

    await fireEvent.changeText(screen.getByLabelText('Correo'), 'mariana.lopez@correo.mx');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));

    expect(
      await screen.findByText('Aún no pasan 60 segundos. Espera para pedir otro código.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Código de 6 dígitos')).toBeOnTheScreen();
  });

  it('la cuenta regresiva de 60 s deshabilita el reenvío y solo se anuncia al terminar', async () => {
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
      ],
    });
    await abrir();
    await enviarCodigo();
    const reenviar = () => screen.getByRole('button', { name: 'Reenviar código' });

    expect(reenviar()).toBeDisabled();
    expect(screen.getByText('Reenviar código (en 60 s)')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByText('Reenviar código (en 30 s)')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalledWith(
      'Ya puedes pedir otro código',
    );

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(reenviar()).toBeEnabled();
    const anuncios = (AccessibilityInfo.announceForAccessibility as jest.Mock).mock.calls.filter(
      ([texto]) => texto === 'Ya puedes pedir otro código',
    );
    expect(anuncios).toHaveLength(1);
  });
});
