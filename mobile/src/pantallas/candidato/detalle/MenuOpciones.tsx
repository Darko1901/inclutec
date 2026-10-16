import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onReportar: () => void;
  /** «Reportar vacante» (CAN-02) o «Reportar empresa» (CAN-07). */
  textoReportar?: string;
}

function Contenido({
  onCerrar,
  onReportar,
  textoReportar = 'Reportar vacante',
}: Omit<Props, 'visible'>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <VentanaModal visible onCerrar={onCerrar} tipo="dialogo" testID="menu-opciones">
      <View style={estilos.fondo}>
        <View accessibilityViewIsModal style={estilos.cuadro}>
          <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
            Más opciones
          </Texto>
          <Boton
            titulo={textoReportar}
            icono="flag-outline"
            variante="secundario"
            onPress={onReportar}
          />
          <Boton titulo="Cancelar" variante="texto" onPress={onCerrar} />
        </View>
      </View>
    </VentanaModal>
  );
}

/** Menú ⋮ de CAN-02 y CAN-07: ofrece reportar lo que se está viendo. */
export function MenuOpciones({ visible, ...resto }: Props) {
  return visible ? <Contenido {...resto} /> : null;
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', padding: espaciado.xl },
  cuadro: {
    gap: espaciado.md,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
});
