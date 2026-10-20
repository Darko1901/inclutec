import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

interface Props<T extends string> {
  estados: T[];
  /** null = todos los estados. */
  valor: T | null;
  onChange: (estado: T | null) => void;
  /** Texto en pantalla de cada estado. */
  textoDe: (estado: T) => string;
  etiqueta?: string;
}

/** Filtro por estado: opciones excluyentes (radio); la elegida lleva palomita y se marca en el lector. */
export function FiltroEstado<T extends string>({
  estados,
  valor,
  onChange,
  textoDe,
  etiqueta = 'Filtrar por estado',
}: Props<T>) {
  const opciones: { clave: string; estado: T | null; texto: string }[] = [
    { clave: 'todos', estado: null, texto: 'Todos' },
    ...estados.map((estado) => ({ clave: estado, estado, texto: textoDe(estado) })),
  ];

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={estilos.grupo}>
      {opciones.map(({ clave, estado, texto }) => {
        const elegida = estado === valor;
        return (
          <Pressable
            key={clave}
            testID={`filtro-${clave}`}
            onPress={() => onChange(estado)}
            accessibilityRole="radio"
            accessibilityLabel={texto}
            accessibilityState={{ checked: elegida }}
            style={[estilos.opcion, elegida && estilos.opcionElegida]}
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
              {texto}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.md,
    borderRadius: radio.completo,
    borderWidth: 2,
    borderColor: colores.primario,
    backgroundColor: colores.fondo,
  },
  opcionElegida: { backgroundColor: colores.primario },
});
