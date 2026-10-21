import { setStringAsync } from 'expo-clipboard';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Linking } from 'react-native';

import { obtenerEstado } from '../../../api/mock/datos';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';
import REC05DetallePostulado from '../REC05DetallePostulado';

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

type Props = ComponentProps<typeof REC05DetallePostulado>;
const navegar = jest.fn();
const volver = jest.fn();

async function abrir(id: number, correo: string = CUENTAS.laura, esperarDetalle = true) {
  const props = {
    route: { key: 'DetallePostulado', name: 'DetallePostulado', params: { id } },
    navigation: { navigate: navegar, goBack: volver },
  } as unknown as Props;
  await renderizarComo(correo, <REC05DetallePostulado {...props} />);
  if (esperarDetalle) await screen.findByTestId('detalle-postulado');
}

const seccion = (testID: string) => within(screen.getByTestId(testID));
const verTexto = (texto: string | RegExp) => screen.getByText(texto, { hidden: true });

async function abrirCambioDeEstado() {
  await fireEvent.press(screen.getByRole('button', { name: 'Cambiar estado' }));
  return within(await screen.findByTestId('modal-cambiar-estado'));
}

describe('REC-05 · Detalle del postulado', () => {
  beforeEach(() => {
    navegar.mockClear();
    volver.mockClear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('encabezado, desglose y CV', () => {
    it('muestra el nombre, la compatibilidad laboral y el estado con texto', async () => {
      await abrir(1);
      expect(screen.getByRole('header', { name: 'Mariana López García' })).toBeOnTheScreen();
      expect(screen.getByTestId('compatibilidad-postulado')).toHaveTextContent(
        'Compatibilidad laboral 83 %',
      );
      expect(screen.getByLabelText('Estado: Entrevista')).toBeOnTheScreen();
      expect(
        screen.getByText(/Postulado a «Técnico de soporte de TI» el 30 sep/),
      ).toBeOnTheScreen();
    });

    it('el desglose dice con texto e ícono qué cumple y qué no, sin el componente de accesibilidad', async () => {
      await abrir(1);
      const obligatorias = seccion('desglose-obligatorias');
      expect(obligatorias.getByLabelText('Soporte técnico: cumple')).toBeOnTheScreen();
      expect(obligatorias.getByLabelText('SQL: no cumple')).toBeOnTheScreen();
      expect(obligatorias.getByText('✓ Redes', { hidden: true })).toBeOnTheScreen();
      expect(obligatorias.getByText('✕ SQL', { hidden: true })).toBeOnTheScreen();
      const deseables = seccion('desglose-deseables');
      expect(deseables.getByLabelText('Excel: cumple')).toBeOnTheScreen();
      expect(deseables.getByLabelText('JavaScript: no cumple')).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Formación mínima: Técnico superior universitario. Cumple.'),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Modalidad de la vacante: Híbrido. Coincide con lo que prefiere.'),
      ).toBeOnTheScreen();
      expect(verTexto(/solo considera habilidades, formación y modalidad/)).toBeOnTheScreen();
    });

    it('la formación que se está cursando y una modalidad que no coincide se dicen con palabras', async () => {
      await abrir(112); // cursa su TSU; híbrido coincide
      expect(
        screen.getByLabelText(
          'Formación mínima: Técnico superior universitario. La está cursando.',
        ),
      ).toBeOnTheScreen();
    });

    it('muestra el CV completo con los niveles de habilidad y el mensaje de la postulación', async () => {
      await abrir(1);
      const cv = seccion('seccion-cv');
      expect(cv.getByTestId('mensaje-postulacion', { hidden: true })).toHaveTextContent(
        'Me interesa mucho el puesto; tengo experiencia en soporte.',
      );
      expect(
        cv.getByText('Técnica en sistemas con experiencia en soporte y atención a usuarios.', {
          hidden: true,
        }),
      ).toBeOnTheScreen();
      expect(cv.getByText('Auxiliar de soporte técnico', { hidden: true })).toBeOnTheScreen();
      expect(
        cv.getByText('TSU en Tecnologías de la Información', { hidden: true }),
      ).toBeOnTheScreen();
      expect(cv.getByLabelText('Soporte técnico, nivel avanzado')).toBeOnTheScreen();
      expect(cv.getByLabelText('Excel, nivel básico')).toBeOnTheScreen();
    });
  });

  describe('necesidades de ajuste', () => {
    it('si las compartió, dice cuáles cubre la vacante', async () => {
      await abrir(1);
      const necesidades = seccion('seccion-necesidades');
      expect(
        necesidades.getByLabelText('Acceso con rampa. Ya cubierto por la vacante'),
      ).toBeOnTheScreen();
      expect(
        necesidades.getAllByText('✓ Ya cubierto por la vacante', { hidden: true }),
      ).toHaveLength(2);
      expect(necesidades.queryByText('El candidato no compartió esta información.')).toBeNull();
    });

    it('las que la vacante no declara quedan «Por confirmar con la empresa», con la nota', async () => {
      await abrir(112);
      const necesidades = seccion('seccion-necesidades');
      expect(
        necesidades.getByLabelText(
          'Software compatible con lector de pantalla. Por confirmar con la empresa',
        ),
      ).toBeOnTheScreen();
      expect(
        necesidades.getByLabelText(/^Nota del candidato: Uso lector de pantalla/),
      ).toBeOnTheScreen();
    });

    it('lo que la vacante ofrece bajo solicitud también queda por confirmar', async () => {
      await abrir(114);
      const necesidades = seccion('seccion-necesidades');
      expect(
        necesidades.getByLabelText('Baño accesible. Ya cubierto por la vacante'),
      ).toBeOnTheScreen();
      expect(
        necesidades.getByLabelText(
          'Horario flexible. Por confirmar con la empresa. La vacante lo ofrece bajo solicitud.',
        ),
      ).toBeOnTheScreen();
    });

    it('si no las compartió dice «El candidato no compartió esta información.»', async () => {
      await abrir(110);
      expect(screen.getByTestId('sin-necesidades')).toHaveTextContent(
        'El candidato no compartió esta información.',
      );
      expect(screen.queryByTestId('necesidad-1')).toBeNull();
    });
  });

  describe('contacto', () => {
    it('antes de «entrevista» dice cuándo estará disponible y no muestra datos', async () => {
      await abrir(110);
      expect(screen.getByTestId('contacto-oculto')).toHaveTextContent(
        'Disponibles al pasar a entrevista',
      );
      expect(screen.queryByTestId('contacto-correo')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Llamar/ })).toBeNull();
      expect(JSON.stringify(screen.toJSON() ?? '')).not.toContain('carlos.mendoza@correo.mx');
    });

    it('desde «entrevista» muestra correo y teléfono con acciones para escribir y llamar', async () => {
      await abrir(1);
      expect(screen.getByTestId('contacto-correo')).toHaveTextContent('mariana.lopez@correo.mx');
      expect(screen.getByTestId('contacto-telefono')).toHaveTextContent('4427654321');
      expect(screen.queryByTestId('contacto-oculto')).toBeNull();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Escribir un correo a Mariana López García' }),
      );
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:mariana.lopez@correo.mx');
      await fireEvent.press(screen.getByRole('button', { name: 'Llamar a Mariana López García' }));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:4427654321');
    });

    it('si el sistema no puede abrir la acción lo explica', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sin app'));
      await abrir(1);
      await fireEvent.press(screen.getByRole('button', { name: /^Llamar a/ }));
      expect(await screen.findByText(/No pudimos abrir el marcador/)).toBeOnTheScreen();
    });
  });

  describe('cambiar estado', () => {
    it('solo ofrece las transiciones permitidas, con contador y aclaración del mensaje', async () => {
      await abrir(110); // postulada
      const modal = await abrirCambioDeEstado();
      expect(modal.getByRole('radio', { name: 'En revisión' })).toBeOnTheScreen();
      expect(modal.getByRole('radio', { name: 'No seleccionada' })).toBeOnTheScreen();
      expect(modal.queryByRole('radio', { name: 'Entrevista' })).toBeNull();
      expect(modal.queryByRole('radio', { name: 'Aceptada' })).toBeNull();
      expect(modal.getByText('El candidato verá este mensaje', { hidden: true })).toBeOnTheScreen();
      expect(modal.getByText('0 / 500')).toBeOnTheScreen();
      expect(modal.getByRole('button', { name: 'Cambiar estado' })).toBeDisabled();
    });

    it('una postulación terminada ya no se puede cambiar', async () => {
      await abrir(117); // aceptada
      expect(screen.queryByRole('button', { name: 'Cambiar estado' })).toBeNull();
      expect(screen.getByTestId('sin-cambios')).toBeOnTheScreen();
    });

    it('«En revisión» con mensaje se envía sin confirmar y queda en el historial', async () => {
      await abrir(110);
      const modal = await abrirCambioDeEstado();
      await fireEvent.press(modal.getByRole('radio', { name: 'En revisión' }));
      await fireEvent.changeText(
        modal.getByTestId('campo-mensaje-estado'),
        'Revisaremos tu perfil.',
      );
      expect(modal.getByText('22 / 500')).toBeOnTheScreen();
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar estado' }));

      expect(
        await screen.findByText(/Estado actualizado: ahora está en «En revisión»/),
      ).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByLabelText('Estado: En revisión')).toBeOnTheScreen());
      expect(screen.queryByTestId('modal-cambiar-estado')).toBeNull();
      expect(
        screen.getByLabelText(/^Estado actual: En revisión.*Revisaremos tu perfil\./),
      ).toBeOnTheScreen();
      // Y ahora ofrece los siguientes estados.
      const siguiente = await abrirCambioDeEstado();
      expect(siguiente.getByRole('radio', { name: 'Entrevista' })).toBeOnTheScreen();
    });

    it('«No seleccionada» pide confirmar; «Volver» no cambia nada', async () => {
      await abrir(110);
      const modal = await abrirCambioDeEstado();
      await fireEvent.press(modal.getByRole('radio', { name: 'No seleccionada' }));
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar estado' }));

      const confirmacion = within(await screen.findByTestId('modal-confirmar-estado'));
      expect(
        confirmacion.getByText('¿Marcar como «No seleccionada»?', { hidden: true }),
      ).toBeOnTheScreen();
      await fireEvent.press(confirmacion.getByRole('button', { name: 'Volver' }));
      expect(await screen.findByTestId('modal-cambiar-estado')).toBeOnTheScreen();
      expect(obtenerEstado().postulaciones.find((p) => p.id === 110)?.estado).toBe('postulada');

      await fireEvent.press(
        within(screen.getByTestId('modal-cambiar-estado')).getByRole('button', {
          name: 'Cambiar estado',
        }),
      );
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Marcar como no seleccionada' }),
      );
      expect(await screen.findByText(/ahora está en «No seleccionada»/)).toBeOnTheScreen();
      expect(obtenerEstado().postulaciones.find((p) => p.id === 110)?.estado).toBe(
        'no_seleccionada',
      );
    });

    it('«Aceptada» también pide confirmar', async () => {
      await abrir(1);
      const modal = await abrirCambioDeEstado();
      expect(modal.getByRole('radio', { name: 'Aceptada' })).toBeOnTheScreen();
      await fireEvent.press(modal.getByRole('radio', { name: 'Aceptada' }));
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar estado' }));
      expect(await screen.findByText('¿Marcar como «Aceptada»?')).toBeOnTheScreen();
      await fireEvent.press(await screen.findByRole('button', { name: 'Marcar como aceptada' }));
      expect(await screen.findByText(/ahora está en «Aceptada»/)).toBeOnTheScreen();
    });

    it('al pasar a «entrevista» muestra el contacto y, sin horarios libres, ofrece ir a la agenda', async () => {
      for (const h of obtenerEstado().horarios.filter(
        (x) => x.vacante_id === 1 && x.estado === 'libre',
      )) {
        h.estado = 'cancelado';
      }
      await abrir(111); // en revisión
      const modal = await abrirCambioDeEstado();
      await fireEvent.press(modal.getByRole('radio', { name: 'Entrevista' }));
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar estado' }));

      expect(await screen.findByTestId('aviso-sin-horarios')).toBeOnTheScreen();
      expect(await screen.findByTestId('contacto-correo')).toHaveTextContent(
        'daniela.ortega@correo.mx',
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Publicar horarios' }));
      expect(navegar).toHaveBeenCalledWith('ReclutadorTabs', {
        screen: 'Agenda',
        params: { publicar_vacante_id: 1 },
      });
    });

    it('con horarios libres no insiste en publicar más', async () => {
      await abrir(111);
      const modal = await abrirCambioDeEstado();
      await fireEvent.press(modal.getByRole('radio', { name: 'Entrevista' }));
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar estado' }));
      await screen.findByText(/ahora está en «Entrevista»/);
      expect(screen.queryByTestId('aviso-sin-horarios')).toBeNull();
    });
  });

  describe('observaciones internas', () => {
    it('lista las existentes con autor y fecha, y dice que el candidato no las ve', async () => {
      await abrir(1);
      const seccionObs = seccion('seccion-observaciones');
      expect(seccionObs.getByLabelText('No visibles para el candidato')).toBeOnTheScreen();
      expect(
        seccionObs.getByLabelText(
          /^Laura Hernández Ruiz, .*Perfil sólido en soporte; confirmar disponibilidad de horario\.$/,
        ),
      ).toBeOnTheScreen();
    });

    it('agrega una observación nueva con contador y la muestra arriba', async () => {
      await abrir(1);
      const campo = screen.getByTestId('campo-observacion');
      await fireEvent.changeText(campo, 'Llamar el lunes por la mañana.');
      expect(screen.getByText('30 / 1000')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar observación' }));

      expect(await screen.findByText('Observación guardada.')).toBeOnTheScreen();
      await waitFor(() =>
        expect(screen.getByLabelText(/Llamar el lunes por la mañana\.$/)).toBeOnTheScreen(),
      );
      expect(screen.getByTestId('campo-observacion').props.value).toBe('');
      expect(obtenerEstado().observaciones.at(-1)?.texto).toBe('Llamar el lunes por la mañana.');
    });

    it('una observación vacía se marca en el campo', async () => {
      await abrir(1);
      await fireEvent.press(screen.getByRole('button', { name: 'Agregar observación' }));
      expect(
        await screen.findByText('Escribe la observación antes de agregarla.'),
      ).toBeOnTheScreen();
    });
  });

  describe('entrevista', () => {
    it('muestra fecha, hora y liga, y permite abrirla y copiarla', async () => {
      await abrir(1);
      const tarjeta = seccion('tarjeta-entrevista');
      expect(tarjeta.getByText('45 min', { exact: false, hidden: true })).toBeOnTheScreen();
      expect(
        tarjeta.getByLabelText('Liga: https://meet.google.com/abc-defg-hij'),
      ).toBeOnTheScreen();

      await fireEvent.press(tarjeta.getByRole('button', { name: 'Abrir liga' }));
      expect(Linking.openURL).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
      await fireEvent.press(tarjeta.getByRole('button', { name: 'Copiar liga' }));
      expect(setStringAsync).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
      expect(await screen.findByText('Liga copiada.')).toBeOnTheScreen();
    });

    it('sin entrevista no hay tarjeta', async () => {
      await abrir(110);
      expect(screen.queryByTestId('tarjeta-entrevista')).toBeNull();
    });
  });

  describe('reportar perfil', () => {
    it('el menú ⋮ ofrece «Reportar perfil» y envía el reporte', async () => {
      await abrir(112);
      await fireEvent.press(
        screen.getByRole('button', { name: 'Más opciones del perfil de Fernando Silva Lara' }),
      );
      await fireEvent.press(await screen.findByRole('button', { name: 'Reportar perfil' }));
      await act(async () => {
        mockModales['menu-postulado'].onDismiss?.();
      });

      const modal = within(await screen.findByTestId('modal-reporte'));
      expect(modal.getByRole('header', { name: 'Reportar perfil' })).toBeOnTheScreen();
      await waitFor(() => expect(modal.getByTestId('motivo-reporte')).toBeEnabled());
      await fireEvent.press(modal.getByTestId('motivo-reporte'));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Información falsa' }));
      await fireEvent.press(modal.getByRole('button', { name: 'Enviar reporte' }));

      expect(await screen.findByText('Gracias, revisaremos tu reporte')).toBeOnTheScreen();
      expect(obtenerEstado().reportes.at(-1)).toMatchObject({
        reportante_id: 2,
        candidato_id: 112,
        motivo_reporte_id: 2,
      });
    });
  });

  it('una postulación de otra empresa no se muestra', async () => {
    await abrir(1, CUENTAS.roberto, false);
    expect(await screen.findByText('No encontramos este postulado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(volver).toHaveBeenCalled();
  });
});
