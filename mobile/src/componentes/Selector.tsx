import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { CampoTexto } from './CampoTexto';
import { EncabezadoModal } from './EncabezadoModal';
import { Texto } from './Texto';
import { VentanaModal } from './VentanaModal';

export interface OpcionSelector {
  id: number;
  nombre: string;
  /** Texto secundario de la opción, por ejemplo el rango de un tamaño de empresa. */
  detalle?: string;
  /** Lo que lee el lector de pantalla si es distinto de lo que se ve, por ejemplo «40 por ciento». */
  etiquetaAccesible?: string;
}

interface SelectorProps {
  etiqueta: string;
  opciones: OpcionSelector[];
  valor: number | null;
  onChange: (id: number) => void;
  error?: string | null;
  placeholder?: string;
  /** Muestra un campo para filtrar la lista. */
  buscable?: boolean;
  deshabilitado?: boolean;
  /** Explica por qué está deshabilitado, por ejemplo «Elige primero una entidad». */
  ayudaDeshabilitado?: string;
  cargando?: boolean;
  testID?: string;
}

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Campo que abre una lista en un modal. Sirve para entidad, municipio, sector, tamaño, etc. */
export function Selector({
  etiqueta,
  opciones,
  valor,
  onChange,
  error,
  placeholder = 'Elige una opción',
  buscable = false,
  deshabilitado = false,
  ayudaDeshabilitado,
  cargando = false,
  testID,
}: SelectorProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const seleccionada = opciones.find((opcion) => opcion.id === valor) ?? null;
  const inactivo = deshabilitado || cargando;

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(`${etiqueta}: ${error}`);
  }, [error, etiqueta]);

  const visibles = useMemo(() => {
    const texto = sinAcentos(busqueda.trim());
    return texto
      ? opciones.filter((opcion) => sinAcentos(opcion.nombre).includes(texto))
      : opciones;
  }, [opciones, busqueda]);

  function abrir() {
    setBusqueda('');
    setAbierto(true);
  }

  function elegir(id: number) {
    onChange(id);
    setAbierto(false);
  }

  const ayuda = cargando ? 'Cargando opciones…' : deshabilitado ? ayudaDeshabilitado : undefined;

  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" accessibilityElementsHidden importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <Pressable
        testID={testID}
        onPress={abrir}
        disabled={inactivo}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}, ${seleccionada ? (seleccionada.etiquetaAccesible ?? seleccionada.nombre) : 'sin seleccionar'}`}
        accessibilityHint={inactivo ? ayuda : (error ?? 'Abre una lista para elegir una opción')}
        accessibilityState={{ disabled: inactivo, expanded: abierto }}
        style={[
          estilos.caja,
          {
            borderColor: error ? colores.error : colores.borde,
            borderWidth: error ? 2 : 1,
            backgroundColor: inactivo ? colores.fondoSuave : colores.fondo,
          },
        ]}
      >
        <Texto
          style={estilos.valor}
          color={seleccionada ? 'texto' : 'textoSecundarioSobreGris'}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {seleccionada ? seleccionada.nombre : placeholder}
        </Texto>
        <Ionicons
          name="chevron-down"
          size={22}
          color={colores.texto}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>
      {ayuda && !error ? (
        <Texto variante="pequeno" color="textoSecundarioSobreGris">
          {ayuda}
        </Texto>
      ) : null}
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

      <VentanaModal
        visible={abierto}
        onCerrar={() => setAbierto(false)}
        testID={testID ? `${testID}-modal` : undefined}
      >
        <>
          <EncabezadoModal titulo={etiqueta} onVolver={() => setAbierto(false)} />
          {buscable ? (
            <View style={estilos.busqueda}>
              <CampoTexto
                etiqueta="Buscar"
                value={busqueda}
                onChangeText={setBusqueda}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
          ) : null}
          <FlatList
            data={visibles}
            keyExtractor={(opcion) => String(opcion.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={estilos.lista}
            ListEmptyComponent={
              <Texto color="textoSecundario" style={estilos.vacio}>
                No hay resultados.
              </Texto>
            }
            renderItem={({ item }) => {
              const marcada = item.id === valor;
              return (
                <Pressable
                  onPress={() => elegir(item.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    item.detalle
                      ? `${item.etiquetaAccesible ?? item.nombre}, ${item.detalle}`
                      : (item.etiquetaAccesible ?? item.nombre)
                  }
                  accessibilityState={{ selected: marcada, checked: marcada }}
                  style={[estilos.opcion, marcada && estilos.opcionMarcada]}
                >
                  <View style={estilos.textosOpcion}>
                    <Texto
                      variante={marcada ? 'cuerpoFuerte' : 'cuerpo'}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {item.nombre}
                    </Texto>
                    {item.detalle ? (
                      <Texto
                        variante="pequeno"
                        color="textoSecundarioSobreGris"
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        {item.detalle}
                      </Texto>
                    ) : null}
                  </View>
                  <Ionicons
                    name={marcada ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={marcada ? colores.primario : colores.borde}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </Pressable>
              );
            }}
          />
        </>
      </VentanaModal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
  },
  valor: { flex: 1 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoError: { flexShrink: 1 },
  busqueda: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.sm },
  lista: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.xl },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
  },
  opcionMarcada: { backgroundColor: colores.infoFondo, paddingHorizontal: espaciado.sm },
  textosOpcion: { flex: 1, gap: espaciado.xs },
  vacio: { padding: espaciado.lg, textAlign: 'center' },
});
