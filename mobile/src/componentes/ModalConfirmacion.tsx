import { Modal, StyleSheet, View } from 'react-native';

import { colores, espaciado, radio } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface ModalConfirmacionProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Acciones que no se pueden deshacer usan el botón rojo. */
  peligro?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ModalConfirmacion({
  visible,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligro = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={estilos.fondo}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={estilos.cuadro}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {titulo}
          </Texto>
          <Texto>{mensaje}</Texto>
          <View style={estilos.acciones}>
            <Boton
              titulo={textoConfirmar}
              onPress={onConfirmar}
              variante={peligro ? 'peligro' : 'primario'}
              cargando={cargando}
            />
            <Boton
              titulo={textoCancelar}
              onPress={onCancelar}
              variante="secundario"
              deshabilitado={cargando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'center',
    padding: espaciado.xl,
    backgroundColor: colores.superposicion,
  },
  cuadro: {
    gap: espaciado.lg,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
  acciones: { gap: espaciado.sm },
});
