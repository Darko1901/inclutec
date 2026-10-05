import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { notificaciones } from '../api';

/** Contador de notificaciones no leídas (GET /notificaciones/resumen) para la barra inferior. */
export function useNoLeidas() {
  const [noLeidas, setNoLeidas] = useState(0);
  const montado = useRef(true);

  const refrescar = useCallback(() => {
    notificaciones
      .resumen()
      .then(({ no_leidas }) => {
        if (montado.current) setNoLeidas(no_leidas);
      })
      .catch(() => {
        // El contador es informativo; si falla se conserva el último valor.
      });
  }, []);

  useEffect(() => {
    montado.current = true;
    refrescar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescar();
    });
    return () => {
      montado.current = false;
      suscripcion.remove();
    };
  }, [refrescar]);

  return { noLeidas, refrescar };
}

/** «Notificaciones, 1 sin leer»: lo que anuncia el lector de pantalla en la pestaña. */
export function etiquetaNotificaciones(noLeidas: number): string {
  return noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones';
}
