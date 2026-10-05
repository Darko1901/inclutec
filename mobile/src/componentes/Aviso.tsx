import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

export type VarianteAviso = 'info' | 'exito' | 'advertencia' | 'error';

interface AvisoProps {
  variante?: VarianteAviso;
  mensaje: string;
  titulo?: string;
  /** Anuncia el mensaje al lector de pantalla cuando aparece o cambia (por omisión, sí). */
  anunciar?: boolean;
  testID?: string;
}

const VARIANTES = {
  info: {
    icono: 'information-circle',
    fondo: colores.infoFondo,
    texto: colores.infoTexto,
    rotulo: 'Información',
  },
  exito: {
    icono: 'checkmark-circle',
    fondo: colores.exitoFondo,
    texto: colores.exitoTexto,
    rotulo: 'Listo',
  },
  advertencia: {
    icono: 'warning',
    fondo: colores.advertenciaFondo,
    texto: colores.advertenciaTexto,
    rotulo: 'Atención',
  },
  error: {
    icono: 'alert-circle',
    fondo: colores.errorFondo,
    texto: colores.errorTexto,
    rotulo: 'Error',
  },
} as const;

export function Aviso({ variante = 'info', mensaje, titulo, anunciar = true, testID }: AvisoProps) {
  const estilo = VARIANTES[variante];

  useEffect(() => {
    if (anunciar) AccessibilityInfo.announceForAccessibility(`${estilo.rotulo}: ${mensaje}`);
  }, [anunciar, estilo.rotulo, mensaje]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${estilo.rotulo}: ${titulo ? `${titulo}. ` : ''}${mensaje}`}
      style={[estilos.aviso, { backgroundColor: estilo.fondo, borderColor: estilo.texto }]}
    >
      <Ionicons
        name={estilo.icono}
        size={24}
        color={estilo.texto}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={estilos.texto}>
        {titulo ? (
          <Texto variante="cuerpoFuerte" style={{ color: estilo.texto }}>
            {titulo}
          </Texto>
        ) : null}
        <Texto style={{ color: estilo.texto }}>{mensaje}</Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 1,
  },
  texto: { flex: 1, gap: espaciado.xs },
});
