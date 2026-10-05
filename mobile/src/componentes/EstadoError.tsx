import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface EstadoErrorProps {
  mensaje: string;
  titulo?: string;
  onReintentar: () => void;
}

export function EstadoError({
  mensaje,
  titulo = 'No pudimos cargar la información',
  onReintentar,
}: EstadoErrorProps) {
  return (
    <View style={estilos.contenedor}>
      <Ionicons
        name="cloud-offline-outline"
        size={48}
        color={colores.error}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Texto
        variante="subtitulo"
        style={estilos.centrado}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        {titulo}
      </Texto>
      <Texto color="textoSecundarioSobreGris" style={estilos.centrado}>
        {mensaje}
      </Texto>
      <Boton titulo="Reintentar" onPress={onReintentar} icono="refresh" />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: espaciado.md, padding: espaciado.xl },
  centrado: { textAlign: 'center' },
});
