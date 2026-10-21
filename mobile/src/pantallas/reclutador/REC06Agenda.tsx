import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, empresas, entrevistas, horarios, type DiaAgenda } from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  EstadoVacio,
  ModalConfirmacion,
  Selector,
  Texto,
  useRetornoFoco,
} from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';
import { colores, espaciado } from '../../tema';
import {
  etiquetaDia,
  formatearFechaCorta,
  formatearFechaLarga,
  hoyEnMexico,
  sumarDias,
} from '../../utilidades/fechas';
import { useCarga } from '../../utilidades/useCarga';
import { abrirLiga, copiarLiga } from '../compartidas/ligas';
import { ModalCancelarEntrevista } from './agenda/ModalCancelarEntrevista';
import { ModalPublicarHorarios } from './agenda/ModalPublicarHorarios';
import {
  TarjetaHorario,
  horaDeInicio,
  type AccionHorario,
  type HorarioAgenda,
} from './agenda/TarjetaHorario';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'Agenda'>;

const DIAS_INICIALES = 30;
const PASO_DIAS = 30;
const TODAS = 0;

interface Mensaje {
  variante: 'exito' | 'error';
  texto: string;
  n: number;
}

interface Pendiente {
  accion: AccionHorario;
  horario: HorarioAgenda;
}

const CONFIRMACIONES: Record<
  Exclude<AccionHorario, 'cancelar'>,
  { titulo: string; mensaje: string; boton: string; hecho: string; peligro?: boolean }
> = {
  eliminar: {
    titulo: '¿Eliminar este horario?',
    mensaje: 'Los candidatos dejarán de verlo. Esta acción no se puede deshacer.',
    boton: 'Eliminar horario',
    hecho: 'Horario eliminado.',
    peligro: true,
  },
  realizada: {
    titulo: '¿Marcar la entrevista como realizada?',
    mensaje: 'Registrarás que la entrevista sí se llevó a cabo.',
    boton: 'Marcar como realizada',
    hecho: 'Entrevista marcada como realizada.',
  },
  no_asistio: {
    titulo: '¿Registrar que el candidato no asistió?',
    mensaje: 'Registrarás que la persona no se presentó a la entrevista.',
    boton: 'Registrar que no asistió',
    hecho: 'Se registró que el candidato no asistió.',
  },
};

