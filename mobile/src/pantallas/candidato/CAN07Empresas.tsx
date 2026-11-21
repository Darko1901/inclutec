import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { empresas, useCatalogo, type ConsultaEmpresas, type EmpresaResumen } from '../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  Cargando,
  ErrorCatalogo,
  EstadoError,
  EstadoVacio,
  Selector,
  Texto,
} from '../../componentes';
import { colores, espaciado } from '../../tema';
import { useListaPaginada } from '../../utilidades/useListaPaginada';
import { TarjetaEmpresa } from './empresas/TarjetaEmpresa';
import { MINIMO_BUSQUEDA, useBusqueda } from './vacantes/useBusqueda';

/** Opción del selector que quita el filtro; ningún sector del catálogo tiene id 0. */
const TODOS_LOS_SECTORES = 0;

const traer = (consulta: ConsultaEmpresas, page: number, size: number) =>
  empresas.listar({ ...consulta, page, size });
const identificar = (empresa: EmpresaResumen) => empresa.id;

/** CAN-07: directorio de empresas validadas, con búsqueda por nombre y filtro por sector. */
export default function CAN07Empresas() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const busqueda = useBusqueda();
  const [sectorId, setSectorId] = useState<number>(TODOS_LOS_SECTORES);
  const sectores = useCatalogo('sectores');

  const consulta = useMemo<ConsultaEmpresas>(
    () => ({
      ...(busqueda.termino ? { q: busqueda.termino } : {}),
      ...(sectorId !== TODOS_LOS_SECTORES ? { sector_id: sectorId } : {}),
    }),
    [busqueda.termino, sectorId],
  );
  const lista = useListaPaginada(traer, consulta, identificar);
  const { carga, recargarSilencioso } = lista;

  // Al volver de una ficha se actualiza el número de vacantes sin parpadeo.
  useFocusEffect(
    useCallback(() => {
      void recargarSilencioso();
    }, [recargarSilencioso]),
  );

  const hayCriterios = Object.keys(consulta).length > 0;
  const total = carga.fase === 'listo' ? carga.total : null;
  useEffect(() => {
    if (hayCriterios && total !== null) {
      AccessibilityInfo.announceForAccessibility(
        total === 0
          ? 'No encontramos empresas con estos filtros'
          : `${total} ${total === 1 ? 'empresa encontrada' : 'empresas encontradas'}`,
      );
    }
  }, [hayCriterios, total]);

  function quitarFiltros() {
    busqueda.limpiar();
    setSectorId(TODOS_LOS_SECTORES);
  }

  const mensajeBusqueda =
    busqueda.texto.trim().length > 0 && busqueda.texto.trim().length < MINIMO_BUSQUEDA
      ? `Escribe al menos ${MINIMO_BUSQUEDA} letras para buscar.`
      : undefined;

  const encabezado = (
    <View style={estilos.encabezado}>
      <Texto variante="titulo" accessibilityRole="header">
        Empresas
      </Texto>
      <CampoTexto
        etiqueta="Buscar empresas"
        value={busqueda.texto}
        onChangeText={busqueda.setTexto}
        placeholder="Nombre de la empresa"
        ayuda={mensajeBusqueda}
        returnKeyType="search"
        onSubmitEditing={busqueda.buscarYa}
        autoCapitalize="none"
        testID="buscador-empresas"
      />
      <ErrorCatalogo catalogos={[sectores]} />
      <Selector
        etiqueta="Sector"
        opciones={[
          { id: TODOS_LOS_SECTORES, nombre: 'Todos los sectores' },
          ...sectores.datos.map(({ id, nombre }) => ({ id, nombre })),
        ]}
        valor={sectorId}
        onChange={setSectorId}
        cargando={sectores.cargando}
        testID="filtro-sector"
      />
      <Texto variante="cuerpoFuerte" color="textoSecundarioSobreGris" accessibilityRole="header">
        {hayCriterios ? 'Resultados' : 'Empresas con vacantes en IncluTec'}
      </Texto>
    </View>
  );

  const vacio =
    carga.fase === 'cargando' ? (
      <Cargando mensaje={hayCriterios ? 'Buscando empresas…' : 'Cargando empresas…'} />
    ) : carga.fase === 'error' ? (
      <EstadoError mensaje={carga.error.detail} onReintentar={lista.reintentar} />
    ) : hayCriterios ? (
      <EstadoVacio
        titulo="No encontramos empresas con estos filtros"
        mensaje="Prueba con otro nombre o quita el filtro de sector."
        icono="search-outline"
        accion={{ titulo: 'Quitar filtros', onPress: quitarFiltros }}
      />
    ) : (
      <EstadoVacio
        titulo="Por ahora no hay empresas registradas"
        mensaje="Vuelve a revisar más tarde."
        icono="business-outline"
      />
    );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <FlatList
        testID="lista-empresas"
        data={carga.fase === 'listo' ? carga.items : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={estilos.celda}>
            <TarjetaEmpresa
              empresa={item}
              onPress={() => navigation.navigate('FichaEmpresa', { id: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        ListFooterComponent={
          lista.cargandoMas ? (
            <Cargando mensaje="Cargando más empresas…" />
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
          <RefreshControl refreshing={lista.refrescando} onRefresh={() => void lista.refrescar()} />
        }
        onEndReached={() => void lista.cargarMas()}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
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
