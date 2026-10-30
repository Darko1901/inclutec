import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ApiError, empresas } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import REC02MisVacantes from '../REC02MisVacantes';
import { accionesDe } from '../vacantes/textosVacantes';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

// El Modal de pruebas no avisa cuándo termina de cerrarse; este deja alcanzar su onDismiss.
const mockModales: Record<string, { onDismiss?: () => void }> = {};
function mockGuardarModal(id: string, propiedades: { onDismiss?: () => void }) {
  mockModales[id] = propiedades;
}
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = jest.requireActual('react-native');
  const Modal = (propiedades: {
    testID?: string;
    visible?: boolean;
    children?: unknown;
    onDismiss?: () => void;
  }) => {
    mockGuardarModal(propiedades.testID ?? 'sin-id', propiedades);
    return propiedades.visible === false ? null : (
      <View testID={propiedades.testID}>{propiedades.children as never}</View>
    );
  };
  return { __esModule: true, default: Modal };
});

const PROPIEDADES = {} as ComponentProps<typeof REC02MisVacantes>;

async function abrir(correo: string = CUENTAS.laura) {
  await renderizarComo(correo, <REC02MisVacantes {...PROPIEDADES} />);
  await screen.findByRole('header', { name: 'Mis vacantes' });
}

const tarjeta = (id: number) => screen.getByTestId(`vacante-${id}`);

/** Abre el menú ⋮ de una vacante. */
async function abrirMenu(id: number) {
  await fireEvent.press(within(tarjeta(id)).getByTestId(`menu-vacante-${id}`));
  return within(await screen.findByTestId('menu-acciones'));
}

/** Elige una acción del menú y simula que el diálogo ya terminó de cerrarse. */
async function elegir(id: number, accion: string) {
  const menu = await abrirMenu(id);
  await fireEvent.press(menu.getByRole('button', { name: accion }));
  await act(async () => {
    mockModales['menu-acciones'].onDismiss?.();
  });
}

const estadoDe = (id: number) => obtenerEstado().vacantes.find((v) => v.id === id)!.estado;

