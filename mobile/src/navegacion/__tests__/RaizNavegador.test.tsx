import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';

import { auth } from '../../api';
import { SesionProvider, useSesion, type PantallaInicial } from '../../sesion';
import { RaizNavegador } from '../RaizNavegador';

/** Inicia sesión con una cuenta de prueba, como lo haría MOV-01 o MOV-02. */
function Entrar({
  correo,
  pantallaInicial,
}: {
  correo: string;
  pantallaInicial?: PantallaInicial;
}) {
  const { iniciarSesion } = useSesion();
  useEffect(() => {
    void auth
      .login({ correo, contrasena: 'Inclutec2026' })
      .then((sesion) => iniciarSesion(sesion, { pantallaInicial }));
  }, [correo, pantallaInicial, iniciarSesion]);
  return null;
}

async function abrir(entrada?: ReactNode) {
  await render(
    <SesionProvider>
      {entrada}
      <NavigationContainer>
        <RaizNavegador />
      </NavigationContainer>
    </SesionProvider>,
  );
}

describe('navegación por rol', () => {
  it('sin sesión muestra MOV-01 con enlaces a MOV-02 y MOV-03', async () => {
    await abrir();

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Paso 1 de 3')).toBeOnTheScreen();
  });

  it('el candidato entra a Vacantes y la pestaña Notificaciones anuncia «1 sin leer»', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" />);

    expect(await screen.findByRole('header', { name: 'Vacantes' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    ).toBeOnTheScreen();
    for (const pestana of ['Vacantes', 'Postulaciones', 'Empresas', 'Perfil']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${pestana}`) })).toBeOnTheScreen();
    }
  });

  it('un candidato recién registrado aterriza en Perfil (CAN-03)', async () => {
    await abrir(<Entrar correo="jorge.ramirez@correo.mx" pantallaInicial="Perfil" />);

    expect(await screen.findByText('CAN-03 · Mi perfil')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Vacantes' })).not.toBeOnTheScreen();
  });

  it('el reclutador entra a Mis vacantes', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" />);

    expect(await screen.findByText('REC-02 · Mis vacantes')).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    ).toBeOnTheScreen();
  });

  it('un reclutador recién registrado aterriza en Organización (REC-01)', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" pantallaInicial="Organizacion" />);

    expect(await screen.findByText('REC-01 · Organización')).toBeOnTheScreen();
  });

  it('el contador baja en la pestaña al marcar una notificación como leída', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    );

    await fireEvent.press(
      await screen.findByRole('button', { name: /^Nueva\. Tu postulación avanzó/ }),
    );

    // La pestaña queda detrás de la pantalla de detalle, pero ya no anuncia mensajes sin leer.
    expect(
      await screen.findByRole('button', { name: 'Notificaciones', hidden: true }),
    ).toBeOnTheScreen();
    // Y la pantalla relacionada recibe el id de la postulación.
    expect(await screen.findByText('Postulación n.º 1')).toBeOnTheScreen();
  });

  it('cerrar sesión desde Perfil regresa a MOV-01', async () => {
    await abrir(<Entrar correo="jorge.ramirez@correo.mx" pantallaInicial="Perfil" />);
    await screen.findByText('CAN-03 · Mi perfil');

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    // El modal de confirmación repite el texto del botón; el de confirmar es el último.
    const botones = await screen.findAllByRole('button', { name: 'Cerrar sesión' });
    await fireEvent.press(botones[botones.length - 1]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen(),
    );
  });
});
