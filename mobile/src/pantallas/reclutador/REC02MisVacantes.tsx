import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
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
  ApiError,
  empresas,
  vacantes,
  type EstadoVacante,
  type VacanteReclutador,
} from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  EstadoVacio,
  FiltroEstado,
  ModalConfirmacion,
  Texto,
  useRetornoFoco,
} from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';
import { colores, espaciado } from '../../tema';
import { useCarga } from '../../utilidades/useCarga';
import { useListaPaginada } from '../../utilidades/useListaPaginada';
import { MenuVacante } from './vacantes/MenuVacante';
import { TarjetaVacante } from './vacantes/TarjetaVacante';
import {
  AVISO_EMPRESA_SIN_VALIDAR,
  CONFIRMACION,
  ESTADOS_FILTRO,
  mensajeAccionHecha,
  textoEstadoVacante,
  type AccionVacante,
} from './vacantes/textosVacantes';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'MisVacantes'>;

interface Consulta {
  estado?: EstadoVacante;
}

const traer = (consulta: Consulta, page: number, size: number) =>
  empresas.misVacantes({ ...consulta, page, size });
const identificar = (vacante: VacanteReclutador) => vacante.id;
const cargarEmpresa = () => empresas.miOrganizacion();

interface Pendiente {
  accion: AccionVacante;
  vacante: VacanteReclutador;
}

/** Texto de un error de publicación: el mensaje del API y, si lo hay, lo que falta. */
function mensajeDeError(fallo: unknown): string {
  const error = ApiError.desde(fallo);
  const faltantes = Object.values(error.campos ?? {});
  return faltantes.length > 0 ? `${error.detail} ${faltantes.join(' ')}` : error.detail;
}

