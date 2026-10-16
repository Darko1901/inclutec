import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError } from '../api';

export const TAMANO_PAGINA = 20;
const TAMANO_MAXIMO = 100;

export type Carga<T> =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; items: T[]; total: number; pagina: number };

interface Pagina<T> {
  items: T[];
  total: number;
}

interface Resultado<T> {
  /** Consulta a la que pertenece: si ya no es la actual, el resultado se ignora. */
  clave: string;
  carga: Carga<T>;
}

interface PaginaSiguiente {
  clave: string;
  cargando: boolean;
  error: string | null;
}

/**
 * Lista paginada con desplazamiento infinito, «jalar para actualizar» y reintento. Cada vez que
 * cambia la consulta empieza de nuevo y descarta las respuestas que llegan tarde. `traer` debe ser
 * estable (una función fuera del componente o con useCallback); `identificar` da la clave de cada
 * elemento para no repetirlo al unir páginas.
 */
export function useListaPaginada<T, C>(
  traer: (consulta: C, page: number, size: number) => Promise<Pagina<T>>,
  consulta: C,
  identificar: (item: T) => number,
) {
  const clave = JSON.stringify(consulta);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const [mas, setMas] = useState<PaginaSiguiente | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [intento, setIntento] = useState(0);
  const solicitud = useRef(0);

  // Mientras no haya un resultado de esta consulta, la lista está cargando.
  const carga = useMemo<Carga<T>>(
    () => (resultado?.clave === clave ? resultado.carga : { fase: 'cargando' }),
    [resultado, clave],
  );
  const cargandoMas = mas?.clave === clave && mas.cargando;
  const errorMas = mas?.clave === clave ? mas.error : null;

  const ultima = useRef({ consulta, carga });
  useEffect(() => {
    ultima.current = { consulta, carga };
  });

  const pedirPrimera = useCallback(async (): Promise<Carga<T>> => {
    try {
      const pagina = await traer(consulta, 1, TAMANO_PAGINA);
      return { fase: 'listo', items: pagina.items, total: pagina.total, pagina: 1 };
    } catch (fallo) {
      return { fase: 'error', error: ApiError.desde(fallo) };
    }
  }, [consulta, traer]);

  // Se vuelve a pedir al cambiar la consulta o al reintentar.
  useEffect(() => {
    const numero = ++solicitud.current;
    void pedirPrimera().then((primera) => {
      if (numero === solicitud.current) {
        setMas(null);
        setResultado({ clave, carga: primera });
      }
    });
  }, [pedirPrimera, clave, intento]);

  const reintentar = useCallback(() => {
    setResultado(null);
    setIntento((actual) => actual + 1);
  }, []);

  /** «Jalar para actualizar». */
  const refrescar = useCallback(async () => {
    setRefrescando(true);
    const numero = ++solicitud.current;
    const primera = await pedirPrimera();
    if (numero === solicitud.current) {
      setMas(null);
      setResultado({ clave, carga: primera });
    }
    setRefrescando(false);
  }, [pedirPrimera, clave]);

  /**
   * Vuelve a pedir lo ya cargado sin mostrar el indicador de carga (por ejemplo, al regresar de
   * otra pantalla). Es estable: lee lo último desde una referencia para poder usarse en
   * useFocusEffect. Si falla, se queda lo que ya se veía.
   */
  const recargarSilencioso = useCallback(async () => {
    const { consulta: criterio, carga: actual } = ultima.current;
    if (actual.fase !== 'listo') return;
    const numero = ++solicitud.current;
    const claveActual = JSON.stringify(criterio);
    const size = Math.min(TAMANO_MAXIMO, actual.pagina * TAMANO_PAGINA);
    try {
      const pagina = await traer(criterio, 1, size);
      if (numero === solicitud.current) {
        setResultado({
          clave: claveActual,
          carga: {
            fase: 'listo',
            items: pagina.items,
            total: pagina.total,
            pagina: Math.max(1, Math.ceil(pagina.items.length / TAMANO_PAGINA)),
          },
        });
      }
    } catch {
      // Si falla, se queda lo que ya se veía.
    }
  }, [traer]);

  const cargarMas = useCallback(async () => {
    if (carga.fase !== 'listo' || cargandoMas || errorMas || carga.items.length >= carga.total) {
      return;
    }
    const numero = solicitud.current;
    setMas({ clave, cargando: true, error: null });
    try {
      const siguiente = carga.pagina + 1;
      const pagina = await traer(consulta, siguiente, TAMANO_PAGINA);
      if (numero !== solicitud.current) return;
      setResultado((previo) => {
        if (previo?.clave !== clave || previo.carga.fase !== 'listo') return previo;
        const conocidos = new Set(previo.carga.items.map(identificar));
        const nuevos = pagina.items.filter((item) => !conocidos.has(identificar(item)));
        return {
          clave,
          carga: {
            fase: 'listo',
            items: [...previo.carga.items, ...nuevos],
            total: pagina.total,
            pagina: siguiente,
          },
        };
      });
      setMas({ clave, cargando: false, error: null });
    } catch (fallo) {
      if (numero === solicitud.current) {
        setMas({ clave, cargando: false, error: ApiError.desde(fallo).detail });
      }
    }
  }, [carga, cargandoMas, errorMas, clave, consulta, traer, identificar]);

  const reintentarMas = useCallback(() => {
    setMas({ clave, cargando: false, error: null });
    void cargarMas();
  }, [clave, cargarMas]);

  return {
    carga,
    refrescando,
    cargandoMas,
    errorMas,
    reintentar,
    refrescar,
    recargarSilencioso,
    cargarMas,
    reintentarMas,
  };
}
