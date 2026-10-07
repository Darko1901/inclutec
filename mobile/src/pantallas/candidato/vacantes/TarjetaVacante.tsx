import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { VacanteResumen } from '../../../api';
import { Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { ICONO_CATEGORIA } from './categoriasAjuste';
import { MAX_AJUSTES_EN_TARJETA, resumenAccesible } from './textos';

interface Props {
  vacante: VacanteResumen;
  onPress: () => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/**
 * Tarjeta de CAN-01. Para el lector de pantalla es un solo elemento con todo el resumen; sus
 * textos e íconos quedan ocultos para que no se lean por separado.
 */
export function TarjetaVacante({ vacante, onPress }: Props) {
  const ajustes = vacante.ajustes.slice(0, MAX_AJUSTES_EN_TARJETA);

  return (
    <Tarjeta
      testID={`vacante-${vacante.id}`}
      onPress={onPress}
      accessibilityLabel={resumenAccesible(vacante)}
      accessibilityHint="Abre el detalle de la vacante"
    >
      <Texto variante="subtitulo" {...ocultar}>
        {vacante.titulo}
      </Texto>

      <View style={estilos.fila}>
        <Texto variante="cuerpoFuerte" style={estilos.flexible} {...ocultar}>
          {vacante.empresa.nombre_comercial}
        </Texto>
        {vacante.empresa.validada ? (
          <View style={estilos.insignia} {...ocultar}>
            <Ionicons name="checkmark-circle" size={18} color={colores.exitoTexto} {...ocultar} />
            <Texto variante="pequeno" style={estilos.textoInsignia} {...ocultar}>
              Empresa validada
            </Texto>
          </View>
        ) : null}
      </View>

      <View style={estilos.fila} {...ocultar}>
        <Ionicons name="location-outline" size={18} color={colores.texto} {...ocultar} />
        <Texto variante="pequeno" style={estilos.flexible} {...ocultar}>
          {`${vacante.modalidad.nombre} · ${vacante.municipio.nombre}`}
        </Texto>
      </View>

      {vacante.compatibilidad !== null ? (
        <View style={estilos.compatibilidad} {...ocultar}>
          <Ionicons name="analytics-outline" size={18} color={colores.primario} {...ocultar} />
          <Texto variante="cuerpoFuerte" color="primario" {...ocultar}>
            {`Compatibilidad ${vacante.compatibilidad} %`}
          </Texto>
        </View>
      ) : null}

      <View style={estilos.ajustes} {...ocultar}>
        {ajustes.length > 0 ? (
          ajustes.map((ajuste) => (
            <View key={ajuste.id} style={estilos.fila} {...ocultar}>
              <Ionicons
                name={ICONO_CATEGORIA[ajuste.categoria]}
                size={18}
                color={colores.texto}
                {...ocultar}
              />
              <Texto variante="pequeno" style={estilos.flexible} {...ocultar}>
                {ajuste.nombre}
              </Texto>
            </View>
          ))
        ) : (
          <Texto variante="pequeno" color="textoSecundario" {...ocultar}>
            Sin ajustes de accesibilidad declarados
          </Texto>
        )}
      </View>

      {vacante.postulacion_id !== null ? (
        <View style={estilos.postulada} {...ocultar}>
          <Ionicons name="checkmark-circle" size={18} color={colores.infoTexto} {...ocultar} />
          <Texto variante="pequeno" style={estilos.textoPostulada} {...ocultar}>
            Ya te postulaste
          </Texto>
        </View>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flexible: { flexShrink: 1 },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    backgroundColor: colores.exitoFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: 999,
  },
  textoInsignia: { color: colores.exitoTexto, fontWeight: '600' },
  compatibilidad: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  ajustes: { gap: espaciado.xs },
  postulada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    alignSelf: 'flex-start',
    backgroundColor: colores.infoFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: 999,
  },
  textoPostulada: { color: colores.infoTexto, fontWeight: '600' },
});
