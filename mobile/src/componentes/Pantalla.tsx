import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espaciado } from '../tema';

interface PantallaProps {
  children: ReactNode;
  /** Con `desplazable` el contenido hace scroll y sube con el teclado (formularios). */
  desplazable?: boolean;
  centrado?: boolean;
}

export function Pantalla({ children, desplazable = false, centrado = false }: PantallaProps) {
  return (
    <SafeAreaView style={estilos.area} edges={['top', 'left', 'right']}>
      {desplazable ? (
        <KeyboardAvoidingView
          style={estilos.area}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[estilos.contenido, centrado && estilos.centrado]}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[estilos.area, estilos.contenido, centrado && estilos.centrado]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { padding: espaciado.xl, gap: espaciado.lg },
  centrado: { flexGrow: 1, justifyContent: 'center' },
});
