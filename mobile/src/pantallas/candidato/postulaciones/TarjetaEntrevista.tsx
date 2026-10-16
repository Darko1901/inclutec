import { Ionicons } from '@expo/vector-icons';
import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Entrevista } from '../../../api';
import { Boton, ChipEstado, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import {
  formatearFechaLarga,
  formatearHora,
  formatearHoraHablada,
} from '../../../utilidades/fechas';
import {
  ACLARACION_CANCELAR,
  duracionCorta,
  duracionHablada,
  EXPLICACION_CANCELACION_TARDIA,
} from './textosEntrevista';

interface Props {
  entrevista: Entrevista;
  onAbrirLiga: () => void;
  onCopiarLiga: () => void;
  onCancelar: () => void;
  /** Para devolver el foco del lector de pantalla a estos botones (ver useRetornoFoco). */
  refCancelar?: Ref<View>;
  refTitulo?: Ref<View>;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** Entrevista de la postulación: fecha, hora, duración y liga, con las acciones que permita el momento. */
export function TarjetaEntrevista({
  entrevista,
  onAbrirLiga,
  onCopiarLiga,
  onCancelar,
  refCancelar,
  refTitulo,
}: Props) {
  const agendada = entrevista.estado === 'agendada';

  return (
    <Tarjeta testID="tarjeta-entrevista">
      <View
        ref={refTitulo}
        accessible
        accessibilityRole="header"
        accessibilityLabel="Tu entrevista"
      >
        <Texto variante="subtitulo" {...ocultar}>
          Tu entrevista
        </Texto>
      </View>
      <ChipEstado tipo="entrevista" estado={entrevista.estado} />

      <View
        accessible
        accessibilityLabel={`${formatearFechaLarga(entrevista.inicio)}, a las ${formatearHoraHablada(
          entrevista.inicio,
        )}, ${duracionHablada(entrevista.duracion_min)}`}
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
          <Texto style={estilos.flexible}>
            {`${formatearHora(entrevista.inicio)} · ${duracionCorta(entrevista.duracion_min)}`}
          </Texto>
        </View>
      </View>

      {agendada ? (
        <>
          <View style={estilos.fila}>
            <Ionicons
              name="videocam-outline"
              size={20}
              color={colores.texto}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Texto
              selectable
              style={estilos.flexible}
              accessibilityLabel={`Liga: ${entrevista.liga}`}
            >
              {entrevista.liga}
            </Texto>
          </View>
          <View style={estilos.acciones}>
            <Boton
              titulo="Abrir liga"
              icono="open-outline"
              onPress={onAbrirLiga}
              accessibilityHint="Abre la videollamada en el navegador o en la aplicación"
            />
            <Boton
              titulo="Copiar liga"
              icono="copy-outline"
              variante="secundario"
              onPress={onCopiarLiga}
              accessibilityHint="Copia la liga para pegarla donde quieras"
            />
            {entrevista.puede_cancelar ? (
              <>
                <Boton
                  ref={refCancelar}
                  titulo="Cancelar entrevista"
                  icono="close-circle-outline"
                  variante="peligro"
                  onPress={onCancelar}
                  accessibilityHint={ACLARACION_CANCELAR}
                />
                <Texto variante="pequeno" color="textoSecundarioSobreGris">
                  {ACLARACION_CANCELAR}
                </Texto>
              </>
            ) : (
              <View style={estilos.explicacion} testID="sin-cancelacion">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colores.advertenciaTexto}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Texto variante="pequeno" style={estilos.textoExplicacion}>
                  {EXPLICACION_CANCELACION_TARDIA}
                </Texto>
              </View>
            )}
          </View>
        </>
      ) : null}
    </Tarjeta>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const estilos = StyleSheet.create({
  datos: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flexible: { flexShrink: 1 },
  acciones: { gap: espaciado.sm },
  explicacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: espaciado.sm,
    backgroundColor: colores.advertenciaFondo,
  },
  textoExplicacion: { flex: 1, color: colores.advertenciaTexto },
});
