import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { notificaciones } from '../api';

interface ValorNoLeidas {
  noLeidas: number;
  /** Vuelve a pedir el contador al API (GET /notificaciones/resumen). */
  refrescar: () => void;
  /** Cambia el contador al instante, sin esperar al API (por ejemplo, al marcar una como leída). */
  establecer: (cantidad: number) => void;
  ajustar: (diferencia: number) => void;
}

const NoLeidasContext = createContext<ValorNoLeidas | null>(null);

/** Contador de no leídas compartido entre la barra inferior y MOV-04. */
export function NoLeidasProvider({ activo, children }: { activo: boolean; children: ReactNode }) {
  const [cantidad, setCantidad] = useState(0);
  const montado = useRef(true);

  const refrescar = useCallback(() => {
    notificaciones
      .resumen()
      .then(({ no_leidas }) => {
        if (montado.current) setCantidad(no_leidas);
      })
      .catch(() => {
        // El contador es informativo; si falla se conserva el último valor.
      });
  }, []);

  const establecer = useCallback((nueva: number) => setCantidad(Math.max(0, nueva)), []);
  const ajustar = useCallback(
    (diferencia: number) => setCantidad((actual) => Math.max(0, actual + diferencia)),
    [],
  );

  useEffect(() => {
    montado.current = true;
    if (!activo) return () => undefined;
    refrescar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescar();
    });
    return () => {
      montado.current = false;
      suscripcion.remove();
    };
  }, [activo, refrescar]);

  const valor = useMemo<ValorNoLeidas>(
    () => ({ noLeidas: activo ? cantidad : 0, refrescar, establecer, ajustar }),
    [activo, cantidad, refrescar, establecer, ajustar],
  );

  return <NoLeidasContext.Provider value={valor}>{children}</NoLeidasContext.Provider>;
}

export function useNoLeidas(): ValorNoLeidas {
  const valor = useContext(NoLeidasContext);
  if (!valor) throw new Error('useNoLeidas debe usarse dentro de NoLeidasProvider');
  return valor;
}
