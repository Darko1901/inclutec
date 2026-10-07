import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, vacantes, type ConsultaVacantes, type VacanteResumen } from '../../../api';

export const TAMANO_PAGINA = 20;
const TAMANO_MAXIMO = 100;

export type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; items: VacanteResumen[]; total: number; pagina: number };

const CARGANDO: Carga = { fase: 'cargando' };

interface Resultado {
  /** Consulta a la que pertenece: si ya no es la actual, el resultado se ignora. */
  clave: string;
  carga: Carga;
}

interface PaginaSiguiente {
  clave: string;
  cargando: boolean;
  error: string | null;
}

/**
 * Lista paginada de CAN-01. Sin criterios pide las recomendadas; con criterios, la búsqueda.
 * Cada vez que cambia la consulta empieza de nuevo y descarta las respuestas que llegan tarde.
 */
export function useListaVacantes(consulta: ConsultaVacantes | null) {
  const clave = JSON.stringify(consulta);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mas, setMas] = useState<PaginaSiguiente | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [intento, setIntento] = useState(0);
  const solicitud = useRef(0);

  // Mientras no haya un resultado de esta consulta, la lista está cargando.
  const carga = useMemo<Carga>(
    () => (resultado?.clave === clave ? resultado.carga : CARGANDO),
    [resultado, clave],
  );
  const cargandoMas = mas?.clave === clave && mas.cargando;
  const errorMas = mas?.clave === clave ? mas.error : null;

  const ultima = useRef({ consulta, carga });
  useEffect(() => {
    ultima.current = { consulta, carga };
  });

  const traer = useCallback(
    (criterio: ConsultaVacantes | null, page: number, size: number) =>
      criterio
        ? vacantes.buscar({ ...criterio, page, size })
        : vacantes.recomendadas({ page, size }),
    [],
  );

  const pedirPrimera = useCallback(async (): Promise<Carga> => {
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
   * CAN-02 después de postularse, para que la tarjeta diga «Ya te postulaste»). Es estable: lee
   * lo último desde una referencia para poder usarse en useFocusEffect.
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
        const conocidos = new Set(previo.carga.items.map((v) => v.id));
        const nuevos = pagina.items.filter((v) => !conocidos.has(v.id));
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
  }, [carga, cargandoMas, errorMas, clave, consulta, traer]);

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
