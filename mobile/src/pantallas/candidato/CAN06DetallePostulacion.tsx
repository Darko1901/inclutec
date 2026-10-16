import { setStringAsync } from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ApiError,
  entrevistas,
  horarios as servicioHorarios,
  postulaciones,
  type Horario,
  type PostulacionDetalle,
} from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  ChipEstado,
  EstadoError,
  ESTADOS,
  LogoEmpresa,
  ModalConfirmacion,
  Texto,
  useRetornoFoco,
} from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { AREA_TACTIL_MINIMA, colores, espaciado } from '../../tema';
import { formatearFechaCorta, formatearFechaLarga } from '../../utilidades/fechas';
import { LineaTiempo } from './postulaciones/LineaTiempo';
import { SeccionHorarios, type CargaHorarios } from './postulaciones/SeccionHorarios';
import { TarjetaEntrevista } from './postulaciones/TarjetaEntrevista';
import { descripcionHorario, TEXTO_HORARIO_OCUPADO } from './postulaciones/textosEntrevista';

type Props = NativeStackScreenProps<RootStackParamList, 'DetallePostulacion'>;

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; detalle: PostulacionDetalle };

type Mensaje = { variante: 'exito' | 'info' | 'error'; texto: string };
type Confirmacion =
  { tipo: 'agendar'; horario: Horario } | { tipo: 'cancelar' } | { tipo: 'retirar' } | null;

