import type { Ionicons } from '@expo/vector-icons';

import type { TipoNotificacion } from '../../../api';
import type { NombreColor } from '../../../tema';

interface DatosTipo {
  /** Nombre en lenguaje claro, para las preferencias. */
  nombre: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: NombreColor;
}

export const TIPOS_NOTIFICACION: Record<TipoNotificacion, DatosTipo> = {
  cambio_estado: {
    nombre: 'Cambios en mis postulaciones',
    icono: 'swap-horizontal-outline',
    color: 'infoTexto',
  },
  nueva_postulacion: {
    nombre: 'Nuevas postulaciones a mis vacantes',
    icono: 'person-add-outline',
    color: 'infoTexto',
  },
  entrevista_agendada: {
    nombre: 'Entrevistas agendadas',
    icono: 'calendar-outline',
    color: 'secundarioTexto',
  },
  entrevista_cancelada: {
    nombre: 'Entrevistas canceladas',
    icono: 'calendar-clear-outline',
    color: 'errorTexto',
  },
  recordatorio_entrevista: {
    nombre: 'Recordatorio de entrevista (24 horas antes)',
    icono: 'alarm-outline',
    color: 'advertenciaTexto',
  },
  empresa_validada: {
    nombre: 'Mi empresa fue validada',
    icono: 'shield-checkmark-outline',
    color: 'exitoTexto',
  },
  empresa_rechazada: {
    nombre: 'Mi empresa fue rechazada',
    icono: 'close-circle-outline',
    color: 'errorTexto',
  },
  vacante_suspendida: {
    nombre: 'Vacantes suspendidas',
    icono: 'ban-outline',
    color: 'advertenciaTexto',
  },
  reporte_resuelto: {
    nombre: 'Respuesta a mis reportes',
    icono: 'flag-outline',
    color: 'neutroTexto',
  },
};
