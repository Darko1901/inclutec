import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Aviso, Boton, Tarjeta, Texto } from '../../../componentes';
import { espaciado } from '../../../tema';
import { TEXTO_CONTACTO_OCULTO } from './textosPostulado';

interface Props {
  nombre: string;
  correo: string | null;
  telefono: string | null;
}

/** Contacto del candidato: oculto hasta «entrevista»; después, con acciones para escribir y llamar. */
export function SeccionContacto({ nombre, correo, telefono }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function abrir(url: string, accion: string) {
    setError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setError(`No pudimos ${accion}. Copia el dato y úsalo desde tu aplicación.`);
    }
  }

  const visible = correo !== null || telefono !== null;
  return (
    <Tarjeta testID="seccion-contacto">
      <Texto variante="subtitulo" accessibilityRole="header">
        Contacto
      </Texto>
      {!visible ? (
        <Texto color="textoSecundarioSobreGris" testID="contacto-oculto">
          {TEXTO_CONTACTO_OCULTO}
        </Texto>
      ) : (
        <View style={estilos.datos}>
          {error ? <Aviso variante="error" mensaje={error} /> : null}
          {correo ? (
            <View style={estilos.dato}>
              <Texto selectable accessibilityLabel={`Correo: ${correo}`} testID="contacto-correo">
                {correo}
              </Texto>
              <Boton
                titulo="Escribir"
                icono="mail-outline"
                variante="secundario"
                accessibilityLabel={`Escribir un correo a ${nombre}`}
                accessibilityHint="Abre tu aplicación de correo"
                onPress={() => void abrir(`mailto:${correo}`, 'abrir el correo')}
                testID="escribir"
              />
            </View>
          ) : null}
          {telefono ? (
            <View style={estilos.dato}>
              <Texto
                selectable
                accessibilityLabel={`Teléfono: ${telefono.split('').join(' ')}`}
                testID="contacto-telefono"
              >
                {telefono}
              </Texto>
              <Boton
                titulo="Llamar"
                icono="call-outline"
                variante="secundario"
                accessibilityLabel={`Llamar a ${nombre}`}
                accessibilityHint="Abre el marcador del teléfono"
                onPress={() => void abrir(`tel:${telefono}`, 'abrir el marcador')}
                testID="llamar"
              />
            </View>
          ) : null}
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  datos: { gap: espaciado.md },
  dato: { gap: espaciado.sm },
});
