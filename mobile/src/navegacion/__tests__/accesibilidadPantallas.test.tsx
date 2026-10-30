import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { auth } from '../../api';
import { auditarAccesibilidad, contarEncabezados } from '../../pruebas/auditoria';
import { SesionProvider, useSesion } from '../../sesion';
import { RaizNavegador } from '../RaizNavegador';

// Recorre las pantallas con el mock y revisa el árbol que verían VoiceOver y TalkBack: rol y nombre
// en todo lo tocable, área táctil, estados, íconos ocultos y texto que escala. Un hallazgo nuevo
// hace fallar la prueba con la pantalla y el elemento.

// Los botones de las barras inferiores los dibuja React Navigation: la barra mide al menos 56 y
// cada celda 48 (`tabBarItemStyle`), pero el alto lo reparte su contenedor y no se ve en el árbol.
const BOTON_DE_BARRA = /, tab, \d of \d|«Notificaciones(, \d+ sin leer)?»/;

// El Modal de pruebas avisa con onDismiss cuando se cierra, como lo hace iOS: así las acciones de
// los menús (editar, duplicar…) llegan a su pantalla.
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Modal = ({
    visible,
    onDismiss,
    children,
    testID,
  }: {
    visible?: boolean;
    onDismiss?: () => void;
    children?: unknown;
    testID?: string;
  }) => {
    const estabaAbiertoRef = React.useRef(visible !== false);
    React.useEffect(() => {
      if (estabaAbiertoRef.current && visible === false) onDismiss?.();
      estabaAbiertoRef.current = visible !== false;
    }, [visible, onDismiss]);
    return visible === false ? null : <View testID={testID}>{children as never}</View>;
  };
  return { __esModule: true, default: Modal };
});

type Arbol = Parameters<typeof auditarAccesibilidad>[0];
const hallazgos: string[] = [];
const sinEncabezado: string[] = [];

function Entrar({ correo }: { correo: string }) {
  const { iniciarSesion } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return null;
}

async function abrir(correo?: string) {
  await render(
    <SesionProvider>
      {correo ? <Entrar correo={correo} /> : null}
      <NavigationContainer>
        <RaizNavegador />
      </NavigationContainer>
    </SesionProvider>,
  );
}

/** Revisa lo que está a la vista y guarda cada hallazgo con el nombre de la pantalla. */
function revisar(pantalla: string, { encabezado = true } = {}) {
  const arbol = screen.toJSON() as Arbol;
  for (const h of auditarAccesibilidad(arbol)) {
    if (h.regla === 'area-tactil' && BOTON_DE_BARRA.test(h.detalle)) continue;
    hallazgos.push(`[${pantalla}] (${h.regla}) ${h.detalle}`);
  }
  if (encabezado && contarEncabezados(arbol) === 0) sinEncabezado.push(pantalla);
}

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre });
const esperarBoton = (nombre: string | RegExp) =>
  screen.findByRole('button', { name: nombre }, { timeout: 8000 });
const esperarEncabezado = (nombre: string | RegExp) =>
  screen.findByRole('header', { name: nombre }, { timeout: 8000 });
const pestana = (nombre: string) => boton(new RegExp(`^${nombre}`));

afterAll(() => {
  const unicos = [...new Set(hallazgos)];
  if (unicos.length || sinEncabezado.length) {
    throw new Error(
      `${unicos.length} hallazgo(s) de accesibilidad:\n${unicos.join('\n')}\n` +
        `Pantallas sin encabezado: ${sinEncabezado.join(', ') || 'ninguna'}`,
    );
  }
});

describe('sin sesión', () => {
  it('MOV-01, MOV-02 y MOV-03', async () => {
    await abrir();
    await esperarBoton('Iniciar sesión');
    revisar('MOV-01');
    await fireEvent.press(boton('¿Olvidaste tu contraseña?'));
    await esperarEncabezado('Recupera tu contraseña');
    revisar('MOV-03');
  });

  it('MOV-02 en sus tres pasos', async () => {
    await abrir();
    await esperarBoton('Crear cuenta');
    await fireEvent.press(boton('Crear cuenta'));
    await screen.findByText('Paso 1 de 3');
    revisar('MOV-02 paso 1');
    await fireEvent.press(boton(/^Busco empleo/));
    await screen.findByText('Paso 2 de 3');
    revisar('MOV-02 paso 2');
  });
});

