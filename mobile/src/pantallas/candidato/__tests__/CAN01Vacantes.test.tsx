import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { useEffect, type ReactNode } from 'react';

import { ApiError, auth, configurarSesionApi, vacantes } from '../../../api';
import { crearToken } from '../../../api/mock/tokens';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN01Vacantes from '../CAN01Vacantes';
import { resumenAccesible } from '../vacantes/textos';

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
        <CAN01Vacantes />
      </Entrar>
    </SesionProvider>,
  );
}

const tarjetas = () => screen.getAllByTestId(/^vacante-\d+$/).map((t) => t.props.testID as string);

/** La vacante 1 como la ve Mariana, para armar datos de prueba sin abrir la pantalla. */
async function primeraVacante() {
  const { token } = crearToken(3, 'candidato');
  configurarSesionApi({ obtenerToken: () => token });
  return (await vacantes.recomendadas()).items[0];
}

async function esperarLista() {
  await screen.findByTestId('vacante-1');
}

describe('CAN-01 · Vacantes', () => {
  beforeEach(() => mockNavegar.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('Mariana: abre con «Recomendadas para ti» y Técnico de soporte de TI (88 %) primero', async () => {
    await abrir();
    await esperarLista();

    expect(screen.getByText('Recomendadas para ti')).toBeOnTheScreen();
    expect(tarjetas()).toEqual([
      'vacante-1',
      'vacante-2',
      'vacante-4',
      'vacante-3',
      'vacante-5',
      'vacante-6',
    ]);
    const primera = within(screen.getByTestId('vacante-1'));
    expect(primera.getByText('Técnico de soporte de TI', { hidden: true })).toBeOnTheScreen();
    expect(primera.getByText('Compatibilidad 88 %', { hidden: true })).toBeOnTheScreen();
    expect(primera.getByText('Empresa validada', { hidden: true })).toBeOnTheScreen();
    expect(primera.getByText('Híbrido · Querétaro', { hidden: true })).toBeOnTheScreen();
    expect(primera.getByText('Ya te postulaste', { hidden: true })).toBeOnTheScreen();
  });

  it('cada tarjeta es un solo elemento con todo su resumen para el lector de pantalla', async () => {
    await abrir();
    await esperarLista();

    expect(
      screen.getByRole('button', {
        name: 'Técnico de soporte de TI, TecnoQro, empresa validada, híbrido, Querétaro, compatibilidad 88 por ciento, acceso con rampa, baño accesible, horario flexible. Ya te postulaste',
      }),
    ).toBeOnTheScreen();
    // Una vacante sin postulación no lleva «Ya te postulaste».
    expect(
      screen.getByRole('button', {
        name: 'Auxiliar de almacén, LogiBajío, empresa validada, presencial, El Marqués, compatibilidad 55 por ciento, acceso con rampa, elevador, baño accesible',
      }),
    ).toBeOnTheScreen();
  });

  it('la vacante sin ajustes lo dice en su resumen', async () => {
    await abrir();
    await esperarLista();

    expect(
      screen.getByRole('button', {
        name: /^Ejecutivo de atención telefónica, ConCentro, empresa validada, presencial, Corregidora, compatibilidad 25 por ciento, sin ajustes de accesibilidad declarados$/,
      }),
    ).toBeOnTheScreen();
  });

  it('tocar una tarjeta abre CAN-02 con el id de la vacante', async () => {
    await abrir();
    await esperarLista();

    await fireEvent.press(screen.getByTestId('vacante-4'));

    expect(mockNavegar).toHaveBeenCalledWith('DetalleVacante', { id: 4 });
  });

  it('muestra el aviso de perfil incompleto con acceso a Perfil', async () => {
    await abrir();
    expect(
      await screen.findByText('Completa tu perfil para recibir mejores recomendaciones.', {
        hidden: true,
      }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Completar mi perfil' }));

    expect(mockNavegar).toHaveBeenCalledWith('Perfil');
  });

  it('pide la primera página de 20 y la siguiente al llegar al final', async () => {
    const recomendadas = jest.spyOn(vacantes, 'recomendadas');
    await abrir();
    await esperarLista();
    expect(recomendadas).toHaveBeenCalledWith({ page: 1, size: 20 });

    // Solo hay 6 vacantes: llegar al final no pide otra página.
    await fireEvent(screen.getByTestId('lista-vacantes'), 'endReached');
    expect(recomendadas).toHaveBeenCalledTimes(1);
  });

  it('desplazamiento infinito: con más de 20 resultados pide la página 2', async () => {
    const base = await primeraVacante();
    jest.spyOn(vacantes, 'recomendadas').mockImplementation(async ({ page = 1 } = {}) => ({
      items: Array.from({ length: page === 1 ? 20 : 5 }, (_, i) => ({
        ...base,
        id: 1000 + (page - 1) * 20 + i,
        titulo: `Vacante ${(page - 1) * 20 + i + 1}`,
        postulacion_id: null,
      })),
      total: 25,
      page,
      size: 20,
    }));
    await abrir();
    await screen.findByTestId('vacante-1000');

    const lista = screen.getByTestId('lista-vacantes');
    await fireEvent(lista, 'endReached');

    await waitFor(() =>
      expect(vacantes.recomendadas).toHaveBeenLastCalledWith({ page: 2, size: 20 }),
    );
    expect(vacantes.recomendadas).toHaveBeenCalledTimes(2);

    // Ya están las 25: llegar otra vez al final no pide una tercera página.
    await fireEvent(lista, 'endReached');
    expect(vacantes.recomendadas).toHaveBeenCalledTimes(2);
  });

  it('«jalar para actualizar» vuelve a pedir la lista', async () => {
    const recomendadas = jest.spyOn(vacantes, 'recomendadas');
    await abrir();
    await esperarLista();

    const lista = screen.getByTestId('lista-vacantes');
    await act(async () => {
      lista.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(recomendadas).toHaveBeenCalledTimes(2));
  });

  it('si falla la carga muestra el error con «Reintentar»', async () => {
    jest.spyOn(vacantes, 'recomendadas').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
    await abrir();

    expect(
      await screen.findByText('El servicio no está disponible; intenta más tarde'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await esperarLista();
  });

  describe('buscador', () => {
    // Los temporizadores falsos se activan cuando la lista ya cargó: así el login y la carga
    // inicial corren con el reloj real y el buscador con uno que solo avanza cuando se le pide.
    afterEach(() => jest.useRealTimers());

    it('busca a partir de 3 caracteres y 400 ms después de dejar de escribir', async () => {
      await abrir();
      await esperarLista();
      jest.useFakeTimers();
      const buscar = jest.spyOn(vacantes, 'buscar');

      await fireEvent.changeText(screen.getByLabelText('Buscar vacantes'), 'so');
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(buscar).not.toHaveBeenCalled();
      expect(screen.getByText('Escribe al menos 3 letras para buscar.')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('Buscar vacantes'), 'sop');
      await fireEvent.changeText(screen.getByLabelText('Buscar vacantes'), 'soporte');
      await act(async () => {
        jest.advanceTimersByTime(399);
      });
      expect(buscar).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      await waitFor(() => expect(buscar).toHaveBeenCalledTimes(1));
      expect(buscar).toHaveBeenCalledWith({ q: 'soporte', page: 1, size: 20 });
      await waitFor(() => expect(tarjetas()).toEqual(['vacante-1']));
      expect(screen.getByText('Resultados')).toBeOnTheScreen();
    });

    it('sin resultados muestra «No encontramos vacantes con estos filtros» y «Quitar filtros»', async () => {
      await abrir();
      await esperarLista();
      jest.useFakeTimers();

      await fireEvent.changeText(screen.getByLabelText('Buscar vacantes'), 'zzzzzz');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(
        await screen.findByText('No encontramos vacantes con estos filtros'),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtros' }));

      await esperarLista();
      expect(screen.getByLabelText('Buscar vacantes').props.value).toBe('');
    });
  });

  describe('«Solo las que cubren mis necesidades»', () => {
    it('Mariana: al activarlo quedan solo las vacantes 1 y 2', async () => {
      const buscar = jest.spyOn(vacantes, 'buscar');
      await abrir();
      await esperarLista();
      const chip = screen.getByRole('checkbox', { name: 'Solo las que cubren mis necesidades' });
      expect(chip).toBeEnabled();

      await fireEvent.press(chip);

      await waitFor(() => expect(tarjetas()).toEqual(['vacante-1', 'vacante-2']));
      expect(buscar).toHaveBeenCalledWith({ cubre_mis_necesidades: true, page: 1, size: 20 });
      expect(
        screen.getByRole('checkbox', { name: 'Solo las que cubren mis necesidades' }),
      ).toBeChecked();
    });

    it('Jorge (sin consentimiento): el chip está deshabilitado y explica por qué, con acceso a Perfil', async () => {
      await abrir('jorge.ramirez@correo.mx');
      await esperarLista();

      const chip = await screen.findByRole('checkbox', {
        name: 'Solo las que cubren mis necesidades',
      });
      expect(chip).toBeDisabled();
      const explicacion =
        'Para usar este filtro, da tu consentimiento y registra tus necesidades de ajuste en tu perfil.';
      expect(chip.props.accessibilityHint).toBe(explicacion);
      expect(screen.getByText(explicacion)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Ir a mi perfil' }));
      expect(mockNavegar).toHaveBeenCalledWith('Perfil');
    });
  });

  describe('filtros', () => {
    async function abrirFiltros() {
      await abrir();
      await esperarLista();
      await fireEvent.press(screen.getByRole('button', { name: /^Filtros/ }));
      await screen.findByRole('header', { name: 'Filtros' });
    }

    async function elegir(selector: RegExp, opcion: string) {
      const boton = await screen.findByRole('button', { name: selector });
      await waitFor(() => expect(boton).toBeEnabled());
      await fireEvent.press(boton);
      await fireEvent.press(await screen.findByRole('radio', { name: opcion }));
    }

    it('el botón dice «Filtros (0)» y abre un modal con todos los criterios', async () => {
      await abrirFiltros();

      expect(screen.getByRole('button', { name: /^Modalidad, / })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Categoría, / })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Entidad, / })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Municipio, / })).toBeDisabled();
      expect(screen.getByRole('button', { name: /^Jornada, / })).toBeOnTheScreen();
      expect(screen.getByLabelText('Salario mínimo (pesos al mes)')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Compatibilidad mínima, / })).toBeOnTheScreen();
      expect(await screen.findByRole('header', { name: 'Movilidad' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Cognitiva y psicosocial' })).toBeOnTheScreen();
      expect(screen.getByRole('checkbox', { name: 'Acceso con rampa' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Limpiar' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Aplicar' })).toBeOnTheScreen();
    });

    it('modalidad Remoto da las vacantes 4 y 6 y el botón cuenta «Filtros (1)»', async () => {
      await abrirFiltros();
      await elegir(/^Modalidad, /, 'Remoto');
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));

      await waitFor(() => expect(tarjetas()).toEqual(['vacante-4', 'vacante-6']));
      expect(screen.getByRole('button', { name: 'Filtros, 1 activo' })).toBeOnTheScreen();
      expect(screen.getByText('Filtros (1)', { hidden: true })).toBeOnTheScreen();
    });

    it('el ajuste «Intérprete de Lengua de Señas Mexicana» da las vacantes 2 y 6', async () => {
      await abrirFiltros();
      await fireEvent.press(
        await screen.findByRole('checkbox', { name: 'Intérprete de Lengua de Señas Mexicana' }),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));

      await waitFor(() => expect(tarjetas()).toEqual(['vacante-2', 'vacante-6']));
    });

    it('combina entidad, municipio, salario y compatibilidad; envía los ajustes repetidos', async () => {
      const buscar = jest.spyOn(vacantes, 'buscar');
      await abrirFiltros();
      await elegir(/^Entidad, /, 'Querétaro');
      await elegir(/^Municipio, /, 'Querétaro');
      await fireEvent.changeText(screen.getByLabelText('Salario mínimo (pesos al mes)'), '15000');
      await elegir(/^Compatibilidad mínima, /, '40 % o más');
      await fireEvent.press(await screen.findByRole('checkbox', { name: 'Acceso con rampa' }));
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Baño accesible' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));

      await waitFor(() => expect(tarjetas()).toEqual(['vacante-1']));
      expect(buscar).toHaveBeenLastCalledWith({
        entidad_id: 22,
        municipio_id: 3,
        salario_min: 15000,
        compatibilidad_min: 40,
        ajuste_id: [1, 3],
        page: 1,
        size: 20,
      });
      // Ubicación 1 + salario 1 + compatibilidad 1 + 2 ajustes.
      expect(screen.getByText('Filtros (5)', { hidden: true })).toBeOnTheScreen();
    });

    it('el salario debe ser un número y el error explica cómo corregirlo', async () => {
      await abrirFiltros();
      await fireEvent.changeText(screen.getByLabelText('Salario mínimo (pesos al mes)'), '12,000');
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));

      expect(
        await screen.findByText('Escribe solo números, sin comas ni signos. Por ejemplo: 12000.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Aplicar' })).toBeOnTheScreen();
    });

    it('«Limpiar» deja el panel sin filtros y «Volver» descarta los cambios', async () => {
      await abrirFiltros();
      await elegir(/^Modalidad, /, 'Remoto');
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
      await waitFor(() => expect(tarjetas()).toHaveLength(2));

      await fireEvent.press(screen.getByRole('button', { name: /^Filtros/ }));
      await screen.findByRole('header', { name: 'Filtros' });
      expect(screen.getByRole('button', { name: 'Modalidad, Remoto' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Limpiar' }));
      expect(screen.getByRole('button', { name: 'Modalidad, Cualquiera' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
      // Volver no aplicó nada: siguen los 2 resultados.
      expect(tarjetas()).toHaveLength(2);

      await fireEvent.press(screen.getByRole('button', { name: /^Filtros/ }));
      await screen.findByRole('header', { name: 'Filtros' });
      await fireEvent.press(screen.getByRole('button', { name: 'Limpiar' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
      await waitFor(() => expect(tarjetas()).toHaveLength(6));
      expect(screen.getByText('Filtros (0)', { hidden: true })).toBeOnTheScreen();
    });
  });
});

describe('resumenAccesible', () => {
  it('omite la compatibilidad si no se calculó y usa hasta 3 ajustes', async () => {
    const base = await primeraVacante();
    const resumen = resumenAccesible({
      ...base,
      postulacion_id: null,
      compatibilidad: null,
      ajustes: [
        ...base.ajustes,
        { id: 2, nombre: 'Elevador', categoria: 'movilidad', tipo: 'existente' },
      ],
    });
    expect(resumen).toBe(
      'Técnico de soporte de TI, TecnoQro, empresa validada, híbrido, Querétaro, acceso con rampa, baño accesible, horario flexible',
    );
  });
});
