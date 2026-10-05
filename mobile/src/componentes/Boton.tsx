import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

export type VarianteBoton = 'primario' | 'secundario' | 'texto' | 'peligro';

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const estilos_variante = {
  primario: { fondo: colores.primario, texto: colores.sobrePrimario, borde: colores.primario },
  secundario: { fondo: colores.fondo, texto: colores.primario, borde: colores.primario },
  texto: { fondo: 'transparent', texto: colores.primario, borde: 'transparent' },
  peligro: { fondo: colores.error, texto: colores.sobrePrimario, borde: colores.error },
} as const;

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
  icono,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: BotonProps) {
  const inactivo = deshabilitado || cargando;
  const colorVariante = estilos_variante[variante];
  const colorTexto = deshabilitado ? colores.textoSecundarioSobreGris : colorVariante.texto;

  return (
    <Pressable
      testID={testID}
      onPress={inactivo ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: deshabilitado ? colores.fondoSuave : colorVariante.fondo,
          borderColor: deshabilitado ? colores.bordeSuave : colorVariante.borde,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={estilos.contenido}>
        {cargando ? (
          <ActivityIndicator
            color={colorTexto}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : icono ? (
          <Ionicons
            name={icono}
            size={20}
            color={colorTexto}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
        <Texto variante="boton" style={{ color: colorTexto, textAlign: 'center', flexShrink: 1 }}>
          {titulo}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: AREA_TACTIL_MINIMA,
    minWidth: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    borderWidth: 2,
    justifyContent: 'center',
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
});
