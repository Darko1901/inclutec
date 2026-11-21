import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ApiError,
  postulaciones,
  vacantes,
  type ConsultaPostulados,
  type EstadoPostulacion,
  type Postulado,
} from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  EstadoVacio,
  FiltroEstado,
  Selector,
  Texto,
} from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { colores, espaciado } from '../../tema';
import { useListaPaginada } from '../../utilidades/useListaPaginada';
import { TarjetaPostulado } from './postulados/TarjetaPostulado';
import {
  cantidadPostulados,
  ESTADOS_FILTRO,
  OPCIONES_MINIMA,
  TEXTO_ORDEN,
  TEXTO_SIN_DISCAPACIDAD,
  textoEstadoPostulacion,
} from './postulados/textosPostulados';

type Props = NativeStackScreenProps<RootStackParamList, 'Postulados'>;

const identificar = (postulado: Postulado) => postulado.postulacion_id;

/** REC-04: los candidatos postulados a una vacante, de mayor a menor compatibilidad laboral. */
export default function REC04Postulados({ route, navigation }: Props) {
  const vacanteId = route.params.vacante_id;
  const [estado, setEstado] = useState<EstadoPostulacion | null>(null);
  const [minima, setMinima] = useState(0);
  const [vacante, setVacante] = useState<{ titulo: string; postulados: number | null } | null>(
    null,
  );

  const traer = useCallback(
    (consulta: ConsultaPostulados, page: number, size: number) =>
      postulaciones.postuladosDe(vacanteId, { ...consulta, page, size }),
    [vacanteId],
  );
  const consulta = useMemo<ConsultaPostulados>(
    () => ({
      ...(estado ? { estado } : {}),
      ...(minima > 0 ? { compatibilidad_min: minima } : {}),
    }),
    [estado, minima],
  );
  const lista = useListaPaginada(traer, consulta, identificar);
  const { carga, recargarSilencioso } = lista;
  const filtrado = estado !== null || minima > 0;

  // El título y el total de postulados no dependen de los filtros.
  const cargarVacante = useCallback(async () => {
    try {
      const detalle = await vacantes.detalle(vacanteId);
      setVacante({ titulo: detalle.titulo, postulados: detalle.postulados });
    } catch {
      // Sin el título se muestra solo el número de postulados.
    }
  }, [vacanteId]);

  // Al volver de REC-05 (por ejemplo, tras cambiar un estado) todo se actualiza sin parpadeo.
  useFocusEffect(
    useCallback(() => {
      void cargarVacante();
      void recargarSilencioso();
    }, [cargarVacante, recargarSilencioso]),
  );

  // Anuncia cuántos postulados hay después de cambiar de filtro.
  const total = carga.fase === 'listo' ? carga.total : null;
  const claveConsulta = JSON.stringify(consulta);
  const anunciada = useRef<string | null>(null);
  useEffect(() => {
    if (total === null) return;
    if (anunciada.current !== null && anunciada.current !== claveConsulta) {
      AccessibilityInfo.announceForAccessibility(
        total === 0 ? 'Sin postulados' : cantidadPostulados(total),
      );
    }
    anunciada.current = claveConsulta;
  }, [total, claveConsulta]);

  const limpiarFiltros = () => {
    setEstado(null);
    setMinima(0);
  };

  const sinAcceso = carga.fase === 'error' && carga.error.status === 403;

  const encabezado = (
    <View style={estilos.encabezado}>
      <View style={estilos.titulos}>
        <Texto variante="titulo" accessibilityRole="header" testID="titulo-vacante">
          {vacante?.titulo ?? 'Postulados'}
        </Texto>
        {vacante?.postulados != null ? (
          <Texto variante="cuerpoFuerte" testID="cantidad-postulados">
            {cantidadPostulados(vacante.postulados)}
          </Texto>
        ) : null}
      </View>
      <Texto color="textoSecundarioSobreGris" testID="texto-orden">
        {`${TEXTO_ORDEN} ${TEXTO_SIN_DISCAPACIDAD}`}
      </Texto>
      <FiltroEstado
        estados={ESTADOS_FILTRO}
        valor={estado}
        onChange={setEstado}
        textoDe={textoEstadoPostulacion}
        etiqueta="Filtrar por estado del postulado"
      />
      <Selector
        etiqueta="Compatibilidad mínima"
        opciones={OPCIONES_MINIMA.map((o) => ({ ...o }))}
        valor={minima}
        onChange={setMinima}
        testID="selector-minima"
      />
      {filtrado && carga.fase === 'listo' ? (
        <Texto
          variante="pequeno"
          color="textoSecundarioSobreGris"
          accessibilityLiveRegion="polite"
          testID="resultado-filtro"
        >
          {`Mostrando ${carga.total} ${carga.total === 1 ? 'postulado' : 'postulados'} con estos filtros.`}
        </Texto>
      ) : null}
    </View>
  );

  const vacio =
    carga.fase === 'cargando' ? (
      <Cargando mensaje="Cargando los postulados…" />
    ) : sinAcceso ? (
      <EstadoVacio
        titulo="Esta vacante no es de tu empresa"
        mensaje={(carga as { error: ApiError }).error.detail}
        icono="lock-closed-outline"
        accion={{ titulo: 'Volver a mis vacantes', onPress: () => navigation.goBack() }}
      />
    ) : carga.fase === 'error' ? (
      <EstadoError mensaje={carga.error.detail} onReintentar={lista.reintentar} />
    ) : filtrado ? (
      <EstadoVacio
        titulo="Ningún postulado cumple estos filtros"
        mensaje="Prueba con otro estado o con una compatibilidad mínima menor."
        icono="filter-outline"
        accion={{ titulo: 'Quitar filtros', onPress: limpiarFiltros }}
      />
    ) : (
      <EstadoVacio
        titulo="Aún no hay postulados"
        mensaje="Cuando una persona se postule a esta vacante, la verás aquí."
        icono="people-outline"
      />
    );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['left', 'right', 'bottom']}>
      <FlatList
        testID="lista-postulados"
        data={carga.fase === 'listo' ? carga.items : []}
        keyExtractor={(item) => String(item.postulacion_id)}
        renderItem={({ item }) => (
          <View style={estilos.celda}>
            <TarjetaPostulado
              postulado={item}
              onPress={() => navigation.navigate('DetallePostulado', { id: item.postulacion_id })}
            />
          </View>
        )}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        ListFooterComponent={
          lista.cargandoMas ? (
            <Cargando mensaje="Cargando más postulados…" />
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
              void cargarVacante();
              void lista.refrescar();
            }}
          />
        }
        // Se pintan los 20 de la primera página: son pocos y el lector de pantalla los recorre todos.
        initialNumToRender={20}
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
  titulos: { gap: espaciado.xs },
  celda: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.md },
  pie: { gap: espaciado.sm, padding: espaciado.lg },
});
