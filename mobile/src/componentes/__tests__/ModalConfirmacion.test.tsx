import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ModalConfirmacion } from '../ModalConfirmacion';

function dibujar(visible = true) {
  const alConfirmar = jest.fn();
  const alCancelar = jest.fn();
  const elemento = (
    <ModalConfirmacion
      visible={visible}
      titulo="¿Cerrar sesión?"
      mensaje="Tendrás que escribir tu correo y contraseña para volver a entrar."
      textoConfirmar="Cerrar sesión"
      onConfirmar={alConfirmar}
      onCancelar={alCancelar}
    />
  );
  return { alConfirmar, alCancelar, elemento };
}

// En las pruebas no hay vistas nativas: findNodeHandle devuelve siempre el mismo número.
const mockNodo = 7;
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get: (objetivo, propiedad, receptor) =>
      propiedad === 'findNodeHandle' ? () => mockNodo : Reflect.get(objetivo, propiedad, receptor),
  });
});

describe('ModalConfirmacion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra el título como encabezado, el mensaje y los dos botones', async () => {
    await render(dibujar().elemento);

    expect(screen.getByRole('header', { name: '¿Cerrar sesión?' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
  });

  it('no dibuja nada cuando está cerrado', async () => {
    await render(dibujar(false).elemento);
    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
  });

  it('confirmar y cancelar llaman a sus funciones', async () => {
    const { alConfirmar, alCancelar, elemento } = dibujar();
    await render(elemento);

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(alConfirmar).toHaveBeenCalledTimes(1);
    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  it('el botón atrás de Android (onRequestClose) cancela', async () => {
    const { alCancelar, elemento } = dibujar();
    await render(elemento);

    await fireEvent(screen.getByTestId('modal-confirmacion'), 'requestClose');

    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  it('lleva el foco del lector de pantalla al título al abrirse', async () => {
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
    await render(dibujar().elemento);

    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 450));
    });

    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(7);
  });
});
