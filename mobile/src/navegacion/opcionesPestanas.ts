import type { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

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

/** Nombre que ve la persona de cada pestaña (el de la ruta es interno: «MisVacantes»). */
export const TITULOS_CANDIDATO: Record<string, string> = {
  Vacantes: 'Vacantes',
  Postulaciones: 'Postulaciones',
  Empresas: 'Empresas',
  Notificaciones: 'Notificaciones',
  Perfil: 'Perfil',
};

export const TITULOS_RECLUTADOR: Record<string, string> = {
  MisVacantes: 'Mis vacantes',
  Agenda: 'Agenda',
  Notificaciones: 'Notificaciones',
  Organizacion: 'Organización',
};

/**
 * Título de la pantalla que aloja una barra inferior. No se ve (su encabezado está oculto), pero
 * el botón «Regresar» de las pantallas de detalle lo usa como texto: sin él diría «ReclutadorTabs».
 * Sigue a la pestaña activa, para que regrese a «Agenda» si se vino de ahí.
 */
export function tituloDePestana(
  route: Parameters<typeof getFocusedRouteNameFromRoute>[0],
  titulos: Record<string, string>,
  porOmision: string,
): string {
  const activa = getFocusedRouteNameFromRoute(route);
  return (activa && titulos[activa]) || porOmision;
}
