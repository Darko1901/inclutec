import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

interface CasillaProps {
  /** Todo el texto es parte del control: tocarlo marca o desmarca la casilla. */
  texto: string;
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
  /** Explicación breve debajo del texto; también se lee como pista. */
  ayuda?: string;
  error?: string | null;
  deshabilitada?: boolean;
  testID?: string;
}

export function Casilla({
  texto,
  marcada,
  onCambio,
  ayuda,
  error,
  deshabilitada = false,
  testID,
}: CasillaProps) {
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  return (
    <View style={estilos.contenedor}>
      <Pressable
        testID={testID}
        onPress={() => onCambio(!marcada)}
        disabled={deshabilitada}
        accessibilityRole="checkbox"
        accessibilityLabel={texto}
        accessibilityHint={ayuda}
        accessibilityState={{ checked: marcada, disabled: deshabilitada }}
        style={estilos.fila}
      >
        <View
          style={[
            estilos.caja,
            {
              borderColor: error ? colores.error : colores.primario,
              backgroundColor: marcada ? colores.primario : colores.fondo,
            },
          ]}
        >
          {marcada ? (
            <Ionicons
              name="checkmark"
              size={20}
              color={colores.sobrePrimario}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
        </View>
        <View style={estilos.textos}>
          <Texto accessibilityElementsHidden importantForAccessibility="no">
            {texto}
          </Texto>
          {ayuda ? (
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {ayuda}
            </Texto>
          ) : null}
        </View>
      </Pressable>
      {error ? (
        <View style={estilos.error}>
          <Ionicons
            name="alert-circle"
            size={18}
            color={colores.error}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto
            variante="pequeno"
            color="error"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={estilos.textoError}
          >
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingVertical: espaciado.sm,
  },
  caja: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: radio.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textos: { flex: 1, gap: espaciado.xs },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoError: { flexShrink: 1 },
});
