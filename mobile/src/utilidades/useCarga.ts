import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../api';

type EstadoCarga<T> =
  { fase: 'cargando' } | { fase: 'error'; error: ApiError } | { fase: 'listo'; datos: T };

/**
 * Carga un dato al abrir la pantalla. `cargar` debe ser estable (una función fuera del
 * componente). `recargarSilencioso` vuelve a pedirlo sin mostrar «Cargando…» y, si falla, deja
 * lo que ya había; `establecer` guarda una respuesta que ya se tiene.
 */
export function useCarga<T>(cargar: () => Promise<T>) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ fase: 'cargando' });
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const pedir = useCallback(
    async (silencioso: boolean) => {
      try {
        const datos = await cargar();
        if (montado.current) setEstado({ fase: 'listo', datos });
      } catch (fallo) {
        if (montado.current && !silencioso) {
          setEstado({ fase: 'error', error: ApiError.desde(fallo) });
        }
      }
    },
    [cargar],
  );

  // La primera carga va aparte de `pedir`: así el efecto solo escribe el estado desde las promesas.
  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => {
        if (vigente) setEstado({ fase: 'listo', datos });
      })
      .catch((fallo: unknown) => {
        if (vigente) setEstado({ fase: 'error', error: ApiError.desde(fallo) });
      });
    return () => {
      vigente = false;
    };
  }, [cargar]);

  const recargar = useCallback(() => {
    setEstado({ fase: 'cargando' });
    return pedir(false);
  }, [pedir]);
  const recargarSilencioso = useCallback(() => pedir(true), [pedir]);
  const establecer = useCallback((datos: T) => setEstado({ fase: 'listo', datos }), []);

  return { estado, recargar, recargarSilencioso, establecer };
}
