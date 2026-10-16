import { setStringAsync } from 'expo-clipboard';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, Linking } from 'react-native';

import {
  ApiError,
  auth,
  entrevistas,
  horarios as servicioHorarios,
  type EventoHistorial,
} from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN06DetallePostulacion from '../CAN06DetallePostulacion';
import { etiquetaEvento } from '../postulaciones/LineaTiempo';
import { agruparPorDia } from '../postulaciones/textosEntrevista';

const navegacion = { navigate: jest.fn(), setOptions: jest.fn() };

// En las pruebas no hay vistas nativas: findNodeHandle devuelve siempre el mismo número.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get: (objetivo, propiedad, receptor) =>
      propiedad === 'findNodeHandle' ? () => 42 : Reflect.get(objetivo, propiedad, receptor),
  });
});

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return estado === 'activa' ? <>{children}</> : null;
}

async function abrir(id: number, correo = 'mariana.lopez@correo.mx', esperarDetalle = true) {
  const props = {
    navigation: navegacion,
    route: { key: 'k', name: 'DetallePostulacion', params: { id } },
  } as unknown as ComponentProps<typeof CAN06DetallePostulacion>;
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <CAN06DetallePostulacion {...props} />
      </Entrar>
    </SesionProvider>,
  );
  if (esperarDetalle) await screen.findByTestId('detalle-postulacion');
}

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre });

/** Presiona un botón del modal de confirmación que está abierto. */
async function confirmar(titulo: string, textoBoton: string) {
  await screen.findByRole('header', { name: titulo });
  await fireEvent.press(within(screen.getByTestId('modal-confirmacion')).getByText(textoBoton));
}

const horarioEstado = (id: number) => obtenerEstado().horarios.find((h) => h.id === id)!;

