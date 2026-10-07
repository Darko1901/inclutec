import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MOV04Notificaciones from '../pantallas/compartidas/MOV04Notificaciones';
import REC01Organizacion from '../pantallas/reclutador/REC01Organizacion';
import REC02MisVacantes from '../pantallas/reclutador/REC02MisVacantes';
import REC06Agenda from '../pantallas/reclutador/REC06Agenda';
import type { ReclutadorTabsParamList } from './tipos';
import { opcionesBarra, opcionesNotificaciones, type IconoPestana } from './opcionesPestanas';
import { useNoLeidas } from './NoLeidasContext';

const Pestanas = createBottomTabNavigator<ReclutadorTabsParamList>();

const ICONOS: Record<keyof ReclutadorTabsParamList, [IconoPestana, IconoPestana]> = {
  MisVacantes: ['briefcase', 'briefcase-outline'],
  Agenda: ['calendar', 'calendar-outline'],
  Notificaciones: ['notifications', 'notifications-outline'],
  Organizacion: ['business', 'business-outline'],
};

/** Barra inferior del reclutador: Mis vacantes, Agenda, Notificaciones, Organización. */
export function ReclutadorTabs() {
  const { noLeidas, refrescar } = useNoLeidas();

  return (
    <Pestanas.Navigator
      screenOptions={({ route }) => ({
        ...opcionesBarra,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONOS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
      screenListeners={{ focus: refrescar }}
    >
      <Pestanas.Screen
        name="MisVacantes"
        component={REC02MisVacantes}
        options={{ title: 'Mis vacantes' }}
      />
      <Pestanas.Screen name="Agenda" component={REC06Agenda} />
      <Pestanas.Screen
        name="Notificaciones"
        component={MOV04Notificaciones}
        options={opcionesNotificaciones(noLeidas)}
      />
      <Pestanas.Screen
        name="Organizacion"
        component={REC01Organizacion}
        options={{ title: 'Organización' }}
      />
    </Pestanas.Navigator>
  );
}
