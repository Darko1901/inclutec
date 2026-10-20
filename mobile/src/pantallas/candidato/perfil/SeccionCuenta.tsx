import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useRetornoFoco } from '../../../componentes';
import { espaciado } from '../../../tema';
import { BotonCerrarSesion } from '../../compartidas/BotonCerrarSesion';
import { FlujoEliminarCuenta } from './FlujoEliminarCuenta';
import { ModalContrasena } from '../../compartidas/ModalContrasena';

interface Props {
  /** Se cambió la contraseña: la pantalla anuncia el aviso. */
  onContrasenaCambiada: () => void;
}

/** Cuenta: cambiar contraseña, aviso de privacidad, cerrar sesión y eliminar la cuenta. */
export function SeccionCuenta({ onContrasenaCambiada }: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [modal, setModal] = useState<'contrasena' | 'eliminar' | null>(null);
  const { registrar, recordar, devolver } = useRetornoFoco();

  function abrir(clave: 'contrasena' | 'eliminar') {
    recordar(clave);
    setModal(clave);
  }

  function cerrar() {
    setModal(null);
    devolver();
  }

  return (
    <View style={estilos.seccion} testID="seccion-cuenta">
      <Texto variante="subtitulo" accessibilityRole="header">
        Cuenta
      </Texto>
      <Boton
        ref={registrar('contrasena')}
        titulo="Cambiar contraseña"
        icono="key-outline"
        variante="secundario"
        onPress={() => abrir('contrasena')}
        testID="cambiar-contrasena"
      />
      <Boton
        titulo="Aviso de privacidad"
        icono="document-text-outline"
        variante="secundario"
        onPress={() => navigation.navigate('AvisoPrivacidad')}
      />
      <BotonCerrarSesion />
      <Boton
        ref={registrar('eliminar')}
        titulo="Eliminar mi cuenta"
        icono="trash-outline"
        variante="peligro"
        accessibilityHint="Pide confirmación dos veces antes de borrar tu cuenta"
        onPress={() => abrir('eliminar')}
        testID="eliminar-cuenta"
      />

      {modal === 'contrasena' ? (
        <ModalContrasena
          onCerrar={cerrar}
          onCambiada={() => {
            cerrar();
            onContrasenaCambiada();
          }}
        />
      ) : null}
      {modal === 'eliminar' ? <FlujoEliminarCuenta onCerrar={cerrar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.md },
});
