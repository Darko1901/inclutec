import { render, screen } from '@testing-library/react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Boton, Casilla, Texto } from '../../componentes';
import { auditarAccesibilidad, contarEncabezados } from '../auditoria';

type Arbol = Parameters<typeof auditarAccesibilidad>[0];
const revisar = () => auditarAccesibilidad(screen.toJSON() as Arbol);
const reglas = () => revisar().map((h) => h.regla);

describe('auditarAccesibilidad (la revisión detecta lo que debe)', () => {
  it('los componentes base bien hechos no tienen hallazgos', async () => {
    await render(
      <>
        <Boton titulo="Guardar" onPress={() => undefined} icono="save-outline" />
        <Casilla texto="Acepto" marcada onCambio={() => undefined} />
        <Texto>Hola</Texto>
      </>,
    );

    expect(revisar()).toEqual([]);
  });

  it('un botón chico, sin rol y sin nombre se reporta', async () => {
    await render(
      <Pressable accessible focusable style={{ width: 30, height: 30 }}>
        <View />
      </Pressable>,
    );

    expect(reglas()).toEqual(expect.arrayContaining(['rol', 'nombre', 'area-tactil']));
  });

  it('un botón con rol y nombre pero de 40 pt no cumple el área táctil', async () => {
    await render(
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={{ minHeight: 40, minWidth: 48 }}
      />,
    );

    expect(revisar().map((h) => h.regla)).toEqual(['area-tactil']);
  });

  it('una casilla o pestaña sin estado se reporta', async () => {
    await render(
      <>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Acepto"
          style={{ minHeight: 48, minWidth: 48 }}
        />
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Activas"
          style={{ minHeight: 48, minWidth: 48 }}
        />
      </>,
    );

    expect(reglas()).toEqual(['estado', 'estado']);
  });

  it('el texto que no escala o está en una caja de alto fijo se reporta', async () => {
    await render(
      <>
        <Text allowFontScaling={false}>No escala</Text>
        <Text maxFontSizeMultiplier={1.2}>Escala poco</Text>
        <View style={{ height: 40 }}>
          <Text>Se cortaría</Text>
        </View>
      </>,
    );

    expect(reglas()).toEqual(['texto', 'texto', 'texto-cortado']);
  });

  it('un campo sin nombre se reporta', async () => {
    await render(<TextInput />);

    expect(reglas()).toEqual(['nombre']);
  });

  it('lo oculto al lector de pantalla no se revisa', async () => {
    await render(
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Pressable style={{ width: 10, height: 10 }} accessible focusable />
      </View>,
    );

    expect(revisar()).toEqual([]);
  });

  it('cuenta los encabezados', async () => {
    await render(
      <>
        <Text accessibilityRole="header">Uno</Text>
        <Text accessibilityRole="header">Dos</Text>
      </>,
    );

    expect(contarEncabezados(screen.toJSON() as Arbol)).toBe(2);
  });
});
