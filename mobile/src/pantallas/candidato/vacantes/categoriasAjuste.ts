import type { Ionicons } from '@expo/vector-icons';

import type { AjusteRef } from '../../../api';

export type CategoriaAjuste = AjusteRef['categoria'];

/** Orden y nombre en pantalla de las categorías de ajuste (docs/diseno/pantallas.md, 3.3). */
export const CATEGORIAS_AJUSTE: { id: CategoriaAjuste; nombre: string }[] = [
  { id: 'movilidad', nombre: 'Movilidad' },
  { id: 'visual', nombre: 'Visual' },
  { id: 'auditiva', nombre: 'Auditiva' },
  { id: 'comunicacion', nombre: 'Comunicación' },
  { id: 'cognitiva_psicosocial', nombre: 'Cognitiva y psicosocial' },
  { id: 'general', nombre: 'General' },
];

export const ICONO_CATEGORIA: Record<CategoriaAjuste, keyof typeof Ionicons.glyphMap> = {
  movilidad: 'accessibility-outline',
  visual: 'eye-outline',
  auditiva: 'ear-outline',
  comunicacion: 'chatbubbles-outline',
  cognitiva_psicosocial: 'bulb-outline',
  general: 'options-outline',
};
