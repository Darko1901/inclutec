import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import type { OrigenFoto } from './foto';

interface Props {
  visible: boolean;
  onElegir: (origen: OrigenFoto) => void;
  onCancelar: () => void;
  /** El diálogo ya terminó de cerrarse: ahora sí se puede abrir el selector del sistema. */
  onCerrado: () => void;
  /** Por omisión es el diálogo de la foto de perfil; el logotipo de la empresa cambia los textos. */
  titulo?: string;
  descripcion?: string;
  /** Sin cámara solo se ofrece la galería (el logotipo casi siempre ya es un archivo). */
  conCamara?: boolean;
}

const DESCRIPCION_FOTO =
  'Tu foto es opcional y la verán las empresas a las que te postules. Debe ser JPG o PNG de hasta 2 MB.';

function Contenido({
  onElegir,
  onCancelar,
  titulo = 'Cambiar foto',
  descripcion = DESCRIPCION_FOTO,
  conCamara = true,
}: Omit<Props, 'visible' | 'onCerrado'>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <View style={estilos.fondo}>
      <View accessibilityViewIsModal style={estilos.cuadro}>
        <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
          {titulo}
        </Texto>
        <Texto color="textoSecundarioSobreGris">{descripcion}</Texto>
        <View style={estilos.acciones}>
          <Boton
            titulo="Elegir de la galería"
            icono="images-outline"
            onPress={() => onElegir('galeria')}
            testID="foto-galeria"
          />
          {conCamara ? (
            <>
              <Boton
                titulo="Tomar una foto"
                icono="camera-outline"
                variante="secundario"
                accessibilityHint="IncluTec te pedirá permiso para usar la cámara"
                onPress={() => onElegir('camara')}
                testID="foto-camara"
              />
              <Texto variante="pequeno" color="textoSecundarioSobreGris">
                Para tomar la foto, IncluTec necesita usar la cámara de tu teléfono. Solo se usa
                para tu foto de perfil.
              </Texto>
            </>
          ) : null}
          <Boton titulo="Cancelar" variante="texto" onPress={onCancelar} />
        </View>
      </View>
    </View>
  );
}

/** Diálogo para elegir de dónde sale la foto, con la explicación del permiso de la cámara. */
export function ModalFoto({ visible, onCerrado, ...resto }: Props) {
  return (
    <VentanaModal
      visible={visible}
      tipo="dialogo"
      onCerrar={resto.onCancelar}
      onCerrado={onCerrado}
      testID="modal-foto"
    >
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
