import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Compatibilidad } from '../../../api';
import { Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { porcentajeAccesible } from '../vacantes/textos';
import { lineasCompatibilidad, type NivelLinea } from './textosDetalle';

const NIVELES: Record<NivelLinea, { icono: keyof typeof Ionicons.glyphMap; color: string }> = {
  bien: { icono: 'checkmark-circle', color: colores.exitoTexto },
  parcial: { icono: 'alert-circle', color: colores.advertenciaTexto },
  mal: { icono: 'close-circle', color: colores.errorTexto },
  neutro: { icono: 'information-circle', color: colores.infoTexto },
};

/** Compatibilidad con la vacante y su desglose en texto, cada línea con ícono y palabras. */
export function TarjetaCompatibilidad({ desglose }: { desglose: Compatibilidad }) {
  return (
    <View style={estilos.tarjeta} testID="tarjeta-compatibilidad">
      <Texto
        variante="subtitulo"
        accessibilityRole="header"
        accessibilityLabel={`Compatibilidad ${porcentajeAccesible(desglose.puntaje)}`}
      >
        {`Compatibilidad ${desglose.puntaje} %`}
      </Texto>
      {lineasCompatibilidad(desglose).map((linea) => {
        const nivel = NIVELES[linea.nivel];
        return (
          <View key={linea.clave} style={estilos.linea} accessible accessibilityLabel={linea.texto}>
            <Ionicons
              name={nivel.icono}
              size={22}
              color={nivel.color}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Texto style={estilos.texto} accessibilityElementsHidden importantForAccessibility="no">
              {linea.texto}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  linea: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  texto: { flex: 1 },
});
