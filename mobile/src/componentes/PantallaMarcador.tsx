import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Pantalla } from './Pantalla';
import { Texto } from './Texto';

interface PantallaMarcadorProps {
  codigo: string;
  nombre: string;
  /** Contenido extra de la tarea actual (por ejemplo, el botón «Cerrar sesión»). */
  children?: ReactNode;
}

/** Marcador de una pantalla que se programa en una tarea posterior. */
export function PantallaMarcador({ codigo, nombre, children }: PantallaMarcadorProps) {
  return (
    <Pantalla centrado desplazable>
      <View
        style={estilos.centro}
        accessible
        accessibilityLabel={`${codigo}, ${nombre}. Pendiente`}
      >
        <Ionicons
          name="construct-outline"
          size={48}
          color={colores.textoSecundarioSobreGris}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Texto variante="subtitulo" accessibilityRole="header" style={estilos.texto}>
          {`${codigo} · ${nombre}`}
        </Texto>
        <Texto color="textoSecundarioSobreGris">Pendiente</Texto>
      </View>
      {children}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', gap: espaciado.md },
  texto: { textAlign: 'center' },
});
