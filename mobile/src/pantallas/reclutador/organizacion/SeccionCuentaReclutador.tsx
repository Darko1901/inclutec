import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aviso, Boton, Texto, useRetornoFoco } from '../../../componentes';
import { useSesion } from '../../../sesion';
import { espaciado } from '../../../tema';
import { BotonCerrarSesion } from '../../compartidas/BotonCerrarSesion';
import { ModalContrasena } from '../../compartidas/ModalContrasena';

/** Cuenta: quién eres, cambiar contraseña, aviso de privacidad y cerrar sesión. */
export function SeccionCuentaReclutador() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { usuario } = useSesion();
  const [modal, setModal] = useState(false);
  const [cambiada, setCambiada] = useState(0);
  const { registrar, recordar, devolver } = useRetornoFoco();

  return (
    <View style={estilos.seccion} testID="seccion-cuenta">
      <Texto variante="subtitulo" accessibilityRole="header">
        Cuenta
      </Texto>
      {usuario ? (
        <View
          accessible
          accessibilityLabel={`${usuario.nombre} ${usuario.apellidos}. ${usuario.correo}`}
        >
          <Texto variante="cuerpoFuerte">{`${usuario.nombre} ${usuario.apellidos}`}</Texto>
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            {usuario.correo}
          </Texto>
        </View>
      ) : null}
      {cambiada > 0 ? (
        <Aviso key={cambiada} variante="exito" mensaje="Tu contraseña se cambió." />
      ) : null}
      <Boton
        ref={registrar('contrasena')}
        titulo="Cambiar contraseña"
        icono="key-outline"
        variante="secundario"
        onPress={() => {
          recordar('contrasena');
          setModal(true);
        }}
        testID="cambiar-contrasena"
      />
      <Boton
        titulo="Aviso de privacidad"
        icono="document-text-outline"
        variante="secundario"
        onPress={() => navigation.navigate('AvisoPrivacidad')}
      />
      <BotonCerrarSesion />
      {modal ? (
        <ModalContrasena
          onCerrar={() => {
            setModal(false);
            devolver();
          }}
          onCambiada={() => {
            setModal(false);
            setCambiada((n) => n + 1);
            devolver();
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.md },
});