describe('REC-02 · Mis vacantes', () => {
  beforeEach(() => mockNavegar.mockClear());
  afterEach(() => jest.restoreAllMocks());

  describe('lista y filtro', () => {
    it('muestra las vacantes de TecnoQro con estado, postulados y fecha', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');

      expect(screen.getByTestId('vacante-6')).toBeOnTheScreen();
      expect(screen.getByTestId('vacante-7')).toBeOnTheScreen();
      expect(screen.queryByTestId('vacante-2')).toBeNull();
      expect(
        within(tarjeta(1)).getByText('Técnico de soporte de TI', { hidden: true }),
      ).toBeOnTheScreen();
      expect(
        within(tarjeta(1)).getByText('28 postulados · 17 nuevos', { hidden: true }),
      ).toBeOnTheScreen();
      expect(within(tarjeta(7)).getByText('Sin postulados', { hidden: true })).toBeOnTheScreen();
      expect(within(tarjeta(7)).getByText('Sin publicar', { hidden: true })).toBeOnTheScreen();
    });

    it('muestra «n postulados · m nuevos» (LogiBajío: Jorge y Mariana, una nueva)', async () => {
      await abrir(CUENTAS.roberto);
      await screen.findByTestId('vacante-3');
      expect(
        within(tarjeta(3)).getByText('2 postulados · 1 nuevo', { hidden: true }),
      ).toBeOnTheScreen();
    });

    it('filtra por estado con un grupo de radios y anuncia el resultado', async () => {
      const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await abrir();
      await screen.findByTestId('vacante-1');
      expect(screen.getByLabelText('Filtrar por estado de la vacante')).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked();

      await fireEvent.press(screen.getByRole('radio', { name: 'Borrador' }));
      expect(await screen.findByTestId('vacante-7')).toBeOnTheScreen();
      expect(screen.queryByTestId('vacante-1')).toBeNull();
      expect(anunciar).toHaveBeenCalledWith('1 vacante');
      expect(screen.getByRole('radio', { name: 'Borrador' })).toBeChecked();

      await fireEvent.press(screen.getByRole('radio', { name: 'Pausada' }));
      expect(await screen.findByText('No tienes vacantes en «Pausada»')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtros' }));
      expect(await screen.findByTestId('vacante-1')).toBeOnTheScreen();
    });

    it('los cinco estados del filtro llevan texto', async () => {
      await abrir();
      for (const nombre of ['Todos', 'Borrador', 'Publicada', 'Pausada', 'Cerrada', 'Suspendida']) {
        expect(screen.getByRole('radio', { name: nombre })).toBeOnTheScreen();
      }
    });

    it('la tarjeta es un solo elemento con todo su resumen y abre los postulados', async () => {
      await abrir(CUENTAS.roberto);
      const boton = await screen.findByTestId('abrir-vacante-3');
      expect(boton.props.accessibilityLabel).toMatch(
        /^Analista de datos de operaciones\. Híbrido\. Estado: Publicada\. 2 postulados, 1 nuevo\. Publicada el \d{1,2} \p{L}{3}/u,
      );
      expect(boton.props.accessibilityHint).toBe('Abre los candidatos postulados');
      // El menú es un botón aparte con su propio nombre.
      expect(
        screen.getByRole('button', { name: 'Más opciones de Analista de datos de operaciones' }),
      ).toBeOnTheScreen();

      await fireEvent.press(boton);
      expect(mockNavegar).toHaveBeenCalledWith('Postulados', { vacante_id: 3 });
    });

    it('sin vacantes: «Aún no tienes vacantes» con «Crear vacante»', async () => {
      obtenerEstado().vacantes = obtenerEstado().vacantes.filter((v) => v.empresa_id !== 1);
      await abrir();
      expect(await screen.findByText('Aún no tienes vacantes')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Crear vacante' }));
      expect(mockNavegar).toHaveBeenCalledWith('EditarVacante');
    });

    it('si falla la carga ofrece «Reintentar»', async () => {
      const original = empresas.misVacantes.bind(empresas);
      const falla = jest.spyOn(empresas, 'misVacantes').mockRejectedValueOnce(
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
      expect(await screen.findByTestId('vacante-1')).toBeOnTheScreen();
    });

    it('«+ Nueva vacante» abre el formulario vacío', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Nueva vacante' }));
      expect(mockNavegar).toHaveBeenCalledWith('EditarVacante');
    });
  });

  describe('menú según el estado', () => {
    it.each([
      ['borrador', ['Editar', 'Publicar', 'Duplicar']],
      ['publicada', ['Editar', 'Pausar', 'Cerrar', 'Duplicar']],
      ['pausada', ['Editar', 'Reanudar', 'Cerrar', 'Duplicar']],
      ['cerrada', ['Duplicar']],
      ['suspendida', []],
    ] as const)('%s ofrece %j', (estado, esperadas) => {
      expect(accionesDe(estado).map((a) => a[0].toUpperCase() + a.slice(1))).toEqual(esperadas);
    });

    it('el menú de una vacante publicada ofrece Editar, Pausar, Cerrar y Duplicar', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      const menu = await abrirMenu(1);
      for (const nombre of ['Editar', 'Pausar', 'Cerrar', 'Duplicar']) {
        expect(menu.getByRole('button', { name: nombre })).toBeOnTheScreen();
      }
      expect(menu.queryByRole('button', { name: 'Publicar' })).toBeNull();
      expect(menu.queryByRole('button', { name: 'Reanudar' })).toBeNull();
    });

    it('una vacante suspendida no tiene menú y dice quién la suspendió', async () => {
      obtenerEstado().vacantes.find((v) => v.id === 6)!.estado = 'suspendida';
      await abrir();
      await screen.findByTestId('vacante-6');
      expect(
        within(tarjeta(6)).getByText('Suspendida por el administrador', { hidden: true }),
      ).toBeOnTheScreen();
      expect(within(tarjeta(6)).queryByTestId('menu-vacante-6')).toBeNull();
      expect(screen.getByTestId('abrir-vacante-6').props.accessibilityLabel).toContain(
        'Suspendida por el administrador',
      );
    });

    it('Editar abre REC-03 con el id de la vacante', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      await elegir(1, 'Editar');
      expect(mockNavegar).toHaveBeenCalledWith('EditarVacante', { vacante_id: 1 });
    });
  });

  describe('acciones', () => {
    it('Pausar pide confirmación, pausa la vacante y avisa', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      await elegir(1, 'Pausar');

      expect(await screen.findByText('¿Pausar esta vacante?')).toBeOnTheScreen();
      expect(estadoDe(1)).toBe('publicada');
      await fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));

      expect(
        await screen.findByText('«Técnico de soporte de TI» quedó pausada.'),
      ).toBeOnTheScreen();
      expect(estadoDe(1)).toBe('pausada');
      await waitFor(() =>
        expect(within(tarjeta(1)).getByText('Pausada', { hidden: true })).toBeOnTheScreen(),
      );
    });

    it('Cancelar la confirmación no cambia nada', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      await elegir(1, 'Cerrar');
      expect(await screen.findByText('¿Cerrar esta vacante?')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
      await waitFor(() => expect(screen.queryByText('¿Cerrar esta vacante?')).toBeNull());
      expect(estadoDe(1)).toBe('publicada');
    });

    it('Cerrar pide confirmación y deja la vacante cerrada', async () => {
      await abrir();
      await screen.findByTestId('vacante-6');
      await elegir(6, 'Cerrar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar vacante' }));
      expect(await screen.findByText('«Desarrollador web junior» se cerró.')).toBeOnTheScreen();
      expect(estadoDe(6)).toBe('cerrada');
    });

    it('Reanudar vuelve a publicar una vacante pausada', async () => {
      obtenerEstado().vacantes.find((v) => v.id === 6)!.estado = 'pausada';
      await abrir();
      await screen.findByTestId('vacante-6');
      await elegir(6, 'Reanudar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Reanudar' }));
      expect(await screen.findByText(/se reanudó\./)).toBeOnTheScreen();
      expect(estadoDe(6)).toBe('publicada');
    });

    it('Duplicar crea un borrador «(copia)» y lo muestra', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      await elegir(1, 'Duplicar');

      expect(
        await screen.findByText('Se creó el borrador «Técnico de soporte de TI (copia)».'),
      ).toBeOnTheScreen();
      expect(
        obtenerEstado().vacantes.some(
          (v) => v.titulo === 'Técnico de soporte de TI (copia)' && v.estado === 'borrador',
        ),
      ).toBe(true);
      expect(
        await screen.findByText('Técnico de soporte de TI (copia)', { hidden: true }),
      ).toBeOnTheScreen();
    });

    it('Publicar un borrador completo lo publica; si falta algo, explica qué', async () => {
      await abrir();
      await screen.findByTestId('vacante-7');
      const borrador = obtenerEstado().vacantes.find((v) => v.id === 7)!;
      borrador.ajustes = [];
      borrador.sin_condiciones_accesibilidad = false;
      borrador.direccion = 'Av. Zaragoza 5, Querétaro';

      await elegir(7, 'Publicar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText(/Faltan datos para publicar la vacante\./)).toBeOnTheScreen();
      expect(screen.getByText(/accesibilidad/)).toBeOnTheScreen();
      expect(estadoDe(7)).toBe('borrador');

      borrador.sin_condiciones_accesibilidad = true;
      await elegir(7, 'Publicar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText('«Diseñador gráfico» se publicó.')).toBeOnTheScreen();
      expect(estadoDe(7)).toBe('publicada');
    });
  });

  describe('empresa sin validar', () => {
    it('Estudio Trazo ve el aviso, puede crear borradores y Publicar queda deshabilitado con su explicación', async () => {
      await abrir(CUENTAS.daniel);
      await screen.findByTestId('vacante-8');
      expect(
        await screen.findByText('Podrás publicar cuando validemos tu empresa'),
      ).toBeOnTheScreen();

      const menu = await abrirMenu(8);
      expect(menu.getByRole('button', { name: 'Publicar' })).toBeDisabled();
      expect(menu.getByRole('button', { name: 'Publicar' }).props.accessibilityHint).toBe(
        'Disponible cuando validemos tu empresa',
      );
      expect(menu.getByText('Podrás publicar cuando validemos tu empresa.')).toBeOnTheScreen();
      expect(menu.getByRole('button', { name: 'Editar' })).toBeEnabled();
      await fireEvent.press(screen.getByRole('button', { name: 'Nueva vacante' }));
      expect(mockNavegar).toHaveBeenCalledWith('EditarVacante');
    });

    it('con la empresa validada no hay aviso', async () => {
      await abrir();
      await screen.findByTestId('vacante-1');
      expect(screen.queryByTestId('aviso-empresa')).toBeNull();
    });

    it('si el API rechaza publicar (403) se muestra su mensaje', async () => {
      await abrir();
      await screen.findByTestId('vacante-7');
      obtenerEstado().empresas.find((e) => e.id === 1)!.estado = 'pendiente';
      await elegir(7, 'Publicar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar' }));
      expect(
        await screen.findByText(/Podrás publicar cuando validemos tu empresa\. Mientras tanto/),
      ).toBeOnTheScreen();
    });
  });
});
