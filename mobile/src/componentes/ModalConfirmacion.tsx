import { StyleSheet, View } from 'react-native';

import { colores, espaciado, radio } from '../tema';
import { Boton } from './Boton';
import { Texto } from './Texto';
import { useFocoEnTitulo } from './useFocoEnTitulo';
import { VentanaModal } from './VentanaModal';

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

function Contenido({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar,
  peligro,
  cargando,
  onConfirmar,
  onCancelar,
}: Required<Omit<ModalConfirmacionProps, 'visible'>>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <View style={estilos.fondo}>
      <View accessibilityViewIsModal accessibilityRole="alert" style={estilos.cuadro}>
        <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
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
  );
}

/** Diálogo de confirmación («¿Seguro que…?»). El botón atrás de Android equivale a cancelar. */
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
    <VentanaModal
      visible={visible}
      tipo="dialogo"
      onCerrar={onCancelar}
      testID="modal-confirmacion"
    >
      <Contenido
        titulo={titulo}
        mensaje={mensaje}
        textoConfirmar={textoConfirmar}
        textoCancelar={textoCancelar}
        peligro={peligro}
        cargando={cargando}
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
      />
    </VentanaModal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'center',
    padding: espaciado.xl,
  },
  cuadro: {
    gap: espaciado.lg,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
  acciones: { gap: espaciado.sm },
});
