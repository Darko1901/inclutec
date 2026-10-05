import { Text, type TextProps } from 'react-native';

import {
  colores,
  MAX_ESCALA_FUENTE,
  tipografia,
  type NombreColor,
  type VarianteTexto,
} from '../tema';

interface TextoProps extends TextProps {
  variante?: VarianteTexto;
  color?: NombreColor;
}

/** Texto base: respeta el tamaño de fuente del sistema hasta el 200 %. */
export function Texto({ variante = 'cuerpo', color = 'texto', style, ...resto }: TextoProps) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_ESCALA_FUENTE}
      style={[tipografia[variante], { color: colores[color] }, style]}
      {...resto}
    />
  );
}
