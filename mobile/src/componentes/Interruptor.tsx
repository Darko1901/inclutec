import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado } from '../tema';
import { Texto } from './Texto';

interface InterruptorProps {
  etiqueta: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
  deshabilitado?: boolean;
  testID?: string;
}

/** Fila con etiqueta y Switch: toda la fila es el control, así que la etiqueta va asociada. */
export function Interruptor({
  etiqueta,
  valor,
  onCambio,
  deshabilitado = false,
  testID,
}: InterruptorProps) {
  return (
    <Pressable
      testID={testID}
      onPress={() => onCambio(!valor)}
      disabled={deshabilitado}
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: valor, disabled: deshabilitado }}
      style={estilos.fila}
    >
      <Texto style={estilos.etiqueta} accessibilityElementsHidden importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Switch
          value={valor}
          disabled={deshabilitado}
          trackColor={{ false: colores.borde, true: colores.primario }}
          thumbColor={colores.fondo}
          ios_backgroundColor={colores.borde}
        />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingVertical: espaciado.xs,
  },
  etiqueta: { flex: 1 },
});
