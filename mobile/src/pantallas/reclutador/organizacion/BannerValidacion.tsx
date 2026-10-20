import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import type { EstadoEmpresa } from '../../../api';
import { ESTADOS, Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { textoBanner } from './textosOrganizacion';

interface Props {
  estado: EstadoEmpresa;
  motivo: string | null;
}

const COLORES = {
  pendiente: { fondo: colores.advertenciaFondo, texto: colores.advertenciaTexto },
  validada: { fondo: colores.exitoFondo, texto: colores.exitoTexto },
  rechazada: { fondo: colores.errorFondo, texto: colores.errorTexto },
  suspendida: { fondo: colores.errorFondo, texto: colores.errorTexto },
} as const;

/** Estado de validación de la empresa: ícono, título y texto (nunca solo color); se anuncia al abrir. */
export function BannerValidacion({ estado, motivo }: Props) {
  const { titulo, mensaje } = textoBanner(estado, motivo);
  const { fondo, texto } = COLORES[estado];

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${titulo}. ${mensaje}`);
  }, [titulo, mensaje]);

  return (
    <View
      testID="banner-validacion"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${titulo}. ${mensaje}`}
      style={[estilos.banner, { backgroundColor: fondo, borderColor: texto }]}
    >
      <Ionicons
        name={ESTADOS.empresa[estado].icono}
        size={28}
        color={texto}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={estilos.textos}>
        <Texto variante="cuerpoFuerte" style={{ color: texto }}>
          {titulo}
        </Texto>
        <Texto style={{ color: texto }}>{mensaje}</Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 1,
  },
  textos: { flex: 1, gap: espaciado.xs },
});
