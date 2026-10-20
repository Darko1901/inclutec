import { render } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';
import { Text } from 'react-native';

import { auth } from '../../api';
import { SesionProvider, useSesion } from '../../sesion';

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return (
    <>
      <Text testID="estado-sesion">{estado}</Text>
      {estado === 'activa' ? children : null}
    </>
  );
}

export async function renderizarComo(correo: string, pantalla: ReactNode) {
  return render(
    <SesionProvider>
      <Entrar correo={correo}>{pantalla}</Entrar>
    </SesionProvider>,
  );
}

export const CUENTAS = {
  laura: 'rh@tecnoqro.mx',
  roberto: 'rh@logibajio.mx',
  daniel: 'contacto@estudiotrazo.mx',
  rechazada: 'rechazada@constructorarivera.mx',
  suspendida: 'suspendida@academiaalameda.mx',
} as const;
