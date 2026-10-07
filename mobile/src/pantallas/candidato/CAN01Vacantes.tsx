import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { candidatos, type PerfilCandidato } from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  CampoTexto,
  EstadoError,
  EstadoVacio,
  Texto,
} from '../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../tema';
import { aConsulta, contarFiltros, SIN_FILTROS, type Filtros } from './vacantes/filtros';
import { ModalFiltros } from './vacantes/ModalFiltros';
import { TarjetaVacante } from './vacantes/TarjetaVacante';
import { MINIMO_BUSQUEDA, useBusqueda } from './vacantes/useBusqueda';
import { useListaVacantes } from './vacantes/useListaVacantes';

/** Por qué el chip «Solo las que cubren mis necesidades» no se puede usar; null si se puede. */
export function explicacionChipNecesidades(perfil: PerfilCandidato | null): string | null {
  if (!perfil) return null;
  if (perfil.consentimiento_sensibles_en === null) {
    return 'Para usar este filtro, da tu consentimiento y registra tus necesidades de ajuste en tu perfil.';
  }
  if (perfil.necesidades.length === 0) {
    return 'Aún no registras necesidades de ajuste. Agrégalas en tu perfil para usar este filtro.';
  }
  return null;
}

/** CAN-01: vacantes recomendadas, búsqueda por texto, filtros y «cubre mis necesidades». */
export default function CAN01Vacantes() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const busqueda = useBusqueda();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [soloCubren, setSoloCubren] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [perfil, setPerfil] = useState<PerfilCandidato | null>(null);

  const explicacionChip = explicacionChipNecesidades(perfil);
  const chipDeshabilitado = explicacionChip !== null;
  // Si el perfil cambia y el chip ya no se puede usar, deja de filtrar aunque estuviera marcado.
  const cubrenActivo = soloCubren && !chipDeshabilitado;

  const consulta = useMemo(
    () => aConsulta(busqueda.termino, filtros, cubrenActivo),
    [busqueda.termino, filtros, cubrenActivo],
  );
  const lista = useListaVacantes(consulta);
  const { carga, recargarSilencioso } = lista;

  // Al volver de otra pantalla (CAN-02, Perfil) se actualizan la lista y el perfil sin parpadeo.
  const cargarPerfil = useCallback(() => {
    candidatos
      .obtenerPerfil()
      .then(setPerfil)
      .catch(() => undefined);
  }, []);
  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
      void recargarSilencioso();
    }, [cargarPerfil, recargarSilencioso]),
  );

  const hayCriterios = consulta !== null;
  const totalFiltros = contarFiltros(filtros);

  // Anuncia cuántas vacantes hay después de buscar o filtrar.
  const total = carga.fase === 'listo' ? carga.total : null;
  useEffect(() => {
    if (hayCriterios && total !== null) {
      AccessibilityInfo.announceForAccessibility(
        total === 0
          ? 'No encontramos vacantes con estos filtros'
          : `${total} ${total === 1 ? 'vacante encontrada' : 'vacantes encontradas'}`,
      );
    }
  }, [hayCriterios, total]);

  function quitarFiltros() {
    busqueda.limpiar();
    setFiltros(SIN_FILTROS);
    setSoloCubren(false);
  }

  const mensajeBusqueda =
    busqueda.texto.trim().length > 0 && busqueda.texto.trim().length < MINIMO_BUSQUEDA
      ? `Escribe al menos ${MINIMO_BUSQUEDA} letras para buscar.`
      : undefined;

  const encabezado = (
    <View style={estilos.encabezado}>
      <Texto variante="titulo" accessibilityRole="header">
        Vacantes
      </Texto>

      <CampoTexto
        etiqueta="Buscar vacantes"
        value={busqueda.texto}
        onChangeText={busqueda.setTexto}
        placeholder="Puesto, empresa o palabra clave"
        ayuda={mensajeBusqueda}
        returnKeyType="search"
        onSubmitEditing={busqueda.buscarYa}
        autoCapitalize="none"
        testID="buscador"
      />

      <View style={estilos.acciones}>
        <Boton
          titulo={`Filtros (${totalFiltros})`}
          variante="secundario"
          icono="options-outline"
          onPress={() => setFiltrosAbiertos(true)}
          accessibilityLabel={
            totalFiltros === 0
              ? 'Filtros, ninguno activo'
              : `Filtros, ${totalFiltros} ${totalFiltros === 1 ? 'activo' : 'activos'}`
          }
          accessibilityHint="Abre el panel para filtrar las vacantes"
          style={estilos.botonFiltros}
        />
        <Pressable
          testID="chip-necesidades"
          onPress={() => setSoloCubren((actual) => !actual)}
          disabled={chipDeshabilitado}
          accessibilityRole="checkbox"
          accessibilityLabel="Solo las que cubren mis necesidades"
          accessibilityHint={explicacionChip ?? undefined}
          accessibilityState={{ checked: cubrenActivo, disabled: chipDeshabilitado }}
          style={[
            estilos.chip,
            cubrenActivo && estilos.chipActivo,
            chipDeshabilitado && estilos.chipDeshabilitado,
          ]}
        >
          <Ionicons
            name={cubrenActivo ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={
              chipDeshabilitado
                ? colores.textoSecundarioSobreGris
                : cubrenActivo
                  ? colores.sobrePrimario
                  : colores.primario
            }
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto
            variante="boton"
            style={[
              estilos.textoChip,
              cubrenActivo && { color: colores.sobrePrimario },
              chipDeshabilitado && { color: colores.textoSecundarioSobreGris },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            Solo las que cubren mis necesidades
          </Texto>
        </Pressable>
      </View>

      {explicacionChip ? (
        <View style={estilos.explicacion}>
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            {explicacionChip}
          </Texto>
          <Boton
            titulo="Ir a mi perfil"
            variante="texto"
            onPress={() => navigation.navigate('Perfil')}
            accessibilityHint="Abre tu perfil para registrar tus necesidades de ajuste"
          />
        </View>
      ) : null}

      {perfil && perfil.completitud < 100 ? (
        <View style={estilos.explicacion}>
          <Aviso
            variante="info"
            titulo={`Tu perfil está al ${perfil.completitud} %`}
            mensaje="Completa tu perfil para recibir mejores recomendaciones."
            anunciar={false}
          />
          <Boton
            titulo="Completar mi perfil"
            variante="secundario"
            onPress={() => navigation.navigate('Perfil')}
          />
        </View>
      ) : null}

      <Texto variante="cuerpoFuerte" color="textoSecundarioSobreGris" accessibilityRole="header">
        {hayCriterios ? 'Resultados' : 'Recomendadas para ti'}
      </Texto>
    </View>
  );

  const vacio =
    carga.fase === 'cargando' ? (
      <Cargando mensaje={hayCriterios ? 'Buscando vacantes…' : 'Cargando vacantes…'} />
    ) : carga.fase === 'error' ? (
      <EstadoError mensaje={carga.error.detail} onReintentar={lista.reintentar} />
    ) : hayCriterios ? (
      <EstadoVacio
        titulo="No encontramos vacantes con estos filtros"
        mensaje="Prueba con otras palabras o quita algunos filtros."
        icono="search-outline"
        accion={{ titulo: 'Quitar filtros', onPress: quitarFiltros }}
      />
    ) : (
      <EstadoVacio
        titulo="Por ahora no hay vacantes publicadas"
        mensaje="Vuelve a revisar más tarde."
        icono="briefcase-outline"
      />
    );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <FlatList
        testID="lista-vacantes"
        data={carga.fase === 'listo' ? carga.items : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={estilos.celda}>
            <TarjetaVacante
              vacante={item}
              onPress={() => navigation.navigate('DetalleVacante', { id: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        ListFooterComponent={
          lista.cargandoMas ? (
            <Cargando mensaje="Cargando más vacantes…" />
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

      <ModalFiltros
        visible={filtrosAbiertos}
        filtros={filtros}
        onAplicar={(nuevos) => {
          setFiltros(nuevos);
          setFiltrosAbiertos(false);
        }}
        onCerrar={() => setFiltrosAbiertos(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { paddingBottom: espaciado.xl },
  encabezado: { padding: espaciado.lg, gap: espaciado.md },
  celda: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.md },
  acciones: { gap: espaciado.sm },
  botonFiltros: { alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.completo,
    borderWidth: 2,
    borderColor: colores.primario,
    backgroundColor: colores.fondo,
    alignSelf: 'flex-start',
  },
  chipActivo: { backgroundColor: colores.primario },
  chipDeshabilitado: { borderColor: colores.bordeSuave, backgroundColor: colores.fondoSuave },
  textoChip: { color: colores.primario, flexShrink: 1 },
  explicacion: { gap: espaciado.xs },
  pie: { gap: espaciado.sm, padding: espaciado.lg },
});
