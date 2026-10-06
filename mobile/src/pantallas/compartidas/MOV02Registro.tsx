import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, auth } from '../../api';
import { Aviso, Boton, Pantalla, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { useSesion } from '../../sesion';
import { colores, espaciado, radio } from '../../tema';
import { PasoDatos } from './registro/PasoDatos';
import { PasoPrivacidad } from './registro/PasoPrivacidad';
import { PasoTipoCuenta } from './registro/PasoTipoCuenta';
import {
  cuerpoCandidato,
  cuerpoReclutador,
  DATOS_INICIALES,
  erroresDeApi,
  pasoDeCampo,
  validarDatos,
  type CampoRegistro,
  type DatosRegistro,
  type ErroresRegistro,
  type TipoCuenta,
} from './registro/formulario';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;
type Paso = 1 | 2 | 3;

const TOTAL_PASOS = 3;
const TITULOS: Record<Paso, string> = {
  1: 'Tipo de cuenta',
  2: 'Datos de tu cuenta',
  3: 'Privacidad',
};
export const MENSAJE_AVISO_OBLIGATORIO =
  'Debes aceptar el aviso de privacidad para crear tu cuenta.';

/** MOV-02: registro en tres pasos (tipo de cuenta, datos y privacidad). */
export default function MOV02Registro({ navigation }: Props) {
  const { iniciarSesion } = useSesion();
  const [paso, setPaso] = useState<Paso>(1);
  const [tipo, setTipo] = useState<TipoCuenta>('candidato');
  const [datos, setDatos] = useState<DatosRegistro>(DATOS_INICIALES);
  const [tocados, setTocados] = useState<Set<CampoRegistro>>(new Set());
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [erroresApi, setErroresApi] = useState<ErroresRegistro>({});
  const [aviso, setAviso] = useState<{ variante: 'error' | 'advertencia'; texto: string } | null>(
    null,
  );
  const [correoDuplicado, setCorreoDuplicado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const desplazamiento = useRef<ScrollView>(null);

  const erroresLocales = useMemo(() => validarDatos(tipo, datos), [tipo, datos]);

  // El error de un campo se muestra si el servidor lo marcó, si el usuario ya salió del campo
  // o si intentó continuar.
  const erroresVisibles = useMemo<ErroresRegistro>(() => {
    const visibles: ErroresRegistro = {};
    for (const campo of Object.keys(datos) as CampoRegistro[]) {
      const mensaje =
        erroresApi[campo] ??
        (mostrarTodos || tocados.has(campo) ? erroresLocales[campo] : undefined);
      if (mensaje) visibles[campo] = mensaje;
    }
    return visibles;
  }, [datos, erroresApi, erroresLocales, mostrarTodos, tocados]);

  const irAPaso = useCallback((nuevo: Paso) => {
    setPaso(nuevo);
    desplazamiento.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(
      `Paso ${nuevo} de ${TOTAL_PASOS}: ${TITULOS[nuevo]}`,
    );
  }, []);

  // El botón «atrás» de Android regresa de paso en vez de salir del registro.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        if (paso === 1) return false;
        irAPaso((paso - 1) as Paso);
        return true;
      });
      return () => suscripcion.remove();
    }, [paso, irAPaso]),
  );

  function cambiar<C extends CampoRegistro>(campo: C, valor: DatosRegistro[C]) {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    setErroresApi((previo) => {
      if (!previo[campo]) return previo;
      const { [campo]: _quitado, ...resto } = previo;
      return resto;
    });
    if (campo === 'correo') setCorreoDuplicado(false);
  }

  function tocar(campo: CampoRegistro) {
    setTocados((previo) => new Set(previo).add(campo));
  }

  function elegirTipo(nuevo: TipoCuenta) {
    if (nuevo !== tipo) {
      setDatos(DATOS_INICIALES);
      setTocados(new Set());
      setMostrarTodos(false);
      setErroresApi({});
    }
    setTipo(nuevo);
    setAviso(null);
    irAPaso(2);
  }

  function continuar() {
    if (Object.keys(erroresLocales).length > 0 || Object.keys(erroresApi).length > 0) {
      setMostrarTodos(true);
      setAviso({ variante: 'error', texto: 'Revisa los campos marcados en rojo.' });
      desplazamiento.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setAviso(null);
    irAPaso(3);
  }

  async function crearCuenta() {
    if (!datos.aceptaAviso) {
      setErroresApi((previo) => ({ ...previo, aceptaAviso: MENSAJE_AVISO_OBLIGATORIO }));
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const sesion =
        tipo === 'candidato'
          ? await auth.registrarCandidato(cuerpoCandidato(datos))
          : await auth.registrarReclutador(cuerpoReclutador(datos));
      // El candidato empieza completando su perfil (CAN-03) y el reclutador su organización (REC-01).
      await iniciarSesion(sesion, {
        pantallaInicial: tipo === 'candidato' ? 'Perfil' : 'Organizacion',
      });
    } catch (fallo) {
      manejarError(fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible());
      setEnviando(false);
    }
  }

  function manejarError(error: ApiError) {
    desplazamiento.current?.scrollTo({ y: 0, animated: true });
    if (error.codigo === 'correo_duplicado') {
      setErroresApi({ correo: 'Ese correo ya está registrado.' });
      setCorreoDuplicado(true);
      setAviso({ variante: 'error', texto: 'Ese correo ya está registrado.' });
      irAPaso(2);
    } else if (error.codigo === 'rfc_duplicado') {
      setErroresApi({ rfc: error.campos?.['empresa.rfc'] ?? 'Otra empresa ya registró ese RFC.' });
      setAviso({ variante: 'error', texto: 'Revisa el RFC de la empresa.' });
      irAPaso(2);
    } else if (error.codigo === 'validacion' && error.campos) {
      const { errores, sinCampo } = erroresDeApi(tipo, error.campos);
      const campos = Object.keys(errores) as CampoRegistro[];
      setErroresApi(errores);
      setAviso({ variante: 'error', texto: sinCampo[0] ?? error.detail });
      if (campos.length > 0) irAPaso(Math.min(...campos.map((c) => pasoDeCampo(tipo, c))) as Paso);
    } else {
      setAviso({ variante: 'error', texto: error.detail });
    }
  }

  return (
    <Pantalla desplazable scrollRef={desplazamiento}>
      <View style={estilos.encabezado}>
        <Texto variante="pequeno" color="textoSecundarioSobreGris" accessibilityRole="header">
          {`Paso ${paso} de ${TOTAL_PASOS}`}
        </Texto>
        <View
          style={estilos.barra}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {([1, 2, 3] as Paso[]).map((numero) => (
            <View
              key={numero}
              style={[estilos.segmento, numero <= paso && estilos.segmentoActivo]}
            />
          ))}
        </View>
        <Texto variante="titulo" accessibilityRole="header">
          {paso === 1 ? 'Crear cuenta' : TITULOS[paso]}
        </Texto>
      </View>

      {aviso ? <Aviso variante={aviso.variante} mensaje={aviso.texto} /> : null}
      {correoDuplicado ? (
        <View style={estilos.acciones}>
          <Boton
            titulo="Ir a iniciar sesión"
            variante="secundario"
            onPress={() => navigation.navigate('InicioSesion')}
          />
          <Boton
            titulo="Recuperar mi contraseña"
            variante="secundario"
            onPress={() => navigation.navigate('RecuperarContrasena')}
          />
        </View>
      ) : null}

      {paso === 1 ? (
        <PasoTipoCuenta
          alElegir={elegirTipo}
          alIrAInicioSesion={() => navigation.navigate('InicioSesion')}
        />
      ) : null}
      {paso === 2 ? (
        <>
          <PasoDatos
            tipo={tipo}
            datos={datos}
            errores={erroresVisibles}
            alCambiar={cambiar}
            alTocar={tocar}
          />
          <Boton titulo="Continuar" onPress={continuar} />
          <Boton titulo="Atrás" variante="texto" onPress={() => irAPaso(1)} />
        </>
      ) : null}
      {paso === 3 ? (
        <>
          <PasoPrivacidad
            tipo={tipo}
            aceptaAviso={datos.aceptaAviso}
            consentimiento={datos.consentimiento}
            errorAviso={erroresVisibles.aceptaAviso}
            alCambiarAviso={(marcada) => cambiar('aceptaAviso', marcada)}
            alCambiarConsentimiento={(marcada) => cambiar('consentimiento', marcada)}
            alLeerAviso={() => navigation.navigate('AvisoPrivacidad')}
          />
          <Boton titulo="Crear cuenta" onPress={() => void crearCuenta()} cargando={enviando} />
          <Boton
            titulo="Atrás"
            variante="texto"
            deshabilitado={enviando}
            onPress={() => irAPaso(2)}
          />
        </>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: espaciado.sm },
  barra: { flexDirection: 'row', gap: espaciado.xs },
  segmento: {
    flex: 1,
    height: 6,
    borderRadius: radio.completo,
    backgroundColor: colores.bordeSuave,
  },
  segmentoActivo: { backgroundColor: colores.primario },
  acciones: { gap: espaciado.sm },
});
