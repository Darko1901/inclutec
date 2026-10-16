import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { colores, espaciado } from '../tema';
import { Boton } from './Boton';
import { EncabezadoModal } from './EncabezadoModal';
import { VentanaModal } from './VentanaModal';

interface ModalFormularioProps {
  titulo: string;
  onCerrar: () => void;
  /** Botón fijo al pie («Guardar»). Sin él, el modal es de solo lectura. */
  accion?: {
    titulo: string;
    onPress: () => void;
    cargando?: boolean;
    deshabilitada?: boolean;
    /** Para acciones que no se pueden deshacer (botón rojo). */
    peligro?: boolean;
  };
  /** Con una operación en curso no se puede cerrar. */
  ocupado?: boolean;
  pistaVolver?: string;
  children: ReactNode;
  testID?: string;
}

/**
 * Modal de pantalla completa para formularios: título (el lector de pantalla empieza ahí), contenido
 * con desplazamiento y botón fijo al pie que respeta el área segura y sube con el teclado. Se
 * monta solo mientras está abierto, así cada apertura empieza con el formulario limpio.
 */
export function ModalFormulario({
  titulo,
  onCerrar,
  accion,
  ocupado = false,
  pistaVolver,
  children,
  testID,
}: ModalFormularioProps) {
  return (
    <VentanaModal visible onCerrar={ocupado ? () => undefined : onCerrar} testID={testID}>
      <EncabezadoModal
        titulo={titulo}
        onVolver={onCerrar}
        pistaVolver={pistaVolver}
        volverDeshabilitado={ocupado}
      />
      <KeyboardAvoidingView
        style={estilos.cuerpo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {accion ? (
          <View style={estilos.pie}>
            <Boton
              titulo={accion.titulo}
              variante={accion.peligro ? 'peligro' : 'primario'}
              onPress={accion.onPress}
              cargando={accion.cargando}
              deshabilitado={accion.deshabilitada}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </VentanaModal>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { flex: 1 },
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  pie: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
