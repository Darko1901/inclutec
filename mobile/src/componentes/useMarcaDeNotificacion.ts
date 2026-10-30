import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, type ScrollView, type View } from 'react-native';

import { espaciado } from '../tema';

/** Lo que tarda el desplazamiento animado antes de mover el foco del lector de pantalla. */
const ESPERA_DESPLAZAMIENTO_MS = 600;

/**
 * Apoyo para <ResaltadoNotificacion>: desplaza un ScrollView hasta la marca y lleva ahí el foco
 * de VoiceOver / TalkBack, para que la persona oiga primero «Desde tu notificación».
 */
export function useMarcaDeNotificacion() {
  const refMarca = useRef<View>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    [],
  );

  /** Mueve el foco a la marca cuando termina de desplazarse la pantalla. */
  const enfocar = useCallback(() => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      const nodo = findNodeHandle(refMarca.current);
      if (nodo !== null) AccessibilityInfo.setAccessibilityFocus(nodo);
    }, ESPERA_DESPLAZAMIENTO_MS);
  }, []);

  /** Desplaza el ScrollView para que la marca quede arriba, con un margen. */
  const desplazar = useCallback((scroll: ScrollView | null) => {
    const marca = refMarca.current;
    const contenido = scroll?.getInnerViewNode?.();
    if (!scroll || !marca || contenido == null) return;
    marca.measureLayout?.(
      contenido,
      (_x, y) => scroll.scrollTo({ y: Math.max(0, y - espaciado.xl), animated: true }),
      () => undefined,
    );
  }, []);

  return { refMarca, enfocar, desplazar };
}
