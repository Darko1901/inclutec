import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { entrevistas, horarios } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { esDiaHabil, hoyEnMexico, iniciarEnMexico, sumarDias } from '../../../utilidades/fechas';
import { fechasConRepeticion, HORAS_INICIO, opcionesDia, opcionesHora } from '../agenda/horarios';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';
import REC06Agenda from '../REC06Agenda';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
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

type Props = ComponentProps<typeof REC06Agenda>;
const establecerParametros = jest.fn();
const LIGA = 'https://meet.google.com/xyz-abcd-efg';

async function abrir(parametros?: Props['route']['params'], correo: string = CUENTAS.laura) {
  const props = {
    route: { key: 'Agenda', name: 'Agenda', params: parametros },
    navigation: { setParams: establecerParametros },
  } as unknown as Props;
  await renderizarComo(correo, <REC06Agenda {...props} />);
  await screen.findByRole('header', { name: 'Agenda' });
}

const tarjeta = (id: number) => screen.getByTestId(`horario-${id}`);
const estadoHorario = (id: number) => obtenerEstado().horarios.find((h) => h.id === id);

/** Pone el horario de Irene (id 110) hace un minuto, para que empiece «hoy» sin importar la hora. */
function irenePorEmpezar() {
  const horario = estadoHorario(110)!;
  horario.inicio = new Date(Date.now() - 60000).toISOString();
}

/** Abre un selector y elige una opción por su nombre accesible. */
async function elegir(testID: string, opcion: string) {
  await fireEvent.press(screen.getByTestId(testID));
  await fireEvent.press(await screen.findByRole('radio', { name: opcion }));
}

