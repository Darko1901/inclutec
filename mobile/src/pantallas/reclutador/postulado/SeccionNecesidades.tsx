import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { PostuladoDetalle } from '../../../api';
import { Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { TEXTO_NECESIDADES_INTRO, TEXTO_SIN_NECESIDADES, textoNecesidad } from './textosPostulado';

interface Props {
  necesidades: PostuladoDetalle['necesidades'];
  nota: string | null;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** Necesidades de ajuste: solo si el candidato las compartió en esta postulación. */
export function SeccionNecesidades({ necesidades, nota }: Props) {
  return (
    <Tarjeta testID="seccion-necesidades">
      <Texto variante="subtitulo" accessibilityRole="header">
        Necesidades de ajuste
      </Texto>
      {necesidades === null ? (
        <Texto color="textoSecundarioSobreGris" testID="sin-necesidades">
          {TEXTO_SIN_NECESIDADES}
        </Texto>
      ) : (
        <>
          <Texto color="textoSecundarioSobreGris">{TEXTO_NECESIDADES_INTRO}</Texto>
          {necesidades.length === 0 ? (
            <Texto>No registró necesidades.</Texto>
          ) : (
            necesidades.map((necesidad) => {
              const { cubierta, texto } = textoNecesidad(necesidad);
              return (
                <View
                  key={necesidad.id}
                  accessible
                  accessibilityLabel={`${necesidad.nombre}. ${texto}`}
                  style={estilos.fila}
                  testID={`necesidad-${necesidad.id}`}
                >
                  <Ionicons
                    name={cubierta ? 'checkmark-circle' : 'help-circle'}
                    size={22}
                    color={cubierta ? colores.exitoTexto : colores.advertenciaTexto}
                    {...ocultar}
                  />
                  <View style={estilos.textos}>
                    <Texto variante="cuerpoFuerte" {...ocultar}>
                      {necesidad.nombre}
                    </Texto>
                    <Texto variante="pequeno" color="textoSecundarioSobreGris" {...ocultar}>
                      {cubierta ? `✓ ${texto}` : texto}
                    </Texto>
                  </View>
                </View>
              );
            })
          )}
          {nota ? (
            <View accessible accessibilityLabel={`Nota del candidato: ${nota}`}>
              <Texto variante="cuerpoFuerte" {...ocultar}>
                Nota del candidato
              </Texto>
              <Texto {...ocultar}>{nota}</Texto>
            </View>
          ) : null}
        </>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  textos: { flex: 1, gap: espaciado.xs },
});
