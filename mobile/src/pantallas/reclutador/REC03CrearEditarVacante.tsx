import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationAction } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, empresas, vacantes, type VacanteDetalle, type VacanteEntrada } from '../../api';
import { Aviso, Boton, Cargando, EstadoError, ModalConfirmacion, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { colores, espaciado } from '../../tema';
import { useCarga } from '../../utilidades/useCarga';
import {
  aEntrada,
  desdeDetalle,
  formularioVacio,
  hayCambios,
  primerPasoConError,
  TEXTO_RECALCULO,
  TITULOS_PASO,
  TOTAL_PASOS,
  textoNotificados,
  validarPaso,
  type Errores,
  type FormularioVacante,
  type Paso,
} from './vacante/formulario';
import { IndicadorPasos } from './vacante/IndicadorPasos';
import { PasoAccesibilidad } from './vacante/PasoAccesibilidad';
import { PasoDatos } from './vacante/PasoDatos';
import { PasoModalidad } from './vacante/PasoModalidad';
import { PasoRequisitos } from './vacante/PasoRequisitos';

type Props = NativeStackScreenProps<RootStackParamList, 'EditarVacante'>;
type Navegacion = Props['navigation'];

const cargarEmpresa = () => empresas.miOrganizacion();

interface Resultado {
  titulo: string;
  mensaje: string;
}

interface AsistenteProps {
  navigation: Navegacion;
  /** null = vacante nueva. */
  vacante: VacanteDetalle | null;
}

function Asistente({ navigation, vacante }: AsistenteProps) {
  const inicial = useMemo(() => (vacante ? desdeDetalle(vacante) : formularioVacio()), [vacante]);
  const [formulario, setFormulario] = useState<FormularioVacante>(inicial);
  const [paso, setPaso] = useState<Paso>(1);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<{ mensaje: string; n: number } | null>(null);
  const [enviando, setEnviando] = useState<'borrador' | 'publicada' | null>(null);
  const [confirmandoPublicar, setConfirmandoPublicar] = useState(false);
  const [descartar, setDescartar] = useState<NavigationAction | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const permitirSalir = useRef(false);

  const empresa = useCarga(cargarEmpresa);
  const empresaNoValidada =
    empresa.estado.fase === 'listo' && empresa.estado.datos.estado !== 'validada';

  const esBorrador = vacante === null || vacante.estado === 'borrador';
  const conPostulados = (vacante?.postulados ?? 0) > 0;
  const cambios = hayCambios(inicial, formulario);

  useEffect(() => {
    navigation.setOptions({ title: vacante ? 'Editar vacante' : 'Nueva vacante' });
  }, [navigation, vacante]);

  // Si hay cambios sin guardar, salir (botón atrás del encabezado o de Android) pide confirmar.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (evento) => {
        if (!cambios || permitirSalir.current) return;
        evento.preventDefault();
        setDescartar(evento.data.action);
      }),
    [navigation, cambios],
  );

  const cambiar = useCallback(
    (cambio: Partial<FormularioVacante>) => setFormulario((previo) => ({ ...previo, ...cambio })),
    [],
  );
  const limpiar = useCallback(
    (...campos: string[]) =>
      setErrores((previo) => {
        if (!campos.some((campo) => campo in previo)) return previo;
        const siguiente = { ...previo };
        for (const campo of campos) delete siguiente[campo];
        return siguiente;
      }),
    [],
  );

  function irAPaso(nuevo: Paso) {
    setPaso(nuevo);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function siguiente() {
    const encontrados = validarPaso(paso, formulario);
    setErrores((previo) => ({ ...previo, ...encontrados }));
    if (Object.keys(encontrados).length > 0) return;
    irAPaso((paso + 1) as Paso);
  }

  async function guardar(destino: 'borrador' | 'publicada') {
    setErrorGeneral(null);
    setConfirmandoPublicar(false);
    // Antes de enviar se revisan los pasos 1 a 3; el API revisa lo demás.
    for (const p of [1, 2, 3] as Paso[]) {
      const encontrados = validarPaso(p, formulario);
      if (Object.keys(encontrados).length > 0) {
        setErrores(encontrados);
        irAPaso(p);
        setErrorGeneral({
          mensaje: `Revisa el paso ${p}: ${TITULOS_PASO[p]}.`,
          n: Date.now(),
        });
        return;
      }
    }
    const entrada: VacanteEntrada = aEntrada(formulario, destino);
    setEnviando(destino);
    try {
      const guardada = vacante
        ? await vacantes.editar(vacante.id, entrada)
        : await vacantes.crear(entrada);
      permitirSalir.current = true;
      const publicada = guardada.vacante.estado === 'publicada';
      const titulo = !vacante
        ? publicada
          ? 'Vacante publicada'
          : 'Borrador guardado'
        : vacante.estado === 'borrador' && publicada
          ? 'Vacante publicada'
          : esBorrador
            ? 'Borrador guardado'
            : 'Cambios guardados';
      const partes = [`«${guardada.vacante.titulo}»`];
      partes[0] += publicada ? ' ya está publicada.' : ' quedó como borrador.';
      if (guardada.postulados_notificados > 0) {
        partes.push(textoNotificados(guardada.postulados_notificados));
      }
      setResultado({ titulo, mensaje: partes.join(' ') });
      AccessibilityInfo.announceForAccessibility(`${titulo}. ${partes.join(' ')}`);
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      const campos = error.campos ?? {};
      const primero = primerPasoConError(campos);
      setErrores(campos);
      if (primero) {
        irAPaso(primero);
        setErrorGeneral({
          mensaje: `${error.detail} Revisa el paso ${primero}: ${TITULOS_PASO[primero]}.`,
          n: Date.now(),
        });
      } else {
        setErrorGeneral({ mensaje: error.detail, n: Date.now() });
      }
    }
    setEnviando(null);
  }

  if (resultado) {
    return (
      <SafeAreaView style={estilos.pantalla} edges={['left', 'right', 'bottom']}>
        <View style={estilos.resultado} testID="resultado-guardado">
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={colores.exito}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto variante="titulo" accessibilityRole="header" style={estilos.centrado}>
            {resultado.titulo}
          </Texto>
          <Texto style={estilos.centrado}>{resultado.mensaje}</Texto>
          <Boton
            titulo="Ver mis vacantes"
            onPress={() => navigation.goBack()}
            testID="volver-a-vacantes"
          />
        </View>
      </SafeAreaView>
    );
  }

  const propiedades = { formulario, cambiar, errores, limpiar };
  const ultimo = paso === TOTAL_PASOS;
  const bloqueadaPublicacion = empresaNoValidada;

  return (
    <SafeAreaView style={estilos.pantalla} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={estilos.cuerpo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={estilos.contenido}
          testID="contenido-vacante"
        >
          <IndicadorPasos paso={paso} />
          {conPostulados ? (
            <Aviso
              variante="info"
              mensaje={TEXTO_RECALCULO}
              anunciar={ultimo}
              testID="aviso-recalculo"
            />
          ) : null}
          {errorGeneral ? (
            <Aviso
              key={errorGeneral.n}
              variante="error"
              mensaje={errorGeneral.mensaje}
              testID="error-general"
            />
          ) : null}

          {paso === 1 ? (
            <PasoDatos
              key="paso-1"
              {...propiedades}
              entidadInicial={vacante?.municipio.entidad.id ?? null}
            />
          ) : null}
          {paso === 2 ? <PasoRequisitos key="paso-2" {...propiedades} /> : null}
          {paso === 3 ? <PasoModalidad key="paso-3" {...propiedades} /> : null}
          {paso === 4 ? <PasoAccesibilidad key="paso-4" {...propiedades} /> : null}
        </ScrollView>

        {/* Botones fijos al pie: el contenido se desplaza por encima y no queda tapado. */}
        <View style={estilos.pie} testID="pie-vacante">
          {ultimo && bloqueadaPublicacion && esBorrador ? (
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              testID="explicacion-publicar"
            >
              Podrás publicar cuando validemos tu empresa. Mientras tanto, guarda tu vacante como
              borrador.
            </Texto>
          ) : null}
          {ultimo ? (
            esBorrador ? (
              <>
                <Boton
                  titulo="Publicar"
                  icono="megaphone-outline"
                  deshabilitado={bloqueadaPublicacion}
                  accessibilityHint={
                    bloqueadaPublicacion ? 'Disponible cuando validemos tu empresa' : undefined
                  }
                  cargando={enviando === 'publicada'}
                  onPress={() => setConfirmandoPublicar(true)}
                  testID="publicar"
                />
                <Boton
                  titulo="Guardar borrador"
                  variante="secundario"
                  deshabilitado={enviando === 'publicada'}
                  cargando={enviando === 'borrador'}
                  onPress={() => void guardar('borrador')}
                  testID="guardar-borrador"
                />
              </>
            ) : (
              <Boton
                titulo="Guardar cambios"
                cargando={enviando !== null}
                onPress={() => void guardar('publicada')}
                testID="guardar-cambios"
              />
            )
          ) : (
            <Boton titulo="Siguiente" onPress={siguiente} testID="siguiente" />
          )}
          {paso > 1 ? (
            <Boton
              titulo="Anterior"
              variante="texto"
              deshabilitado={enviando !== null}
              onPress={() => irAPaso((paso - 1) as Paso)}
              testID="anterior"
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ModalConfirmacion
        visible={confirmandoPublicar}
        titulo="¿Publicar esta vacante?"
        mensaje={
          conPostulados
            ? `Los candidatos podrán verla y postularse. ${TEXTO_RECALCULO}.`
            : 'Los candidatos podrán verla y postularse.'
        }
        textoConfirmar="Publicar"
        onConfirmar={() => void guardar('publicada')}
        onCancelar={() => setConfirmandoPublicar(false)}
      />
      <ModalConfirmacion
        visible={descartar !== null}
        titulo="¿Descartar los cambios?"
        mensaje="Si sales ahora, perderás lo que escribiste en esta vacante."
        textoConfirmar="Descartar cambios"
        textoCancelar="Seguir editando"
        peligro
        onConfirmar={() => {
          const accion = descartar;
          permitirSalir.current = true;
          setDescartar(null);
          if (accion) navigation.dispatch(accion);
        }}
        onCancelar={() => setDescartar(null)}
      />
    </SafeAreaView>
  );
}

/** Carga la vacante que se edita y, cuando llega, muestra el formulario. */
function Edicion({ navigation, id }: { navigation: Navegacion; id: number }) {
  const cargar = useCallback(() => vacantes.detalle(id), [id]);
  const { estado, recargar } = useCarga(cargar);

  if (estado.fase === 'cargando') {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <Cargando mensaje="Cargando la vacante…" />
      </SafeAreaView>
    );
  }
  if (estado.fase === 'error') {
    return (
      <SafeAreaView style={estilos.pantalla}>
        <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
      </SafeAreaView>
    );
  }
  const vacante = estado.datos;
  if (vacante.estado === 'cerrada' || vacante.estado === 'suspendida') {
    const suspendida = vacante.estado === 'suspendida';
    return (
      <SafeAreaView style={estilos.pantalla}>
        <View style={estilos.resultado} testID="no-editable">
          <Ionicons
            name={suspendida ? 'ban-outline' : 'lock-closed-outline'}
            size={56}
            color={colores.textoSecundarioSobreGris}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto variante="subtitulo" accessibilityRole="header" style={estilos.centrado}>
            {suspendida ? 'Esta vacante está suspendida' : 'Esta vacante está cerrada'}
          </Texto>
          <Texto style={estilos.centrado}>
            {suspendida
              ? 'La suspendió el administrador, así que no se puede editar.'
              : 'Ya no se puede editar. Si quieres volver a usarla, duplícala como borrador desde Mis vacantes.'}
          </Texto>
          <Boton titulo="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }
  return <Asistente navigation={navigation} vacante={vacante} />;
}

/** REC-03: crear o editar una vacante en cuatro pasos. */
export default function REC03CrearEditarVacante({ route, navigation }: Props) {
  const id = route.params?.vacante_id;
  return id === undefined ? (
    <Asistente navigation={navigation} vacante={null} />
  ) : (
    <Edicion navigation={navigation} id={id} />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  cuerpo: { flex: 1 },
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  pie: {
    gap: espaciado.sm,
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
  resultado: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: espaciado.lg,
    padding: espaciado.xl,
  },
  centrado: { textAlign: 'center' },
});
