import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onReportar: () => void;
}

function Contenido({ onCerrar, onReportar }: Omit<Props, 'visible'>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <VentanaModal visible onCerrar={onCerrar} tipo="dialogo" testID="menu-opciones">
      <View style={estilos.fondo}>
        <View accessibilityViewIsModal style={estilos.cuadro}>
          <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
            Más opciones
          </Texto>
          <Boton
            titulo="Reportar vacante"
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

/** Menú ⋮ de CAN-02: por ahora solo ofrece «Reportar vacante». */
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
