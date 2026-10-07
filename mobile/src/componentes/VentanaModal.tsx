import type { ReactNode } from 'react';
import { Modal, StyleSheet } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { colores } from '../tema';

interface VentanaModalProps {
  visible: boolean;
  /** Se llama con el botón atrás de Android (y con el gesto de cerrar en iPad). */
  onCerrar: () => void;
  /** `pantalla` ocupa toda la pantalla; `dialogo` deja ver lo de atrás (confirmaciones). */
  tipo?: 'pantalla' | 'dialogo';
  children: ReactNode;
  testID?: string;
}

/**
 * Modal de React Native con su propio SafeAreaProvider. Un Modal se dibuja fuera del árbol de la
 * app, así que el provider de la app no le llega y las áreas seguras (barra de estado, notch,
 * indicador de inicio) quedarían en cero: por eso cada modal crea el suyo.
 */
export function VentanaModal({
  visible,
  onCerrar,
  tipo = 'pantalla',
  children,
  testID,
}: VentanaModalProps) {
  const esPantalla = tipo === 'pantalla';
  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent={!esPantalla}
      animationType={esPantalla ? 'slide' : 'fade'}
      onRequestClose={onCerrar}
      supportedOrientations={['portrait', 'landscape']}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView
          style={esPantalla ? estilos.pantalla : estilos.dialogo}
          accessibilityViewIsModal
        >
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  dialogo: { flex: 1, backgroundColor: colores.superposicion },
});
