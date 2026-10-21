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

    expect(await screen.findByRole('header', { name: 'Mi perfil' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Vacantes' })).not.toBeOnTheScreen();
  });

  it('desde Perfil se abre Mi CV', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" pantallaInicial="Perfil" />);
    await screen.findByRole('header', { name: 'Mi perfil' });

    await fireEvent.press(screen.getByRole('button', { name: 'Mi CV' }));

    expect(await screen.findByRole('tab', { name: 'Experiencia' })).toBeSelected();
  });

  it('desde Perfil se abre el aviso de privacidad y se regresa', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" pantallaInicial="Perfil" />);
    await screen.findByRole('header', { name: 'Mi perfil' });

    await fireEvent.press(screen.getByRole('button', { name: 'Aviso de privacidad' }));
    expect(
      await screen.findByRole('header', { name: 'Aviso de privacidad integral de IncluTec' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByRole('header', { name: 'Mi perfil' })).toBeOnTheScreen();
  });

  it('Agregar experiencia en Perfil abre Mi CV en esa pestaña', async () => {
    await abrir(<Entrar correo="jorge.ramirez@correo.mx" pantallaInicial="Perfil" />);
    await screen.findByRole('header', { name: 'Mi perfil' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Agregar experiencia' }));
    expect(await screen.findByRole('tab', { name: 'Experiencia' })).toBeSelected();
  });

  it('el reclutador entra a Mis vacantes', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" />);

    expect(await screen.findByRole('header', { name: 'Mis vacantes' })).toBeOnTheScreen();
    expect(await screen.findByTestId('vacante-1')).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    ).toBeOnTheScreen();
  });

  it('«+ Nueva vacante» abre el formulario de REC-03 en el paso 1', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" />);
    await screen.findByTestId('vacante-1');

    await fireEvent.press(screen.getByRole('button', { name: 'Nueva vacante' }));
    expect(await screen.findByText('Paso 1 de 4')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Datos generales' })).toBeOnTheScreen();
  });

  it('tocar una vacante abre REC-04 con su id', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" />);

    await fireEvent.press(await screen.findByTestId('abrir-vacante-6'));
    expect(await screen.findByTestId('lista-postulados')).toBeOnTheScreen();
    expect(
      await screen.findByRole('header', { name: 'Desarrollador web junior' }),
    ).toBeOnTheScreen();
  });

  it('un reclutador recién registrado aterriza en Organización (REC-01)', async () => {
    await abrir(<Entrar correo="rh@tecnoqro.mx" pantallaInicial="Organizacion" />);

    expect(await screen.findByRole('header', { name: 'Organización' })).toBeOnTheScreen();
    expect(await screen.findByTestId('banner-validacion')).toBeOnTheScreen();
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
    // Y se abre CAN-06 con la postulación de la notificación.
    expect(
      await screen.findByRole('header', { name: 'Técnico de soporte de TI' }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Historial')).toBeOnTheScreen();
  });

  it('Postulaciones abre el detalle y desde ahí la ficha de la empresa (CAN-05 → CAN-06 → CAN-07)', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Postulaciones/ }));

    await fireEvent.press(await screen.findByTestId('postulacion-1'));
    await screen.findByRole('header', { name: 'Técnico de soporte de TI' });
    await fireEvent.press(await screen.findByTestId('abrir-empresa'));

    expect(await screen.findByRole('header', { name: 'TecnoQro' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Prácticas de inclusión' })).toBeOnTheScreen();
  });

  it('Empresas muestra el directorio sin Estudio Trazo y abre la ficha', async () => {
    await abrir(<Entrar correo="mariana.lopez@correo.mx" />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Empresas/ }));

    await fireEvent.press(await screen.findByTestId('empresa-2'));

    expect(await screen.findByRole('header', { name: 'LogiBajío' })).toBeOnTheScreen();
    expect(screen.queryByText('Estudio Trazo', { hidden: true })).toBeNull();
  });

  it('cerrar sesión desde Perfil regresa a MOV-01', async () => {
    await abrir(<Entrar correo="jorge.ramirez@correo.mx" pantallaInicial="Perfil" />);
    await screen.findByRole('header', { name: 'Mi perfil' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    // El modal de confirmación repite el texto del botón; el de confirmar es el último.
    const botones = await screen.findAllByRole('button', { name: 'Cerrar sesión' });
    await fireEvent.press(botones[botones.length - 1]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeOnTheScreen(),
    );
  });
});
