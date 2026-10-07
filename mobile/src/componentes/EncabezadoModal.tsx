import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';
import { useFocoEnTitulo } from './useFocoEnTitulo';

interface AccionEncabezado {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  deshabilitada?: boolean;
}

interface EncabezadoModalProps {
  titulo: string;
  /** Cierra el modal (si hace falta, primero guarda). */
  onVolver: () => void;
  /** Explica qué hace «Volver» cuando no es solo cerrar, por ejemplo «Guarda tus cambios». */
  pistaVolver?: string;
  volverDeshabilitado?: boolean;
  /** Acción opcional a la derecha, por ejemplo «Guardar». */
  accion?: AccionEncabezado;
}

/** Encabezado de los modales de pantalla completa: «‹ Volver», título y acción opcional. */
export function EncabezadoModal({
  titulo,
  onVolver,
  pistaVolver,
  volverDeshabilitado = false,
  accion,
}: EncabezadoModalProps) {
  const referenciaTitulo = useFocoEnTitulo();

  return (
    <View style={estilos.fila}>
      <Pressable
        onPress={volverDeshabilitado ? undefined : onVolver}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        accessibilityHint={pistaVolver}
        accessibilityState={{ disabled: volverDeshabilitado }}
        style={estilos.volver}
      >
        <Ionicons
          name="chevron-back"
          size={26}
          color={colores.primario}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Texto
          variante="boton"
          color="primario"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          Volver
        </Texto>
      </Pressable>
      <Texto
        ref={referenciaTitulo}
        variante="cuerpoFuerte"
        accessibilityRole="header"
        style={estilos.titulo}
      >
        {titulo}
      </Texto>
      <View style={estilos.accion}>
        {accion ? (
          <Boton
            titulo={accion.titulo}
            variante="texto"
            onPress={accion.onPress}
            cargando={accion.cargando}
            deshabilitado={accion.deshabilitada}
          />
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: AREA_TACTIL_MINIMA,
    minHeight: AREA_TACTIL_MINIMA,
    paddingRight: espaciado.sm,
  },
  titulo: { flex: 1, textAlign: 'center' },
  // Mismo ancho mínimo que «Volver» para que el título quede centrado aunque no haya acción.
  accion: { minWidth: AREA_TACTIL_MINIMA + espaciado.xl, alignItems: 'flex-end' },
});
