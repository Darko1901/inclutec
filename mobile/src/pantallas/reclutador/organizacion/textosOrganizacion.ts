import type { EmpresaPropia, EstadoEmpresa } from '../../../api';

export const MAX_CONSTANCIA_MB = 5;

interface TextoBanner {
  titulo: string;
  /** Lo que dice el banner; incluye el motivo cuando la empresa lo tiene. */
  mensaje: string;
}

const conMotivo = (motivo: string | null) =>
  motivo ? `Motivo: ${motivo.replace(/\.$/, '')}.` : 'El administrador no indicó un motivo.';

/** Texto de cada variante del banner de REC-01 (RF-02: lo que implica cada estado). */
export function textoBanner(estado: EstadoEmpresa, motivo: string | null): TextoBanner {
  switch (estado) {
    case 'pendiente':
      return {
        titulo: 'Pendiente de validación',
        mensaje: 'Estamos revisando tu empresa. Puedes crear borradores, pero no publicar.',
      };
    case 'validada':
      return {
        titulo: 'Empresa validada',
        mensaje: 'Tu empresa está validada. Ya puedes publicar vacantes.',
      };
    case 'rechazada':
      return {
        titulo: 'Validación rechazada',
        mensaje: `${conMotivo(motivo)} Corrige tus datos y sube de nuevo tu constancia de situación fiscal para que la revisemos otra vez.`,
      };
    case 'suspendida':
      return {
        titulo: 'Empresa suspendida',
        mensaje: `${conMotivo(motivo)} Tus vacantes no se muestran a los candidatos. Para resolverlo, escribe a soporte.`,
      };
  }
}

/** Estado de la constancia, según la empresa y si ya subió el archivo. */
export function textoConstancia(empresa: Pick<EmpresaPropia, 'estado' | 'documento_url'>): string {
  switch (empresa.estado) {
    case 'pendiente':
      return empresa.documento_url
        ? 'Constancia recibida. Estamos revisándola.'
        : 'Aún no subes tu constancia de situación fiscal. La necesitamos para validar tu empresa.';
    case 'rechazada':
      return 'Tu constancia no fue aceptada. Sube una nueva para que la revisemos otra vez.';
    case 'validada':
      return 'Constancia revisada. Tu empresa está validada.';
    case 'suspendida':
      return 'Tu empresa está suspendida. Escribe a soporte para revisar tu caso.';
  }
}

/** Solo una empresa pendiente o rechazada puede subir (otra) constancia. */
export const puedeSubirConstancia = (estado: EstadoEmpresa) =>
  estado === 'pendiente' || estado === 'rechazada';

export const AYUDA_DATOS_FISCALES = 'Para cambiarlos, escribe a soporte.';
