import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { ApiError, auth } from '../../api';
import { Aviso, Boton, CampoCodigo, CampoTexto, Pantalla, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { colores, espaciado } from '../../tema';
import {
  mensajeConfirmacion,
  mensajeContrasenaRegistro,
  mensajeCorreo,
  normalizarCorreo,
} from '../../utilidades/validaciones';

type Props = NativeStackScreenProps<RootStackParamList, 'RecuperarContrasena'>;

export const SEGUNDOS_REENVIO = 60;

type Mensaje = { variante: 'exito' | 'advertencia' | 'error'; texto: string };

/** MOV-03: pide el correo, valida el código de 6 dígitos y guarda la nueva contraseña. */
export default function MOV03RecuperarContrasena({ navigation }: Props) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [correo, setCorreo] = useState('');
  const [correoTocado, setCorreoTocado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [codigoVerificado, setCodigoVerificado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [tocados, setTocados] = useState({ contrasena: false, confirmar: false });
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [restantes, setRestantes] = useState(0);
  const cuentaIniciada = useRef(false);

  const correoValido = mensajeCorreo(correo) === null;
  const errorCorreo = correoTocado ? mensajeCorreo(correo) : null;
  const errorNueva = tocados.contrasena ? mensajeContrasenaRegistro(contrasena) : null;
  const errorConfirmar = tocados.confirmar ? mensajeConfirmacion(contrasena, confirmar) : null;
  const puedeGuardar =
    codigoVerificado &&
    mensajeContrasenaRegistro(contrasena) === null &&
    mensajeConfirmacion(contrasena, confirmar) === null;

  // Cuenta regresiva del reenvío: se ve cada segundo, pero solo se anuncia al terminar.
  const contando = restantes > 0;
  useEffect(() => {
    if (!contando) return undefined;
    const reloj = setInterval(() => setRestantes((actual) => actual - 1), 1000);
    return () => clearInterval(reloj);
  }, [contando]);

  useEffect(() => {
    if (restantes === 0 && cuentaIniciada.current) {
      cuentaIniciada.current = false;
      AccessibilityInfo.announceForAccessibility('Ya puedes pedir otro código');
    }
  }, [restantes]);

  function iniciarCuenta(segundos: number) {
    cuentaIniciada.current = true;
    setRestantes(segundos);
  }

  function reiniciarCodigo() {
    setCodigo('');
    setCodigoVerificado(false);
    setErrorCodigo(null);
  }

  function volverAlPaso1(aviso: Mensaje | null) {
    reiniciarCodigo();
    setContrasena('');
    setConfirmar('');
    setTocados({ contrasena: false, confirmar: false });
    setMensaje(aviso);
    setRestantes(0);
    cuentaIniciada.current = false;
    setPaso(1);
  }

  async function solicitar() {
    if (!correoValido || enviando) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await auth.solicitarCodigo({ correo: normalizarCorreo(correo) });
      reiniciarCodigo();
      setMensaje({ variante: 'exito', texto: respuesta.detail });
      iniciarCuenta(SEGUNDOS_REENVIO);
      setPaso(2);
    } catch (fallo) {
      const error = fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible();
      if (error.codigo === 'reenvio_prematuro') {
        // Ya hay un código reciente y sigue vigente: se pasa a capturarlo.
        setMensaje({ variante: 'advertencia', texto: error.detail });
        iniciarCuenta(error.reintentarEn ?? SEGUNDOS_REENVIO);
        setPaso(2);
      } else {
        setMensaje({ variante: 'error', texto: error.detail });
      }
    } finally {
      setEnviando(false);
    }
  }

  async function verificar(codigoNuevo: string) {
    setVerificando(true);
    setErrorCodigo(null);
    try {
      await auth.verificarCodigo({ correo: normalizarCorreo(correo), codigo: codigoNuevo });
      setCodigoVerificado(true);
      AccessibilityInfo.announceForAccessibility(
        'Código correcto. Ya puedes escribir tu nueva contraseña.',
      );
    } catch (fallo) {
      const error = fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible();
      if (error.codigo === 'codigo_vencido') {
        volverAlPaso1({ variante: 'advertencia', texto: error.detail });
      } else {
        setErrorCodigo(error.detail);
      }
    } finally {
      setVerificando(false);
    }
  }

  function cambiarCodigo(nuevo: string) {
    setCodigo(nuevo);
    setErrorCodigo(null);
    setCodigoVerificado(false);
    // El código se valida al completar los 6 dígitos, antes de pedir la nueva contraseña.
    if (nuevo.length === 6) void verificar(nuevo);
  }

  async function guardar() {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    setMensaje(null);
    setErrorContrasena(null);
    try {
      const respuesta = await auth.restablecerContrasena({
        correo: normalizarCorreo(correo),
        codigo,
        contrasena,
      });
      navigation.navigate('InicioSesion', { mensajeExito: respuesta.detail });
    } catch (fallo) {
      const error = fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible();
      if (error.codigo === 'codigo_vencido') {
        volverAlPaso1({ variante: 'advertencia', texto: error.detail });
      } else if (error.codigo === 'codigo_invalido') {
        setCodigoVerificado(false);
        setErrorCodigo(error.detail);
      } else if (error.campos?.contrasena) {
        setErrorContrasena(error.campos.contrasena);
      } else {
        setMensaje({ variante: 'error', texto: error.detail });
      }
      setGuardando(false);
    }
  }

  const textoReenvio = contando ? `Reenviar código (en ${restantes} s)` : 'Reenviar código';

  return (
    <Pantalla desplazable>
      <Texto variante="pequeno" color="textoSecundarioSobreGris" accessibilityRole="header">
        {`Paso ${paso} de 2`}
      </Texto>
      <Texto variante="titulo" accessibilityRole="header">
        {paso === 1 ? 'Recupera tu contraseña' : 'Escribe el código'}
      </Texto>

      {mensaje ? <Aviso variante={mensaje.variante} mensaje={mensaje.texto} /> : null}

      {paso === 1 ? (
        <>
          <Texto>
            Escribe el correo con el que te registraste y te enviaremos un código de 6 dígitos.
          </Texto>
          <CampoTexto
            etiqueta="Correo"
            testID="campo-correo"
            value={correo}
            onChangeText={setCorreo}
            onBlur={() => setCorreoTocado(true)}
            error={errorCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void solicitar()}
          />
          <Boton
            titulo="Enviar código"
            onPress={() => void solicitar()}
            cargando={enviando}
            deshabilitado={!correoValido}
            accessibilityHint={correoValido ? undefined : 'Escribe un correo válido'}
          />
        </>
      ) : (
        <>
          <Texto>{`Revisa el correo ${correo.trim()}. El código vence en 15 minutos.`}</Texto>
          <CampoCodigo
            testID="campo-codigo"
            value={codigo}
            onChangeText={cambiarCodigo}
            error={errorCodigo}
            editable={!verificando && !guardando}
            autoFocus
          />
          {verificando ? (
            <View style={estilos.estado} accessibilityLiveRegion="polite">
              <Texto variante="pequeno" color="textoSecundarioSobreGris">
                Verificando código…
              </Texto>
            </View>
          ) : null}
          {codigoVerificado ? (
            <View style={estilos.estado} accessible accessibilityLabel="Código correcto">
              <Ionicons name="checkmark-circle" size={20} color={colores.exito} />
              <Texto variante="pequeno" style={{ color: colores.exitoTexto }}>
                Código correcto
              </Texto>
            </View>
          ) : null}

          <Boton
            titulo={textoReenvio}
            accessibilityLabel="Reenviar código"
            accessibilityHint={contando ? 'Disponible en unos segundos' : undefined}
            variante="texto"
            onPress={() => void solicitar()}
            cargando={enviando}
            deshabilitado={contando}
          />

          <CampoTexto
            etiqueta="Nueva contraseña"
            testID="campo-nueva"
            value={contrasena}
            onChangeText={(texto) => {
              setContrasena(texto);
              setErrorContrasena(null);
            }}
            onBlur={() => setTocados((previo) => ({ ...previo, contrasena: true }))}
            error={errorContrasena ?? errorNueva}
            ayuda={
              codigoVerificado
                ? 'De 8 a 64 caracteres, con al menos una letra y un número.'
                : 'Se habilita cuando el código es correcto.'
            }
            editable={codigoVerificado}
            esContrasena
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            testID="campo-confirmar"
            value={confirmar}
            onChangeText={setConfirmar}
            onBlur={() => setTocados((previo) => ({ ...previo, confirmar: true }))}
            error={errorConfirmar}
            editable={codigoVerificado}
            esContrasena
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void guardar()}
          />
          <Boton
            titulo="Guardar"
            onPress={() => void guardar()}
            cargando={guardando}
            deshabilitado={!puedeGuardar}
            accessibilityHint={puedeGuardar ? undefined : 'Escribe el código y la nueva contraseña'}
          />
          <Boton titulo="Usar otro correo" variante="texto" onPress={() => volverAlPaso1(null)} />
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  estado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
});
