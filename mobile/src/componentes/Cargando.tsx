import { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Texto } from './Texto';

interface CargandoProps {
  mensaje?: string;
}

export function Cargando({ mensaje = 'Cargando…' }: CargandoProps) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(mensaje);
  }, [mensaje]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={mensaje}
      accessibilityState={{ busy: true }}
      style={estilos.contenedor}
    >
      <ActivityIndicator size="large" color={colores.primario} />
      <Texto color="textoSecundarioSobreGris">{mensaje}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: espaciado.md, padding: espaciado.xl },
});
