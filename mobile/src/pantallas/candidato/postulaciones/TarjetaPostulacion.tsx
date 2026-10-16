import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { PostulacionResumen } from '../../../api';
import { ChipEstado, LogoEmpresa, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { resumenAccesiblePostulacion, textoEntrevista, textoPostulaste } from './textosPostulacion';

interface Props {
  postulacion: PostulacionResumen;
  onPress: () => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const ocultarTodo = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Tarjeta de CAN-05. Para el lector de pantalla es un solo elemento con todo su resumen; sus
 * textos, el logotipo y el estado quedan ocultos para que no se lean por separado.
 */
export function TarjetaPostulacion({ postulacion, onPress }: Props) {
  const { vacante } = postulacion;

  return (
    <Tarjeta
      testID={`postulacion-${postulacion.id}`}
      onPress={onPress}
      accessibilityLabel={resumenAccesiblePostulacion(postulacion)}
      accessibilityHint="Abre el detalle de la postulación"
    >
      <View style={estilos.fila}>
        <LogoEmpresa logoUrl={vacante.empresa.logo_url} nombre={vacante.empresa.nombre_comercial} />
        <View style={estilos.flexible}>
          <Texto variante="subtitulo" {...ocultar}>
            {vacante.titulo}
          </Texto>
          <Texto variante="cuerpoFuerte" {...ocultar}>
            {vacante.empresa.nombre_comercial}
          </Texto>
        </View>
      </View>

      <Texto variante="pequeno" color="textoSecundarioSobreGris" {...ocultar}>
        {textoPostulaste(postulacion.creado_en)}
      </Texto>

      <View {...ocultarTodo}>
        <ChipEstado tipo="postulacion" estado={postulacion.estado} />
      </View>

      {postulacion.entrevista_inicio ? (
        <View style={estilos.entrevista} {...ocultar}>
          <Ionicons
            name="videocam-outline"
            size={18}
            color={colores.secundarioTexto}
            {...ocultar}
          />
          <Texto variante="cuerpoFuerte" style={estilos.textoEntrevista} {...ocultar}>
            {textoEntrevista(postulacion.entrevista_inicio)}
          </Texto>
        </View>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  flexible: { flex: 1, flexShrink: 1 },
  entrevista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    alignSelf: 'flex-start',
    backgroundColor: colores.secundarioFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: 999,
  },
  textoEntrevista: { color: colores.secundarioTexto, flexShrink: 1 },
});
