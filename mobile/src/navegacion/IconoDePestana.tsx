import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Texto } from '../componentes';
import { colores } from '../tema';
import type { IconoPestana } from './opcionesPestanas';

interface Props {
  nombre: IconoPestana;
  color: string;
  size: number;
  /** Notificaciones sin leer; con 0 no se dibuja la insignia. */
  insignia?: number;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/**
 * Ícono de una pestaña con su insignia de «sin leer». La insignia crece con la letra del sistema
 * (la de React Navigation tiene alto fijo y cortaría el número al 200 %); el lector de pantalla ya
 * dice el conteo en el nombre de la pestaña («Notificaciones, 1 sin leer»), así que aquí se oculta.
 */
export function IconoDePestana({ nombre, color, size, insignia = 0 }: Props) {
  return (
    <View>
      <Ionicons name={nombre} size={size} color={color} {...ocultar} />
      {insignia > 0 ? (
        <View style={estilos.insignia} testID="insignia-no-leidas" {...ocultar}>
          <Texto variante="pequeno" style={estilos.numero}>
            {insignia > 99 ? '99+' : String(insignia)}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  insignia: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    minHeight: 20,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.error,
  },
  numero: { color: colores.sobrePrimario, fontSize: 12, lineHeight: 16, fontWeight: '700' },
});
