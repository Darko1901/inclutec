import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, Linking, View } from 'react-native';

import { auth, reportes } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN07FichaEmpresa from '../CAN07FichaEmpresa';

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

/** Hace de navegador: guarda lo que la pantalla pone en el encabezado (el botón ⋮) y lo dibuja. */
function Anfitrion({ id }: { id: number }) {
  const [cabecera, setCabecera] = useState<ReactNode>(null);
  const navigation = useMemo(
    () => ({
      ...navegacion,
      setOptions: (opciones: { headerRight?: () => ReactNode }) =>
        setCabecera(opciones.headerRight?.() ?? null),
    }),
    [],
  );
  const props = {
    navigation,
    route: { key: 'k', name: 'FichaEmpresa', params: { id } },
  } as unknown as ComponentProps<typeof CAN07FichaEmpresa>;
  return (
    <>
      <View>{cabecera}</View>
      <CAN07FichaEmpresa {...props} />
    </>
  );
}

async function abrir(id: number, correo = 'mariana.lopez@correo.mx', esperar = true) {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <Anfitrion id={id} />
      </Entrar>
    </SesionProvider>,
  );
  if (esperar) await screen.findByTestId('ficha-empresa');
}

describe('CAN-07 · Ficha de empresa', () => {
  beforeEach(() => {
    navegacion.navigate.mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('muestra nombre, validación, sector, tamaño, ubicación y descripción', async () => {
    await abrir(1);

    expect(screen.getByRole('header', { name: 'TecnoQro' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Empresa validada')).toBeOnTheScreen();
    expect(screen.getByText('✓ Empresa validada', { hidden: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Sector: Tecnologías de la información')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tamaño: Mediana (51 a 250 trabajadores)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ubicación: Querétaro, Querétaro')).toBeOnTheScreen();
    expect(
      screen.getByText('Empresa de desarrollo de software y soporte técnico.'),
    ).toBeOnTheScreen();
  });

  it('tiene la sección «Prácticas de inclusión» con lo que declara la empresa', async () => {
    await abrir(1);

    expect(screen.getByRole('header', { name: 'Prácticas de inclusión' })).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
      ),
    ).toBeOnTheScreen();
  });

  it('lista sus vacantes publicadas con la compatibilidad y abren CAN-02', async () => {
    await abrir(1);

    const vacante = within(screen.getByTestId('vacante-1'));
    expect(vacante.getByText('Técnico de soporte de TI', { hidden: true })).toBeOnTheScreen();
    expect(vacante.getByText('Compatibilidad 88 %', { hidden: true })).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('vacante-6')).getByText('Compatibilidad 15 %', { hidden: true }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('vacante-6'));
    expect(navegacion.navigate).toHaveBeenCalledWith('DetalleVacante', { id: 6 });
  });

  it('el sitio web abre el navegador; sin sitio web no hay enlace', async () => {
    const abrirUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await abrir(1);

    await fireEvent.press(screen.getByRole('link', { name: 'Sitio web, tecnoqro.mx' }));
    expect(abrirUrl).toHaveBeenCalledWith('https://tecnoqro.mx');
  });

  it('ConCentro no tiene sitio web', async () => {
    await abrir(3);

    expect(screen.getByRole('header', { name: 'ConCentro' })).toBeOnTheScreen();
    expect(screen.queryByTestId('sitio-web')).toBeNull();
  });

  it('el menú ⋮ ofrece «Reportar empresa» con los motivos que aplican a empresas', async () => {
    const crear = jest.spyOn(reportes, 'crear');
    await abrir(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Más opciones' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Reportar empresa' }));
    expect(await screen.findByRole('header', { name: 'Reportar empresa' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));
    expect(
      await screen.findByText('Elige un motivo para poder enviar el reporte.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Motivo, / }));
    // Los motivos exclusivos de vacantes no aparecen.
    await screen.findByRole('radio', { name: 'Discriminación' });
    expect(screen.queryByRole('radio', { name: 'Solicitud de pago al candidato' })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Información falsa' }));
    await fireEvent.changeText(screen.getByLabelText('Descripción (opcional)'), 'Datos falsos.');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        motivo_reporte_id: 2,
        empresa_id: 2,
        descripcion: 'Datos falsos.',
      }),
    );
    expect(await screen.findByText('Gracias, revisaremos tu reporte')).toBeOnTheScreen();
    expect(obtenerEstado().reportes.at(-1)).toMatchObject({ empresa_id: 2, vacante_id: null });
  });

  it('Estudio Trazo (pendiente) no tiene ficha pública', async () => {
    await abrir(4, 'mariana.lopez@correo.mx', false);

    expect(
      await screen.findByText('La empresa no existe o ya no está disponible.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByText('La empresa no existe o ya no está disponible.'),
    ).toBeOnTheScreen();
  });
});
