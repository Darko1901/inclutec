import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Selector, type OpcionSelector } from '../Selector';

const OPCIONES: OpcionSelector[] = [
  { id: 1, nombre: 'Corregidora' },
  { id: 2, nombre: 'El Marqués' },
  { id: 3, nombre: 'Querétaro' },
  { id: 4, nombre: 'San Juan del Río' },
];

function dibujar(propiedades: Partial<React.ComponentProps<typeof Selector>> = {}) {
  const alCambiar = jest.fn();
  const resultado = render(
    <Selector
      etiqueta="Municipio"
      opciones={OPCIONES}
      valor={null}
      onChange={alCambiar}
      {...propiedades}
    />,
  );
  return { alCambiar, resultado };
}

describe('Selector', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra la etiqueta visible y se anuncia como botón con su valor actual', async () => {
    const { resultado } = dibujar({ valor: 3 });
    await resultado;

    expect(screen.getByText('Municipio', { hidden: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Municipio, Querétaro' })).toBeOnTheScreen();
  });

  it('sin valor dice «sin seleccionar»', async () => {
    await dibujar().resultado;
    expect(screen.getByRole('button', { name: 'Municipio, sin seleccionar' })).toBeOnTheScreen();
  });

  it('abre la lista con una opción por elemento, con rol radio y estado seleccionado', async () => {
    await dibujar({ valor: 2 }).resultado;

    await fireEvent.press(screen.getByRole('button', { name: /^Municipio/ }));

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'El Marqués' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Corregidora' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'El Marqués' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Corregidora' })).not.toBeSelected();
  });

  it('al elegir una opción avisa el id y cierra la lista', async () => {
    const { alCambiar, resultado } = dibujar();
    await resultado;
    await fireEvent.press(screen.getByRole('button', { name: /^Municipio/ }));

    await fireEvent.press(screen.getByRole('radio', { name: 'Querétaro' }));

    expect(alCambiar).toHaveBeenCalledWith(3);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('filtra con la búsqueda sin importar acentos ni mayúsculas', async () => {
    await dibujar({ buscable: true }).resultado;
    await fireEvent.press(screen.getByRole('button', { name: /^Municipio/ }));

    await fireEvent.changeText(screen.getByLabelText('Buscar'), 'marques');

    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'El Marqués' })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Buscar'), 'zzz');
    expect(screen.getByText('No hay resultados.')).toBeOnTheScreen();
  });

  it('muestra el error debajo, como alerta, y lo anuncia', async () => {
    await dibujar({ error: 'Elige tu municipio.' }).resultado;

    expect(screen.getByRole('alert')).toHaveTextContent('Elige tu municipio.');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Municipio: Elige tu municipio.',
    );
  });

  it('deshabilitado no abre y explica por qué', async () => {
    await dibujar({ deshabilitado: true, ayudaDeshabilitado: 'Elige primero una entidad.' })
      .resultado;

    const boton = screen.getByRole('button', { name: /^Municipio/ });
    expect(boton).toBeDisabled();
    expect(screen.getByText('Elige primero una entidad.')).toBeOnTheScreen();
  });
});
