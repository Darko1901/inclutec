import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { EncabezadoModal } from '../EncabezadoModal';

// En las pruebas no hay vistas nativas: findNodeHandle devuelve siempre el mismo número.
const mockNodo = 42;
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get: (objetivo, propiedad, receptor) =>
      propiedad === 'findNodeHandle' ? () => mockNodo : Reflect.get(objetivo, propiedad, receptor),
  });
});

describe('EncabezadoModal', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra «‹ Volver» como botón accesible y el título como encabezado', async () => {
    await render(<EncabezadoModal titulo="Preferencias de avisos" onVolver={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Preferencias de avisos' })).toBeOnTheScreen();
    // Texto visible, además del ícono: nunca solo un símbolo.
    expect(screen.getByText('Volver', { hidden: true })).toBeOnTheScreen();
  });

  it('«Volver» llama a cerrar', async () => {
    const alVolver = jest.fn();
    await render(<EncabezadoModal titulo="Municipio" onVolver={alVolver} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(alVolver).toHaveBeenCalledTimes(1);
  });

  it('puede explicar qué hace «Volver» cuando guarda', async () => {
    await render(
      <EncabezadoModal
        titulo="Preferencias"
        onVolver={() => undefined}
        pistaVolver="Guarda tus cambios"
      />,
    );
    expect(screen.getByRole('button', { name: 'Volver' }).props.accessibilityHint).toBe(
      'Guarda tus cambios',
    );
  });

  it('deshabilitado no cierra y lo declara en su estado', async () => {
    const alVolver = jest.fn();
    await render(<EncabezadoModal titulo="Preferencias" onVolver={alVolver} volverDeshabilitado />);

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(alVolver).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
  });

  it('muestra una acción opcional a la derecha', async () => {
    const alGuardar = jest.fn();
    await render(
      <EncabezadoModal
        titulo="Editar"
        onVolver={() => undefined}
        accion={{ titulo: 'Guardar', onPress: alGuardar }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(alGuardar).toHaveBeenCalledTimes(1);
  });

  it('sin acción solo hay un botón', async () => {
    await render(<EncabezadoModal titulo="Municipio" onVolver={() => undefined} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('lleva el foco del lector de pantalla al título al abrirse', async () => {
    await render(<EncabezadoModal titulo="Municipio" onVolver={() => undefined} />);
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 450));
    });

    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42);
  });
});
