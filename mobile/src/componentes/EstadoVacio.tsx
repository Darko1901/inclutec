import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface EstadoVacioProps {
  titulo: string;
  mensaje?: string;
  icono?: keyof typeof Ionicons.glyphMap;
  /** Acción opcional, por ejemplo «Limpiar filtros». */
  accion?: { titulo: string; onPress: () => void };
}

export function EstadoVacio({
  titulo,
  mensaje,
  icono = 'file-tray-outline',
  accion,
}: EstadoVacioProps) {
  return (
    <View style={estilos.contenedor}>
      <Ionicons
        name={icono}
        size={48}
        color={colores.textoSecundarioSobreGris}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Texto variante="subtitulo" style={estilos.centrado} accessibilityRole="header">
        {titulo}
      </Texto>
      {mensaje ? (
        <Texto color="textoSecundarioSobreGris" style={estilos.centrado}>
          {mensaje}
        </Texto>
      ) : null}
      {accion ? (
        <Boton titulo={accion.titulo} onPress={accion.onPress} variante="secundario" />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: espaciado.md, padding: espaciado.xl },
  centrado: { textAlign: 'center' },
});
