// Múltiplos de 4.
export const espaciado = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  completo: 999,
} as const;

// Área táctil mínima en dp (WCAG 2.5.8 y RNF de accesibilidad).
export const AREA_TACTIL_MINIMA = 48;
