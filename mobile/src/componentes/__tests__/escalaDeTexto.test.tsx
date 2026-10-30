import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { auditarAccesibilidad, textosEscalados } from '../../pruebas/auditoria';
import { Aviso } from '../Aviso';
import { Boton } from '../Boton';
import { CampoTexto } from '../CampoTexto';
import { Casilla } from '../Casilla';
import { ChipEstado, ESTADOS } from '../ChipEstado';
import { Tarjeta } from '../Tarjeta';
import { Texto } from '../Texto';

type Arbol = Parameters<typeof auditarAccesibilidad>[0];
const arbol = () => screen.toJSON() as Arbol;

// El tamaño de letra del sistema llega hasta el 200 %: ningún texto se queda en su tamaño base,
// ninguna caja con texto tiene alto fijo (lo cortaría) y todo lo tocable mide al menos 44 pt.
const ESCALA = 2;
const ninguna = () => {
  /* sin acción */
};

describe('los componentes base al 200 % de tamaño de letra', () => {
  it('Texto crece al doble en todas sus variantes, interlineado incluido', async () => {
    await render(
      <>
        {(
          ['titulo', 'subtitulo', 'cuerpo', 'cuerpoFuerte', 'etiqueta', 'pequeno', 'boton'] as const
        ).map((variante) => (
          <Texto key={variante} variante={variante}>
            {variante}
          </Texto>
        ))}
      </>,
    );

    const textos = textosEscalados(arbol(), ESCALA);
    expect(textos).toHaveLength(7);
    for (const { texto, tamano, interlineado } of textos) {
      // 28 → 56, 16 → 32, 14 → 28…: el doble del tamaño base, no más ni menos.
      expect([28, 20, 16, 14]).toContain(tamano / ESCALA);
      expect(interlineado).toBeGreaterThanOrEqual(tamano);
      expect(texto).not.toBe('');
    }
    expect(auditarAccesibilidad(arbol())).toEqual([]);
  });

  it('Boton: texto escalado, sin alto fijo y con área táctil de 48 pt en todas sus formas', async () => {
    await render(
      <>
        <Boton titulo="Guardar los cambios de mi perfil y volver" onPress={ninguna} />
        <Boton titulo="Con ícono" icono="refresh" variante="secundario" onPress={ninguna} />
        <Boton titulo="Eliminar" variante="peligro" onPress={ninguna} />
        <Boton titulo="Texto" variante="texto" onPress={ninguna} />
        <Boton titulo="Cargando" cargando onPress={ninguna} />
        <Boton titulo="Deshabilitado" deshabilitado onPress={ninguna} />
      </>,
    );

    expect(auditarAccesibilidad(arbol())).toEqual([]);
    for (const { tamano } of textosEscalados(arbol(), ESCALA)) expect(tamano).toBe(32);
  });

  it('CampoTexto: etiqueta, ayuda, error y contador crecen; el campo no tiene alto fijo', async () => {
    await render(
      <>
        <CampoTexto etiqueta="Correo" value="" onChangeText={ninguna} ayuda="Escribe tu correo" />
        <CampoTexto
          etiqueta="Teléfono"
          value="12"
          onChangeText={ninguna}
          error="Debe tener 10 dígitos"
        />
        <CampoTexto
          etiqueta="Resumen"
          value="Hola"
          onChangeText={ninguna}
          multiline
          maxLength={500}
          contador
        />
        <CampoTexto etiqueta="Contraseña" value="" onChangeText={ninguna} esContrasena />
      </>,
    );

    expect(auditarAccesibilidad(arbol())).toEqual([]);
    const textos = textosEscalados(arbol(), ESCALA);
    expect(textos.length).toBeGreaterThanOrEqual(7);
    for (const { tamano } of textos) expect(tamano).toBeGreaterThanOrEqual(28);
  });

  it('Tarjeta (con y sin toque) crece con su contenido y la tocable mide 48 pt', async () => {
    await render(
      <>
        <Tarjeta>
          <Texto>Una tarjeta con un texto largo que ocupa varias líneas al agrandar la letra</Texto>
        </Tarjeta>
        <Tarjeta onPress={ninguna} accessibilityLabel="Abrir">
          <Texto>Tarjeta tocable</Texto>
        </Tarjeta>
      </>,
    );

    expect(auditarAccesibilidad(arbol())).toEqual([]);
    for (const { tamano } of textosEscalados(arbol(), ESCALA)) expect(tamano).toBe(32);
  });

  it('ChipEstado: todos los estados llevan texto escalable (no solo color ni ícono) y sin alto fijo', async () => {
    const chips = Object.entries(ESTADOS).flatMap(([tipo, estados]) =>
      Object.keys(estados).map((estado) => ({ tipo, estado })),
    );
    await render(
      <View>
        {chips.map(({ tipo, estado }) => (
          <ChipEstado key={`${tipo}-${estado}`} tipo={tipo as never} estado={estado as never} />
        ))}
      </View>,
    );

    expect(chips.length).toBeGreaterThan(20);
    expect(auditarAccesibilidad(arbol())).toEqual([]);
    const textos = textosEscalados(arbol(), ESCALA);
    expect(textos).toHaveLength(chips.length);
    // Cada chip dice su estado con palabras.
    for (const { texto, tamano } of textos) {
      expect(texto.length).toBeGreaterThan(2);
      expect(tamano).toBeGreaterThanOrEqual(24);
    }
  });

  it('Aviso y Casilla (con ayuda y error) también escalan y se leen completos', async () => {
    await render(
      <>
        <Aviso variante="error" titulo="No se pudo guardar" mensaje="Revisa los campos marcados." />
        <Aviso variante="exito" mensaje="Guardado." />
        <Casilla
          texto="Acepto el aviso de privacidad"
          marcada={false}
          onCambio={ninguna}
          ayuda="Es obligatorio"
          error="Debes aceptar"
        />
      </>,
    );

    expect(auditarAccesibilidad(arbol())).toEqual([]);
    for (const { tamano } of textosEscalados(arbol(), ESCALA))
      expect(tamano).toBeGreaterThanOrEqual(28);
  });
});
