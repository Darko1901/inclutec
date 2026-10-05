import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

interface LogotipoProps {
  /** `grande` para el splash y `chico` para el inicio de sesión. */
  tamano?: 'grande' | 'chico';
}

export function Logotipo({ tamano = 'grande' }: LogotipoProps) {
  const lado = tamano === 'grande' ? 96 : 64;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logotipo de IncluTec"
      style={estilos.contenedor}
    >
      <View style={[estilos.icono, { width: lado, height: lado }]}>
        <Ionicons name="people" size={lado * 0.55} color={colores.sobrePrimario} />
      </View>
      <Texto variante={tamano === 'grande' ? 'titulo' : 'subtitulo'} color="primario">
        IncluTec
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: espaciado.md },
  icono: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.lg,
    backgroundColor: colores.primario,
  },
});
