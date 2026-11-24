import { fireEvent, render, screen } from '@testing-library/react-native';

import { marcarArchivoNuevo } from '../../api/config';
import { Avatar } from '../Avatar';
import { LogoEmpresa } from '../LogoEmpresa';

// Las iniciales son decorativas (ocultas al lector de pantalla), por eso se buscan con las ocultas.
const OCULTOS = { includeHiddenElements: true };

describe('Avatar', () => {
  it('si la foto no se descarga muestra las iniciales, y reintenta cuando se sube otra', async () => {
    const foto = '/archivos/fotos/candidato-3.jpg';
    const avatar = <Avatar fotoUrl={foto} nombre="Mariana" apellidos="López" testID="avatar" />;
    const vista = await render(avatar);
    expect(screen.queryByText('ML', OCULTOS)).toBeNull();

    await fireEvent(screen.getByTestId('avatar'), 'error');
    expect(screen.getByText('ML', OCULTOS)).toBeTruthy();

    marcarArchivoNuevo(foto);
    await vista.rerender(
      <Avatar fotoUrl={foto} nombre="Mariana" apellidos="López" testID="avatar" />,
    );
    expect(screen.queryByText('ML', OCULTOS)).toBeNull();
  });
});

describe('LogoEmpresa', () => {
  it('si el logotipo no se descarga muestra las iniciales de la empresa', async () => {
    await render(
      <LogoEmpresa logoUrl="/archivos/logos/empresa-1.png" nombre="Estudio Trazo" testID="logo" />,
    );
    expect(screen.queryByText('ET', OCULTOS)).toBeNull();

    await fireEvent(screen.getByTestId('logo-imagen', OCULTOS), 'error');

    expect(screen.getByText('ET', OCULTOS)).toBeTruthy();
  });
});
