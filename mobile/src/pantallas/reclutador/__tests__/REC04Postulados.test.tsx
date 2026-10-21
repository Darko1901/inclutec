import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ApiError, postulaciones } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';
import REC04Postulados from '../REC04Postulados';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

// El Modal de pruebas solo muestra su contenido.
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = jest.requireActual('react-native');
  const Modal = (propiedades: { testID?: string; visible?: boolean; children?: unknown }) =>
    propiedades.visible === false ? null : (
      <View testID={propiedades.testID}>{propiedades.children as never}</View>
    );
  return { __esModule: true, default: Modal };
});

type Props = ComponentProps<typeof REC04Postulados>;
const navegar = jest.fn();
const volver = jest.fn();

async function abrir(correo: string = CUENTAS.laura, vacanteId = 1) {
  const props = {
    route: { key: 'Postulados', name: 'Postulados', params: { vacante_id: vacanteId } },
    navigation: { navigate: navegar, goBack: volver },
  } as unknown as Props;
  await renderizarComo(correo, <REC04Postulados {...props} />);
  await screen.findByTestId('lista-postulados');
}

/** Todo el texto y las etiquetas accesibles del árbol, en una sola cadena. */
function textosDe(nodo: unknown): string {
  if (nodo === null || nodo === undefined) return '';
  if (typeof nodo === 'string') return nodo;
  if (Array.isArray(nodo)) return nodo.map(textosDe).join(' ');
  const { props, children } = nodo as {
    props?: { accessibilityLabel?: string; accessibilityHint?: string };
    children?: unknown;
  };
  return [props?.accessibilityLabel, props?.accessibilityHint, textosDe(children)]
    .filter(Boolean)
    .join(' ');
}

const tarjetas = () =>
  screen.getAllByTestId(/^postulado-\d+$/).map((t) => Number(t.props.testID.split('-')[1]));

