import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';

interface Props {
  etiqueta: string;
  valor: string;
  testID?: string;
}

/** Dato de solo lectura con candado (razón social y RFC de una empresa validada). */
export function CampoBloqueado({ etiqueta, valor, testID }: Props) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${etiqueta}, ${valor}. Bloqueado, no se puede editar`}
      style={estilos.contenedor}
    >
      <Texto variante="etiqueta" accessibilityElementsHidden importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <View style={estilos.caja}>
        <Texto style={estilos.valor} accessibilityElementsHidden importantForAccessibility="no">
          {valor}
        </Texto>
        <Ionicons
          name="lock-closed"
          size={20}
          color={colores.textoSecundarioSobreGris}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: 48,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    backgroundColor: colores.fondoSuave,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  valor: { flex: 1 },
});