/** REC-02: las vacantes de mi empresa, con filtro por estado y las acciones que permite cada estado. */
export default function REC02MisVacantes(_: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [estado, setEstado] = useState<EstadoVacante | null>(null);
  const consulta = useMemo<Consulta>(() => (estado ? { estado } : {}), [estado]);
  const lista = useListaPaginada(traer, consulta, identificar);
  const { carga, recargarSilencioso } = lista;
  const organizacion = useCarga(cargarEmpresa);
  const { registrar, recordar, devolver } = useRetornoFoco();

  const [menu, setMenu] = useState<VacanteReclutador | null>(null);
  const [confirmar, setConfirmar] = useState<Pendiente | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<{
    variante: 'exito' | 'error';
    mensaje: string;
    n: number;
  }>();
  const elegida = useRef<Pendiente | null>(null);

  // Al volver de REC-03 o de Organización se actualizan la lista y el estado de la empresa.
  const primeraVez = useRef(true);
  const { recargarSilencioso: recargarEmpresa } = organizacion;
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) primeraVez.current = false;
      else {
        void recargarSilencioso();
        void recargarEmpresa();
      }
    }, [recargarSilencioso, recargarEmpresa]),
  );

  const empresaValidada =
    organizacion.estado.fase === 'listo' ? organizacion.estado.datos.estado === 'validada' : true;
  const avisoSinValidar = organizacion.estado.fase === 'listo' && !empresaValidada;

  // Anuncia cuántas vacantes hay después de cambiar de filtro.
  const total = carga.fase === 'listo' ? carga.total : null;
  const claveConsulta = JSON.stringify(consulta);
  const anunciada = useRef<string | null>(null);
  useEffect(() => {
    if (total === null) return;
    if (anunciada.current !== null && anunciada.current !== claveConsulta) {
      AccessibilityInfo.announceForAccessibility(
        total === 0 ? 'Sin vacantes' : `${total} ${total === 1 ? 'vacante' : 'vacantes'}`,
      );
    }
    anunciada.current = claveConsulta;
  }, [total, claveConsulta]);

  const avisar = (variante: 'exito' | 'error', mensaje: string) =>
    setAviso((previo) => ({ variante, mensaje, n: (previo?.n ?? 0) + 1 }));

  function abrirMenu(vacante: VacanteReclutador) {
    recordar(`menu-${vacante.id}`);
    setMenu(vacante);
  }

  function elegirAccion(accion: AccionVacante, vacante: VacanteReclutador) {
    elegida.current = { accion, vacante };
    setMenu(null);
  }

  // Dos diálogos no pueden presentarse a la vez en iOS: lo siguiente espera a que el menú cierre.
  function alCerrarseMenu() {
    const pendiente = elegida.current;
    elegida.current = null;
    if (!pendiente) {
      devolver();
      return;
    }
    if (CONFIRMACION[pendiente.accion]) setConfirmar(pendiente);
    else void ejecutar(pendiente);
  }

  async function ejecutar({ accion, vacante }: Pendiente) {
    if (accion === 'editar') {
      navigation.navigate('EditarVacante', { vacante_id: vacante.id });
      return;
    }
    setTrabajando(true);
    try {
      if (accion === 'duplicar') {
        const copia = await vacantes.duplicar(vacante.id);
        avisar('exito', `Se creó el borrador «${copia.titulo}».`);
      } else {
        const destino = {
          publicar: 'publicada',
          reanudar: 'publicada',
          pausar: 'pausada',
          cerrar: 'cerrada',
        } as const;
        await vacantes.cambiarEstado(vacante.id, destino[accion as keyof typeof destino]);
        avisar('exito', mensajeAccionHecha(accion, vacante.titulo));
      }
      await recargarSilencioso();
    } catch (fallo) {
      avisar('error', mensajeDeError(fallo));
    }
    setTrabajando(false);
    setConfirmar(null);
    devolver();
  }

  const crear = () => navigation.navigate('EditarVacante');

  const encabezado = (
    <View style={estilos.encabezado}>
      <Texto variante="titulo" accessibilityRole="header">
        Mis vacantes
      </Texto>
      {avisoSinValidar ? (
        <View style={estilos.avisoEmpresa}>
          <Aviso
            variante="advertencia"
            mensaje={AVISO_EMPRESA_SIN_VALIDAR}
            testID="aviso-empresa"
          />
          <Boton
            titulo="Ver el estado de mi empresa"
            variante="texto"
            onPress={() => navigation.navigate('Organizacion')}
          />
        </View>
      ) : null}
      {aviso ? (
        <Aviso
          key={aviso.n}
          variante={aviso.variante}
          mensaje={aviso.mensaje}
          testID="aviso-accion"
        />
      ) : null}
      <FiltroEstado
        estados={ESTADOS_FILTRO}
        valor={estado}
        onChange={setEstado}
        textoDe={textoEstadoVacante}
        etiqueta="Filtrar por estado de la vacante"
      />
    </View>
  );

  const vacio =
    carga.fase === 'cargando' ? (
      <Cargando mensaje="Cargando tus vacantes…" />
    ) : carga.fase === 'error' ? (
      <EstadoError mensaje={carga.error.detail} onReintentar={lista.reintentar} />
    ) : estado ? (
      <EstadoVacio
        titulo={`No tienes vacantes en «${textoEstadoVacante(estado)}»`}
        mensaje="Prueba con otro estado."
        icono="filter-outline"
        accion={{ titulo: 'Quitar filtros', onPress: () => setEstado(null) }}
      />
    ) : (
      <EstadoVacio
        titulo="Aún no tienes vacantes"
        mensaje="Crea tu primera vacante para que los candidatos la encuentren."
        icono="briefcase-outline"
        accion={{ titulo: 'Crear vacante', onPress: crear }}
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
              refMenu={registrar(`menu-${item.id}`)}
              onPress={() => navigation.navigate('Postulados', { vacante_id: item.id })}
              onMenu={() => abrirMenu(item)}
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
          <RefreshControl
            refreshing={lista.refrescando}
            onRefresh={() => {
              void recargarEmpresa();
              void lista.refrescar();
            }}
          />
        }
        onEndReached={() => void lista.cargarMas()}
        onEndReachedThreshold={0.5}
        contentContainerStyle={estilos.contenido}
      />

      {/* Barra fija debajo de la lista: no tapa la última tarjeta ni el indicador de inicio. */}
      <View style={estilos.barra}>
        <Boton
          titulo="+ Nueva vacante"
          accessibilityLabel="Nueva vacante"
          accessibilityHint="Abre el formulario para crear una vacante"
          onPress={crear}
          testID="nueva-vacante"
        />
      </View>

      <MenuVacante
        vacante={menu}
        empresaValidada={empresaValidada}
        onElegir={elegirAccion}
        onCancelar={() => setMenu(null)}
        onCerrado={alCerrarseMenu}
      />
      {confirmar && CONFIRMACION[confirmar.accion] ? (
        <ModalConfirmacion
          visible
          titulo={CONFIRMACION[confirmar.accion]!.titulo}
          mensaje={`${confirmar.vacante.titulo}. ${CONFIRMACION[confirmar.accion]!.mensaje}`}
          textoConfirmar={CONFIRMACION[confirmar.accion]!.boton}
          peligro={CONFIRMACION[confirmar.accion]!.peligro}
          cargando={trabajando}
          onConfirmar={() => void ejecutar(confirmar)}
          onCancelar={() => {
            setConfirmar(null);
            devolver();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { paddingBottom: espaciado.lg },
  encabezado: { padding: espaciado.lg, gap: espaciado.md },
  avisoEmpresa: { gap: espaciado.xs },
  celda: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.md },
  pie: { gap: espaciado.sm, padding: espaciado.lg },
  barra: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
