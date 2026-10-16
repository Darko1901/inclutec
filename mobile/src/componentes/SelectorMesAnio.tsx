import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { NOMBRES_MESES, type MesAnio } from '../utilidades/fechasCV';
import { colores, espaciado } from '../tema';
import { Selector } from './Selector';
import { Texto } from './Texto';

interface SelectorMesAnioProps {
  /** Nombre del campo, por ejemplo «Fecha de inicio». */
  etiqueta: string;
  valor: MesAnio;
  onChange: (valor: MesAnio) => void;
  /** Último año que se puede elegir (por omisión, el año actual). */
  anioMaximo?: number;
  /** Cuántos años hacia atrás se ofrecen. */
  anios?: number;
  error?: string | null;
  testID?: string;
}

/**
 * Fecha de mes y año con dos listas accesibles (sin el selector de fecha nativo). La app guarda
 * siempre el día 1; ver `aFechaApi` en utilidades/fechasCV.
 */
export function SelectorMesAnio({
  etiqueta,
  valor,
  onChange,
  anioMaximo = new Date().getFullYear(),
  anios = 70,
  error,
  testID,
}: SelectorMesAnioProps) {
  const meses = useMemo(
    () => NOMBRES_MESES.map((nombre, indice) => ({ id: indice + 1, nombre })),
    [],
  );
  const listaAnios = useMemo(
    () =>
      Array.from({ length: anios }, (_, indice) => anioMaximo - indice).map((anio) => ({
        id: anio,
        nombre: String(anio),
      })),
    [anios, anioMaximo],
  );

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(`${etiqueta}: ${error}`);
  }, [error, etiqueta]);

  return (
    <View style={estilos.contenedor} accessibilityRole="none">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View style={estilos.fila}>
        <View style={estilos.mes}>
          <Selector
            etiqueta={`Mes de ${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)}`}
            testID={testID ? `${testID}-mes` : undefined}
            opciones={meses}
            valor={valor.mes}
            onChange={(mes) => onChange({ ...valor, mes })}
            placeholder="Mes"
          />
        </View>
        <View style={estilos.anio}>
          <Selector
            etiqueta={`Año de ${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)}`}
            testID={testID ? `${testID}-anio` : undefined}
            opciones={listaAnios}
            valor={valor.anio}
            onChange={(anio) => onChange({ ...valor, anio })}
            placeholder="Año"
            buscable
          />
        </View>
      </View>
      {error ? (
        <View style={estilos.error}>
          <Ionicons
            name="alert-circle"
            size={18}
            color={colores.error}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto
            variante="pequeno"
            color="error"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={estilos.textoError}
          >
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  fila: { flexDirection: 'row', gap: espaciado.md },
  mes: { flex: 3 },
  anio: { flex: 2 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoError: { flexShrink: 1 },
});
