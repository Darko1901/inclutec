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

/** Se agrega al nombre de una opción guardada que el administrador ya desactivó. */
export const SUFIJO_YA_NO_SE_OFRECE = ' (ya no se ofrece)';

type Guardado = Pick<CatalogoItem, 'id' | 'nombre'> & Partial<CatalogoItem>;

/**
 * El catálogo solo trae lo activo. Lo que el registro ya tenía se agrega aunque el administrador lo
 * haya desactivado, para que se vea y se pueda quitar: lo ya guardado no cambia. Mientras el
 * catálogo carga, o si falló, se devuelve tal cual.
 */
export function conGuardados(
  catalogo: { datos: CatalogoItem[]; cargando: boolean; error: ApiError | null },
  guardados: readonly (Guardado | null | undefined)[],
): CatalogoItem[] {
  if (catalogo.cargando || catalogo.error) return catalogo.datos;
  const ids = new Set(catalogo.datos.map((item) => item.id));
  const faltantes: CatalogoItem[] = [];
  for (const guardado of guardados) {
    if (!guardado || ids.has(guardado.id)) continue;
    ids.add(guardado.id);
    faltantes.push({ ...guardado, nombre: `${guardado.nombre}${SUFIJO_YA_NO_SE_OFRECE}` });
  }
  return faltantes.length > 0 ? [...catalogo.datos, ...faltantes] : catalogo.datos;
}
