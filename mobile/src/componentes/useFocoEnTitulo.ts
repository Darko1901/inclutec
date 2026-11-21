import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, type Text } from 'react-native';

const ESPERA_ANIMACION_MS = 350;

/**
 * Lleva el foco de VoiceOver / TalkBack al elemento al que se asigne la referencia, una vez que
 * termina la animación de apertura. Así, al abrir una ventana lo primero que se lee es su título.
 */
export function useFocoEnTitulo() {
  const referencia = useRef<Text>(null);

  useEffect(() => {
    const espera = setTimeout(() => {
      const nodo = findNodeHandle(referencia.current);
      if (nodo !== null) AccessibilityInfo.setAccessibilityFocus(nodo);
    }, ESPERA_ANIMACION_MS);
    return () => clearTimeout(espera);
  }, []);

  return referencia;
}
