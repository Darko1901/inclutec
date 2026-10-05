import type { TextStyle } from 'react-native';

// Tamaños base en dp. React Native los escala con el tamaño de fuente del sistema
// (no se desactiva allowFontScaling); `MAX_ESCALA_FUENTE` cubre el 200 % que pide el RNF.
export const MAX_ESCALA_FUENTE = 2;

export const tipografia = {
  titulo: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitulo: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  cuerpo: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  cuerpoFuerte: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  etiqueta: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  pequeno: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  boton: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof tipografia;
