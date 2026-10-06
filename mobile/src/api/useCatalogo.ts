import { useEffect, useState } from 'react';

import type { TipoCatalogo } from './catalogos';
import { ApiError } from './errores';
import { catalogos } from './servicios';
import type { CatalogoItem, ConsultaCatalogo } from './tipos';

interface Resultado {
  clave: string;
  datos: CatalogoItem[];
  error: ApiError | null;
}

// Los catálogos casi no cambian: se guardan mientras la app está abierta para no volver a pedirlos
// cada vez que se abre una pantalla. Los errores no se guardan.
const guardados = new Map<string, CatalogoItem[]>();

export function limpiarCatalogosGuardados(): void {
  guardados.clear();
}

/** Carga un catálogo; vuelve a pedirlo si cambian el tipo o los filtros, o con `recargar`. */
export function useCatalogo(tipo: TipoCatalogo, filtros?: ConsultaCatalogo, habilitado = true) {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const filtrosJson = JSON.stringify(filtros ?? {});
  const claveBase = `${tipo}|${filtrosJson}`;
  const clave = `${claveBase}|${intento}`;
  const guardado = guardados.get(claveBase);

  useEffect(() => {
    if (!habilitado || guardados.has(claveBase)) return undefined;
    let vigente = true;
    catalogos
      .listar(tipo, JSON.parse(filtrosJson) as ConsultaCatalogo)
      .then((datos) => {
        guardados.set(claveBase, datos);
        if (vigente) setResultado({ clave, datos, error: null });
      })
      .catch((error: unknown) => {
        if (vigente) setResultado({ clave, datos: [], error: ApiError.desde(error) });
      });
    return () => {
      vigente = false;
    };
  }, [tipo, filtrosJson, habilitado, claveBase, clave]);

  // El resultado en memoria solo vale si corresponde a la consulta actual.
  const listo = habilitado && resultado?.clave === clave;
  return {
    datos: guardado ?? (listo ? resultado.datos : []),
    cargando: habilitado && !guardado && !listo,
    error: !guardado && listo ? resultado.error : null,
    recargar: () => {
      guardados.delete(claveBase);
      setIntento((actual) => actual + 1);
    },
  };
}