/** CAN-06: línea de tiempo de la postulación, horarios para agendar, entrevista y retiro. */
export default function CAN06DetallePostulacion({ route, navigation }: Props) {
  const { id } = route.params;
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [cargaHorarios, setCargaHorarios] = useState<CargaHorarios>({ fase: 'cargando' });
  const [recargaHorarios, setRecargaHorarios] = useState(0);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [enviando, setEnviando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const { registrar, recordar, devolver } = useRetornoFoco();

  const detalle = carga.fase === 'listo' ? carga.detalle : null;
  const vacanteId = detalle?.vacante.id ?? null;
  const necesitaHorarios =
    detalle !== null && detalle.estado === 'entrevista' && !detalle.entrevista;

  useEffect(() => {
    let vigente = true;
    postulaciones
      .detalle(id)
      .then((resultado) => {
        if (vigente) setCarga({ fase: 'listo', detalle: resultado });
      })
      .catch((fallo: unknown) => {
        if (vigente) setCarga({ fase: 'error', error: ApiError.desde(fallo) });
      });
    return () => {
      vigente = false;
    };
  }, [id, intento]);

  // Los horarios solo se piden cuando hace falta elegir uno.
  useEffect(() => {
    if (!necesitaHorarios || vacanteId === null) return undefined;
    let vigente = true;
    servicioHorarios
      .disponibles(vacanteId)
      .then((lista) => {
        if (vigente) setCargaHorarios({ fase: 'listo', horarios: lista });
      })
      .catch((fallo: unknown) => {
        if (vigente) setCargaHorarios({ fase: 'error', detail: ApiError.desde(fallo).detail });
      });
    return () => {
      vigente = false;
    };
  }, [necesitaHorarios, vacanteId, recargaHorarios]);

  function reintentar() {
    setCarga({ fase: 'cargando' });
    setIntento((actual) => actual + 1);
  }

  function recargarHorarios() {
    setCargaHorarios({ fase: 'cargando' });
    setRecargaHorarios((actual) => actual + 1);
  }

  /** Vuelve a pedir la postulación sin mostrar «Cargando…»; si falla, se queda lo que se veía. */
  const recargarDetalle = useCallback(async () => {
    try {
      setCarga({ fase: 'listo', detalle: await postulaciones.detalle(id) });
    } catch {
      // Se queda lo que ya se veía.
    }
  }, [id]);

  async function refrescar() {
    setRefrescando(true);
    await recargarDetalle();
    recargarHorarios();
    setRefrescando(false);
  }

  function pedirConfirmacion(siguiente: NonNullable<Confirmacion>, clave: string) {
    setMensaje(null);
    recordar(clave);
    setConfirmacion(siguiente);
  }

  function descartarConfirmacion() {
    setConfirmacion(null);
    devolver();
  }

  function avisar(variante: Mensaje['variante'], texto: string) {
    setMensaje({ variante, texto });
  }

  async function abrirLiga(liga: string) {
    try {
      await Linking.openURL(liga);
    } catch {
      avisar('error', 'No pudimos abrir la liga. Cópiala y ábrela en tu navegador.');
    }
  }

  async function copiarLiga(liga: string) {
    try {
      await setStringAsync(liga);
      avisar('exito', 'Liga copiada.');
    } catch {
      avisar('error', 'No pudimos copiar la liga. Intenta de nuevo.');
    }
  }

  async function agendar(horario: Horario) {
    setEnviando(true);
    try {
      const entrevista = await postulaciones.agendarEntrevista(id, horario.id);
      setConfirmacion(null);
      setCarga((actual) =>
        actual.fase === 'listo'
          ? { fase: 'listo', detalle: { ...actual.detalle, entrevista } }
          : actual,
      );
      avisar('exito', 'Listo, tu entrevista quedó agendada.');
      devolver('entrevista');
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setConfirmacion(null);
      if (error.codigo === 'horario_ocupado') {
        avisar('error', TEXTO_HORARIO_OCUPADO);
        recargarHorarios();
        devolver('horarios');
      } else {
        avisar('error', error.detail);
        if (error.codigo === 'estado_invalido') await recargarDetalle();
        else devolver('horarios');
      }
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarEntrevista(entrevistaId: number) {
    setEnviando(true);
    try {
      await entrevistas.cancelar(entrevistaId);
      setConfirmacion(null);
      await recargarDetalle();
      recargarHorarios();
      avisar('exito', 'Cancelaste tu entrevista. Elige otro horario cuando quieras.');
      devolver('horarios');
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setConfirmacion(null);
      // Con 409 cancelacion_tardia se vuelve a pedir la postulación: el botón deja de aparecer.
      avisar('error', error.detail);
      await recargarDetalle();
      devolver('entrevista');
    } finally {
      setEnviando(false);
    }
  }

  async function retirar() {
    setEnviando(true);
    try {
      const retirada = await postulaciones.retirar(id);
      setConfirmacion(null);
      setCarga({ fase: 'listo', detalle: retirada });
      avisar('exito', 'Retiraste tu postulación. Ya no aparece entre las activas.');
      devolver('estado');
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setConfirmacion(null);
      avisar('error', error.detail);
      if (error.codigo === 'transicion_invalida') await recargarDetalle();
      devolver('estado');
    } finally {
      setEnviando(false);
    }
  }

  if (carga.fase === 'cargando') {
    return (
      <View style={estilos.pantalla}>
        <Cargando mensaje="Cargando tu postulación…" />
      </View>
    );
  }
  if (carga.fase === 'error') {
    return (
      <View style={estilos.pantalla}>
        <EstadoError mensaje={carga.error.detail} onReintentar={reintentar} />
      </View>
    );
  }

  const { vacante } = carga.detalle;
  const entrevista = carga.detalle.entrevista;
  const agendada = entrevista?.estado === 'agendada' ? entrevista : null;

  return (
    <View style={estilos.pantalla}>
      {mensaje ? (
        <View style={estilos.mensaje}>
          <Aviso variante={mensaje.variante} mensaje={mensaje.texto} />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={estilos.contenido}
        testID="detalle-postulacion"
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} />
        }
      >
        <View style={estilos.encabezado}>
          <Texto variante="titulo" accessibilityRole="header">
            {vacante.titulo}
          </Texto>
          <Boton
            titulo="Ver vacante"
            icono="briefcase-outline"
            variante="secundario"
            onPress={() => navigation.navigate('DetalleVacante', { id: vacante.id })}
            accessibilityHint="Abre el detalle de la vacante"
            style={estilos.botonVacante}
          />
          <Pressable
            onPress={() => navigation.navigate('FichaEmpresa', { id: vacante.empresa.id })}
            accessibilityRole="button"
            accessibilityLabel={vacante.empresa.nombre_comercial}
            accessibilityHint="Abre la ficha de la empresa"
            style={estilos.empresa}
            testID="abrir-empresa"
          >
            <LogoEmpresa
              logoUrl={vacante.empresa.logo_url}
              nombre={vacante.empresa.nombre_comercial}
            />
            <Texto variante="subtitulo" color="primario" style={estilos.subrayado}>
              {vacante.empresa.nombre_comercial}
            </Texto>
          </Pressable>
          <View
            ref={registrar('estado')}
            accessible
            accessibilityLabel={`Estado: ${ESTADOS.postulacion[carga.detalle.estado].texto}. Te postulaste el ${formatearFechaLarga(carga.detalle.creado_en)}`}
            style={estilos.estado}
            testID="estado-postulacion"
          >
            <View {...ocultarTodo}>
              <ChipEstado tipo="postulacion" estado={carga.detalle.estado} />
            </View>
            <Texto variante="pequeno" color="textoSecundarioSobreGris" {...ocultar}>
              {`Te postulaste el ${formatearFechaCorta(carga.detalle.creado_en)}`}
            </Texto>
          </View>
        </View>

        <View style={estilos.seccion}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Historial
          </Texto>
          <LineaTiempo historial={carga.detalle.historial} />
        </View>

        {entrevista ? (
          <TarjetaEntrevista
            entrevista={entrevista}
            refTitulo={registrar('entrevista')}
            refCancelar={registrar('cancelar')}
            onAbrirLiga={() => void abrirLiga(entrevista.liga)}
            onCopiarLiga={() => void copiarLiga(entrevista.liga)}
            onCancelar={() => pedirConfirmacion({ tipo: 'cancelar' }, 'cancelar')}
          />
        ) : null}

        {necesitaHorarios ? (
          <SeccionHorarios
            carga={cargaHorarios}
            onAgendar={(horario) =>
              pedirConfirmacion({ tipo: 'agendar', horario }, `agendar-${horario.id}`)
            }
            onReintentar={recargarHorarios}
            referenciaBoton={(horarioId) => registrar(`agendar-${horarioId}`)}
            referenciaTitulo={registrar('horarios')}
          />
        ) : null}

        {carga.detalle.puede_retirar ? (
          <Boton
            ref={registrar('retirar')}
            titulo="Retirar postulación"
            icono="arrow-undo-outline"
            variante="secundario"
            onPress={() => pedirConfirmacion({ tipo: 'retirar' }, 'retirar')}
            accessibilityHint="Te pedirá confirmar antes de retirarla"
            testID="retirar-postulacion"
          />
        ) : null}
        <SafeAreaView edges={['bottom']} />
      </ScrollView>

      <ModalConfirmacion
        visible={confirmacion?.tipo === 'agendar'}
        titulo="¿Agendar esta entrevista?"
        mensaje={
          confirmacion?.tipo === 'agendar'
            ? `${descripcionHorario(confirmacion.horario.inicio, confirmacion.horario.duracion_min)}. Le avisaremos a la empresa.`
            : ''
        }
        textoConfirmar="Sí, agendar"
        textoCancelar="Volver"
        cargando={enviando}
        onConfirmar={() => confirmacion?.tipo === 'agendar' && void agendar(confirmacion.horario)}
        onCancelar={descartarConfirmacion}
      />
      <ModalConfirmacion
        visible={confirmacion?.tipo === 'cancelar'}
        titulo="¿Cancelar la entrevista?"
        mensaje="El horario quedará libre y le avisaremos a la empresa. Después podrás elegir otro horario."
        textoConfirmar="Sí, cancelar entrevista"
        textoCancelar="No, conservarla"
        peligro
        cargando={enviando}
        onConfirmar={() => agendada && void cancelarEntrevista(agendada.id)}
        onCancelar={descartarConfirmacion}
      />
      <ModalConfirmacion
        visible={confirmacion?.tipo === 'retirar'}
        titulo="¿Retirar tu postulación?"
        mensaje={
          agendada
            ? `Dejarás de participar en «${vacante.titulo}». También se cancelará tu entrevista del ${descripcionHorario(agendada.inicio, agendada.duracion_min)} y el horario quedará libre.`
            : `Dejarás de participar en «${vacante.titulo}». Esta acción no se puede deshacer.`
        }
        textoConfirmar="Sí, retirar"
        textoCancelar="No, conservarla"
        peligro
        cargando={enviando}
        onConfirmar={() => void retirar()}
        onCancelar={descartarConfirmacion}
      />
    </View>
  );
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const ocultarTodo = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  mensaje: { padding: espaciado.lg, paddingBottom: 0 },
  contenido: { padding: espaciado.lg, gap: espaciado.xl },
  encabezado: { gap: espaciado.sm },
  botonVacante: { alignSelf: 'flex-start' },
  empresa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    alignSelf: 'flex-start',
  },
  subrayado: { textDecorationLine: 'underline', flexShrink: 1 },
  estado: { gap: espaciado.xs },
  seccion: { gap: espaciado.md },
});
