import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCatalogo } from '../api';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { Aviso } from './Aviso';
import { CampoTexto } from './CampoTexto';
import { Texto } from './Texto';

const MINIMO_BUSQUEDA = 2;
const ESPERA_BUSQUEDA_MS = 300;

/** Texto del buscador y el término que se consulta 300 ms después de dejar de escribir. */
function useTermino(texto: string) {
  const [termino, setTermino] = useState('');
  useEffect(() => {
    const limpio = texto.trim();
    const espera = setTimeout(
      () => setTermino(limpio.length >= MINIMO_BUSQUEDA ? limpio : ''),
      ESPERA_BUSQUEDA_MS,
    );
    return () => clearTimeout(espera);
  }, [texto]);
  return termino;
}

interface BuscadorHabilidadesProps {
  /** Ids de las habilidades que ya se eligieron: no se vuelven a sugerir. */
  excluidas: number[];
  onAgregar: (id: number, nombre: string) => void;
  /** Con el límite alcanzado el campo se deshabilita y se explica por qué. */
  deshabilitado?: boolean;
  ayudaDeshabilitado?: string;
  etiqueta?: string;
  testID?: string;
}

/**
 * Buscador de habilidades con sugerencias del catálogo (desde 2 letras, 300 ms después de dejar
 * de escribir). Lo comparten CAN-04 (mis habilidades) y REC-03 (requisitos de la vacante).
 */
export function BuscadorHabilidades({
  excluidas,
  onAgregar,
  deshabilitado = false,
  ayudaDeshabilitado,
  etiqueta = 'Buscar una habilidad',
  testID = 'buscador-habilidades',
}: BuscadorHabilidadesProps) {
  const [texto, setTexto] = useState('');
  const termino = useTermino(texto);
  const sugerencias = useCatalogo('habilidades', { q: termino }, termino !== '');
  const disponibles = useMemo(
    () => sugerencias.datos.filter((s) => !excluidas.includes(s.id)),
    [sugerencias.datos, excluidas],
  );
  const hayBusqueda = termino !== '' && texto.trim().length >= MINIMO_BUSQUEDA;

  return (
    <View style={estilos.contenedor}>
      <CampoTexto
        etiqueta={etiqueta}
        value={texto}
        onChangeText={setTexto}
        editable={!deshabilitado}
        placeholder="Por ejemplo: Excel, Python"
        autoCapitalize="none"
        returnKeyType="search"
        ayuda={
          deshabilitado
            ? ayudaDeshabilitado
            : `Escribe al menos ${MINIMO_BUSQUEDA} letras para ver sugerencias.`
        }
        testID={testID}
      />

      {hayBusqueda && !deshabilitado ? (
        sugerencias.error ? (
          <Aviso variante="error" mensaje={sugerencias.error.detail} />
        ) : sugerencias.cargando ? (
          <Texto color="textoSecundarioSobreGris">Buscando…</Texto>
        ) : disponibles.length === 0 ? (
          <Texto color="textoSecundarioSobreGris" accessibilityLiveRegion="polite">
            {`No encontramos habilidades con «${termino}».`}
          </Texto>
        ) : (
          <View style={estilos.sugerencias} testID="sugerencias-habilidades">
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              accessibilityLiveRegion="polite"
            >
              {`${disponibles.length} ${disponibles.length === 1 ? 'sugerencia' : 'sugerencias'}. Toca una para agregarla.`}
            </Texto>
            {disponibles.map((habilidad) => (
              <Pressable
                key={habilidad.id}
                onPress={() => {
                  onAgregar(habilidad.id, habilidad.nombre);
                  setTexto('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${habilidad.nombre}`}
                style={estilos.sugerencia}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={colores.primario}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Texto accessibilityElementsHidden importantForAccessibility="no">
                  {habilidad.nombre}
                </Texto>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.md },
  sugerencias: {
    backgroundColor: colores.fondo,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    padding: espaciado.sm,
  },
  sugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.sm,
  },
});
