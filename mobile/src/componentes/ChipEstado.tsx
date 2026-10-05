import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type {
  CompartirAjustes,
  EstadoEmpresa,
  EstadoEntrevista,
  EstadoHorario,
  EstadoPostulacion,
  EstadoReporte,
  EstadoUsuario,
  EstadoVacante,
  TipoAjusteVacante,
} from '../api';
import { colores, espaciado, radio } from '../tema';
import { Texto } from './Texto';

type Icono = keyof typeof Ionicons.glyphMap;
type Tono = 'neutro' | 'info' | 'exito' | 'advertencia' | 'error' | 'secundario';

export interface DefinicionEstado {
  texto: string;
  icono: Icono;
  tono: Tono;
}

interface EstadosPorTipo {
  postulacion: EstadoPostulacion;
  vacante: EstadoVacante;
  empresa: EstadoEmpresa;
  entrevista: EstadoEntrevista;
  horario: EstadoHorario;
  reporte: EstadoReporte;
  usuario: EstadoUsuario;
  ajuste_vacante: TipoAjusteVacante;
  compartir_ajustes: CompartirAjustes;
}

export type TipoEstado = keyof EstadosPorTipo;

/** Tabla 3.4 de docs/diseno/pantallas.md: texto en pantalla, ícono y tono de cada estado. */
export const ESTADOS: { [T in TipoEstado]: Record<EstadosPorTipo[T], DefinicionEstado> } = {
  postulacion: {
    postulada: { texto: 'Postulada', icono: 'paper-plane-outline', tono: 'info' },
    en_revision: { texto: 'En revisión', icono: 'eye-outline', tono: 'info' },
    entrevista: { texto: 'Entrevista', icono: 'calendar-outline', tono: 'secundario' },
    aceptada: { texto: 'Aceptada', icono: 'checkmark-circle', tono: 'exito' },
    no_seleccionada: { texto: 'No seleccionada', icono: 'close-circle', tono: 'error' },
    retirada: { texto: 'Retirada', icono: 'arrow-undo-outline', tono: 'neutro' },
  },
  vacante: {
    borrador: { texto: 'Borrador', icono: 'create-outline', tono: 'neutro' },
    publicada: { texto: 'Publicada', icono: 'megaphone-outline', tono: 'exito' },
    pausada: { texto: 'Pausada', icono: 'pause-circle-outline', tono: 'advertencia' },
    cerrada: { texto: 'Cerrada', icono: 'lock-closed-outline', tono: 'neutro' },
    suspendida: { texto: 'Suspendida', icono: 'ban-outline', tono: 'error' },
  },
  empresa: {
    pendiente: { texto: 'Pendiente de validación', icono: 'time-outline', tono: 'advertencia' },
    validada: { texto: 'Validada', icono: 'shield-checkmark-outline', tono: 'exito' },
    rechazada: { texto: 'Rechazada', icono: 'close-circle-outline', tono: 'error' },
    suspendida: { texto: 'Suspendida', icono: 'ban-outline', tono: 'error' },
  },
  entrevista: {
    agendada: { texto: 'Agendada', icono: 'calendar-outline', tono: 'info' },
    realizada: { texto: 'Realizada', icono: 'checkmark-done-outline', tono: 'exito' },
    no_asistio: { texto: 'No asistió', icono: 'person-remove-outline', tono: 'advertencia' },
    cancelada: { texto: 'Cancelada', icono: 'close-circle-outline', tono: 'error' },
  },
  horario: {
    libre: { texto: 'Libre', icono: 'ellipse-outline', tono: 'exito' },
    agendado: { texto: 'Agendado', icono: 'calendar-outline', tono: 'info' },
    cancelado: { texto: 'Cancelado', icono: 'close-circle-outline', tono: 'error' },
  },
  reporte: {
    abierto: { texto: 'Abierto', icono: 'folder-open-outline', tono: 'advertencia' },
    en_revision: { texto: 'En revisión', icono: 'eye-outline', tono: 'info' },
    resuelto: { texto: 'Resuelto', icono: 'checkmark-circle-outline', tono: 'exito' },
    descartado: { texto: 'Descartado', icono: 'trash-outline', tono: 'neutro' },
  },
  usuario: {
    activo: { texto: 'Activo', icono: 'checkmark-circle-outline', tono: 'exito' },
    suspendido: { texto: 'Suspendido', icono: 'pause-circle-outline', tono: 'advertencia' },
    eliminado: { texto: 'Eliminado', icono: 'trash-outline', tono: 'neutro' },
  },
  ajuste_vacante: {
    existente: { texto: 'El lugar cuenta con', icono: 'checkmark-circle-outline', tono: 'exito' },
    bajo_solicitud: {
      texto: 'Podemos ofrecer bajo solicitud',
      icono: 'chatbubble-ellipses-outline',
      tono: 'info',
    },
  },
  compartir_ajustes: {
    preguntar: {
      texto: 'Preguntarme en cada postulación',
      icono: 'help-circle-outline',
      tono: 'info',
    },
    siempre: { texto: 'Siempre', icono: 'share-social-outline', tono: 'exito' },
    nunca: { texto: 'Nunca', icono: 'eye-off-outline', tono: 'neutro' },
  },
};

const TONOS = {
  neutro: { fondo: colores.neutroFondo, texto: colores.neutroTexto },
  info: { fondo: colores.infoFondo, texto: colores.infoTexto },
  exito: { fondo: colores.exitoFondo, texto: colores.exitoTexto },
  advertencia: { fondo: colores.advertenciaFondo, texto: colores.advertenciaTexto },
  error: { fondo: colores.errorFondo, texto: colores.errorTexto },
  secundario: { fondo: colores.secundarioFondo, texto: colores.secundarioTexto },
} as const;

interface ChipEstadoProps<T extends TipoEstado> {
  tipo: T;
  estado: EstadosPorTipo[T];
  testID?: string;
}

/** Estado con texto e ícono: nunca se comunica solo con color. */
export function ChipEstado<T extends TipoEstado>({ tipo, estado, testID }: ChipEstadoProps<T>) {
  const definicion = (ESTADOS[tipo] as Record<string, DefinicionEstado>)[estado];
  if (!definicion) return null;
  const tono = TONOS[definicion.tono];

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Estado: ${definicion.texto}`}
      style={[estilos.chip, { backgroundColor: tono.fondo, borderColor: tono.texto }]}
    >
      <Ionicons
        name={definicion.icono}
        size={16}
        color={tono.texto}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Texto variante="pequeno" style={{ color: tono.texto, fontWeight: '600', flexShrink: 1 }}>
        {definicion.texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: radio.completo,
    borderWidth: 1,
  },
});
