import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, notificaciones, type Notificacion } from '../../api';
import { Aviso, Boton, Cargando, EstadoError, EstadoVacio, Texto } from '../../componentes';
import { useNoLeidas } from '../../navegacion/NoLeidasContext';
import { useSesion } from '../../sesion';
import { AREA_TACTIL_MINIMA, colores, espaciado } from '../../tema';
import { destinoNotificacion } from './notificaciones/destino';
import { ItemNotificacion } from './notificaciones/ItemNotificacion';
import { ModalPreferencias } from './notificaciones/ModalPreferencias';

export const TAMANO_PAGINA = 20;

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; items: Notificacion[]; total: number; pagina: number };

/** MOV-04: lista paginada de notificaciones, con marcar como leída y preferencias de aviso. */
export default function MOV04Notificaciones() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { usuario } = useSesion();
  const { noLeidas, ajustar, establecer, refrescar } = useNoLeidas();
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [preferenciasAbiertas, setPreferenciasAbiertas] = useState(false);
  const [mensaje, setMensaje] = useState<{ variante: 'exito' | 'error'; texto: string } | null>(
    null,
  );

  const traerPrimeraPagina = useCallback(async (): Promise<Carga> => {
    try {
      const pagina = await notificaciones.listar({ page: 1, size: TAMANO_PAGINA });
      return { fase: 'listo', items: pagina.items, total: pagina.total, pagina: 1 };
    } catch (fallo) {
      return { fase: 'error', error: ApiError.desde(fallo) };
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    void traerPrimeraPagina().then((resultado) => {
      if (vigente) setCarga(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [traerPrimeraPagina]);

  async function reintentar() {
    setCarga({ fase: 'cargando' });
    setCarga(await traerPrimeraPagina());
  }

  async function actualizar() {
    setRefrescando(true);
    setErrorMas(null);
    setCarga(await traerPrimeraPagina());
    refrescar();
    setRefrescando(false);
  }

  async function cargarMas() {
    if (carga.fase !== 'listo' || cargandoMas || errorMas || carga.items.length >= carga.total) {
      return;
    }
    setCargandoMas(true);
    try {
      const siguiente = carga.pagina + 1;
      const pagina = await notificaciones.listar({ page: siguiente, size: TAMANO_PAGINA });
      setCarga((actual) => {
        if (actual.fase !== 'listo') return actual;
        const conocidos = new Set(actual.items.map((n) => n.id));
        const nuevos = pagina.items.filter((n) => !conocidos.has(n.id));
        return {
          ...actual,
          items: [...actual.items, ...nuevos],
          total: pagina.total,
          pagina: siguiente,
        };
      });
    } catch (fallo) {
      setErrorMas(ApiError.desde(fallo).detail);
    } finally {
      setCargandoMas(false);
    }
  }

  function cambiarLeida(id: number, leida: boolean) {
    setCarga((actual) =>
      actual.fase === 'listo'
        ? { ...actual, items: actual.items.map((n) => (n.id === id ? { ...n, leida } : n)) }
        : actual,
    );
  }

  function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) {
      // Se marca al instante (lista y contador) y se confirma con el API en segundo plano.
      cambiarLeida(notificacion.id, true);
      ajustar(-1);
      notificaciones
        .marcarLeida(notificacion.id)
        .then(() => refrescar())
        .catch(() => {
          cambiarLeida(notificacion.id, false);
          refrescar();
        });
    }
    const destino = usuario ? destinoNotificacion(usuario.rol, notificacion.referencia) : null;
    if (destino) navigation.navigate(destino.pantalla, destino.params);
  }

  async function marcarTodas() {
    setMarcandoTodas(true);
    setMensaje(null);
    try {
      await notificaciones.marcarTodasLeidas();
      setCarga((actual) =>
        actual.fase === 'listo'
          ? { ...actual, items: actual.items.map((n) => ({ ...n, leida: true })) }
          : actual,
      );
      establecer(0);
      AccessibilityInfo.announceForAccessibility('Todas las notificaciones quedaron como leídas');
    } catch (fallo) {
      setMensaje({ variante: 'error', texto: ApiError.desde(fallo).detail });
    } finally {
      setMarcandoTodas(false);
    }
  }

  function cerrarPreferencias(guardadas: boolean) {
    setPreferenciasAbiertas(false);
    if (guardadas) setMensaje({ variante: 'exito', texto: 'Preferencias guardadas' });
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <View style={estilos.encabezado}>
        <Texto variante="titulo" accessibilityRole="header" style={estilos.titulo}>
          Notificaciones
        </Texto>
        <Pressable
          onPress={() => {
            setMensaje(null);
            setPreferenciasAbiertas(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Preferencias de notificaciones"
          style={estilos.engrane}
        >
          <Ionicons
            name="settings-outline"
            size={26}
            color={colores.primario}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>

      <View style={estilos.acciones}>
        {mensaje ? <Aviso variante={mensaje.variante} mensaje={mensaje.texto} /> : null}
        <Boton
          titulo="Marcar todas como leídas"
          icono="checkmark-done-outline"
          variante="secundario"
          cargando={marcandoTodas}
          deshabilitado={noLeidas === 0}
          onPress={() => void marcarTodas()}
        />
      </View>

      {carga.fase === 'cargando' ? <Cargando mensaje="Cargando notificaciones…" /> : null}
      {carga.fase === 'error' ? (
        <EstadoError mensaje={carga.error.detail} onReintentar={() => void reintentar()} />
      ) : null}
      {carga.fase === 'listo' ? (
        <FlatList
          testID="lista-notificaciones"
          data={carga.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ItemNotificacion
              notificacion={item}
              tieneDestino={
                usuario ? destinoNotificacion(usuario.rol, item.referencia) !== null : false
              }
              onPress={() => abrir(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={() => void actualizar()} />
          }
          onEndReached={() => void cargarMas()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EstadoVacio titulo="No tienes notificaciones" icono="notifications-off-outline" />
          }
          ListFooterComponent={
            cargandoMas ? (
              <Cargando mensaje="Cargando más…" />
            ) : errorMas ? (
              <View style={estilos.pie}>
                <Aviso variante="error" mensaje={errorMas} />
                <Boton
                  titulo="Reintentar"
                  variante="secundario"
                  icono="refresh"
                  onPress={() => {
                    setErrorMas(null);
                    void cargarMas();
                  }}
                />
              </View>
            ) : null
          }
          contentContainerStyle={carga.items.length === 0 ? estilos.vacio : undefined}
        />
      ) : null}

      <ModalPreferencias visible={preferenciasAbiertas} onCerrar={cerrarPreferencias} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.lg,
    gap: espaciado.sm,
  },
  titulo: { flex: 1 },
  engrane: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acciones: { gap: espaciado.sm, padding: espaciado.lg },
  vacio: { flexGrow: 1, justifyContent: 'center' },
  pie: { gap: espaciado.sm, padding: espaciado.lg },
});
