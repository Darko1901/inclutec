import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';

import { ApiError, auth, postulaciones, type PostulacionResumen } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN05Postulaciones from '../CAN05Postulaciones';
import { resumenAccesiblePostulacion } from '../postulaciones/textosPostulacion';

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
        <CAN05Postulaciones />
      </Entrar>
    </SesionProvider>,
  );
}

const tarjetas = () =>
  screen.queryAllByTestId(/^postulacion-\d+$/).map((t) => t.props.testID as string);

const pestana = (nombre: RegExp | string) => screen.getByRole('tab', { name: nombre });

async function esperarActivas() {
  await screen.findByTestId('postulacion-1');
}

describe('CAN-05 · Mis postulaciones', () => {
  beforeEach(() => mockNavegar.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('Mariana: Activas muestra la vacante 1 con la fecha y hora de su entrevista agendada', async () => {
    await abrir();
    await esperarActivas();

    expect(tarjetas()).toEqual(['postulacion-1']);
    const tarjeta = within(screen.getByTestId('postulacion-1'));
    expect(tarjeta.getByText('Técnico de soporte de TI', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('TecnoQro', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('Te postulaste el 30 sep', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText('Entrevista', { hidden: true })).toBeOnTheScreen();
    expect(tarjeta.getByText(/^Entrevista el \d+ \w+, /, { hidden: true })).toBeOnTheScreen();
  });

  it('las pestañas tienen rol de pestaña, su número y marcan la elegida', async () => {
    await abrir();
    await esperarActivas();

    await waitFor(() => expect(pestana('Activas, 1 postulación')).toBeOnTheScreen());
    expect(pestana('Activas, 1 postulación')).toBeSelected();
    expect(pestana('Finalizadas, 3 postulaciones')).not.toBeSelected();
    expect(screen.getByText('Activas (1)', { hidden: true })).toBeOnTheScreen();
    expect(screen.getByText('Finalizadas (3)', { hidden: true })).toBeOnTheScreen();
  });

  it('Finalizadas muestra las de prueba con su estado en texto e ícono', async () => {
    await abrir();
    await esperarActivas();

    await fireEvent.press(pestana(/^Finalizadas/));
    await screen.findByTestId('postulacion-101');

    expect(tarjetas()).toEqual(['postulacion-103', 'postulacion-101', 'postulacion-102']);
    expect(pestana(/^Finalizadas/)).toBeSelected();
    for (const [id, estado] of [
      [103, 'Retirada'],
      [101, 'Aceptada'],
      [102, 'No seleccionada'],
    ] as const) {
      const chip = within(screen.getByTestId(`postulacion-${id}`)).getByLabelText(
        `Estado: ${estado}`,
        { hidden: true },
      );
      // Texto e ícono dentro del mismo chip: nunca solo color.
      expect(within(chip).getByText(estado, { hidden: true })).toBeOnTheScreen();
    }
    // Las finalizadas no tienen entrevista agendada que mostrar.
    expect(screen.queryByText(/^Entrevista el /, { hidden: true })).toBeNull();
  });

  it('filtra por estado dentro de la pestaña y avisa si no hay ninguna', async () => {
    await abrir();
    await esperarActivas();
    await fireEvent.press(pestana(/^Finalizadas/));
    await screen.findByTestId('postulacion-101');

    // Las opciones son las de la pestaña elegida.
    expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
      'Todos',
      'Aceptada',
      'No seleccionada',
      'Retirada',
    ]);
    await fireEvent.press(screen.getByRole('radio', { name: 'Aceptada' }));
    await waitFor(() => expect(tarjetas()).toEqual(['postulacion-101']));
    expect(screen.getByRole('radio', { name: 'Aceptada' })).toBeChecked();

    // Al cambiar de pestaña el filtro se quita.
    await fireEvent.press(pestana(/^Activas/));
    await screen.findByTestId('postulacion-1');
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Postulada' }));
    expect(await screen.findByText('No tienes postulaciones en «Postulada»')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos los estados' }));
    await screen.findByTestId('postulacion-1');
  });

  it('la tarjeta es un solo elemento con todo su resumen y abre CAN-06', async () => {
    await abrir();
    await esperarActivas();

    const botones = within(screen.getByTestId('lista-postulaciones')).getAllByRole('button');
    expect(botones).toHaveLength(1);
    const etiqueta = botones[0].props.accessibilityLabel as string;
    expect(etiqueta).toMatch(
      /^Técnico de soporte de TI, TecnoQro\. Te postulaste el miércoles 30 de septiembre de 2026\. Estado: Entrevista\. Entrevista agendada el \w+ \d+ de \w+ de \d{4}, a las \d+:\d{2} de la \w+$/,
    );
    expect(botones[0].props.accessibilityHint).toBe('Abre el detalle de la postulación');

    await fireEvent.press(botones[0]);
    expect(mockNavegar).toHaveBeenCalledWith('DetallePostulacion', { id: 1 });
  });

  it('sin ninguna postulación: «Aún no te has postulado» y «Ver vacantes»', async () => {
    await abrir('notificaciones@correo.mx');

    expect(await screen.findByText('Aún no te has postulado')).toBeOnTheScreen();
    expect(tarjetas()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver vacantes' }));
    expect(mockNavegar).toHaveBeenCalledWith('Vacantes');
  });

  it('si solo la pestaña está vacía no dice que nunca se ha postulado', async () => {
    await abrir('jorge.ramirez@correo.mx');
    await screen.findByTestId('postulacion-100');

    await fireEvent.press(pestana(/^Finalizadas/));
    expect(await screen.findByText('Aún no tienes postulaciones finalizadas')).toBeOnTheScreen();
    expect(screen.queryByText('Aún no te has postulado')).toBeNull();
  });

  it('si falla la carga muestra el error con «Reintentar»', async () => {
    jest.spyOn(postulaciones, 'mias').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
    await abrir();

    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await esperarActivas();
  });

  it('«jalar para actualizar» vuelve a pedir la lista', async () => {
    const mias = jest.spyOn(postulaciones, 'mias');
    await abrir();
    await esperarActivas();
    const antes = mias.mock.calls.filter(([c]) => c?.size === 20).length;

    await act(async () => {
      screen.getByTestId('lista-postulaciones').props.refreshControl.props.onRefresh();
    });

    await waitFor(() =>
      expect(mias.mock.calls.filter(([c]) => c?.size === 20).length).toBe(antes + 1),
    );
  });

  it('desplazamiento infinito: con más de 20 postulaciones pide la página 2', async () => {
    const estado = obtenerEstado();
    const modelo = estado.postulaciones.find((p) => p.id === 102)!;
    for (let i = 0; i < 25; i++) {
      estado.postulaciones.push({
        ...modelo,
        id: 200 + i,
        creado_en: `2026-08-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
      });
    }
    const mias = jest.spyOn(postulaciones, 'mias');
    await abrir();
    await esperarActivas();
    await fireEvent.press(pestana(/^Finalizadas/));
    await screen.findByTestId('postulacion-101');
    expect(mias).toHaveBeenCalledWith({ activas: false, page: 1, size: 20 });

    await fireEvent(screen.getByTestId('lista-postulaciones'), 'endReached');

    await waitFor(() => expect(mias).toHaveBeenCalledWith({ activas: false, page: 2, size: 20 }));
    // Ya están las 28: llegar otra vez al final no pide una tercera página.
    await fireEvent(screen.getByTestId('lista-postulaciones'), 'endReached');
    expect(mias.mock.calls.filter(([c]) => c?.page === 3)).toHaveLength(0);
  });
});

describe('resumenAccesiblePostulacion', () => {
  const base: PostulacionResumen = {
    id: 1,
    vacante: {
      id: 1,
      titulo: 'Técnico de soporte de TI',
      empresa: { id: 1, nombre_comercial: 'TecnoQro', logo_url: null },
    },
    estado: 'entrevista',
    creado_en: '2026-09-30T17:20:00Z',
    actualizado_en: '2026-10-02T16:30:00Z',
    entrevista_inicio: '2026-10-06T16:00:00Z',
  };

  it('lleva puesto, empresa, fecha completa, estado en texto y la entrevista con su hora', () => {
    expect(resumenAccesiblePostulacion(base)).toBe(
      'Técnico de soporte de TI, TecnoQro. Te postulaste el miércoles 30 de septiembre de 2026. Estado: Entrevista. Entrevista agendada el martes 6 de octubre de 2026, a las 10:00 de la mañana',
    );
  });

  it('sin entrevista agendada no la menciona', () => {
    expect(
      resumenAccesiblePostulacion({ ...base, estado: 'en_revision', entrevista_inicio: null }),
    ).toBe(
      'Técnico de soporte de TI, TecnoQro. Te postulaste el miércoles 30 de septiembre de 2026. Estado: En revisión',
    );
  });
});
