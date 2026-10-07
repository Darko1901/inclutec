import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';

import { Boton, Pantalla, Texto } from '../../componentes';
import { AVISO_PRIVACIDAD } from '../../contenido/avisoPrivacidad';
import type { RootStackParamList } from '../../navegacion';
import { espaciado } from '../../tema';
import { leerMarkdown, type BloqueTexto } from '../../utilidades/markdown';

type Props = NativeStackScreenProps<RootStackParamList, 'AvisoPrivacidad'>;

const BLOQUES = leerMarkdown(AVISO_PRIVACIDAD);

function Contenido({ bloque }: { bloque: BloqueTexto }) {
  const partes = bloque.partes.map((parte, indice) => (
    <Text key={indice} style={parte.negrita ? estilos.negrita : undefined}>
      {parte.texto}
    </Text>
  ));
  switch (bloque.tipo) {
    case 'titulo':
      return (
        <Texto variante="titulo" accessibilityRole="header">
          {partes}
        </Texto>
      );
    case 'seccion':
      return (
        <Texto variante="subtitulo" accessibilityRole="header" style={estilos.seccion}>
          {partes}
        </Texto>
      );
    case 'vineta':
      return (
        <View style={estilos.vineta}>
          <Texto accessibilityElementsHidden importantForAccessibility="no">
            •
          </Texto>
          <Texto style={estilos.textoVineta}>{partes}</Texto>
        </View>
      );
    default:
      return <Texto>{partes}</Texto>;
  }
}

/** Aviso de privacidad completo, con encabezados accesibles para saltar entre secciones. */
export default function AvisoPrivacidad({ navigation }: Props) {
  return (
    <Pantalla desplazable>
      {BLOQUES.map((bloque, indice) => (
        <Contenido key={indice} bloque={bloque} />
      ))}
      <Boton titulo="Volver" variante="secundario" onPress={() => navigation.goBack()} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  negrita: { fontWeight: '700' },
  seccion: { marginTop: espaciado.md },
  vineta: { flexDirection: 'row', gap: espaciado.sm },
  textoVineta: { flex: 1 },
});
