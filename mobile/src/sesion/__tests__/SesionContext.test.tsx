import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { auth, candidatos } from '../../api';
import { obtenerEstado } from '../../api/mock/datos';
import { crearToken } from '../../api/mock/tokens';
import * as dispositivoPush from '../dispositivoPush';
import { MENSAJE_ADMINISTRADOR, MENSAJE_SESION_VENCIDA, SesionProvider, useSesion } from '..';

const envoltorio = ({ children }: { children: ReactNode }) => (
  <SesionProvider>{children}</SesionProvider>
);

async function iniciar() {
  return renderHook(() => useSesion(), { wrapper: envoltorio });
}

function login(correo: string) {
  return auth.login({ correo, contrasena: 'Inclutec2026' });
}

describe('sesión', () => {
  it('empieza cargando y, sin token guardado, pasa a sin_sesion', async () => {
    const { result } = await iniciar();
    expect(result.current.estado).toBe('cargando');

    await act(() => result.current.restaurarSesion());

    expect(result.current.estado).toBe('sin_sesion');
    expect(result.current.usuario).toBeNull();
  });

  it('guarda el token en el almacén seguro al iniciar sesión', async () => {
    const { result } = await iniciar();
    const sesion = await login('mariana.lopez@correo.mx');

    let entro = false;
    await act(async () => {
      entro = await result.current.iniciarSesion(sesion);
    });

    expect(entro).toBe(true);
    expect(result.current.estado).toBe('activa');
    expect(result.current.usuario?.rol).toBe('candidato');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('inclutec_token', sesion.access_token);
  });

  it('restaura la sesión guardada validando el token con auth.me', async () => {
    const sesion = await login('rh@tecnoqro.mx');
    await SecureStore.setItemAsync('inclutec_token', sesion.access_token);

    const { result } = await iniciar();
    await act(() => result.current.restaurarSesion());

    expect(result.current.estado).toBe('activa');
    expect(result.current.usuario).toMatchObject({ id: 2, rol: 'reclutador' });
  });

  it('con un token que el API rechaza (401) vuelve a sin_sesion y borra el token', async () => {
    await SecureStore.setItemAsync('inclutec_token', 'token-que-no-sirve');

    const { result } = await iniciar();
    await act(() => result.current.restaurarSesion());

    await waitFor(() => expect(result.current.estado).toBe('sin_sesion'));
    expect(result.current.aviso).toBe(MENSAJE_SESION_VENCIDA);
    expect(await SecureStore.getItemAsync('inclutec_token')).toBeNull();
  });

  it('al abrir la app con la cuenta suspendida (423) cierra la sesión con el aviso del API', async () => {
    await SecureStore.setItemAsync('inclutec_token', crearToken(100, 'candidato').token);

    const { result } = await iniciar();
    await act(() => result.current.restaurarSesion());

    await waitFor(() => expect(result.current.aviso).toBe('Tu cuenta está suspendida.'));
    expect(result.current.estado).toBe('sin_sesion');
    expect(await SecureStore.getItemAsync('inclutec_token')).toBeNull();
  });

  it('si el administrador suspende la cuenta con la app abierta, la siguiente llamada cierra la sesión', async () => {
    const { result } = await iniciar();
    const sesion = await login('mariana.lopez@correo.mx');
    await act(async () => {
      await result.current.iniciarSesion(sesion);
    });
    const mariana = obtenerEstado().usuarios.find((u) => u.usuario.id === 3);
    if (mariana) mariana.usuario.estado = 'suspendido';

    await act(async () => {
      await expect(candidatos.obtenerPerfil()).rejects.toMatchObject({ status: 423 });
    });

    await waitFor(() => expect(result.current.estado).toBe('sin_sesion'));
    expect(result.current.aviso).toBe('Tu cuenta está suspendida.');
    expect(result.current.usuario).toBeNull();
    expect(await SecureStore.getItemAsync('inclutec_token')).toBeNull();
  });

  it('al eliminar la cuenta, el 423 del logout no cambia el aviso pedido', async () => {
    const avisos: (string | null)[] = [];
    const { result } = await renderHook(
      () => {
        const sesion = useSesion();
        avisos.push(sesion.aviso);
        return sesion;
      },
      { wrapper: envoltorio },
    );
    const sesion = await login('mariana.lopez@correo.mx');
    await act(async () => {
      await result.current.iniciarSesion(sesion);
    });
    await candidatos.eliminarCuenta({ contrasena: 'Inclutec2026' });

    await act(() => result.current.cerrarSesion('Tu cuenta se eliminó.'));

    expect(result.current.estado).toBe('sin_sesion');
    expect(result.current.aviso).toBe('Tu cuenta se eliminó.');
    expect(avisos).not.toContain('Tu cuenta está suspendida.');
  });

  it('no deja entrar al administrador: avisa que usa el panel web y cierra la sesión', async () => {
    const { result } = await iniciar();
    const sesion = await login('admin@inclutec.mx');

    let entro = true;
    await act(async () => {
      entro = await result.current.iniciarSesion(sesion);
    });

    expect(entro).toBe(false);
    expect(result.current.estado).toBe('sin_sesion');
    expect(result.current.aviso).toBe(MENSAJE_ADMINISTRADOR);
    expect(await SecureStore.getItemAsync('inclutec_token')).toBeNull();
  });

  it('si hay un token de administrador guardado, al abrir la app lo rechaza igual', async () => {
    const sesion = await login('admin@inclutec.mx');
    await SecureStore.setItemAsync('inclutec_token', sesion.access_token);

    const { result } = await iniciar();
    await act(() => result.current.restaurarSesion());

    expect(result.current.estado).toBe('sin_sesion');
    expect(result.current.aviso).toBe(MENSAJE_ADMINISTRADOR);
  });

  it('al cerrar sesión envía el token push a POST /auth/logout', async () => {
    jest.spyOn(dispositivoPush, 'obtenerTokenPush').mockReturnValue('ExponentPushToken[abc]');
    const alCerrar = jest.spyOn(auth, 'logout');
    const { result } = await iniciar();
    const sesion = await login('mariana.lopez@correo.mx');
    await act(async () => {
      await result.current.iniciarSesion(sesion);
    });

    await act(() => result.current.cerrarSesion());

    expect(alCerrar).toHaveBeenCalledWith({ expo_push_token: 'ExponentPushToken[abc]' });
    alCerrar.mockRestore();
  });

  it('iniciarSesion guarda la pestaña inicial pedida y cerrar sesión la borra', async () => {
    const { result } = await iniciar();
    const sesion = await login('mariana.lopez@correo.mx');

    await act(async () => {
      await result.current.iniciarSesion(sesion, { pantallaInicial: 'Perfil' });
    });
    expect(result.current.pantallaInicial).toBe('Perfil');

    await act(() => result.current.cerrarSesion());
    expect(result.current.pantallaInicial).toBeNull();
  });

  it('cerrar sesión borra el token y el usuario', async () => {
    const { result } = await iniciar();
    const sesion = await login('mariana.lopez@correo.mx');
    await act(async () => {
      await result.current.iniciarSesion(sesion);
    });

    await act(() => result.current.cerrarSesion());

    expect(result.current.estado).toBe('sin_sesion');
    expect(result.current.usuario).toBeNull();
    expect(await SecureStore.getItemAsync('inclutec_token')).toBeNull();
  });
});
