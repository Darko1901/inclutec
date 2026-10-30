import { StyleSheet, View } from 'react-native';

import type { ApiError } from '../api';
import { espaciado } from '../tema';
import { Aviso } from './Aviso';
import { Boton } from './Boton';

interface Catalogo {
  error: ApiError | null;
  recargar: () => void;
}

interface ErrorCatalogoProps {
  /** Los catálogos (de useCatalogo) que usa el formulario; solo se muestra si alguno falló. */
  catalogos: Catalogo[];
  testID?: string;
}

/**
 * Aviso de que una lista del formulario (entidades, sectores, ajustes…) no cargó, con «Reintentar».
 * Sin él, un selector vacío no le diría a la persona qué pasó.
 */
export function ErrorCatalogo({ catalogos, testID = 'error-catalogo' }: ErrorCatalogoProps) {
  const fallidos = catalogos.filter((catalogo) => catalogo.error);
  if (fallidos.length === 0) return null;
  return (
    <View style={estilos.contenedor} testID={testID}>
      <Aviso variante="error" mensaje={fallidos[0].error!.detail} />
      <Boton
        titulo="Reintentar"
        variante="secundario"
        icono="refresh"
        onPress={() => fallidos.forEach((catalogo) => catalogo.recargar())}
        testID={`${testID}-reintentar`}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.sm },
});
