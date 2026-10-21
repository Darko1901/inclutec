import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { entrevistas, postulaciones, type PostuladoDetalle } from '../../api';
import {
  Aviso,
  Avatar,
  Boton,
  Cargando,
  ChipEstado,
  EstadoError,
  Tarjeta,
  Texto,
  useRetornoFoco,
} from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { AREA_TACTIL_MINIMA, colores, espaciado } from '../../tema';
import { formatearFechaCorta } from '../../utilidades/fechas';
import { useCarga } from '../../utilidades/useCarga';
import { ModalReporte } from '../candidato/detalle/ModalReporte';
import { LineaTiempo } from '../candidato/postulaciones/LineaTiempo';
import { CvCandidato } from '../compartidas/CvCandidato';
import { abrirLiga, copiarLiga } from '../compartidas/ligas';
import { DesgloseCompatibilidad } from './postulado/DesgloseCompatibilidad';
import { MenuPostulado } from './postulado/MenuPostulado';
import { ModalCambiarEstado } from './postulado/ModalCambiarEstado';
import { SeccionContacto } from './postulado/SeccionContacto';
import { SeccionNecesidades } from './postulado/SeccionNecesidades';
import { SeccionObservaciones } from './postulado/SeccionObservaciones';
import { TarjetaEntrevistaPostulado } from './postulado/TarjetaEntrevistaPostulado';
import { MENSAJE_REPORTE } from './postulado/textosPostulado';
import { textoCompatibilidad, textoEstadoPostulacion } from './postulados/textosPostulados';

type Props = NativeStackScreenProps<RootStackParamList, 'DetallePostulado'>;

interface Datos {
  detalle: PostuladoDetalle;
  observaciones: Awaited<ReturnType<typeof postulaciones.observaciones>>;
}

interface Mensaje {
  variante: 'exito' | 'error' | 'advertencia';
  texto: string;
  n: number;
}