describe('REC-04 · Postulados', () => {
  beforeEach(() => {
    navegar.mockClear();
    volver.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('muestra el título de la vacante, cuántos postulados hay y cómo se ordenan', async () => {
    await abrir();
    expect(
      await screen.findByRole('header', { name: 'Técnico de soporte de TI' }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('28 postulados')).toBeOnTheScreen();
    expect(screen.getByTestId('texto-orden')).toHaveTextContent(
      /Ordenados de mayor a menor compatibilidad laboral\./,
    );
    expect(screen.getByTestId('texto-orden')).toHaveTextContent(
      /solo considera habilidades, formación y modalidad/,
    );
  });

  it('las tarjetas salen de mayor a menor compatibilidad y Mariana tiene 83 %', async () => {
    await abrir();
    await screen.findByTestId('postulado-1');
    const ids = tarjetas();
    expect(ids).toHaveLength(20);
    expect(ids.slice(0, 2)).toEqual([117, 110]);

    const mariana = screen.getByTestId('postulado-1');
    expect(
      within(mariana).getByText('Compatibilidad laboral 83 %', { hidden: true }),
    ).toBeOnTheScreen();
    expect(within(mariana).getByText('Mariana López García', { hidden: true })).toBeOnTheScreen();
    expect(within(mariana).getByText('Entrevista', { hidden: true })).toBeOnTheScreen();
  });

  it('la tarjeta es un solo elemento con todo su resumen', async () => {
    await abrir();
    const boton = await screen.findByTestId('postulado-1');
    expect(boton.props.accessibilityLabel).toMatch(
      /^Mariana López García\. Compatibilidad laboral 83 por ciento\. Estado: Entrevista\. Se postuló el 30 sep( 2026)?$/,
    );
    expect(boton.props.accessibilityHint).toBe('Abre el detalle del postulado');
    // «Ajustes por confirmar» se dice en el resumen solo cuando aplica.
    expect((await screen.findByTestId('postulado-112')).props.accessibilityLabel).toMatch(
      /Ajustes por confirmar$/,
    );
    expect(
      within(screen.getByTestId('postulado-112')).getByText('Ajustes por confirmar', {
        hidden: true,
      }),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('postulado-110')).queryByText('Ajustes por confirmar', {
        hidden: true,
      }),
    ).toBeNull();
  });

  it('nada sobre discapacidad en la pantalla', async () => {
    await abrir();
    await screen.findByTestId('postulado-112');
    const todo = textosDe(screen.toJSON());
    expect(todo).not.toMatch(/discapacidad/i);
    expect(todo).not.toMatch(/diagn[oó]stic/i);
    // Ni el detalle de las necesidades: en la lista solo hay «Ajustes por confirmar».
    expect(todo).not.toMatch(/lector de pantalla|rampa|intérprete/i);
    expect(todo).toMatch(/Ajustes por confirmar/);
  });

  it('abrir una tarjeta lleva a REC-05 con el id de la postulación', async () => {
    await abrir();
    await fireEvent.press(await screen.findByTestId('postulado-1'));
    expect(navegar).toHaveBeenCalledWith('DetallePostulado', { id: 1 });
  });

  it('filtra por estado y anuncia el resultado', async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await abrir();
    await screen.findByTestId('postulado-1');

    await fireEvent.press(screen.getByRole('radio', { name: 'Entrevista' }));
    await waitFor(() => expect(tarjetas().sort((a, b) => a - b)).toEqual([1, 115]));
    expect(screen.getByRole('radio', { name: 'Entrevista' })).toBeChecked();
    expect(await screen.findByText('Mostrando 2 postulados con estos filtros.')).toBeOnTheScreen();
    expect(anunciar).toHaveBeenCalledWith('2 postulados');

    await fireEvent.press(screen.getByRole('radio', { name: 'Retirada' }));
    await waitFor(() => expect(tarjetas()).toEqual([118]));
  });

  it('filtra por compatibilidad mínima con el selector de 0, 50, 70 y 85 %', async () => {
    await abrir();
    await screen.findByTestId('postulado-1');
    await fireEvent.press(screen.getByTestId('selector-minima'));
    for (const opcion of [
      'Todas, sin mínimo',
      '50 por ciento o más',
      '70 por ciento o más',
      '85 por ciento o más',
    ]) {
      expect(await screen.findByRole('radio', { name: opcion })).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole('radio', { name: '85 por ciento o más' }));

    await waitFor(() => expect(screen.queryByTestId('postulado-1')).toBeNull());
    await screen.findAllByTestId(/^postulado-\d+$/);
    const etiquetas = screen
      .getAllByTestId(/^postulado-\d+$/)
      .map((t) =>
        Number(/Compatibilidad laboral (\d+) por ciento/.exec(t.props.accessibilityLabel)![1]),
      );
    expect(etiquetas.length).toBeGreaterThan(0);
    expect(etiquetas.every((n) => n >= 85)).toBe(true);
    expect(screen.getByTestId('selector-minima').props.accessibilityLabel).toBe(
      'Compatibilidad mínima, 85 por ciento o más',
    );
  });

  it('combinar filtros sin resultados ofrece quitarlos', async () => {
    await abrir();
    await screen.findByTestId('postulado-1');
    await fireEvent.press(screen.getByRole('radio', { name: 'No seleccionada' }));
    await fireEvent.press(screen.getByTestId('selector-minima'));
    await fireEvent.press(await screen.findByRole('radio', { name: '85 por ciento o más' }));

    expect(await screen.findByText('Ningún postulado cumple estos filtros')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(await screen.findByTestId('postulado-1')).toBeOnTheScreen();
  });

  it('el desplazamiento infinito pide la segunda página y no una tercera', async () => {
    const espia = jest.spyOn(postulaciones, 'postuladosDe');
    await abrir();
    await screen.findByTestId('postulado-1');
    expect(tarjetas()).toHaveLength(20);
    expect(espia).toHaveBeenCalledWith(1, { page: 1, size: 20 });

    await fireEvent(screen.getByTestId('lista-postulados'), 'endReached');
    await waitFor(() => expect(espia).toHaveBeenCalledWith(1, { page: 2, size: 20 }));
    // Ya están los 28: llegar otra vez al final no pide más.
    await fireEvent(screen.getByTestId('lista-postulados'), 'endReached');
    expect(espia.mock.calls.filter(([, c]) => c?.page === 3)).toHaveLength(0);
  });

  it('jalar para actualizar vuelve a pedir la lista', async () => {
    await abrir();
    await screen.findByTestId('postulado-1');
    const espia = jest.spyOn(postulaciones, 'postuladosDe');
    const lista = screen.getByTestId('lista-postulados');
    await act(async () => {
      await lista.props.refreshControl.props.onRefresh();
    });
    await waitFor(() => expect(espia).toHaveBeenCalled());
  });

  it('sin postulados: «Aún no hay postulados»', async () => {
    obtenerEstado().postulaciones = obtenerEstado().postulaciones.filter((p) => p.vacante_id !== 6);
    await abrir(CUENTAS.laura, 6);
    expect(await screen.findByText('Aún no hay postulados')).toBeOnTheScreen();
  });

  it('una vacante de otra empresa explica que no es suya y regresa', async () => {
    await abrir(CUENTAS.laura, 2);
    expect(await screen.findByText('Esta vacante no es de tu empresa')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver a mis vacantes' }));
    expect(volver).toHaveBeenCalled();
  });

  it('si falla la carga ofrece «Reintentar»', async () => {
    const original = postulaciones.postuladosDe.bind(postulaciones);
    const falla = jest.spyOn(postulaciones, 'postuladosDe').mockRejectedValue(
      new ApiError({
        status: 500,
        codigo: 'error_interno',
        detail: 'El servicio no está disponible; intenta más tarde.',
      }),
    );
    await abrir();
    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde.'),
    ).toBeOnTheScreen();
    falla.mockImplementation(original);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByTestId('postulado-1')).toBeOnTheScreen();
  });
});