describe('REC-06 · Agenda de entrevistas', () => {
  beforeEach(() => {
    mockNavegar.mockClear();
    establecerParametros.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('lista por día', () => {
    it('agrupa por día con «Hoy», «Mañana» o «jue 22 oct» y los lee con la fecha completa', async () => {
      irenePorEmpezar();
      await abrir();
      await screen.findByTestId('horario-2');

      const encabezados = screen
        .getAllByRole('header')
        .filter((h) => /\d{4}$/.test(h.props.accessibilityLabel ?? ''));
      expect(encabezados.length).toBeGreaterThan(2);
      for (const encabezado of encabezados) {
        expect(encabezado.props.accessibilityLabel).toMatch(
          /^(Hoy|Mañana|\p{L}{3} \d{1,2} \p{L}{3}), \p{L}+ \d{1,2} de \p{L}+ de \d{4}$/u,
        );
      }
      // El primer día es hoy, con el horario de Irene que ya empezó.
      expect(encabezados[0].props.accessibilityLabel).toMatch(/^Hoy, /);
      expect(
        within(screen.getByTestId(`dia-${hoyEnMexico()}`)).getByTestId('horario-110'),
      ).toBeOnTheScreen();
    });

    it('un horario libre muestra hora, duración, vacante y «Libre»', async () => {
      await abrir();
      await screen.findByTestId('horario-2');
      const libre = within(tarjeta(2));
      expect(libre.getByText('45 min', { exact: false, hidden: true })).toBeOnTheScreen();
      expect(libre.getByText('Técnico de soporte de TI', { hidden: true })).toBeOnTheScreen();
      expect(libre.getByLabelText('Estado: Libre')).toBeOnTheScreen();
      expect(libre.getByRole('button', { name: /^Eliminar el horario de las/ })).toBeOnTheScreen();
      expect(screen.getByTestId('datos-horario-2').props.accessibilityLabel).toMatch(
        /^\d{1,2}:\d{2} de la (mañana|tarde|noche), 45 minutos\. Técnico de soporte de TI\. Libre$/,
      );
    });

    it('uno agendado muestra al candidato, la liga y sus acciones', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      const agendado = within(tarjeta(1));
      expect(agendado.getByText('Mariana López García', { hidden: true })).toBeOnTheScreen();
      expect(
        agendado.getByLabelText('Liga: https://meet.google.com/abc-defg-hij'),
      ).toBeOnTheScreen();
      expect(agendado.getByRole('button', { name: 'Abrir liga' })).toBeOnTheScreen();
      expect(agendado.getByRole('button', { name: 'Copiar liga' })).toBeOnTheScreen();
      expect(screen.getByTestId('datos-horario-1').props.accessibilityLabel).toMatch(
        /Con Mariana López García$/,
      );

      await fireEvent.press(
        agendado.getByRole('button', { name: 'Ver al candidato Mariana López García' }),
      );
      expect(mockNavegar).toHaveBeenCalledWith('DetallePostulado', { id: 1 });
    });

    it('filtra por vacante', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      await elegir('filtro-vacante', 'Desarrollador web junior');
      await waitFor(() => expect(screen.queryByTestId('horario-1')).toBeNull());
      expect(await screen.findByTestId('horario-105')).toBeOnTheScreen();
    });

    it('«Ver más días» amplía el rango de 30 en 30', async () => {
      const espia = jest.spyOn(entrevistas, 'miAgenda');
      await abrir();
      await screen.findByTestId('horario-1');
      const hoy = hoyEnMexico();
      expect(espia).toHaveBeenCalledWith({ hasta: sumarDias(hoy, 30) });
      await fireEvent.press(screen.getByRole('button', { name: 'Ver más días' }));
      await waitFor(() => expect(espia).toHaveBeenCalledWith({ hasta: sumarDias(hoy, 60) }));
    });

    it('sin horarios: «No tienes entrevistas en estos días» con «Publicar horarios»', async () => {
      obtenerEstado().horarios = obtenerEstado().horarios.filter((h) => h.reclutador_id !== 2);
      await abrir();
      expect(await screen.findByText('No tienes entrevistas en estos días')).toBeOnTheScreen();
      const botones = screen.getAllByRole('button', { name: 'Publicar horarios' });
      expect(botones.length).toBeGreaterThan(1); // el del vacío y el de la barra fija
      await fireEvent.press(botones[0]);
      expect(await screen.findByTestId('modal-publicar-horarios')).toBeOnTheScreen();
    });

    it('la barra «+ Publicar horarios» es fija y no está dentro de la lista', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      const lista = within(screen.getByTestId('lista-agenda'));
      expect(lista.queryByTestId('publicar-horarios')).toBeNull();
      expect(screen.getByTestId('publicar-horarios')).toBeOnTheScreen();
    });
  });

  describe('eliminar, resultado y cancelar', () => {
    it('elimina un horario libre tras confirmar', async () => {
      await abrir();
      await screen.findByTestId('horario-2');
      await fireEvent.press(
        within(tarjeta(2)).getByRole('button', { name: /^Eliminar el horario/ }),
      );
      expect(await screen.findByText('¿Eliminar este horario?')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Eliminar horario' }));

      expect(await screen.findByText('Horario eliminado.')).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByTestId('horario-2')).toBeNull());
      expect(estadoHorario(2)).toBeUndefined();
    });

    it('un horario agendado no se elimina: solo ofrece cancelar la entrevista', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      expect(within(tarjeta(1)).queryByRole('button', { name: /^Eliminar/ })).toBeNull();
      await expect(horarios.eliminar(1)).rejects.toBeDefined();
    });

    it('antes de la hora de inicio, «realizada» y «No asistió» están deshabilitadas y lo explican', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      const agendado = within(tarjeta(1));
      expect(agendado.getByRole('button', { name: 'Marcar como realizada' })).toBeDisabled();
      expect(agendado.getByRole('button', { name: 'No asistió' })).toBeDisabled();
      expect(agendado.getByTestId('explicacion-1')).toHaveTextContent(
        /Podrás registrar si se realizó o si no asistió después de las \d{1,2}:\d{2}/,
      );
      expect(
        agendado.getByRole('button', { name: 'Marcar como realizada' }).props.accessibilityHint,
      ).toMatch(/^Disponible después de las /);
    });

    it('después de la hora de inicio se marca realizada (con confirmación)', async () => {
      irenePorEmpezar();
      await abrir();
      await screen.findByTestId('horario-110');
      const irene = within(tarjeta(110));
      expect(irene.getByRole('button', { name: 'Marcar como realizada' })).toBeEnabled();
      expect(irene.queryByTestId('explicacion-110')).toBeNull();

      await fireEvent.press(irene.getByRole('button', { name: 'Marcar como realizada' }));
      expect(await screen.findByText('¿Marcar la entrevista como realizada?')).toBeOnTheScreen();
      await fireEvent.press(
        within(screen.getByTestId('modal-confirmacion')).getByRole('button', {
          name: 'Marcar como realizada',
        }),
      );

      expect(await screen.findByText('Entrevista marcada como realizada.')).toBeOnTheScreen();
      await waitFor(() =>
        expect(within(tarjeta(110)).getByLabelText('Estado: Realizada')).toBeOnTheScreen(),
      );
      expect(
        within(tarjeta(110)).queryByRole('button', { name: 'Marcar como realizada' }),
      ).toBeNull();
      expect(obtenerEstado().entrevistas.find((e) => e.id === 110)?.estado).toBe('realizada');
    });

    it('también se registra «No asistió»', async () => {
      irenePorEmpezar();
      await abrir();
      await screen.findByTestId('horario-110');
      await fireEvent.press(within(tarjeta(110)).getByRole('button', { name: 'No asistió' }));
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Registrar que no asistió' }),
      );
      expect(await screen.findByText('Se registró que el candidato no asistió.')).toBeOnTheScreen();
      expect(obtenerEstado().entrevistas.find((e) => e.id === 110)?.estado).toBe('no_asistio');
    });

    it('cancelar exige un motivo y avisa al candidato', async () => {
      await abrir();
      await screen.findByTestId('horario-1');
      await fireEvent.press(
        within(tarjeta(1)).getByRole('button', {
          name: 'Cancelar la entrevista con Mariana López García',
        }),
      );
      const modal = within(await screen.findByTestId('modal-cancelar-entrevista'));
      expect(modal.getByText('0 / 255')).toBeOnTheScreen();

      await fireEvent.press(modal.getByRole('button', { name: 'Cancelar entrevista' }));
      expect(await screen.findByText(/Escribe el motivo de la cancelación/)).toBeOnTheScreen();

      await fireEvent.changeText(
        modal.getByTestId('campo-motivo-cancelacion'),
        'La sala no está disponible.',
      );
      await fireEvent.press(modal.getByRole('button', { name: 'Cancelar entrevista' }));

      expect(
        await screen.findByText('Entrevista cancelada. Avisamos al candidato.'),
      ).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByTestId('horario-1')).toBeNull());
      const estado = obtenerEstado();
      expect(estado.entrevistas.find((e) => e.id === 1)).toMatchObject({
        estado: 'cancelada',
        motivo_cancelacion: 'La sala no está disponible.',
      });
      expect(
        estado.notificaciones.some((n) => n.usuario_id === 3 && n.tipo === 'entrevista_cancelada'),
      ).toBe(true);
    });
  });

  describe('publicar horarios', () => {
    /** Primer lunes a partir de mañana (siempre está entre las primeras opciones de la lista). */
    function primerLunes() {
      return opcionesDia().find(
        (d) => d.id >= 1 && new Date(`${d.fecha}T00:00:00Z`).getUTCDay() === 1,
      )!;
    }

    async function llenar(dia = opcionesDia()[5], liga = LIGA) {
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar horarios' }));
      const modal = within(await screen.findByTestId('modal-publicar-horarios'));
      await waitFor(() => expect(modal.getByTestId('selector-vacante-horario')).toBeEnabled());
      await elegir('selector-vacante-horario', 'Técnico de soporte de TI');
      await elegir('selector-dia', dia.etiquetaAccesible);
      await elegir('selector-hora', '8:00 de la mañana');
      await fireEvent.press(modal.getByRole('radio', { name: '30 minutos' }));
      await fireEvent.changeText(modal.getByTestId('campo-liga'), liga);
      return modal;
    }

    it('ofrece los datos pedidos: vacantes publicadas, día, hora de 7:00 a 20:00 cada 15 min y duraciones', async () => {
      await abrir();
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar horarios' }));
      const modal = within(await screen.findByTestId('modal-publicar-horarios'));
      await waitFor(() => expect(modal.getByTestId('selector-vacante-horario')).toBeEnabled());

      // Solo las vacantes publicadas de TecnoQro (no el borrador «Diseñador gráfico»).
      await fireEvent.press(modal.getByTestId('selector-vacante-horario'));
      expect(
        await screen.findByRole('radio', { name: 'Técnico de soporte de TI' }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Desarrollador web junior' })).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: 'Diseñador gráfico' })).toBeNull();
      await fireEvent.press(screen.getByRole('radio', { name: 'Desarrollador web junior' }));

      expect(modal.getByRole('radio', { name: '30 minutos' })).toBeOnTheScreen();
      expect(modal.getByRole('radio', { name: '45 minutos' })).toBeChecked();
      expect(modal.getByRole('radio', { name: '60 minutos' })).toBeOnTheScreen();

      expect(HORAS_INICIO).toHaveLength(53);
      expect(opcionesHora()[0]).toMatchObject({
        nombre: '7:00 a.m.',
        etiquetaAccesible: '7:00 de la mañana',
      });
      expect(opcionesHora().at(-1)).toMatchObject({
        nombre: '8:00 p.m.',
        etiquetaAccesible: '8:00 de la noche',
      });
    });

    it('publica un horario libre que aparece en la agenda', async () => {
      await abrir();
      const dia = opcionesDia()[5];
      const modal = await llenar(dia);
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));

      expect(await screen.findByText('Se publicó 1 horario.')).toBeOnTheScreen();
      expect(screen.queryByTestId('modal-publicar-horarios')).toBeNull();
      const nuevo = obtenerEstado().horarios.find(
        (h) => h.inicio === iniciarEnMexico(dia.fecha, 480),
      )!;
      expect(nuevo).toMatchObject({ vacante_id: 1, duracion_min: 30, liga: LIGA, estado: 'libre' });
    });

    it('una liga que no es de Meet o Teams se marca en su campo', async () => {
      await abrir();
      const modal = await llenar(undefined, 'https://zoom.us/j/123');
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));
      expect(
        await screen.findByText('Escribe una liga de Google Meet o de Microsoft Teams.'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('modal-publicar-horarios')).toBeOnTheScreen();
    });

    it('pide los campos que faltan', async () => {
      await abrir();
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar horarios' }));
      const modal = within(await screen.findByTestId('modal-publicar-horarios'));
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText('Elige el día de la entrevista.')).toBeOnTheScreen();
      expect(screen.getByText('Elige la hora de inicio.')).toBeOnTheScreen();
      expect(
        screen.getByText('Elige la vacante para la que publicas el horario.'),
      ).toBeOnTheScreen();
    });

    it('«Hoy» con una hora que ya pasó se rechaza', async () => {
      await abrir();
      await fireEvent.press(await screen.findByRole('button', { name: 'Publicar horarios' }));
      const modal = within(await screen.findByTestId('modal-publicar-horarios'));
      await waitFor(() => expect(modal.getByTestId('selector-vacante-horario')).toBeEnabled());
      await elegir('selector-vacante-horario', 'Técnico de soporte de TI');
      await elegir('selector-dia', opcionesDia()[0].etiquetaAccesible);
      await elegir('selector-hora', '7:00 de la mañana');
      await fireEvent.changeText(modal.getByTestId('campo-liga'), LIGA);
      // Si ya son las 7:00 o antes, esta prueba no aplica (la hora aún no pasó).
      if (new Date(iniciarEnMexico(opcionesDia()[0].fecha, 420)).getTime() > Date.now()) return;
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText('Elige una hora que aún no pase.')).toBeOnTheScreen();
    });

    it('un horario que se cruza con otro muestra «Este horario se traslapa con otro.»', async () => {
      await abrir();
      const dia = opcionesDia()[5];
      const primero = await llenar(dia);
      await fireEvent.press(primero.getByRole('button', { name: 'Publicar' }));
      await screen.findByText('Se publicó 1 horario.');

      const segundo = await llenar(dia);
      await fireEvent.press(segundo.getByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText('Este horario se traslapa con otro.')).toBeOnTheScreen();
      expect(screen.getByTestId('modal-publicar-horarios')).toBeOnTheScreen();
    });

    it('repite en los siguientes días hábiles y dice cuántos se publicaron', async () => {
      await abrir();
      const lunes = primerLunes();
      const modal = await llenar(lunes);
      await fireEvent.press(
        modal.getByRole('checkbox', { name: 'Repetir en los siguientes días hábiles' }),
      );
      await elegir('selector-dias-repetir', '3 días hábiles');
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));

      expect(await screen.findByText('Se publicaron 4 horarios.')).toBeOnTheScreen();
      const publicados = obtenerEstado()
        .horarios.filter((h) => h.liga === LIGA)
        .map((h) => h.inicio)
        .sort();
      expect(publicados).toEqual(
        [0, 1, 2, 3].map((d) => iniciarEnMexico(sumarDias(lunes.fecha, d), 480)),
      );
    });

    it('si uno choca, publica los demás y dice cuál no se pudo', async () => {
      await abrir();
      const lunes = primerLunes();
      const martes = sumarDias(lunes.fecha, 1);
      await horarios.publicar({
        vacante_id: 1,
        inicio: iniciarEnMexico(martes, 480),
        duracion_min: 45,
        liga: 'https://meet.google.com/otra-liga-xyz',
      });

      const modal = await llenar(lunes);
      await fireEvent.press(
        modal.getByRole('checkbox', { name: 'Repetir en los siguientes días hábiles' }),
      );
      await elegir('selector-dias-repetir', '2 días hábiles');
      await fireEvent.press(modal.getByRole('button', { name: 'Publicar' }));

      const resumen = await screen.findByTestId('resumen-publicacion');
      expect(
        within(resumen).getByText(/Se publicaron 2 de 3 horarios\./, { hidden: true }),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(`fallido-${martes}`)).toHaveTextContent(
        /Este horario se traslapa con otro\./,
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));
      expect(await screen.findByText('Se publicaron 2 horarios.')).toBeOnTheScreen();
    });

    it('desde REC-05 abre el formulario con la vacante elegida y limpia el parámetro al cerrar', async () => {
      await abrir({ publicar_vacante_id: 1 });
      const modal = within(await screen.findByTestId('modal-publicar-horarios'));
      await waitFor(() =>
        expect(modal.getByTestId('selector-vacante-horario').props.accessibilityLabel).toBe(
          'Vacante, Técnico de soporte de TI',
        ),
      );
      await fireEvent.press(modal.getByRole('button', { name: 'Volver' }));
      expect(establecerParametros).toHaveBeenCalledWith({ publicar_vacante_id: undefined });
    });
  });
});

describe('fechas de la repetición', () => {
  it('salta los fines de semana', () => {
    // 2026-10-23 es viernes.
    expect(fechasConRepeticion('2026-10-23', 2)).toEqual([
      '2026-10-23',
      '2026-10-26',
      '2026-10-27',
    ]);
    expect(fechasConRepeticion('2026-10-24', 1)).toEqual(['2026-10-24', '2026-10-26']);
    expect(fechasConRepeticion('2026-10-26', 0)).toEqual(['2026-10-26']);
    expect(fechasConRepeticion('2026-10-26', 5).every((f, i) => i === 0 || esDiaHabil(f))).toBe(
      true,
    );
  });
});
