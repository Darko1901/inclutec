import { act, render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { VentanaModal } from '../VentanaModal';

// El Modal de pruebas no llama a onDismiss; este deja alcanzarlo, como lo haría iOS.
let mockPropiedadesModal: { onDismiss?: () => void } = {};
function mockGuardarModal(propiedades: { onDismiss?: () => void }) {
  mockPropiedadesModal = propiedades;
}
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = jest.requireActual('react-native');
  const Modal = (propiedades: {
    visible?: boolean;
    children?: unknown;
    onDismiss?: () => void;
  }) => {
    mockGuardarModal(propiedades);
    return propiedades.visible === false ? null : <View>{propiedades.children as never}</View>;
  };
  return { __esModule: true, default: Modal };
});

const dibujar = (visible: boolean, onCerrado: () => void) => (
  <VentanaModal visible={visible} onCerrar={() => undefined} onCerrado={onCerrado}>
    {null}
  </VentanaModal>
);

// Jest no trae requestIdleCallback (React Native sí lo define al arrancar): cada prueba pone el suyo.

describe('VentanaModal · onCerrado', () => {
  afterEach(() => jest.restoreAllMocks());

  it('en iOS usa el onDismiss del Modal y no llama antes de que termine de cerrarse', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const alCerrado = jest.fn();
    const { rerender } = await render(dibujar(true, alCerrado));

    await rerender(dibujar(false, alCerrado));
    expect(alCerrado).not.toHaveBeenCalled();

    await act(async () => mockPropiedadesModal.onDismiss?.());
    expect(alCerrado).toHaveBeenCalledTimes(1);
  });

  it('en Android lo llama cuando la interfaz queda libre tras cerrarse', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    let terminar: () => void = () => undefined;
    globalThis.requestIdleCallback = ((tarea: () => void) => {
      terminar = tarea;
      return 1;
    }) as never;
    globalThis.cancelIdleCallback = jest.fn();
    const alCerrado = jest.fn();
    const { rerender } = await render(dibujar(true, alCerrado));

    await rerender(dibujar(false, alCerrado));
    expect(alCerrado).not.toHaveBeenCalled();
    terminar();
    expect(alCerrado).toHaveBeenCalledTimes(1);
  });

  it('en Android no llama si el modal nunca estuvo abierto o sigue abierto', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const espia = jest.fn();
    globalThis.requestIdleCallback = espia as never;
    globalThis.cancelIdleCallback = jest.fn();
    const alCerrado = jest.fn();
    const { rerender } = await render(dibujar(false, alCerrado));
    await rerender(dibujar(false, alCerrado));
    await rerender(dibujar(true, alCerrado));

    expect(espia).not.toHaveBeenCalled();
    expect(alCerrado).not.toHaveBeenCalled();
  });
});
