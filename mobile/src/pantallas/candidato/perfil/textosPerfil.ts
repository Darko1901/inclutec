import type { Ref } from 'react';
import type { View } from 'react-native';

import type { PerfilCandidato, PerfilCandidatoEntrada, SeccionPerfil } from '../../../api';

/** Cómo se nombra cada sección pendiente en «Falta: …». */
export const NOMBRE_PENDIENTE: Record<SeccionPerfil, string> = {
  datos_personales: 'datos personales',
  resumen: 'resumen',
  foto: 'foto',
  preferencias: 'preferencias laborales',
  formacion: 'formación',
  experiencia: 'experiencia',
  habilidades: 'habilidades',
};

/** Texto del botón que lleva a cada sección pendiente. */
export const ACCION_PENDIENTE: Record<SeccionPerfil, string> = {
  datos_personales: 'Completar datos personales',
  resumen: 'Escribir mi resumen',
  foto: 'Agregar foto',
  preferencias: 'Elegir preferencias',
  formacion: 'Agregar formación',
  experiencia: 'Agregar experiencia',
  habilidades: 'Agregar habilidades',
};

/** «90 por ciento»: así se dicen los porcentajes en voz alta. */
export const porcentajeAccesible = (valor: number) => `${valor} por ciento`;

function unir(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** «Falta: foto» o «Faltan: foto y experiencia»; null si no falta nada. */
export function textoFaltantes(pendientes: SeccionPerfil[]): string | null {
  if (pendientes.length === 0) return null;
  const nombres = pendientes.map((p) => NOMBRE_PENDIENTE[p]);
  return `${pendientes.length === 1 ? 'Falta' : 'Faltan'}: ${unir(nombres)}`;
}

/** «Tu perfil está al 90 % · Falta: foto». */
export function textoCompletitud(
  perfil: Pick<PerfilCandidato, 'completitud' | 'secciones_pendientes'>,
) {
  const faltantes = textoFaltantes(perfil.secciones_pendientes);
  const base = `Tu perfil está al ${perfil.completitud} %`;
  return faltantes ? `${base} · ${faltantes}` : base;
}

/** Los datos guardados del perfil en la forma que pide `PUT /candidatos/me`. */
export function entradaDePerfil(perfil: PerfilCandidato): PerfilCandidatoEntrada {
  return {
    nombre: perfil.usuario.nombre,
    apellidos: perfil.usuario.apellidos,
    telefono: perfil.usuario.telefono,
    municipio_id: perfil.municipio?.id ?? null,
    jornada_id: perfil.jornada?.id ?? null,
    resumen: perfil.resumen,
    disponible_reubicacion: perfil.disponible_reubicacion,
    modalidad_ids: perfil.modalidades.map((m) => m.id),
    categoria_ids: perfil.categorias.map((c) => c.id),
    compartir_ajustes: perfil.compartir_ajustes,
  };
}

export const MAX_RESUMEN = 500;
export const MAX_NOTA_AJUSTES = 300;

export const TEXTO_SIN_DIAGNOSTICO =
  'No te pedimos diagnóstico. Solo lo que necesitas para trabajar cómodo(a).';

export const OPCIONES_COMPARTIR = [
  {
    valor: 'preguntar',
    titulo: 'Preguntarme en cada postulación',
    ayuda: 'Antes de postularte, te preguntamos si quieres compartirlas con esa empresa.',
  },
  {
    valor: 'siempre',
    titulo: 'Compartir siempre',
    ayuda: 'Las empresas a las que te postules verán tus necesidades de ajuste.',
  },
  {
    valor: 'nunca',
    titulo: 'No compartir nunca',
    ayuda: 'Ninguna empresa verá tus necesidades de ajuste.',
  },
] as const;

/** Aviso que se anuncia al guardar una sección. */
export interface AvisoSeccion {
  mensaje: string;
  /** Cambia en cada guardado para que el lector de pantalla vuelva a anunciarlo. */
  n: number;
}

/** Lo que reciben las secciones desplegables de CAN-03. */
export interface PropiedadesSeccion {
  /** Para llevar el foco del lector de pantalla al botón de la sección. */
  refBoton?: Ref<View>;
  perfil: PerfilCandidato;
  expandida: boolean;
  onAlternar: () => void;
  aviso: AvisoSeccion | undefined;
  /** Se guardó: la pantalla actualiza la completitud y anuncia el mensaje. */
  onGuardado: (mensaje: string, perfilNuevo?: PerfilCandidato) => void;
}