describe('CAN-06 · Detalle de postulación y entrevista', () => {
  beforeEach(() => {
    navegacion.navigate.mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('encabezado e historial', () => {
    it('muestra la vacante y la empresa, que abren CAN-02 y la ficha CAN-07', async () => {
      await abrir(1);

      expect(screen.getByRole('header', { name: 'Técnico de soporte de TI' })).toBeOnTheScreen();
      await fireEvent.press(boton('Ver vacante'));
      expect(navegacion.navigate).toHaveBeenCalledWith('DetalleVacante', { id: 1 });
      await fireEvent.press(boton('TecnoQro'));
      expect(navegacion.navigate).toHaveBeenCalledWith('FichaEmpresa', { id: 1 });
      expect(
        screen.getByLabelText(/^Estado: Entrevista\. Te postulaste el miércoles 30 de/),
      ).toBeOnTheScreen();
    });

    it('la línea de tiempo es una lista con el mensaje del reclutador y el estado actual en texto', async () => {
      await abrir(1);

      // La lista no es un elemento accesible por sí sola: así cada paso se lee por separado.
      const lista = screen.getByTestId('linea-tiempo');
      expect(lista.props.accessibilityRole).toBe('list');
      const pasos = within(lista).getAllByTestId(/^paso-\d$/);
      expect(pasos).toHaveLength(3);
      expect(pasos.map((p) => p.props.accessibilityLabel)).toEqual([
        expect.stringMatching(
          /^Postulada\. miércoles 30 de septiembre de 2026, a las 11:20 de la mañana$/,
        ),
        expect.stringMatching(/^En revisión\. /),
        expect.stringMatching(
          /^Estado actual: Entrevista\. .*Mensaje del reclutador: Nos gustaría conocerte; agenda un horario\.$/,
        ),
      ]);
      // Se ve el mensaje y la marca de estado actual con palabras, no solo con color.
      expect(
        screen.getByText('Nos gustaría conocerte; agenda un horario.', { hidden: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText('Estado actual', { hidden: true })).toBeOnTheScreen();
    });

    it('etiquetaEvento dice fecha y hora completas y solo marca «Estado actual» en el último', () => {
      const evento: EventoHistorial = {
        estado_anterior: 'postulada',
        estado_nuevo: 'en_revision',
        mensaje: null,
        creado_en: '2026-10-01T15:00:00Z',
      };
      expect(etiquetaEvento(evento, false)).toBe(
        'En revisión. jueves 1 de octubre de 2026, a las 9:00 de la mañana',
      );
      expect(etiquetaEvento(evento, true)).toMatch(/^Estado actual: En revisión\. /);
    });
  });

  describe('entrevista agendada', () => {
    it('muestra fecha, hora, duración y liga, con «Abrir liga», «Copiar liga» y «Cancelar entrevista»', async () => {
      await abrir(1);

      const tarjeta = within(screen.getByTestId('tarjeta-entrevista'));
      expect(tarjeta.getByRole('header', { name: 'Tu entrevista' })).toBeOnTheScreen();
      expect(tarjeta.getByTestId('datos-entrevista').props.accessibilityLabel).toMatch(
        /, a las \d+:\d{2} de la \w+, 45 minutos$/,
      );
      expect(tarjeta.getByText(/· 45 min$/, { hidden: true })).toBeOnTheScreen();
      expect(tarjeta.getByText('https://meet.google.com/abc-defg-hij')).toBeOnTheScreen();
      expect(tarjeta.getByRole('button', { name: 'Cancelar entrevista' })).toBeOnTheScreen();
      expect(tarjeta.getByText('Puedes cancelar hasta 24 h antes.')).toBeOnTheScreen();
      // Con entrevista agendada no se piden horarios.
      expect(screen.queryByText('Elige un horario')).toBeNull();
    });

    it('«Abrir liga» abre la liga y «Copiar liga» la copia con aviso', async () => {
      const abrirUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      await abrir(1);

      await fireEvent.press(boton('Abrir liga'));
      expect(abrirUrl).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');

      await fireEvent.press(boton('Copiar liga'));
      expect(setStringAsync).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
      expect(await screen.findByText('Liga copiada.')).toBeOnTheScreen();
    });

    it('si no se puede abrir la liga lo dice y sugiere copiarla', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sin app'));
      await abrir(1);

      await fireEvent.press(boton('Abrir liga'));

      expect(
        await screen.findByText('No pudimos abrir la liga. Cópiala y ábrela en tu navegador.'),
      ).toBeOnTheScreen();
    });

    it('con menos de 24 h el botón «Cancelar entrevista» no aparece y se explica por qué', async () => {
      await abrir(100, 'jorge.ramirez@correo.mx');

      expect(screen.getByRole('button', { name: 'Abrir liga' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Cancelar entrevista' })).toBeNull();
      expect(screen.getByTestId('sin-cancelacion')).toHaveTextContent(
        /faltan menos de 24 h para la entrevista/,
      );
    });

    it('si el API responde 409 cancelacion_tardia muestra su mensaje y quita el botón', async () => {
      // El reloj de la pantalla pudo quedar atrasado: la entrevista ya empieza en menos de 24 h.
      jest.spyOn(entrevistas, 'cancelar').mockImplementation(async () => {
        horarioEstado(1).inicio = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        throw new ApiError({
          status: 409,
          codigo: 'cancelacion_tardia',
          detail: 'Solo puedes cancelar con al menos 24 horas de anticipación.',
        });
      });
      await abrir(1);

      await fireEvent.press(boton('Cancelar entrevista'));
      await confirmar('¿Cancelar la entrevista?', 'Sí, cancelar entrevista');

      expect(
        await screen.findByText('Solo puedes cancelar con al menos 24 horas de anticipación.'),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Cancelar entrevista' })).toBeNull(),
      );
      expect(screen.getByTestId('sin-cancelacion')).toBeOnTheScreen();
    });

    it('una entrevista realizada muestra sus datos sin liga ni botones', async () => {
      await abrir(101);

      const tarjeta = within(screen.getByTestId('tarjeta-entrevista'));
      expect(tarjeta.getByLabelText('Estado: Realizada', { hidden: true })).toBeOnTheScreen();
      expect(tarjeta.queryByRole('button')).toBeNull();
    });
  });

  describe('cancelar y volver a agendar', () => {
    it('cancela (más de 24 h), pide elegir otro horario y agenda uno', async () => {
      await abrir(1);

      await fireEvent.press(boton('Cancelar entrevista'));
      await confirmar('¿Cancelar la entrevista?', 'Sí, cancelar entrevista');

      expect(await screen.findByRole('header', { name: 'Elige un horario' })).toBeOnTheScreen();
      expect(screen.queryByTestId('tarjeta-entrevista')).toBeNull();
      expect(horarioEstado(1).estado).toBe('libre');
      expect(await screen.findByText(/^Cancelaste tu entrevista/)).toBeOnTheScreen();

      // Hay horarios agrupados por día, con hora y duración, cada uno con «Agendar».
      await screen.findByTestId('agendar-101');
      expect(screen.getAllByTestId(/^dia-/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByRole('header').map((h) => h.props.accessibilityLabel ?? '')).toEqual(
        expect.arrayContaining(['Elige un horario']),
      );

      await fireEvent.press(screen.getByTestId('agendar-101'));
      await confirmar('¿Agendar esta entrevista?', 'Sí, agendar');

      expect(await screen.findByText('Listo, tu entrevista quedó agendada.')).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('tarjeta-entrevista')).getByText('45 min', {
          exact: false,
          hidden: true,
        }),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Elige un horario')).toBeNull();
      expect(horarioEstado(101).estado).toBe('agendado');
    });

    it('«Volver» en la confirmación no agenda nada', async () => {
      await abrir(1);
      await fireEvent.press(boton('Cancelar entrevista'));
      await confirmar('¿Cancelar la entrevista?', 'Sí, cancelar entrevista');
      await screen.findByTestId('agendar-101');

      await fireEvent.press(screen.getByTestId('agendar-101'));
      await screen.findByRole('header', { name: '¿Agendar esta entrevista?' });
      await fireEvent.press(within(screen.getByTestId('modal-confirmacion')).getByText('Volver'));

      expect(horarioEstado(101).estado).toBe('libre');
      expect(screen.getByRole('header', { name: 'Elige un horario' })).toBeOnTheScreen();
    });

    it('el botón «Agendar» se lee con la fecha, la hora y la duración', async () => {
      await abrir(1);
      await fireEvent.press(boton('Cancelar entrevista'));
      await confirmar('¿Cancelar la entrevista?', 'Sí, cancelar entrevista');

      const agendar = await screen.findByTestId('agendar-101');
      expect(agendar.props.accessibilityLabel).toMatch(
        /^Agendar, .+ \d+ de .+ de \d{4}, a las \d+:\d{2} de la .+, 45 minutos$/,
      );
    });

    it('si otro candidato ya tomó el horario avisa, recarga la lista y no agenda', async () => {
      await abrir(1);
      await fireEvent.press(boton('Cancelar entrevista'));
      await confirmar('¿Cancelar la entrevista?', 'Sí, cancelar entrevista');
      await screen.findByTestId('agendar-102');

      await fireEvent.press(screen.getByTestId('agendar-102'));
      await confirmar('¿Agendar esta entrevista?', 'Sí, agendar');

      expect(
        await screen.findByText('Ese horario acaba de ser tomado, elige otro.'),
      ).toBeOnTheScreen();
      // La lista se vuelve a pedir: sigue el 101, ya sin el 102.
      expect(await screen.findByTestId('agendar-101')).toBeOnTheScreen();
      expect(screen.queryByTestId('agendar-102')).toBeNull();
      expect(screen.queryByTestId('tarjeta-entrevista')).toBeNull();
    });

    it('sin horarios publicados lo explica', async () => {
      const estado = obtenerEstado();
      estado.entrevistas.find((e) => e.id === 1)!.estado = 'cancelada';
      estado.horarios.filter((h) => h.vacante_id === 1).forEach((h) => (h.estado = 'cancelado'));
      await abrir(1);

      expect(await screen.findByRole('header', { name: 'Elige un horario' })).toBeOnTheScreen();
      expect(
        await screen.findByText(
          'La empresa aún no publica horarios. Te avisaremos cuando lo haga.',
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(/^agendar-/)).toBeNull();
    });

    it('si no cargan los horarios muestra el error con «Reintentar»', async () => {
      const estado = obtenerEstado();
      estado.entrevistas.find((e) => e.id === 1)!.estado = 'cancelada';
      jest
        .spyOn(servicioHorarios, 'disponibles')
        .mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
      await abrir(1);

      expect(
        await screen.findByText('El servicio no está disponible; intenta más tarde'),
      ).toBeOnTheScreen();
      await fireEvent.press(boton('Reintentar'));
      expect(await screen.findByTestId('agendar-101')).toBeOnTheScreen();
    });
  });

  describe('retirar la postulación', () => {
    it('pide confirmación, avisa que se cancela la entrevista y deja la postulación retirada', async () => {
      await abrir(1);

      await fireEvent.press(boton('Retirar postulación'));
      const dialogo = await screen.findByTestId('modal-confirmacion');
      expect(
        within(dialogo).getByText(/También se cancelará tu entrevista del /),
      ).toBeOnTheScreen();
      await fireEvent.press(within(dialogo).getByText('Sí, retirar'));

      expect(await screen.findByText(/^Retiraste tu postulación/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/^Estado: Retirada\./)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Retirar postulación' })).toBeNull();
      expect(screen.queryByTestId('tarjeta-entrevista')).toBeNull();
      expect(horarioEstado(1).estado).toBe('libre');
      expect(obtenerEstado().postulaciones.find((p) => p.id === 1)?.estado).toBe('retirada');
    });

    it('sin entrevista agendada la confirmación no la menciona; «No, conservarla» no cambia nada', async () => {
      await abrir(2, 'jorge.ramirez@correo.mx');

      await fireEvent.press(boton('Retirar postulación'));
      const dialogo = await screen.findByTestId('modal-confirmacion');
      expect(within(dialogo).queryByText(/entrevista/i)).toBeNull();
      await fireEvent.press(within(dialogo).getByText('No, conservarla'));

      expect(obtenerEstado().postulaciones.find((p) => p.id === 2)?.estado).toBe('postulada');
      expect(boton('Retirar postulación')).toBeOnTheScreen();
    });

    it('en una postulación finalizada no hay botón de retirar ni horarios', async () => {
      await abrir(102);

      expect(screen.queryByRole('button', { name: 'Retirar postulación' })).toBeNull();
      expect(screen.queryByText('Elige un horario')).toBeNull();
      expect(screen.getByLabelText(/^Estado: No seleccionada\./)).toBeOnTheScreen();
      expect(
        screen.getByText('Por ahora avanzamos con otros perfiles. Gracias por tu interés.', {
          hidden: true,
        }),
      ).toBeOnTheScreen();
    });
  });

  describe('estados de carga', () => {
    it('una postulación que no es tuya muestra el error con «Reintentar»', async () => {
      await abrir(2, 'mariana.lopez@correo.mx', false);

      expect(await screen.findByText('No encontramos esa postulación.')).toBeOnTheScreen();
      expect(boton('Reintentar')).toBeOnTheScreen();
    });
  });
});

describe('agruparPorDia', () => {
  const ahora = new Date('2026-10-15T15:00:00Z'); // 9:00 a.m. en la Ciudad de México
  const horario = (id: number, inicio: string) => ({
    id,
    vacante_id: 1,
    inicio,
    fin: inicio,
    duracion_min: 45,
    estado: 'libre' as const,
    liga: null,
  });

  it('agrupa por día de la Ciudad de México con Hoy, Mañana y «jue 22 oct», en orden', () => {
    const grupos = agruparPorDia(
      [
        horario(4, '2026-10-22T17:00:00Z'),
        horario(2, '2026-10-16T17:00:00Z'),
        horario(1, '2026-10-15T20:00:00Z'),
        horario(3, '2026-10-16T19:00:00Z'),
      ],
      ahora,
    );

    expect(grupos.map((g) => [g.titulo, g.tituloAccesible, g.horarios.map((h) => h.id)])).toEqual([
      ['Hoy', 'Hoy', [1]],
      ['Mañana', 'Mañana', [2, 3]],
      ['jue 22 oct', 'jueves 22 de octubre de 2026', [4]],
    ]);
  });
});
