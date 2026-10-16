import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { useRetornoFoco } from '../useRetornoFoco';

// En las pruebas no hay vistas nativas: findNodeHandle devuelve el testID del nodo que recibe.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get: (objetivo, propiedad, receptor) =>
      propiedad === 'findNodeHandle'
        ? (nodo: { props?: { testID?: string } } | null) => nodo?.props?.testID ?? null
        : Reflect.get(objetivo, propiedad, receptor),
  });
});

function Prueba({ conSegundo = true }: { conSegundo?: boolean }) {
  const { registrar, recordar, devolver } = useRetornoFoco();
  return (
    <>
      <View ref={registrar('a')} testID="boton-a" />
      {conSegundo ? <View ref={registrar('b')} testID="boton-b" /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="abrir a"
        onPress={() => recordar('a')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="abrir b"
        onPress={() => recordar('b')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="cerrar"
        onPress={() => devolver()}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="cerrar con respaldo"
        onPress={() => devolver('a')}
      />
    </>
  );
}

describe('useRetornoFoco', () => {
  let foco: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    foco = jest
      .spyOn(AccessibilityInfo, 'setAccessibilityFocus')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('al cerrar devuelve el foco al botón que abrió', async () => {
    await render(<Prueba />);

    await fireEvent.press(screen.getByRole('button', { name: 'abrir b' }));
    await fireEvent.press(screen.getByRole('button', { name: 'cerrar' }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(foco).toHaveBeenCalledTimes(1);
    expect(foco).toHaveBeenCalledWith('boton-b');
  });

  it('si el botón ya no existe usa el de respaldo', async () => {
    const { rerender } = await render(<Prueba />);
    await fireEvent.press(screen.getByRole('button', { name: 'abrir b' }));
    await rerender(<Prueba conSegundo={false} />);

    await fireEvent.press(screen.getByRole('button', { name: 'cerrar con respaldo' }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(foco).toHaveBeenCalledWith('boton-a');
  });

  it('sin botón de origen ni respaldo no mueve el foco', async () => {
    await render(<Prueba />);

    await fireEvent.press(screen.getByRole('button', { name: 'cerrar' }));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(foco).not.toHaveBeenCalled();
  });
});
