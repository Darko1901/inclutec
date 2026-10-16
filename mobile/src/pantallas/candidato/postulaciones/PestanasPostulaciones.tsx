import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import {
  cantidadPostulaciones,
  TITULO_PESTANA,
  type PestanaPostulaciones,
} from './textosPostulacion';

interface Props {
  pestana: PestanaPostulaciones;
  /** Cantidad de postulaciones de cada pestaña; null mientras se consulta. */
  conteos: Record<PestanaPostulaciones, number | null>;
  onChange: (pestana: PestanaPostulaciones) => void;
}

const PESTANAS: PestanaPostulaciones[] = ['activas', 'finalizadas'];

/** Pestañas Activas / Finalizadas: rol de pestaña, con su número y la elegida marcada con palomita. */
export function PestanasPostulaciones({ pestana, conteos, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={estilos.pestanas}>
      {PESTANAS.map((id) => {
        const elegida = id === pestana;
        const cantidad = conteos[id];
        const titulo = TITULO_PESTANA[id];
        return (
          <Pressable
            key={id}
            testID={`pestana-${id}`}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityLabel={
              cantidad === null ? titulo : `${titulo}, ${cantidadPostulaciones(cantidad)}`
            }
            accessibilityState={{ selected: elegida }}
            style={[estilos.pestana, elegida && estilos.pestanaElegida]}
          >
            {elegida ? (
              <Ionicons
                name="checkmark"
                size={18}
                color={colores.sobrePrimario}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ) : null}
            <Texto
              variante="boton"
              style={{ color: elegida ? colores.sobrePrimario : colores.primario }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {cantidad === null ? titulo : `${titulo} (${cantidad})`}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  pestanas: { flexDirection: 'row', gap: espaciado.sm },
  pestana: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: colores.primario,
    backgroundColor: colores.fondo,
  },
  pestanaElegida: { backgroundColor: colores.primario },
});
