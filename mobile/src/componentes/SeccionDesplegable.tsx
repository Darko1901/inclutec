import { Ionicons } from '@expo/vector-icons';
import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

interface SeccionDesplegableProps {
  ref?: Ref<View>;
  titulo: string;
  expandida: boolean;
  onAlternar: () => void;
  icono?: keyof typeof Ionicons.glyphMap;
  /** Texto breve bajo el título cuando la sección está contraída. */
  resumen?: string;
  children: ReactNode;
  testID?: string;
}

/**
 * Sección que se despliega con un botón (con su estado expandido o contraído). El contenido sigue
 * montado al contraerla para no perder lo que la persona ya escribió.
 */
export function SeccionDesplegable({
  ref,
  titulo,
  expandida,
  onAlternar,
  icono,
  resumen,
  children,
  testID,
}: SeccionDesplegableProps) {
  return (
    <View testID={testID} style={estilos.contenedor}>
      <Pressable
        ref={ref}
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityLabel={resumen && !expandida ? `${titulo}. ${resumen}` : titulo}
        accessibilityHint={
          expandida ? 'Toca para contraer la sección' : 'Toca para expandir la sección'
        }
        accessibilityState={{ expanded: expandida }}
        style={estilos.encabezado}
      >
        {icono ? (
          <Ionicons
            name={icono}
            size={24}
            color={colores.primario}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
        <View style={estilos.textos}>
          <Texto variante="subtitulo" accessibilityElementsHidden importantForAccessibility="no">
            {titulo}
          </Texto>
          {resumen && !expandida ? (
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {resumen}
            </Texto>
          ) : null}
        </View>
        <Ionicons
          name={expandida ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colores.texto}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>
      <View style={expandida ? estilos.contenido : estilos.oculto}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    overflow: 'hidden',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA + espaciado.md,
    padding: espaciado.lg,
  },
  textos: { flex: 1, gap: espaciado.xs },
  contenido: { gap: espaciado.lg, paddingHorizontal: espaciado.lg, paddingBottom: espaciado.lg },
  oculto: { display: 'none' },
});
