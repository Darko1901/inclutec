import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ApiError, auth } from '../../../api';
import { SesionProvider } from '../../../sesion';
import MOV01InicioSesion from '../MOV01InicioSesion';

const navegacion = { navigate: jest.fn() };

async function abrirLogin() {
  await render(
    <SesionProvider>
      {/* @ts-expect-error: basta con la parte de la navegación que usa la pantalla */}
      <MOV01InicioSesion navigation={navegacion} route={{ key: 'k', name: 'InicioSesion' }} />
    </SesionProvider>,
  );
}

async function escribir(correo: string, contrasena: string) {
  await fireEvent.changeText(screen.getByLabelText('Correo'), correo);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), contrasena);
}

describe('MOV-01 · Inicio de sesión', () => {
  beforeEach(() => {
    navegacion.navigate.mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deshabilita «Iniciar sesión» hasta que correo y contraseña son válidos', async () => {
    await abrirLogin();
    const boton = () => screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(boton()).toBeDisabled();

    await escribir('correo-malo', 'Inclutec2026');
    expect(boton()).toBeDisabled();

    await escribir('mariana.lopez@correo.mx', 'corta');
    expect(boton()).toBeDisabled();

    await escribir('mariana.lopez@correo.mx', 'Inclutec2026');
    expect(boton()).toBeEnabled();
  });

  it('muestra y anuncia el mensaje del contrato ante credenciales incorrectas (401)', async () => {
    await abrirLogin();
    await escribir('mariana.lopez@correo.mx', 'ContrasenaMala1');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Error: Correo o contraseña incorrectos.',
    );
  });

  it('muestra y anuncia que la cuenta está suspendida (423)', async () => {
    await abrirLogin();
    await escribir('suspendida@correo.mx', 'Inclutec2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Tu cuenta está suspendida.')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Error: Tu cuenta está suspendida.',
    );
  });

  it('muestra el bloqueo tras 5 intentos fallidos (429)', async () => {
    await abrirLogin();
    await escribir('jorge.ramirez@correo.mx', 'ContrasenaMala1');
    for (let intento = 1; intento <= 6; intento++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled(),
      );
    }

    expect(
      screen.getByText('Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'),
    ).toBeOnTheScreen();
  });

  it('muestra el mensaje genérico ante un error del servicio', async () => {
    jest.spyOn(auth, 'login').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));

    await abrirLogin();
    await escribir('mariana.lopez@correo.mx', 'Inclutec2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde'),
    ).toBeOnTheScreen();
  });

  it('avisa que el administrador usa el panel web y no inicia sesión', async () => {
    await abrirLogin();
    await escribir('admin@inclutec.mx', 'Inclutec2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('El administrador usa el panel web')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Atención: El administrador usa el panel web',
    );
  });

  it('muestra el error de formato bajo el campo y lo anuncia', async () => {
    await abrirLogin();
    await fireEvent.changeText(screen.getByLabelText('Correo'), 'correo-malo');
    await fireEvent(screen.getByLabelText('Correo'), 'blur');

    expect(
      screen.getByText('Escribe un correo válido, por ejemplo nombre@correo.mx.'),
    ).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Correo: Escribe un correo válido, por ejemplo nombre@correo.mx.',
    );
  });

  it('enlaza a recuperar contraseña (MOV-03) y a crear cuenta (MOV-02)', async () => {
    await abrirLogin();

    await fireEvent.press(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(navegacion.navigate).toHaveBeenNthCalledWith(1, 'RecuperarContrasena');
    expect(navegacion.navigate).toHaveBeenNthCalledWith(2, 'Registro');
  });
});
