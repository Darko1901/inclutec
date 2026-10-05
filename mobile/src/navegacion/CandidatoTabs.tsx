import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CAN01Vacantes from '../pantallas/candidato/CAN01Vacantes';
import CAN03Perfil from '../pantallas/candidato/CAN03Perfil';
import CAN05Postulaciones from '../pantallas/candidato/CAN05Postulaciones';
import CAN07Empresas from '../pantallas/candidato/CAN07Empresas';
import MOV04Notificaciones from '../pantallas/compartidas/MOV04Notificaciones';
import type { CandidatoTabsParamList } from './tipos';
import { opcionesBarra, opcionesNotificaciones, type IconoPestana } from './opcionesPestanas';
import { useNoLeidas } from './useNoLeidas';

const Pestanas = createBottomTabNavigator<CandidatoTabsParamList>();

const ICONOS: Record<keyof CandidatoTabsParamList, [IconoPestana, IconoPestana]> = {
  Vacantes: ['briefcase', 'briefcase-outline'],
  Postulaciones: ['document-text', 'document-text-outline'],
  Empresas: ['business', 'business-outline'],
  Notificaciones: ['notifications', 'notifications-outline'],
  Perfil: ['person', 'person-outline'],
};

/** Barra inferior del candidato: Vacantes, Postulaciones, Empresas, Notificaciones, Perfil. */
export function CandidatoTabs() {
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
      <Pestanas.Screen name="Vacantes" component={CAN01Vacantes} />
      <Pestanas.Screen name="Postulaciones" component={CAN05Postulaciones} />
      <Pestanas.Screen name="Empresas" component={CAN07Empresas} />
      <Pestanas.Screen
        name="Notificaciones"
        component={MOV04Notificaciones}
        options={opcionesNotificaciones(noLeidas)}
      />
      <Pestanas.Screen name="Perfil" component={CAN03Perfil} />
    </Pestanas.Navigator>
  );
}
