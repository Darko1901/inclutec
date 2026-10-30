import { useState } from 'react';
import { View } from 'react-native';

import { useCatalogo } from '../api';
import { espaciado } from '../tema';
import { ErrorCatalogo } from './ErrorCatalogo';
import { Selector } from './Selector';

interface SelectorUbicacionProps {
  /** Entidad del municipio ya guardado, para precargar el selector de municipio. */
  entidadInicial: number | null;
  municipioId: number | null;
  onMunicipio: (id: number | null) => void;
  error?: string | null;
  /** Prefijo de los testID: «selector-entidad» y «selector-municipio» por omisión. */
  testIDBase?: string;
}

/** Entidad y municipio: el municipio depende de la entidad elegida. */
export function SelectorUbicacion({
  entidadInicial,
  municipioId,
  onMunicipio,
  error,
  testIDBase = 'selector',
}: SelectorUbicacionProps) {
  const [entidadId, setEntidadId] = useState<number | null>(entidadInicial);
  const entidades = useCatalogo('entidades');
  const municipios = useCatalogo(
    'municipios',
    { entidad_id: entidadId ?? undefined },
    entidadId !== null,
  );

  return (
    <View style={{ gap: espaciado.lg }}>
      <ErrorCatalogo catalogos={[entidades, municipios]} testID={`${testIDBase}-error-catalogo`} />
      <Selector
        etiqueta="Entidad"
        opciones={entidades.datos.map(({ id, nombre }) => ({ id, nombre }))}
        valor={entidadId}
        cargando={entidades.cargando}
        onChange={(id) => {
          if (id !== entidadId) onMunicipio(null);
          setEntidadId(id);
        }}
        placeholder="Elige la entidad"
        testID={`${testIDBase}-entidad`}
      />
      <Selector
        etiqueta="Municipio"
        opciones={municipios.datos.map(({ id, nombre }) => ({ id, nombre }))}
        valor={municipioId}
        cargando={municipios.cargando}
        deshabilitado={entidadId === null}
        ayudaDeshabilitado="Elige primero la entidad."
        onChange={onMunicipio}
        error={error}
        placeholder="Elige el municipio"
        testID={`${testIDBase}-municipio`}
      />
    </View>
  );
}
