// Paleta de docs/CONTEXTO.md. Los fondos "suave" y los textos "fuerte" se usan en avisos y chips
// para mantener un contraste de al menos 4.5:1 con texto normal.
export const colores = {
  primario: '#1E40AF',
  secundario: '#0F766E',
  exito: '#15803D',
  advertencia: '#B45309',
  error: '#B91C1C',
  texto: '#111827',
  textoSecundario: '#6B7280',
  // Texto secundario sobre el fondo gris (#6B7280 solo da 4.36:1 sobre #F3F4F6).
  textoSecundarioSobreGris: '#4B5563',
  fondo: '#FFFFFF',
  fondoSuave: '#F3F4F6',
  borde: '#6B7280',
  bordeSuave: '#D1D5DB',
  sobrePrimario: '#FFFFFF',

  infoFondo: '#DBEAFE',
  infoTexto: '#1E3A8A',
  exitoFondo: '#DCFCE7',
  exitoTexto: '#166534',
  advertenciaFondo: '#FEF3C7',
  advertenciaTexto: '#92400E',
  errorFondo: '#FEE2E2',
  errorTexto: '#991B1B',
  neutroFondo: '#F3F4F6',
  neutroTexto: '#374151',
  secundarioFondo: '#CCFBF1',
  secundarioTexto: '#115E59',

  superposicion: 'rgba(17, 24, 39, 0.6)',
} as const;

export type NombreColor = keyof typeof colores;