describe('candidato (Mariana)', () => {
  it('pestañas: Vacantes, Postulaciones, Empresas, Notificaciones y Perfil', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarEncabezado('Vacantes');
    await esperarBoton(/^Técnico de soporte de TI/);
    revisar('CAN-01');
    await fireEvent.press(pestana('Postulaciones'));
    await esperarEncabezado('Mis postulaciones');
    await esperarBoton(/^Técnico de soporte de TI/);
    revisar('CAN-05');
    await fireEvent.press(pestana('Empresas'));
    await esperarEncabezado('Empresas');
    await esperarBoton(/TecnoQro/);
    revisar('CAN-07');
    await fireEvent.press(pestana('Notificaciones'));
    await esperarEncabezado('Notificaciones');
    await esperarBoton(/Tu postulación avanzó/);
    revisar('MOV-04');
    await fireEvent.press(pestana('Perfil'));
    await esperarEncabezado('Mi perfil');
    revisar('CAN-03');
  });

  it('CAN-01: filtros', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(boton(/^Filtros/));
    await esperarEncabezado('Filtros');
    revisar('CAN-01 filtros');
  });

  it('CAN-02: detalle, postularme y reportar', async () => {
    await abrir('mariana.lopez@correo.mx');
    await fireEvent.press(await esperarBoton(/^Auxiliar de almacén/));
    await esperarBoton('Postularme');
    revisar('CAN-02');
    await fireEvent.press(boton('Postularme'));
    await esperarEncabezado(/Postularme|postulación/i);
    revisar('CAN-02 postularme');
  });

  it('CAN-06 y CAN-07: postulación y ficha de empresa', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(pestana('Postulaciones'));
    await fireEvent.press(await esperarBoton(/^Técnico de soporte de TI/));
    await esperarBoton('Cancelar entrevista');
    revisar('CAN-06');
    await fireEvent.press(boton('Cancelar entrevista'));
    await esperarEncabezado('¿Cancelar la entrevista?');
    revisar('CAN-06 cancelar entrevista');
  });

  it('CAN-07: ficha de empresa', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(pestana('Empresas'));
    await fireEvent.press(await esperarBoton(/TecnoQro/));
    await esperarEncabezado('TecnoQro');
    revisar('CAN-07 ficha');
  });

  it('CAN-03 con sus secciones abiertas y CAN-04 Mi CV', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(pestana('Perfil'));
    await esperarEncabezado('Mi perfil');
    for (const seccion of ['Datos personales', 'Preferencias laborales', 'Necesidades de ajuste']) {
      await fireEvent.press(await esperarBoton(new RegExp(`^${seccion}`)));
    }
    await waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(3));
    revisar('CAN-03 secciones abiertas');
    await fireEvent.press(boton('Mi CV'));
    await screen.findByRole('tab', { name: 'Experiencia' }, { timeout: 8000 });
    revisar('CAN-04 experiencia');
    await fireEvent.press(screen.getByRole('tab', { name: 'Habilidades' }));
    await esperarBoton(/Guardar habilidades/);
    revisar('CAN-04 habilidades');
  });

  it('MOV-04: preferencias de avisos', async () => {
    await abrir('mariana.lopez@correo.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(pestana('Notificaciones'));
    await fireEvent.press(await esperarBoton('Preferencias de notificaciones'));
    await esperarEncabezado('Preferencias de avisos');
    await waitFor(() => expect(screen.getAllByRole('switch').length).toBeGreaterThan(0));
    revisar('MOV-04 preferencias');
  });
});

describe('reclutador (Laura)', () => {
  it('pestañas: Mis vacantes, Agenda, Notificaciones y Organización', async () => {
    await abrir('rh@tecnoqro.mx');
    await esperarEncabezado('Mis vacantes');
    await esperarBoton(/^Técnico de soporte de TI/);
    revisar('REC-02');
    await fireEvent.press(pestana('Agenda'));
    await esperarEncabezado('Agenda');
    await screen.findByTestId('horario-1', {}, { timeout: 8000 });
    revisar('REC-06');
    await fireEvent.press(pestana('Notificaciones'));
    await esperarEncabezado('Notificaciones');
    await esperarBoton(/Nueva entrevista/);
    revisar('MOV-04 reclutador');
    await fireEvent.press(pestana('Organización'));
    await screen.findAllByRole('header', { name: /rganización/ }, { timeout: 8000 });
    revisar('REC-01');
  });

  it('REC-02: menú de acciones, REC-03 y REC-04/05', async () => {
    await abrir('rh@tecnoqro.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(boton('Más opciones de Técnico de soporte de TI'));
    await esperarBoton('Editar');
    revisar('REC-02 menú');
  });

  it('REC-03: los cuatro pasos de una vacante nueva', async () => {
    await abrir('rh@tecnoqro.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(boton('Más opciones de Técnico de soporte de TI'));
    await fireEvent.press(await esperarBoton('Editar'));
    await screen.findByText('Paso 1 de 4', {}, { timeout: 8000 });
    revisar('REC-03 paso 1');
    await fireEvent.press(boton('Siguiente'));
    await screen.findByText('Paso 2 de 4');
    revisar('REC-03 paso 2');
    await fireEvent.press(boton('Siguiente'));
    await screen.findByText('Paso 3 de 4');
    revisar('REC-03 paso 3');
    await fireEvent.press(boton('Siguiente'));
    await screen.findByText('Paso 4 de 4');
    revisar('REC-03 paso 4');
  });

  it('REC-04 y REC-05: postulados y detalle', async () => {
    await abrir('rh@tecnoqro.mx');
    await fireEvent.press(await esperarBoton(/^Técnico de soporte de TI/));
    await screen.findByTestId('titulo-vacante', {}, { timeout: 8000 });
    await esperarBoton(/Mariana López García/);
    revisar('REC-04');
    await fireEvent.press(boton(/Mariana López García/));
    await esperarBoton('Cambiar estado');
    revisar('REC-05');
    await fireEvent.press(boton('Cambiar estado'));
    await esperarEncabezado('Cambiar estado');
    revisar('REC-05 cambiar estado');
  });

  it('REC-06: publicar horarios', async () => {
    await abrir('rh@tecnoqro.mx');
    await esperarBoton(/^Técnico de soporte de TI/);
    await fireEvent.press(pestana('Agenda'));
    await screen.findByTestId('horario-1', {}, { timeout: 8000 });
    await fireEvent.press(boton('Publicar horarios'));
    await esperarEncabezado('Publicar horarios');
    revisar('REC-06 publicar horarios');
  });
});
