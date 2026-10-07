import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Notificacion } from '../../../api';
import { Texto } from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import { formatearRelativo } from '../../../utilidades/fechas';
import { TIPOS_NOTIFICACION } from './tiposNotificacion';

interface Props {
  notificacion: Notificacion;
  /** Si hay pantalla relacionada, la pista del lector de pantalla lo dice. */
  tieneDestino: boolean;
  onPress: () => void;
}

export function ItemNotificacion({ notificacion, tieneDestino, onPress }: Props) {
  const { titulo, mensaje, leida, tipo, creado_en } = notificacion;
  const datos = TIPOS_NOTIFICACION[tipo];
  const fecha = formatearRelativo(creado_en);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${leida ? '' : 'Nueva. '}${titulo}. ${mensaje}. ${fecha}`}
      accessibilityHint={tieneDestino ? 'Abre la pantalla relacionada' : undefined}
      style={[estilos.fila, !leida && estilos.noLeida]}
    >
      <View style={[estilos.icono, { borderColor: colores[datos.color] }]}>
        <Ionicons
          name={datos.icono}
          size={22}
          color={colores[datos.color]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View style={estilos.textos}>
        <View style={estilos.cabecera}>
          <Texto
            variante={leida ? 'cuerpo' : 'cuerpoFuerte'}
            style={estilos.titulo}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {titulo}
          </Texto>
          {!leida ? (
            <View
              style={estilos.etiqueta}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Texto variante="pequeno" style={{ color: colores.sobrePrimario, fontWeight: '700' }}>
                Nueva
              </Texto>
            </View>
          ) : null}
        </View>
        <Texto accessibilityElementsHidden importantForAccessibility="no">
          {mensaje}
        </Texto>
        <Texto
          variante="pequeno"
          color="textoSecundarioSobreGris"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {fecha}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    padding: espaciado.lg,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
  noLeida: { backgroundColor: colores.infoFondo },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radio.completo,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.fondo,
  },
  textos: { flex: 1, gap: espaciado.xs },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  titulo: { flex: 1 },
  etiqueta: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: 2,
    borderRadius: radio.completo,
    backgroundColor: colores.primario,
  },
});
