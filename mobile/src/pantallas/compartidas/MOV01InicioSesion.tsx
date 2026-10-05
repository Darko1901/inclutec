import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { ApiError, auth } from '../../api';
import { Aviso, Boton, CampoTexto, Logotipo, Pantalla, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { useSesion } from '../../sesion';
import { espaciado } from '../../tema';
import {
  esContrasenaDeLogin,
  esCorreoValido,
  mensajeContrasenaDeLogin,
  mensajeCorreo,
  normalizarCorreo,
} from '../../utilidades/validaciones';

type Props = NativeStackScreenProps<RootStackParamList, 'InicioSesion'>;

/** MOV-01: inicio de sesión. La redirección por rol ocurre sola al cambiar la sesión. */
export default function MOV01InicioSesion({ navigation }: Props) {
  const { iniciarSesion, aviso, limpiarAviso } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [tocado, setTocado] = useState({ correo: false, contrasena: false });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const campoContrasena = useRef<TextInput>(null);

  const formularioValido = esCorreoValido(correo) && esContrasenaDeLogin(contrasena);
  const errorCorreo =
    (tocado.correo ? mensajeCorreo(correo) : null) ?? error?.campos?.correo ?? null;
  const errorContrasena =
    (tocado.contrasena ? mensajeContrasenaDeLogin(contrasena) : null) ??
    error?.campos?.contrasena ??
    null;
  // Los errores con campos (422) se muestran bajo cada campo, no en el aviso general.
  const errorGeneral = error && !error.campos ? error : null;

  async function entrar() {
    if (!formularioValido || cargando) return;
    limpiarAviso();
    setError(null);
    setCargando(true);
    try {
      const sesion = await auth.login({ correo: normalizarCorreo(correo), contrasena });
      const entro = await iniciarSesion(sesion);
      if (!entro) setCargando(false);
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible());
      setCargando(false);
    }
  }

  return (
    <Pantalla desplazable centrado>
      <View style={estilos.logo}>
        <Logotipo tamano="chico" />
      </View>
      <Texto variante="titulo" accessibilityRole="header">
        Iniciar sesión
      </Texto>

      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral.detail} /> : null}
      {!errorGeneral && aviso ? <Aviso variante="advertencia" mensaje={aviso} /> : null}

      <CampoTexto
        etiqueta="Correo"
        testID="campo-correo"
        value={correo}
        onChangeText={(texto) => {
          setCorreo(texto);
          if (error) setError(null);
        }}
        onBlur={() => setTocado((previo) => ({ ...previo, correo: true }))}
        error={errorCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => campoContrasena.current?.focus()}
      />
      <CampoTexto
        etiqueta="Contraseña"
        testID="campo-contrasena"
        value={contrasena}
        onChangeText={(texto) => {
          setContrasena(texto);
          if (error) setError(null);
        }}
        onBlur={() => setTocado((previo) => ({ ...previo, contrasena: true }))}
        error={errorContrasena}
        esContrasena
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={entrar}
      />

      <Boton
        titulo="Iniciar sesión"
        onPress={entrar}
        cargando={cargando}
        deshabilitado={!formularioValido}
        accessibilityHint={
          formularioValido
            ? undefined
            : 'Escribe un correo válido y una contraseña de al menos 8 caracteres'
        }
      />

      <View style={estilos.enlaces}>
        <Boton
          titulo="¿Olvidaste tu contraseña?"
          variante="texto"
          onPress={() => navigation.navigate('RecuperarContrasena')}
        />
        <Boton
          titulo="Crear cuenta"
          variante="texto"
          onPress={() => navigation.navigate('Registro')}
        />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  logo: { alignItems: 'center', marginBottom: espaciado.sm },
  enlaces: { gap: espaciado.xs },
});
