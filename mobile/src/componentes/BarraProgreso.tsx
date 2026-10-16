import { StyleSheet, View } from 'react-native';

import { colores, radio } from '../tema';

interface BarraProgresoProps {
  /** Lo que mide la barra, por ejemplo «Completitud del perfil». */
  etiqueta: string;
  /** 0 a 100. */
  valor: number;
  /** El valor dicho como se lee en voz alta, por ejemplo «90 por ciento». */
  valorAccesible: string;
  testID?: string;
}

/** Barra de progreso: para el lector de pantalla es un solo elemento con su etiqueta y su valor. */
export function BarraProgreso({ etiqueta, valor, valorAccesible, testID }: BarraProgresoProps) {
  const ancho = Math.max(0, Math.min(100, valor));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: ancho, text: valorAccesible }}
      style={estilos.pista}
    >
      <View style={[estilos.relleno, { width: `${ancho}%` }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pista: {
    height: 14,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.primario,
    backgroundColor: colores.fondo,
    overflow: 'hidden',
  },
  relleno: { height: '100%', backgroundColor: colores.primario },
});
