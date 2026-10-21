import type { EstadoPostulacion, PostuladoDetalle } from '../../../api';

export const TEXTO_CONTACTO_OCULTO = 'Disponibles al pasar a entrevista';
export const TEXTO_SIN_NECESIDADES = 'El candidato no compartió esta información.';
export const ETIQUETA_OBSERVACIONES = 'No visibles para el candidato';
export const ACLARACION_MENSAJE = 'El candidato verá este mensaje';
export const MAX_MENSAJE_ESTADO = 500;
export const MAX_OBSERVACION = 1000;
export const MENSAJE_REPORTE = 'Gracias, revisaremos tu reporte';

export const TEXTO_NECESIDADES_INTRO =
  'Son ajustes que el candidato decidió compartir contigo en esta postulación. No cambian su compatibilidad.';

type Necesidad = NonNullable<PostuladoDetalle['necesidades']>[number];

/** «✓ Ya cubierto por la vacante» o «Por confirmar con la empresa». */
export function textoNecesidad(necesidad: Necesidad): { cubierta: boolean; texto: string } {
  if (necesidad.estado === 'existente') {
    return { cubierta: true, texto: 'Ya cubierto por la vacante' };
  }
  return {
    cubierta: false,
    texto:
      necesidad.estado === 'bajo_solicitud'
        ? 'Por confirmar con la empresa. La vacante lo ofrece bajo solicitud.'
        : 'Por confirmar con la empresa',
  };
}

/** Texto de lo que significa el cumplimiento de la formación mínima. */
export function textoFormacion(formacion: PostuladoDetalle['compatibilidad']['formacion']): {
  texto: string;
  cumple: 'si' | 'cursando' | 'no' | 'sin_requisito';
} {
  if (!formacion.requerida) {
    return { texto: 'La vacante no pide una formación mínima.', cumple: 'sin_requisito' };
  }
  const nivel = formacion.requerida.nombre;
  switch (formacion.cumple) {
    case 'si':
      return { texto: `Formación mínima: ${nivel}. Cumple.`, cumple: 'si' };
    case 'cursando':
      return { texto: `Formación mínima: ${nivel}. La está cursando.`, cumple: 'cursando' };
    case 'no':
      return { texto: `Formación mínima: ${nivel}. No cumple.`, cumple: 'no' };
  }
}

export function textoModalidad(modalidad: PostuladoDetalle['compatibilidad']['modalidad']): string {
  return modalidad.coincide
    ? `Modalidad de la vacante: ${modalidad.vacante.nombre}. Coincide con lo que prefiere.`
    : `Modalidad de la vacante: ${modalidad.vacante.nombre}. No coincide con lo que prefiere.`;
}

/** Estados a los que se puede pasar y lo que explica cada uno. */
export const AYUDA_ESTADO: Partial<Record<EstadoPostulacion, string>> = {
  en_revision: 'Avisa al candidato que ya estás revisando su perfil.',
  entrevista: 'Invita al candidato a elegir un horario y le muestra tu contacto.',
  aceptada: 'Termina el proceso con una oferta para el candidato.',
  no_seleccionada: 'Termina el proceso. Si hay una entrevista agendada, se cancela.',
};

/** Los estados que cierran el proceso piden confirmar antes de enviarse. */
export const PIDEN_CONFIRMACION: EstadoPostulacion[] = ['no_seleccionada', 'aceptada'];

export const MENSAJE_CONFIRMACION: Partial<
  Record<EstadoPostulacion, { titulo: string; mensaje: string; boton: string }>
> = {
  no_seleccionada: {
    titulo: '¿Marcar como «No seleccionada»?',
    mensaje:
      'El proceso de esta persona terminará y recibirá un aviso. Esta decisión no se puede deshacer.',
    boton: 'Marcar como no seleccionada',
  },
  aceptada: {
    titulo: '¿Marcar como «Aceptada»?',
    mensaje:
      'El proceso de esta persona terminará y recibirá la buena noticia. No se puede deshacer.',
    boton: 'Marcar como aceptada',
  },
};
