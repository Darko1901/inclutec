import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Horario } from '../../../api';
import { Boton, Cargando, EstadoError, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { formatearHora } from '../../../utilidades/fechas';
import {
  agruparPorDia,
  duracionCorta,
  etiquetaAgendar,
  TEXTO_SIN_HORARIOS,
} from './textosEntrevista';

export type CargaHorarios =
  { fase: 'cargando' } | { fase: 'error'; detail: string } | { fase: 'listo'; horarios: Horario[] };

interface Props {
  carga: CargaHorarios;
  onAgendar: (horario: Horario) => void;
  onReintentar: () => void;
  /** Devuelve una referencia para regresar el foco del lector de pantalla al botón (useRetornoFoco). */
  referenciaBoton: (horarioId: number) => Ref<View>;
  referenciaTitulo?: Ref<View>;
}

/** «Elige un horario»: los horarios libres agrupados por día, cada uno con su botón «Agendar». */
export function SeccionHorarios({
  carga,
  onAgendar,
  onReintentar,
  referenciaBoton,
  referenciaTitulo,
}: Props) {
  return (
    <Tarjeta testID="seccion-horarios">
      <View
        ref={referenciaTitulo}
        accessible
        accessibilityRole="header"
        accessibilityLabel="Elige un horario"
      >
        <Texto variante="subtitulo" accessibilityElementsHidden importantForAccessibility="no">
          Elige un horario
        </Texto>
      </View>
      <Texto color="textoSecundarioSobreGris">
        La empresa quiere conocerte. Elige el día y la hora que mejor te acomoden.
      </Texto>

      {carga.fase === 'cargando' ? <Cargando mensaje="Buscando horarios…" /> : null}
      {carga.fase === 'error' ? (
        <EstadoError
          titulo="No pudimos cargar los horarios"
          mensaje={carga.detail}
          onReintentar={onReintentar}
        />
      ) : null}
      {carga.fase === 'listo' && carga.horarios.length === 0 ? (
        <Texto testID="sin-horarios">{TEXTO_SIN_HORARIOS}</Texto>
      ) : null}
      {carga.fase === 'listo'
        ? agruparPorDia(carga.horarios).map((grupo) => (
            <View key={grupo.clave} style={estilos.grupo} testID={`dia-${grupo.clave}`}>
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={grupo.tituloAccesible}
              >
                <Texto
                  variante="cuerpoFuerte"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {grupo.titulo}
                </Texto>
              </View>
              {grupo.horarios.map((horario) => (
                <View key={horario.id} style={estilos.horario}>
                  <View
                    style={estilos.hora}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Texto variante="cuerpoFuerte">{formatearHora(horario.inicio)}</Texto>
                    <Texto variante="pequeno" color="textoSecundarioSobreGris">
                      {duracionCorta(horario.duracion_min)}
                    </Texto>
                  </View>
                  <Boton
                    ref={referenciaBoton(horario.id)}
                    titulo="Agendar"
                    onPress={() => onAgendar(horario)}
                    accessibilityLabel={etiquetaAgendar(horario)}
                    testID={`agendar-${horario.id}`}
                  />
                </View>
              ))}
            </View>
          ))
        : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  horario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  hora: { flexShrink: 1 },
});
