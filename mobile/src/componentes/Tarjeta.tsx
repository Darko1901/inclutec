import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colores, espaciado, radio } from '../tema';

interface TarjetaProps {
  children: ReactNode;
  /** Si se pasa, la tarjeta completa es un botón. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Tarjeta({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: TarjetaProps) {
  if (!onPress) {
    return (
      <View testID={testID} style={[estilos.tarjeta, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada, style]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    padding: espaciado.lg,
    gap: espaciado.sm,
  },
  presionada: { backgroundColor: colores.fondoSuave },
});