/** REC-06: horarios libres y entrevistas agendadas por día, con publicar, eliminar, resultado y cancelar. */
export default function REC06Agenda({ route, navigation: tab }: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [hoy] = useState(() => hoyEnMexico());
  const [vacanteId, setVacanteId] = useState(TODAS);
  const [dias, setDias] = useState(DIAS_INICIALES);
  const [ahora, setAhora] = useState(() => Date.now());
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>();
  const [publicando, setPublicando] = useState(false);
  const [vacanteInicial, setVacanteInicial] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<Pendiente | null>(null);
  const [cancelar, setCancelar] = useState<HorarioAgenda | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const { registrar, recordar, devolver } = useRetornoFoco();

  const hasta = sumarDias(hoy, dias);
  const cargarAgenda = useCallback(
    () =>
      entrevistas.miAgenda({
        hasta,
        ...(vacanteId !== TODAS ? { vacante_id: vacanteId } : {}),
      }),
    [hasta, vacanteId],
  );
  const { estado, recargar, recargarSilencioso } = useCarga(cargarAgenda);
  const cargarVacantes = useCallback(() => empresas.misVacantes({ size: 100 }), []);
  const vacantes = useCarga(cargarVacantes);

  // El reloj avanza para habilitar «Marcar como realizada» sin tener que salir de la pantalla.
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Al volver a la pestaña (por ejemplo, tras publicar horarios desde otra pantalla) se actualiza.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      setAhora(Date.now());
      if (primeraVez.current) primeraVez.current = false;
      else void recargarSilencioso();
    }, [recargarSilencioso]),
  );

  // Desde REC-05: «Publicar horarios» abre el formulario con esa vacante.
  const solicitada = route.params?.publicar_vacante_id;
  const formularioAbierto = publicando || solicitada !== undefined;

  function cerrarFormulario() {
    setPublicando(false);
    if (solicitada !== undefined) tab.setParams({ publicar_vacante_id: undefined });
    devolver();
  }

  const avisar = (variante: Mensaje['variante'], texto: string) =>
    setMensaje((previo) => ({ variante, texto, n: (previo?.n ?? 0) + 1 }));

  function pedirAccion(accion: AccionHorario, horario: HorarioAgenda) {
    recordar(`accion-${horario.id}`);
    if (accion === 'cancelar') setCancelar(horario);
    else setConfirmar({ accion, horario });
  }

  async function ejecutar({ accion, horario }: Pendiente) {
    if (accion === 'cancelar') return;
    setTrabajando(true);
    try {
      if (accion === 'eliminar') {
        await horarios.eliminar(horario.id);
      } else if (horario.entrevista) {
        await entrevistas.registrarResultado(horario.entrevista.id, {
          estado: accion,
          motivo_cancelacion: null,
        });
      }
      avisar('exito', CONFIRMACIONES[accion].hecho);
      await recargarSilencioso();
    } catch (fallo) {
      avisar('error', ApiError.desde(fallo).detail);
    }
    setTrabajando(false);
    setConfirmar(null);
    devolver();
  }

  async function refrescar() {
    setRefrescando(true);
    await recargarSilencioso();
    setRefrescando(false);
  }

  function verMasDias() {
    setDias((actual) => actual + PASO_DIAS);
    AccessibilityInfo.announceForAccessibility(
      `Se muestran los próximos ${dias + PASO_DIAS} días.`,
    );
  }

  const abrirPublicar = () => {
    setVacanteInicial(vacanteId !== TODAS ? vacanteId : null);
    setPublicando(true);
  };

  const opcionesVacante = [
    { id: TODAS, nombre: 'Todas las vacantes' },
    ...(vacantes.estado.fase === 'listo'
      ? vacantes.estado.datos.items.map(({ id, titulo }) => ({ id, nombre: titulo }))
      : []),
  ];

  const encabezado = (
    <View style={estilos.encabezado}>
      <Texto variante="titulo" accessibilityRole="header">
        Agenda
      </Texto>
      <Texto color="textoSecundarioSobreGris" testID="rango-agenda">
        {`De hoy al ${formatearFechaCorta(`${hasta}`)}. Hora de la Ciudad de México.`}
      </Texto>
      {mensaje ? (
        <Aviso
          key={mensaje.n}
          variante={mensaje.variante}
          mensaje={mensaje.texto}
          testID="aviso-agenda"
        />
      ) : null}
      <Selector
        etiqueta="Vacante"
        opciones={opcionesVacante}
        valor={vacanteId}
        onChange={setVacanteId}
        testID="filtro-vacante"
      />
    </View>
  );

  const lista: DiaAgenda[] = estado.fase === 'listo' ? estado.datos : [];
  const vacio =
    estado.fase === 'cargando' ? (
      <Cargando mensaje="Cargando tu agenda…" />
    ) : estado.fase === 'error' ? (
      <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
    ) : (
      <EstadoVacio
        titulo="No tienes entrevistas en estos días"
        mensaje="Publica horarios para que los candidatos en «Entrevista» elijan uno."
        icono="calendar-outline"
        accion={{ titulo: 'Publicar horarios', onPress: abrirPublicar }}
      />
    );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <FlatList
        testID="lista-agenda"
        data={lista}
        keyExtractor={(dia) => dia.fecha}
        renderItem={({ item: dia }) => {
          const primero = dia.horarios[0];
          return (
            <View style={estilos.dia} testID={`dia-${dia.fecha}`}>
              <Texto
                variante="subtitulo"
                accessibilityRole="header"
                accessibilityLabel={`${etiquetaDia(primero.inicio)}, ${formatearFechaLarga(primero.inicio)}`}
              >
                {etiquetaDia(primero.inicio)}
              </Texto>
              {dia.horarios.map((horario) => (
                <TarjetaHorario
                  key={horario.id}
                  horario={horario}
                  ahora={ahora}
                  refAccion={registrar(`accion-${horario.id}`)}
                  onAccion={pedirAccion}
                  onAbrirCandidato={(id) => navigation.navigate('DetallePostulado', { id })}
                  onAbrirLiga={(liga) =>
                    void abrirLiga(liga).then((error) => error && avisar('error', error))
                  }
                  onCopiarLiga={(liga) =>
                    void copiarLiga(liga).then((error) =>
                      error ? avisar('error', error) : avisar('exito', 'Liga copiada.'),
                    )
                  }
                />
              ))}
            </View>
          );
        }}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        ListFooterComponent={
          estado.fase === 'listo' ? (
            <View style={estilos.pie}>
              <Boton
                titulo="Ver más días"
                icono="chevron-down-outline"
                variante="secundario"
                accessibilityHint={`Muestra ${PASO_DIAS} días más`}
                onPress={verMasDias}
                testID="ver-mas-dias"
              />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} />
        }
        contentContainerStyle={estilos.contenido}
      />

      {/* Barra fija debajo de la lista: no tapa la última tarjeta ni el indicador de inicio. */}
      <View style={estilos.barra}>
        <Boton
          titulo="+ Publicar horarios"
          accessibilityLabel="Publicar horarios"
          accessibilityHint="Abre el formulario para ofrecer horarios de entrevista"
          onPress={abrirPublicar}
          testID="publicar-horarios"
        />
      </View>

      {confirmar && confirmar.accion !== 'cancelar' ? (
        <ModalConfirmacion
          visible
          titulo={CONFIRMACIONES[confirmar.accion].titulo}
          mensaje={`${CONFIRMACIONES[confirmar.accion].mensaje} (${horaDeInicio(confirmar.horario)}, ${confirmar.horario.vacante.titulo})`}
          textoConfirmar={CONFIRMACIONES[confirmar.accion].boton}
          peligro={CONFIRMACIONES[confirmar.accion].peligro}
          cargando={trabajando}
          onConfirmar={() => void ejecutar(confirmar)}
          onCancelar={() => {
            setConfirmar(null);
            devolver();
          }}
        />
      ) : null}
      {cancelar?.entrevista ? (
        <ModalCancelarEntrevista
          entrevistaId={cancelar.entrevista.id}
          candidato={`${cancelar.entrevista.candidato.nombre} ${cancelar.entrevista.candidato.apellidos}`}
          onCerrar={() => {
            setCancelar(null);
            devolver();
          }}
          onCancelada={() => {
            setCancelar(null);
            avisar('exito', 'Entrevista cancelada. Avisamos al candidato.');
            void recargarSilencioso();
            devolver();
          }}
        />
      ) : null}
      {formularioAbierto ? (
        <ModalPublicarHorarios
          vacanteInicial={publicando ? vacanteInicial : (solicitada ?? null)}
          onCerrar={cerrarFormulario}
          onPublicados={(cantidad) => {
            avisar(
              'exito',
              cantidad === 1 ? 'Se publicó 1 horario.' : `Se publicaron ${cantidad} horarios.`,
            );
            void recargarSilencioso();
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
  dia: { paddingHorizontal: espaciado.lg, paddingBottom: espaciado.md, gap: espaciado.md },
  pie: { padding: espaciado.lg },
  barra: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
