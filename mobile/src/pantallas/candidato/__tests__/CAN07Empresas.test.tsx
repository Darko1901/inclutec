import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';

import { ApiError, auth, empresas } from '../../../api';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN07Empresas from '../CAN07Empresas';
import {
  dominioDe,
  resumenAccesibleEmpresa,
  textoVacantesActivas,
} from '../empresas/textosEmpresa';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
  // Sin NavigationContainer, useFocusEffect se comporta como un efecto normal.
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return estado === 'activa' ? <>{children}</> : null;
}

async function abrir(correo = 'mariana.lopez@correo.mx') {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <CAN07Empresas />
      </Entrar>
    </SesionProvider>,
  );
}

const tarjetas = () =>
  screen.queryAllByTestId(/^empresa-\d+$/).map((t) => t.props.testID as string);

describe('CAN-07 · Directorio de empresas', () => {
  beforeEach(() => mockNavegar.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('muestra TecnoQro, LogiBajío y ConCentro por nombre, y no Estudio Trazo (pendiente)', async () => {
    await abrir();
    await screen.findByTestId('empresa-1');

    expect(tarjetas()).toEqual(['empresa-3', 'empresa-2', 'empresa-1']);
    expect(screen.queryByText('Estudio Trazo', { hidden: true })).toBeNull();
  });

  it('cada tarjeta lleva nombre, «✓ Empresa validada», sector y vacantes activas', async () => {
    await abrir();
    await screen.findByTestId('empresa-1');

    const tarjeta = within(screen.getByTestId('empresa-1'));
    expect(tarjeta.getByText('TecnoQro', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('✓ Empresa validada', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('Tecnologías de la información', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('2 vacantes activas', { hidden: true })).toBeOnTheScreen();
    // Sin logotipo que se pueda descargar muestra las iniciales (LogiBajío no tiene logotipo).
    expect(
      within(screen.getByTestId('empresa-2')).getByText('L', { hidden: true }),
    ).toBeOnTheScreen();
  });

  it('la tarjeta es un solo botón con todo su resumen y abre la ficha', async () => {
    await abrir();
    await screen.findByTestId('empresa-1');

    const botones = screen.getAllByTestId(/^empresa-\d+$/);
    expect(botones.map((b) => b.props.accessibilityLabel)).toEqual([
      'ConCentro, empresa validada, Servicios profesionales, 2 vacantes activas',
      'LogiBajío, empresa validada, Manufactura, 2 vacantes activas',
      'TecnoQro, empresa validada, Tecnologías de la información, 2 vacantes activas',
    ]);
    await fireEvent.press(botones[2]);
    expect(mockNavegar).toHaveBeenCalledWith('FichaEmpresa', { id: 1 });
  });

  it('filtra por sector con el selector y «Todos los sectores» lo quita', async () => {
    const listar = jest.spyOn(empresas, 'listar');
    await abrir();
    await screen.findByTestId('empresa-1');

    await fireEvent.press(await screen.findByRole('button', { name: /^Sector, / }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Manufactura' }));

    await waitFor(() => expect(tarjetas()).toEqual(['empresa-2']));
    expect(listar).toHaveBeenCalledWith({ sector_id: 1, page: 1, size: 20 });

    await fireEvent.press(screen.getByRole('button', { name: /^Sector, / }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Todos los sectores' }));
    await waitFor(() => expect(tarjetas()).toHaveLength(3));
  });

  describe('buscador', () => {
    // Los temporizadores falsos se activan cuando la lista ya cargó (ver CAN-01).
    afterEach(() => jest.useRealTimers());

    it('busca a partir de 3 caracteres y 400 ms después de dejar de escribir', async () => {
      await abrir();
      await screen.findByTestId('empresa-1');
      jest.useFakeTimers();
      const listar = jest.spyOn(empresas, 'listar');

      await fireEvent.changeText(screen.getByLabelText('Buscar empresas'), 'lo');
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(listar).not.toHaveBeenCalled();
      expect(screen.getByText('Escribe al menos 3 letras para buscar.')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('Buscar empresas'), 'logibajio');
      await act(async () => {
        jest.advanceTimersByTime(399);
      });
      expect(listar).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => expect(listar).toHaveBeenCalledTimes(1));
      expect(listar).toHaveBeenCalledWith({ q: 'logibajio', page: 1, size: 20 });
      await waitFor(() => expect(tarjetas()).toEqual(['empresa-2']));
    });

    it('buscar a Estudio Trazo no encuentra nada y «Quitar filtros» regresa el directorio', async () => {
      await abrir();
      await screen.findByTestId('empresa-1');
      jest.useFakeTimers();

      await fireEvent.changeText(screen.getByLabelText('Buscar empresas'), 'trazo');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(
        await screen.findByText('No encontramos empresas con estos filtros'),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtros' }));
      await screen.findByTestId('empresa-1');
      expect(screen.getByLabelText('Buscar empresas').props.value).toBe('');
    });
  });

  it('si falla la carga muestra el error con «Reintentar»', async () => {
    jest.spyOn(empresas, 'listar').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
    await abrir();

    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByTestId('empresa-1');
  });

  it('sin empresas registradas lo dice', async () => {
    jest.spyOn(empresas, 'listar').mockResolvedValue({ items: [], total: 0, page: 1, size: 20 });
    await abrir();

    expect(await screen.findByText('Por ahora no hay empresas registradas')).toBeOnTheScreen();
  });

  it('«jalar para actualizar» vuelve a pedir la lista', async () => {
    const listar = jest.spyOn(empresas, 'listar');
    await abrir();
    await screen.findByTestId('empresa-1');
    const antes = listar.mock.calls.length;

    await act(async () => {
      screen.getByTestId('lista-empresas').props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(listar.mock.calls.length).toBeGreaterThan(antes));
  });
});

describe('textos de empresa', () => {
  it('cuenta las vacantes activas en singular y plural', () => {
    expect(textoVacantesActivas(0)).toBe('Sin vacantes activas');
    expect(textoVacantesActivas(1)).toBe('1 vacante activa');
    expect(textoVacantesActivas(3)).toBe('3 vacantes activas');
  });

  it('la etiqueta accesible lleva nombre, validación, sector y vacantes', () => {
    expect(
      resumenAccesibleEmpresa({
        id: 1,
        nombre_comercial: 'TecnoQro',
        logo_url: null,
        sector: { id: 4, nombre: 'Tecnologías de la información' },
        tamano_empresa: { id: 3, nombre: 'Mediana', rango: '51 a 250 trabajadores' },
        municipio: { id: 3, nombre: 'Querétaro', entidad: { id: 22, nombre: 'Querétaro' } },
        vacantes_publicadas: 1,
      }),
    ).toBe('TecnoQro, empresa validada, Tecnologías de la información, 1 vacante activa');
  });

  it('muestra solo el dominio del sitio web', () => {
    expect(dominioDe('https://www.tecnoqro.mx/inicio?x=1')).toBe('tecnoqro.mx');
    expect(dominioDe('http://logibajio.mx')).toBe('logibajio.mx');
  });
});
