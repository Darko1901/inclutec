import type { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { AREA_TACTIL_MINIMA, colores } from '../tema';

/** «Notificaciones, 1 sin leer»: lo que anuncia el lector de pantalla en la pestaña. */
function etiquetaNotificaciones(noLeidas: number): string {
  return noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones';
}

export type IconoPestana = keyof typeof Ionicons.glyphMap;

export const opcionesBarra: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colores.primario,
  tabBarInactiveTintColor: colores.textoSecundario,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
  // Sin alto fijo: la barra crece con la letra del sistema y no corta las etiquetas.
  tabBarStyle: { height: undefined, minHeight: 56 },
  tabBarItemStyle: { minHeight: AREA_TACTIL_MINIMA },
};

export function opcionesNotificaciones(noLeidas: number): BottomTabNavigationOptions {
  return {
    title: 'Notificaciones',
    tabBarAccessibilityLabel: etiquetaNotificaciones(noLeidas),
  };
}
