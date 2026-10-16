import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { EventoHistorial } from '../../../api';
import { ESTADOS, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { formatearFechaHora, formatearFechaHoraHablada } from '../../../utilidades/fechas';

interface Props {
  /** Del más antiguo al más reciente, como lo manda el API. */
  historial: EventoHistorial[];
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const ocultarTodo = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** Lo que lee el lector de pantalla de cada paso, en una sola frase. */
export function etiquetaEvento(evento: EventoHistorial, actual: boolean): string {
  const partes = [
    `${actual ? 'Estado actual: ' : ''}${ESTADOS.postulacion[evento.estado_nuevo].texto}`,
    formatearFechaHoraHablada(evento.creado_en),
  ];
  if (evento.mensaje) partes.push(`Mensaje del reclutador: ${evento.mensaje}`);
  return partes.join('. ');
}

/**
 * Línea de tiempo del historial. Para el lector de pantalla es una lista; cada paso se lee de una
 * vez con su fecha, su hora y el mensaje del reclutador, y el estado actual lo dice con palabras.
 */
export function LineaTiempo({ historial }: Props) {
  return (
    <View accessibilityRole="list" style={estilos.lista} testID="linea-tiempo">
      {historial.map((evento, indice) => {
        const actual = indice === historial.length - 1;
        const definicion = ESTADOS.postulacion[evento.estado_nuevo];
        return (
          <View
            key={`${evento.estado_nuevo}-${evento.creado_en}`}
            accessible
            accessibilityRole="text"
            accessibilityLabel={etiquetaEvento(evento, actual)}
            style={estilos.paso}
            testID={`paso-${indice}`}
          >
            <View style={estilos.guia} {...ocultarTodo}>
              <View style={[estilos.punto, actual && estilos.puntoActual]}>
                <Ionicons
                  name={definicion.icono}
                  size={18}
                  color={actual ? colores.sobrePrimario : colores.primario}
                  {...ocultar}
                />
              </View>
              {!actual ? <View style={estilos.linea} /> : null}
            </View>
            <View style={estilos.contenido} {...ocultarTodo}>
              <View style={estilos.titulo}>
                <Texto variante="cuerpoFuerte">{definicion.texto}</Texto>
                {actual ? (
                  <View style={estilos.insignia}>
                    <Ionicons name="checkmark" size={14} color={colores.infoTexto} {...ocultar} />
                    <Texto variante="pequeno" style={estilos.textoInsignia}>
                      Estado actual
                    </Texto>
                  </View>
                ) : null}
              </View>
              <Texto variante="pequeno" color="textoSecundarioSobreGris">
                {formatearFechaHora(evento.creado_en)}
              </Texto>
              {evento.mensaje ? (
                <View style={estilos.mensaje}>
                  <Texto variante="pequeno" color="textoSecundarioSobreGris">
                    Mensaje del reclutador
                  </Texto>
                  <Texto>{evento.mensaje}</Texto>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const TAMANO_PUNTO = 32;

const estilos = StyleSheet.create({
  lista: { gap: 0 },
  paso: { flexDirection: 'row', gap: espaciado.md },
  guia: { alignItems: 'center', width: TAMANO_PUNTO },
  punto: {
    width: TAMANO_PUNTO,
    height: TAMANO_PUNTO,
    borderRadius: TAMANO_PUNTO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.infoFondo,
    borderWidth: 2,
    borderColor: colores.primario,
  },
  puntoActual: { backgroundColor: colores.primario },
  linea: { flex: 1, width: 2, minHeight: espaciado.lg, backgroundColor: colores.bordeSuave },
  contenido: { flex: 1, gap: espaciado.xs, paddingBottom: espaciado.lg },
  titulo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espaciado.sm },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    backgroundColor: colores.infoFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  textoInsignia: { color: colores.infoTexto, fontWeight: '600' },
  mensaje: {
    gap: 2,
    marginTop: espaciado.xs,
    padding: espaciado.md,
    borderRadius: espaciado.sm,
    backgroundColor: colores.fondoSuave,
  },
});
