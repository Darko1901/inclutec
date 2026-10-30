import { Ionicons } from '@expo/vector-icons';
import type { ReactNode, Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

export const TEXTO_DESDE_NOTIFICACION = 'Desde tu notificación';

interface Props {
  /** Si es false, solo dibuja el contenido (sin borde ni texto). */
  activo: boolean;
  children: ReactNode;
  /** Para llevar el foco del lector de pantalla a la marca (ver useMarcaDeNotificacion). */
  refMarca?: Ref<View>;
  testID?: string;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/**
 * Resalta el elemento al que llevó una notificación: borde, ícono y el texto «Desde tu
 * notificación» (nunca solo color). La marca es lo primero que lee el lector de pantalla.
 */
export function ResaltadoNotificacion({ activo, children, refMarca, testID }: Props) {
  if (!activo) return <>{children}</>;
  return (
    <View style={estilos.marco} testID={testID}>
      <View
        ref={refMarca}
        accessible
        accessibilityRole="text"
        accessibilityLabel={TEXTO_DESDE_NOTIFICACION}
        style={estilos.marca}
        testID="marca-notificacion"
      >
        <Ionicons name="notifications" size={18} color={colores.infoTexto} {...ocultar} />
        <Texto variante="pequeno" style={estilos.texto} {...ocultar}>
          {TEXTO_DESDE_NOTIFICACION}
        </Texto>
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: {
    gap: espaciado.sm,
    padding: espaciado.sm,
    borderWidth: 3,
    borderColor: colores.primario,
    borderRadius: radio.lg + espaciado.sm,
    backgroundColor: colores.infoFondo,
  },
  marca: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  texto: { color: colores.infoTexto, fontWeight: '700', flexShrink: 1 },
});
