import type { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { colores } from '../tema';
import { etiquetaNotificaciones } from './useNoLeidas';

export type IconoPestana = keyof typeof Ionicons.glyphMap;

export const opcionesBarra: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colores.primario,
  tabBarInactiveTintColor: colores.textoSecundario,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
  tabBarStyle: { minHeight: 56 },
};

export function opcionesNotificaciones(noLeidas: number): BottomTabNavigationOptions {
  return {
    title: 'Notificaciones',
    tabBarAccessibilityLabel: etiquetaNotificaciones(noLeidas),
    tabBarBadge: noLeidas > 0 ? (noLeidas > 99 ? '99+' : noLeidas) : undefined,
    tabBarBadgeStyle: { backgroundColor: colores.error, color: colores.sobrePrimario },
  };
}
