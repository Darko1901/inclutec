import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, type View } from 'react-native';

const ESPERA_CIERRE_MS = 400;

/**
 * Devuelve el foco del lector de pantalla al botón que abrió un modal cuando este se cierra.
 * Cada botón se registra con una clave (`ref={registrar('editar-3')}`); al abrir el modal se
 * anota cuál fue (`recordar`) y al cerrarlo `devolver` mueve el foco ahí. Si el botón ya no
 * existe (por ejemplo, la tarjeta se eliminó) usa la clave de respaldo.
 */
export function useRetornoFoco() {
  const nodos = useRef(new Map<string, View>());
  const origen = useRef<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
    },
    [],
  );

  const registrar = useCallback(
    (clave: string) => (nodo: View | null) => {
      if (nodo) nodos.current.set(clave, nodo);
      else nodos.current.delete(clave);
    },
    [],
  );

  const recordar = useCallback((clave: string) => {
    origen.current = clave;
  }, []);

  const devolver = useCallback((respaldo?: string) => {
    const clave = origen.current;
    origen.current = null;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      const nodo =
        (clave ? nodos.current.get(clave) : undefined) ??
        (respaldo ? nodos.current.get(respaldo) : undefined);
      const manejador = nodo ? findNodeHandle(nodo) : null;
      if (manejador !== null) AccessibilityInfo.setAccessibilityFocus(manejador);
    }, ESPERA_CIERRE_MS);
  }, []);

  return { registrar, recordar, devolver };
}
