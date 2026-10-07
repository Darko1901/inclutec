import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';
import { Text } from 'react-native';

import { ApiError, auth, notificaciones } from '../../../api';
import { NoLeidasProvider, useNoLeidas } from '../../../navegacion/NoLeidasContext';
import { SesionProvider, useSesion } from '../../../sesion';
import MOV04Notificaciones from '../MOV04Notificaciones';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
}));

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return estado === 'activa' ? <>{children}</> : null;
}

function Contador() {
  const { noLeidas } = useNoLeidas();
  return <Text testID="contador">{String(noLeidas)}</Text>;
}

async function abrir(correo: string) {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <NoLeidasProvider activo>
          <Contador />
          <MOV04Notificaciones />
        </NoLeidasProvider>
      </Entrar>
    </SesionProvider>,
  );
}

const contador = () => screen.getByTestId('contador').props.children as string;

describe('MOV-04 · Notificaciones', () => {
  beforeEach(() => mockNavegar.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('lista las notificaciones con título, mensaje, fecha y la etiqueta «Nueva» en las no leídas', async () => {
    await abrir('mariana.lopez@correo.mx');

    expect(await screen.findByRole('button', { name: /Tu postulación avanzó/ })).toBeOnTheScreen();
    expect(
      screen.getByText('Tu postulación a Técnico de soporte de TI pasó a Entrevista.', {
        hidden: true,
      }),
    ).toBeOnTheScreen();
    // La etiqueta es texto, no solo color: una no leída tiene «Nueva»; las leídas no.
    expect(screen.getAllByText('Nueva', { hidden: true })).toHaveLength(1);
    await waitFor(() => expect(contador()).toBe('1'));
    expect(
      screen.getByRole('button', { name: /^Nueva\. Tu postulación avanzó\./ }),
    ).toBeOnTheScreen();
  });

  it('tocar una la marca como leída, baja el contador y abre CAN-06 con su id', async () => {
    const marcar = jest.spyOn(notificaciones, 'marcarLeida');
    await abrir('mariana.lopez@correo.mx');
    await waitFor(() => expect(contador()).toBe('1'));

    await fireEvent.press(
      await screen.findByRole('button', { name: /^Nueva\. Tu postulación avanzó/ }),
    );

    expect(contador()).toBe('0');
    expect(screen.queryAllByText('Nueva', { hidden: true })).toHaveLength(0);
    expect(mockNavegar).toHaveBeenCalledWith('DetallePostulacion', { id: 1 });
    expect(marcar).toHaveBeenCalledWith(1);
    // El API confirma el mismo número.
    await waitFor(async () => expect(await notificaciones.resumen()).toEqual({ no_leidas: 0 }));
  });

  it('al reclutador lo lleva a la pantalla de su referencia (entrevista → REC-06)', async () => {
    await abrir('rh@tecnoqro.mx');

    await fireEvent.press(await screen.findByRole('button', { name: /^Nueva\. Nueva entrevista/ }));

    expect(mockNavegar).toHaveBeenCalledWith('Agenda', { entrevista_id: 1 });
  });

  it('una notificación ya leída solo navega: no vuelve a marcar ni cambia el contador', async () => {
    const marcar = jest.spyOn(notificaciones, 'marcarLeida');
    await abrir('mariana.lopez@correo.mx');
    await waitFor(() => expect(contador()).toBe('1'));

    await fireEvent.press(
      await screen.findByRole('button', { name: /Tienes una entrevista mañana/ }),
    );

    expect(marcar).not.toHaveBeenCalled();
    expect(contador()).toBe('1');
    expect(mockNavegar).toHaveBeenCalledWith('DetallePostulacion', { id: 1 });
  });

  it('«Marcar todas como leídas» deja el contador en 0', async () => {
    await abrir('notificaciones@correo.mx');
    await waitFor(() => expect(contador()).toBe('5'));

    await fireEvent.press(screen.getByRole('button', { name: 'Marcar todas como leídas' }));

    await waitFor(() => expect(contador()).toBe('0'));
    expect(screen.queryAllByText('Nueva', { hidden: true })).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Marcar todas como leídas' })).toBeDisabled();
  });

  it('pide páginas de 20 y carga la siguiente al llegar al final de la lista', async () => {
    const listar = jest.spyOn(notificaciones, 'listar');
    await abrir('notificaciones@correo.mx');
    await screen.findByRole('button', { name: /Aviso 1\. Notificación/ });
    expect(listar).toHaveBeenCalledWith({ page: 1, size: 20 });

    await fireEvent(screen.getByTestId('lista-notificaciones'), 'endReached');

    await waitFor(() => expect(listar).toHaveBeenCalledWith({ page: 2, size: 20 }));
  });

  it('con 45 notificaciones deja de pedir páginas cuando ya cargó todas', async () => {
    const listar = jest.spyOn(notificaciones, 'listar');
    await abrir('notificaciones@correo.mx');
    await screen.findByRole('button', { name: /Aviso 1\. Notificación/ });
    const lista = () => screen.getByTestId('lista-notificaciones');

    await fireEvent(lista(), 'endReached');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
    await fireEvent(lista(), 'endReached');
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(3));
    await fireEvent(lista(), 'endReached');

    expect(listar).toHaveBeenCalledTimes(3);
  });

  it('sin notificaciones muestra «No tienes notificaciones»', async () => {
    await abrir('jorge.ramirez@correo.mx');

    expect(await screen.findByText('No tienes notificaciones')).toBeOnTheScreen();
  });

  it('si falla la carga muestra el error con «Reintentar»', async () => {
    jest.spyOn(notificaciones, 'listar').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
    await abrir('mariana.lopez@correo.mx');

    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: /Tu postulación avanzó/ })).toBeOnTheScreen();
  });

  describe('preferencias', () => {
    it('muestra un interruptor de push y uno de correo por cada tipo del rol, con nombres claros', async () => {
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });

      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));

      expect(await screen.findByText('Cambios en mis postulaciones')).toBeOnTheScreen();
      expect(
        screen.getByRole('switch', { name: 'Cambios en mis postulaciones: aviso en el teléfono' }),
      ).toBeChecked();
      expect(
        screen.getByRole('switch', { name: 'Cambios en mis postulaciones: correo electrónico' }),
      ).toBeChecked();
      // El candidato no recibe avisos de nuevas postulaciones.
      expect(screen.queryByText('Nuevas postulaciones a mis vacantes')).not.toBeOnTheScreen();
      expect(screen.getAllByRole('switch')).toHaveLength(10);
    });

    it('guarda con PUT al cerrar y avisa «Preferencias guardadas»', async () => {
      const guardar = jest.spyOn(notificaciones, 'guardarPreferencias');
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });
      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));
      await screen.findByText('Cambios en mis postulaciones');

      await fireEvent.press(
        screen.getByRole('switch', { name: 'Cambios en mis postulaciones: aviso en el teléfono' }),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(await screen.findByText('Preferencias guardadas')).toBeOnTheScreen();
      expect(guardar).toHaveBeenCalledTimes(1);
      expect(guardar.mock.calls[0][0]).toContainEqual({
        tipo: 'cambio_estado',
        push: false,
        correo: true,
      });
      const guardadas = await notificaciones.obtenerPreferencias();
      expect(guardadas.find((p) => p.tipo === 'cambio_estado')?.push).toBe(false);
    });

    it('el modal tiene su título y «Volver» regresa a la lista de notificaciones', async () => {
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });
      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));

      expect(
        await screen.findByRole('header', { name: 'Preferencias de avisos' }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Volver' }).props.accessibilityHint).toBe(
        'Guarda tus cambios y regresa a las notificaciones',
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(
        screen.queryByRole('header', { name: 'Preferencias de avisos' }),
      ).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /Tu postulación avanzó/ })).toBeOnTheScreen();
    });

    it('el botón atrás de Android también guarda los cambios y cierra', async () => {
      const guardar = jest.spyOn(notificaciones, 'guardarPreferencias');
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });
      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));
      await screen.findByText('Cambios en mis postulaciones');
      await fireEvent.press(
        screen.getByRole('switch', { name: 'Cambios en mis postulaciones: correo electrónico' }),
      );

      await fireEvent(screen.getByTestId('modal-preferencias'), 'requestClose');

      expect(await screen.findByText('Preferencias guardadas')).toBeOnTheScreen();
      expect(guardar).toHaveBeenCalledTimes(1);
    });

    it('si no cambió nada, cierra sin llamar al API ni avisar', async () => {
      const guardar = jest.spyOn(notificaciones, 'guardarPreferencias');
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });
      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));
      await screen.findByText('Cambios en mis postulaciones');

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(guardar).not.toHaveBeenCalled();
      expect(screen.queryByText('Preferencias guardadas')).not.toBeOnTheScreen();
    });

    it('si el guardado falla, mantiene abierto el modal y muestra el error', async () => {
      jest
        .spyOn(notificaciones, 'guardarPreferencias')
        .mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
      await abrir('mariana.lopez@correo.mx');
      await screen.findByRole('button', { name: /Tu postulación avanzó/ });
      await fireEvent.press(screen.getByRole('button', { name: 'Preferencias de notificaciones' }));
      await screen.findByText('Cambios en mis postulaciones');

      await fireEvent.press(
        screen.getByRole('switch', { name: 'Cambios en mis postulaciones: correo electrónico' }),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(
        await screen.findByText('El servicio no está disponible; intenta más tarde'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Cambios en mis postulaciones')).toBeOnTheScreen();
    });
  });
});
