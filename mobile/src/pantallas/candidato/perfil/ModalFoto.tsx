import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import type { OrigenFoto } from './foto';

interface Props {
  visible: boolean;
  onElegir: (origen: OrigenFoto) => void;
  onCancelar: () => void;
}

function Contenido({ onElegir, onCancelar }: Omit<Props, 'visible'>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <View style={estilos.fondo}>
      <View accessibilityViewIsModal style={estilos.cuadro}>
        <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
          Cambiar foto
        </Texto>
        <Texto color="textoSecundarioSobreGris">
          Tu foto es opcional y la verán las empresas a las que te postules. Debe ser JPG o PNG de
          hasta 2 MB.
        </Texto>
        <View style={estilos.acciones}>
          <Boton
            titulo="Elegir de la galería"
            icono="images-outline"
            onPress={() => onElegir('galeria')}
            testID="foto-galeria"
          />
          <Boton
            titulo="Tomar una foto"
            icono="camera-outline"
            variante="secundario"
            accessibilityHint="IncluTec te pedirá permiso para usar la cámara"
            onPress={() => onElegir('camara')}
            testID="foto-camara"
          />
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            Para tomar la foto, IncluTec necesita usar la cámara de tu teléfono. Solo se usa para tu
            foto de perfil.
          </Texto>
          <Boton titulo="Cancelar" variante="texto" onPress={onCancelar} />
        </View>
      </View>
    </View>
  );
}

/** Diálogo para elegir de dónde sale la foto, con la explicación del permiso de la cámara. */
export function ModalFoto({ visible, ...resto }: Props) {
  return (
    <VentanaModal visible={visible} tipo="dialogo" onCerrar={resto.onCancelar} testID="modal-foto">
      <Contenido {...resto} />
    </VentanaModal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', padding: espaciado.xl },
  cuadro: {
    gap: espaciado.lg,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
  acciones: { gap: espaciado.sm },
});
