import { Ionicons } from '@expo/vector-icons';
import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DiaAgenda } from '../../../api';
import { Boton, ChipEstado, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { formatearHora, formatearHoraHablada } from '../../../utilidades/fechas';

export type HorarioAgenda = DiaAgenda['horarios'][number];

export type AccionHorario = 'eliminar' | 'realizada' | 'no_asistio' | 'cancelar';

interface Props {
  horario: HorarioAgenda;
  /** Para saber si la entrevista ya empezó. */
  ahora: number;
  onAccion: (accion: AccionHorario, horario: HorarioAgenda) => void;
  onAbrirCandidato: (postulacionId: number) => void;
  onAbrirLiga: (liga: string) => void;
  onCopiarLiga: (liga: string) => void;
  refAccion?: Ref<View>;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** Qué lee el lector de pantalla del bloque de datos de un horario. */
export function resumenAccesibleHorario(horario: HorarioAgenda): string {
  const partes = [
    `${formatearHoraHablada(horario.inicio)}, ${horario.duracion_min} minutos`,
    horario.vacante.titulo,
  ];
  if (horario.entrevista) {
    const { candidato } = horario.entrevista;
    partes.push(`Con ${candidato.nombre} ${candidato.apellidos}`);
  } else {
    partes.push('Libre');
  }
  return partes.join('. ');
}

/** Hora a partir de la que se puede registrar el resultado: «10:30 a.m.». */
export const horaDeInicio = (horario: HorarioAgenda) => formatearHora(horario.inicio);

/** Horario de la agenda: libre (con «Eliminar») o agendado (candidato, liga y resultado). */
export function TarjetaHorario({
  horario,
  ahora,
  onAccion,
  onAbrirCandidato,
  onAbrirLiga,
  onCopiarLiga,
  refAccion,
}: Props) {
  const { entrevista } = horario;
  const empezo = new Date(horario.inicio).getTime() <= ahora;

  return (
    <Tarjeta testID={`horario-${horario.id}`}>
      <View
        accessible
        accessibilityLabel={resumenAccesibleHorario(horario)}
        style={estilos.datos}
        testID={`datos-horario-${horario.id}`}
      >
        <View style={estilos.fila} {...ocultar}>
          <Ionicons name="time-outline" size={22} color={colores.texto} {...ocultar} />
          <Texto variante="subtitulo" {...ocultar}>
            {`${formatearHora(horario.inicio)} · ${horario.duracion_min} min`}
          </Texto>
        </View>
        <Texto {...ocultar}>{horario.vacante.titulo}</Texto>
        {entrevista ? (
          <Texto variante="cuerpoFuerte" {...ocultar}>
            {`${entrevista.candidato.nombre} ${entrevista.candidato.apellidos}`}
          </Texto>
        ) : null}
      </View>
      {entrevista ? (
        <ChipEstado tipo="entrevista" estado={entrevista.estado} />
      ) : (
        <ChipEstado
          tipo="horario"
          estado={horario.estado}
          testID={`estado-horario-${horario.id}`}
        />
      )}

      {!entrevista ? (
        <Boton
          ref={refAccion}
          titulo="Eliminar"
          icono="trash-outline"
          variante="secundario"
          accessibilityLabel={`Eliminar el horario de las ${formatearHoraHablada(horario.inicio)}`}
          accessibilityHint="Pide confirmación antes de eliminarlo"
          onPress={() => onAccion('eliminar', horario)}
          testID={`eliminar-${horario.id}`}
        />
      ) : (
        <View style={estilos.acciones}>
          <Boton
            titulo="Ver candidato"
            icono="person-outline"
            variante="texto"
            accessibilityLabel={`Ver al candidato ${entrevista.candidato.nombre} ${entrevista.candidato.apellidos}`}
            onPress={() => onAbrirCandidato(entrevista.postulacion_id)}
            testID={`ver-candidato-${horario.id}`}
          />
          {entrevista.estado === 'agendada' ? (
            <>
              <Texto selectable accessibilityLabel={`Liga: ${horario.liga}`}>
                {horario.liga}
              </Texto>
              <Boton
                titulo="Abrir liga"
                icono="open-outline"
                onPress={() => onAbrirLiga(horario.liga)}
                testID={`abrir-liga-${horario.id}`}
              />
              <Boton
                titulo="Copiar liga"
                icono="copy-outline"
                variante="secundario"
                onPress={() => onCopiarLiga(horario.liga)}
                testID={`copiar-liga-${horario.id}`}
              />
              <Boton
                ref={refAccion}
                titulo="Marcar como realizada"
                icono="checkmark-done-outline"
                variante="secundario"
                deshabilitado={!empezo}
                accessibilityHint={
                  empezo
                    ? undefined
                    : `Disponible después de las ${formatearHoraHablada(horario.inicio)}`
                }
                onPress={() => onAccion('realizada', horario)}
                testID={`realizada-${horario.id}`}
              />
              <Boton
                titulo="No asistió"
                icono="person-remove-outline"
                variante="secundario"
                deshabilitado={!empezo}
                accessibilityHint={
                  empezo
                    ? undefined
                    : `Disponible después de las ${formatearHoraHablada(horario.inicio)}`
                }
                onPress={() => onAccion('no_asistio', horario)}
                testID={`no-asistio-${horario.id}`}
              />
              {!empezo ? (
                <View style={estilos.explicacion} testID={`explicacion-${horario.id}`}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={colores.advertenciaTexto}
                    {...ocultar}
                  />
                  <Texto variante="pequeno" style={estilos.textoExplicacion}>
                    {`Podrás registrar si se realizó o si no asistió después de las ${formatearHora(horario.inicio)}.`}
                  </Texto>
                </View>
              ) : null}
              <Boton
                titulo="Cancelar"
                accessibilityLabel={`Cancelar la entrevista con ${entrevista.candidato.nombre} ${entrevista.candidato.apellidos}`}
                accessibilityHint="Pide un motivo y avisa al candidato"
                icono="close-circle-outline"
                variante="peligro"
                onPress={() => onAccion('cancelar', horario)}
                testID={`cancelar-${horario.id}`}
              />
            </>
          ) : null}
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  datos: { gap: espaciado.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  acciones: { gap: espaciado.sm },
  explicacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: radio.sm,
    backgroundColor: colores.advertenciaFondo,
  },
  textoExplicacion: { flex: 1, color: colores.advertenciaTexto },
});
