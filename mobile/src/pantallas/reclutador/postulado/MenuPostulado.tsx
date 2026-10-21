import { StyleSheet, View } from 'react-native';

import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';

interface Props {
  visible: boolean;
  nombre: string;
  onReportar: () => void;
  onCancelar: () => void;
  /** El menú ya terminó de cerrarse: ahora sí se puede abrir otra ventana. */
  onCerrado?: () => void;
}

function Contenido({
  nombre,
  onReportar,
  onCancelar,
}: Pick<Props, 'nombre' | 'onReportar' | 'onCancelar'>) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <View style={estilos.fondo}>
      <View accessibilityViewIsModal style={estilos.cuadro}>
        <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
          Más opciones
        </Texto>
        <Texto color="textoSecundarioSobreGris">{nombre}</Texto>
        <View style={estilos.acciones}>
          <Boton
            titulo="Reportar perfil"
            icono="flag-outline"
            variante="secundario"
            accessibilityHint="Avisa al equipo de IncluTec sobre este perfil"
            onPress={onReportar}
            testID="accion-reportar-perfil"
          />
          <Boton titulo="Cancelar" variante="texto" onPress={onCancelar} />
        </View>
      </View>
    </View>
  );
}

/** Menú ⋮ del postulado: «Reportar perfil». */
export function MenuPostulado({ visible, onCerrado, ...resto }: Props) {
  return (
    <VentanaModal
      visible={visible}
      tipo="dialogo"
      onCerrar={resto.onCancelar}
      onCerrado={onCerrado}
      testID="menu-postulado"
    >
      <Contenido {...resto} />
    </VentanaModal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', padding: espaciado.xl },
  cuadro: {
    gap: espaciado.md,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
  acciones: { gap: espaciado.sm },
});