/** REC-05: CV, desglose, necesidades compartidas, contacto, cambio de estado y observaciones. */
export default function REC05DetallePostulado({ route, navigation }: Props) {
  const { id } = route.params;
  const cargar = useCallback(async (): Promise<Datos> => {
    const [detalle, observaciones] = await Promise.all([
      postulaciones.detallePostulado(id),
      postulaciones.observaciones(id),
    ]);
    return { detalle, observaciones };
  }, [id]);
  const { estado, recargar, recargarSilencioso } = useCarga(cargar);
  const { registrar, recordar, devolver } = useRetornoFoco();

  const [menu, setMenu] = useState(false);
  const [reportando, setReportando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>();
  const [sinHorarios, setSinHorarios] = useState<number | null>(null);
  const abrirReporte = useRef(false);

  const avisar = (variante: Mensaje['variante'], texto: string) =>
    setMensaje((previo) => ({ variante, texto, n: (previo?.n ?? 0) + 1 }));

  // Dos ventanas no pueden presentarse a la vez en iOS: el reporte espera a que cierre el menú.
  function alCerrarseMenu() {
    if (abrirReporte.current) {
      abrirReporte.current = false;
      setReportando(true);
    } else {
      devolver();
    }
  }

  if (estado.fase === 'cargando') {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <Cargando mensaje="Cargando el postulado…" />
      </SafeAreaView>
    );
  }
  if (estado.fase === 'error') {
    const sinPermiso = estado.error.status === 403 || estado.error.status === 404;
    return (
      <SafeAreaView style={estilos.pantalla}>
        <EstadoError
          titulo={sinPermiso ? 'No encontramos este postulado' : undefined}
          mensaje={estado.error.detail}
          onReintentar={sinPermiso ? () => navigation.goBack() : () => void recargar()}
        />
      </SafeAreaView>
    );
  }

  const { detalle, observaciones } = estado.datos;
  const { candidato, postulacion } = detalle;
  const nombre = `${candidato.nombre} ${candidato.apellidos}`;
  const permitidos = detalle.transiciones_permitidas;

  /** Al pasar a «entrevista», avisa si la vacante no tiene horarios libres que ofrecer. */
  async function comprobarHorarios() {
    try {
      const dias = await entrevistas.miAgenda({ vacante_id: detalle.vacante.id });
      const hayLibres = dias.some((d) => d.horarios.some((h) => h.estado === 'libre'));
      setSinHorarios(hayLibres ? null : detalle.vacante.id);
    } catch {
      setSinHorarios(null);
    }
  }

  return (
    <SafeAreaView style={estilos.pantalla} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.contenido} testID="detalle-postulado">
        <View style={estilos.encabezado}>
          <Avatar
            fotoUrl={candidato.foto_url}
            nombre={candidato.nombre}
            apellidos={candidato.apellidos}
            tamano={64}
          />
          <View style={estilos.titulos}>
            <Texto variante="titulo" accessibilityRole="header" testID="nombre-postulado">
              {nombre}
            </Texto>
            <Texto variante="cuerpoFuerte" testID="compatibilidad-postulado">
              {textoCompatibilidad(detalle.compatibilidad.puntaje)}
            </Texto>
          </View>
          <Pressable
            ref={registrar('menu')}
            testID="menu-postulado-boton"
            onPress={() => {
              recordar('menu');
              setMenu(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Más opciones del perfil de ${nombre}`}
            accessibilityHint="Abre las opciones, como reportar el perfil"
            style={estilos.menu}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={colores.primario}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>
        <View style={estilos.estado}>
          <ChipEstado tipo="postulacion" estado={postulacion.estado} testID="estado-postulado" />
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            {`Postulado a «${detalle.vacante.titulo}» el ${formatearFechaCorta(postulacion.creado_en)}`}
          </Texto>
        </View>

        {mensaje ? (
          <Aviso
            key={mensaje.n}
            variante={mensaje.variante}
            mensaje={mensaje.texto}
            testID="aviso-postulado"
          />
        ) : null}
        {sinHorarios !== null ? (
          <View style={estilos.sinHorarios} testID="aviso-sin-horarios">
            <Aviso
              variante="advertencia"
              mensaje="Esta vacante no tiene horarios libres. Publícalos para que el candidato pueda elegir uno."
            />
            <Boton
              titulo="Publicar horarios"
              icono="calendar-outline"
              onPress={() =>
                navigation.navigate('ReclutadorTabs', {
                  screen: 'Agenda',
                  params: { publicar_vacante_id: sinHorarios },
                })
              }
              testID="ir-a-agenda"
            />
          </View>
        ) : null}

        {permitidos.length > 0 ? (
          <Boton
            ref={registrar('cambiar-estado')}
            titulo="Cambiar estado"
            icono="swap-horizontal-outline"
            accessibilityHint="Elige el nuevo estado y, si quieres, un mensaje para el candidato"
            onPress={() => {
              recordar('cambiar-estado');
              setCambiando(true);
            }}
            testID="cambiar-estado"
          />
        ) : (
          <Texto color="textoSecundarioSobreGris" testID="sin-cambios">
            Esta postulación ya terminó: su estado no se puede cambiar.
          </Texto>
        )}

        <DesgloseCompatibilidad compatibilidad={detalle.compatibilidad} />

        <Tarjeta testID="seccion-cv">
          <Texto variante="subtitulo" accessibilityRole="header">
            CV del candidato
          </Texto>
          {postulacion.mensaje ? (
            <View
              accessible
              accessibilityLabel={`Mensaje de la postulación: ${postulacion.mensaje}`}
            >
              <Texto
                variante="cuerpoFuerte"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                Mensaje de la postulación
              </Texto>
              <Texto
                accessibilityElementsHidden
                importantForAccessibility="no"
                testID="mensaje-postulacion"
              >
                {postulacion.mensaje}
              </Texto>
            </View>
          ) : null}
          <CvCandidato cv={candidato} conPersona={false} />
        </Tarjeta>

        <SeccionNecesidades necesidades={detalle.necesidades} nota={detalle.nota_ajustes} />
        <SeccionContacto nombre={nombre} correo={candidato.correo} telefono={candidato.telefono} />

        {detalle.entrevista ? (
          <TarjetaEntrevistaPostulado
            entrevista={detalle.entrevista}
            onAbrirLiga={() =>
              void abrirLiga(detalle.entrevista!.liga).then(
                (error) => error && avisar('error', error),
              )
            }
            onCopiarLiga={() =>
              void copiarLiga(detalle.entrevista!.liga).then((error) =>
                error ? avisar('error', error) : avisar('exito', 'Liga copiada.'),
              )
            }
          />
        ) : null}

        <Tarjeta testID="seccion-historial">
          <Texto variante="subtitulo" accessibilityRole="header">
            Historial de estados
          </Texto>
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            Los mensajes de este historial los ve el candidato.
          </Texto>
          <LineaTiempo historial={postulacion.historial} />
        </Tarjeta>

        <SeccionObservaciones
          postulacionId={postulacion.id}
          observaciones={observaciones}
          onAgregada={recargarSilencioso}
        />
      </ScrollView>

      <MenuPostulado
        visible={menu}
        nombre={nombre}
        onReportar={() => {
          abrirReporte.current = true;
          setMenu(false);
        }}
        onCancelar={() => setMenu(false)}
        onCerrado={alCerrarseMenu}
      />
      <ModalReporte
        visible={reportando}
        objeto={{ tipo: 'candidato', id: candidato.id, nombre }}
        onCerrar={() => {
          setReportando(false);
          devolver();
        }}
        onEnviado={() => {
          setReportando(false);
          avisar('exito', MENSAJE_REPORTE);
          devolver();
        }}
      />
      {cambiando ? (
        <ModalCambiarEstado
          postulacionId={postulacion.id}
          nombre={nombre}
          permitidos={permitidos}
          onCerrar={() => {
            setCambiando(false);
            devolver();
          }}
          onCambiado={(resultado) => {
            setCambiando(false);
            setSinHorarios(null);
            avisar(
              'exito',
              `Estado actualizado: ahora está en «${textoEstadoPostulacion(resultado.estado)}». El candidato recibió un aviso.`,
            );
            void recargarSilencioso();
            if (resultado.estado === 'entrevista') void comprobarHorarios();
            devolver();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  titulos: { flex: 1, gap: espaciado.xs },
  estado: { gap: espaciado.xs },
  menu: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinHorarios: { gap: espaciado.sm },
});
