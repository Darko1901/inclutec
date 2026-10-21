import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { Entrevista } from '../../../api';
import { Boton, ChipEstado, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import {
  formatearFechaLarga,
  formatearHora,
  formatearHoraHablada,
} from '../../../utilidades/fechas';

interface Props {
  entrevista: Entrevista;
  onAbrirLiga: () => void;
  onCopiarLiga: () => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Entrevista del postulado: fecha, hora y duración, y la liga mientras siga agendada. */
export function TarjetaEntrevistaPostulado({ entrevista, onAbrirLiga, onCopiarLiga }: Props) {
  return (
    <Tarjeta testID="tarjeta-entrevista">
      <Texto variante="subtitulo" accessibilityRole="header">
        Entrevista
      </Texto>
      <ChipEstado tipo="entrevista" estado={entrevista.estado} />
      <View
        accessible
        accessibilityLabel={`${formatearFechaLarga(entrevista.inicio)}, a las ${formatearHoraHablada(entrevista.inicio)}, ${entrevista.duracion_min} minutos`}
        style={estilos.datos}
        testID="datos-entrevista"
      >
        <View style={estilos.fila} {...ocultar}>
          <Ionicons name="calendar-outline" size={20} color={colores.texto} {...ocultar} />
          <Texto style={estilos.flexible}>
            {capitalizar(formatearFechaLarga(entrevista.inicio))}
          </Texto>
        </View>
        <View style={estilos.fila} {...ocultar}>
          <Ionicons name="time-outline" size={20} color={colores.texto} {...ocultar} />
          <Texto
            style={estilos.flexible}
          >{`${formatearHora(entrevista.inicio)} · ${entrevista.duracion_min} min`}</Texto>
        </View>
      </View>
      {entrevista.estado === 'agendada' ? (
        <>
          <Texto selectable accessibilityLabel={`Liga: ${entrevista.liga}`}>
            {entrevista.liga}
          </Texto>
          <Boton titulo="Abrir liga" icono="open-outline" onPress={onAbrirLiga} />
          <Boton
            titulo="Copiar liga"
            icono="copy-outline"
            variante="secundario"
            onPress={onCopiarLiga}
          />
        </>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  datos: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flexible: { flexShrink: 1 },
});
