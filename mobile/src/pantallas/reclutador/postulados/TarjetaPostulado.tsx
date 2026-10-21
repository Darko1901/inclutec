import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Postulado } from '../../../api';
import { Avatar, ChipEstado, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import {
  ETIQUETA_AJUSTES,
  resumenAccesiblePostulado,
  textoCompatibilidad,
  textoSePostulo,
} from './textosPostulados';

interface Props {
  postulado: Postulado;
  onPress: () => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const ocultarTodo = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Tarjeta de REC-04. Para el lector de pantalla es un solo elemento con todo su resumen. No dice
 * nada sobre discapacidad: solo si hay ajustes por confirmar.
 */
export function TarjetaPostulado({ postulado, onPress }: Props) {
  const { candidato } = postulado;
  return (
    <Tarjeta
      testID={`postulado-${postulado.postulacion_id}`}
      onPress={onPress}
      accessibilityLabel={resumenAccesiblePostulado(postulado)}
      accessibilityHint="Abre el detalle del postulado"
    >
      <View style={estilos.fila}>
        <View {...ocultarTodo}>
          <Avatar
            fotoUrl={candidato.foto_url}
            nombre={candidato.nombre}
            apellidos={candidato.apellidos}
            tamano={48}
          />
        </View>
        <View style={estilos.flexible}>
          <Texto variante="subtitulo" {...ocultar}>
            {`${candidato.nombre} ${candidato.apellidos}`}
          </Texto>
          <Texto variante="cuerpoFuerte" {...ocultar}>
            {textoCompatibilidad(postulado.compatibilidad)}
          </Texto>
        </View>
      </View>
      <View {...ocultarTodo}>
        <ChipEstado tipo="postulacion" estado={postulado.estado} />
      </View>
      <Texto variante="pequeno" color="textoSecundarioSobreGris" {...ocultar}>
        {textoSePostulo(postulado.creado_en)}
      </Texto>
      {postulado.ajustes_por_confirmar ? (
        <View style={estilos.etiqueta} {...ocultarTodo}>
          <Ionicons name="help-circle-outline" size={18} color={colores.infoTexto} {...ocultar} />
          <Texto variante="pequeno" style={estilos.textoEtiqueta} {...ocultar}>
            {ETIQUETA_AJUSTES}
          </Texto>
        </View>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  flexible: { flex: 1, flexShrink: 1 },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: radio.completo,
    backgroundColor: colores.infoFondo,
  },
  textoEtiqueta: { color: colores.infoTexto, fontWeight: '600' },
});
