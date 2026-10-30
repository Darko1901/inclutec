import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  postulaciones,
  type ConsultaPostulaciones,
  type EstadoPostulacion,
  type PostulacionResumen,
} from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  EstadoVacio,
  FiltroEstado,
  Texto,
} from '../../componentes';
import { colores, espaciado } from '../../tema';
import { useListaPaginada } from '../../utilidades/useListaPaginada';
import { PestanasPostulaciones } from './postulaciones/PestanasPostulaciones';
import { TarjetaPostulacion } from './postulaciones/TarjetaPostulacion';
import {
  cantidadPostulaciones,
  ESTADOS_POR_PESTANA,
  textoEstado,
  type PestanaPostulaciones,
} from './postulaciones/textosPostulacion';

type Conteos = Record<PestanaPostulaciones, number | null>;

const traer = (consulta: ConsultaPostulaciones, page: number, size: number) =>
  postulaciones.mias({ ...consulta, page, size });
const identificar = (postulacion: PostulacionResumen) => postulacion.id;

/** CAN-05: mis postulaciones, separadas en Activas y Finalizadas, con filtro por estado. */
export default function CAN05Postulaciones() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [pestana, setPestana] = useState<PestanaPostulaciones>('activas');
  const [estado, setEstado] = useState<EstadoPostulacion | null>(null);
  const [conteos, setConteos] = useState<Conteos>({ activas: null, finalizadas: null });

  const consulta = useMemo<ConsultaPostulaciones>(
    () => ({ activas: pestana === 'activas', ...(estado ? { estado } : {}) }),
    [pestana, estado],
  );
  const lista = useListaPaginada(traer, consulta, identificar);
  const { carga, recargarSilencioso } = lista;

  // El número de cada pestaña no depende del filtro: se consulta aparte con páginas de un elemento.
  const cargarConteos = useCallback(async () => {
    try {
      const [activas, finalizadas] = await Promise.all([
        postulaciones.mias({ activas: true, size: 1 }),
        postulaciones.mias({ activas: false, size: 1 }),
      ]);
      setConteos({ activas: activas.total, finalizadas: finalizadas.total });
    } catch {
      // Sin los números las pestañas se ven sin ellos.
    }
  }, []);

  // Al volver de CAN-06 (por ejemplo, tras retirar una postulación) se actualiza sin parpadeo.
  useFocusEffect(
    useCallback(() => {
      void cargarConteos();
      void recargarSilencioso();
    }, [cargarConteos, recargarSilencioso]),
  );

  function cambiarPestana(nueva: PestanaPostulaciones) {
    if (nueva === pestana) return;
    setPestana(nueva);
    setEstado(null);
  }

  // Anuncia cuántas postulaciones hay después de cambiar de pestaña o de filtro.
  const total = carga.fase === 'listo' ? carga.total : null;
  const claveConsulta = JSON.stringify(consulta);
  const anunciada = useRef<string | null>(null);
  useEffect(() => {
    if (total === null) return;
    if (anunciada.current !== null && anunciada.current !== claveConsulta) {
      AccessibilityInfo.announceForAccessibility(
        total === 0 ? 'Sin postulaciones' : cantidadPostulaciones(total),
      );
    }
    anunciada.current = claveConsulta;
  }, [total, claveConsulta]);

  const sinNinguna = conteos.activas === 0 && conteos.finalizadas === 0;

  const encabezado = (
    <View style={estilos.encabezado}>
      <Texto variante="titulo" accessibilityRole="header">
        Mis postulaciones
      </Texto>
      <PestanasPostulaciones pestana={pestana} conteos={conteos} onChange={cambiarPestana} />
      <FiltroEstado
        estados={ESTADOS_POR_PESTANA[pestana]}
        valor={estado}
        onChange={setEstado}
        textoDe={textoEstado}
      />
    </View>
  );

  const irAVacantes = () => navigation.navigate('Vacantes');
  const vacio =
    carga.fase === 'cargando' ? (
      <Cargando mensaje="Cargando tus postulaciones…" />
    ) : carga.fase === 'error' ? (
      <EstadoError mensaje={carga.error.detail} onReintentar={lista.reintentar} />
    ) : estado ? (
      <EstadoVacio
        titulo={`No tienes postulaciones en «${textoEstado(estado)}»`}
        mensaje="Prueba con otro estado."
        icono="filter-outline"
        accion={{ titulo: 'Quitar filtros', onPress: () => setEstado(null) }}
      />
    ) : sinNinguna ? (
      <EstadoVacio
        titulo="Aún no te has postulado"
        mensaje="Cuando te postules a una vacante, la verás aquí con su estado."
        icono="document-text-outline"
        accion={{ titulo: 'Ver vacantes', onPress: irAVacantes }}
      />
    ) : pestana === 'activas' ? (
      <EstadoVacio
        titulo="No tienes postulaciones activas"
        mensaje="Las que ya terminaron están en «Finalizadas»."
        icono="document-text-outline"
        accion={{ titulo: 'Ver vacantes', onPress: irAVacantes }}
      />
    ) : (
      <EstadoVacio
        titulo="Aún no tienes postulaciones finalizadas"
        mensaje="Aquí verás las que fueron aceptadas, no seleccionadas o que retiraste."
        icono="archive-outline"
      />
    );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <FlatList
        testID="lista-postulaciones"
        data={carga.fase === 'listo' ? carga.items : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={estilos.celda}>
            <TarjetaPostulacion
              postulacion={item}
              onPress={() => navigation.navigate('DetallePostulacion', { id: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        ListFooterComponent={
          lista.cargandoMas ? (
            <Cargando mensaje="Cargando más postulaciones…" />
          ) : lista.errorMas ? (
            <View style={estilos.pie}>
              <Aviso variante="error" mensaje={lista.errorMas} />
              <Boton
                titulo="Reintentar"
                variante="secundario"
                icono="refresh"
                onPress={lista.reintentarMas}
              />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={lista.refrescando}
            onRefresh={() => {
              void cargarConteos();
              void lista.refrescar();
            }}
          />
        }
        onEndReached={() => void lista.cargarMas()}
        onEndReachedThreshold={0.5}
        contentContainerStyle={estilos.contenido}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { paddingBottom: espaciado.xl },
  encabezado: { padding: espaciado.lg, gap: espaciado.md },
  celda: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.md },
  pie: { gap: espaciado.sm, padding: espaciado.lg },
});
