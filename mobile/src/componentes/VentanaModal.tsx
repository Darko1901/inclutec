import { useEffect, useRef, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet } from 'react-native';
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
  /**
   * Se llama cuando el modal ya terminó de cerrarse. Sirve para abrir algo del sistema (selector
   * de fotos, cámara) que iOS no puede presentar mientras el modal sigue cerrándose.
   */
  onCerrado?: () => void;
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
  onCerrado,
  children,
  testID,
}: VentanaModalProps) {
  const esPantalla = tipo === 'pantalla';

  // En iOS lo avisa el propio Modal (onDismiss). En Android ese evento no existe: se llama
  // cuando el cierre ya se aplicó y la interfaz quedó libre.
  const estabaVisible = useRef(visible);
  const alCerrar = useRef(onCerrado);
  useEffect(() => {
    alCerrar.current = onCerrado;
  });
  useEffect(() => {
    const secerro = estabaVisible.current && !visible;
    estabaVisible.current = visible;
    if (Platform.OS === 'ios' || !secerro) return undefined;
    // requestIdleCallback espera a que el cierre se haya aplicado y la interfaz esté libre.
    const tarea = requestIdleCallback(() => alCerrar.current?.());
    return () => cancelIdleCallback(tarea);
  }, [visible]);

  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent={!esPantalla}
      animationType={esPantalla ? 'slide' : 'fade'}
      onRequestClose={onCerrar}
      onDismiss={onCerrado}
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
