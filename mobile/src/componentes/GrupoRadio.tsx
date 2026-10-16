import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado } from '../tema';
import { Texto } from './Texto';

export interface OpcionRadio<T extends string> {
  valor: T;
  titulo: string;
  ayuda?: string;
}

interface GrupoRadioProps<T extends string> {
  etiqueta: string;
  opciones: OpcionRadio<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  testID?: string;
}

/** Opciones excluyentes en pantalla (3 o menos): cada una es un radio con su estado marcado. */
export function GrupoRadio<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  testID,
}: GrupoRadioProps<T>) {
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={etiqueta}
      style={estilos.grupo}
    >
      <Texto variante="etiqueta" accessibilityRole="header">
        {etiqueta}
      </Texto>
      {opciones.map((opcion) => {
        const marcada = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => onCambio(opcion.valor)}
            accessibilityRole="radio"
            accessibilityLabel={opcion.titulo}
            accessibilityHint={opcion.ayuda}
            accessibilityState={{ checked: marcada, selected: marcada }}
            style={estilos.opcion}
          >
            <Ionicons
              name={marcada ? 'radio-button-on' : 'radio-button-off'}
              size={26}
              color={colores.primario}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={estilos.textos}>
              <Texto
                variante={marcada ? 'cuerpoFuerte' : 'cuerpo'}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {opcion.titulo}
              </Texto>
              {opcion.ayuda ? (
                <Texto
                  variante="pequeno"
                  color="textoSecundarioSobreGris"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {opcion.ayuda}
                </Texto>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.xs },
  opcion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingVertical: espaciado.sm,
  },
  textos: { flex: 1, gap: espaciado.xs },
});
