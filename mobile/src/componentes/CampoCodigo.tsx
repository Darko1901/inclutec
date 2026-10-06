import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TextInput, View } from 'react-native';

import {
  AREA_TACTIL_MINIMA,
  colores,
  espaciado,
  MAX_ESCALA_FUENTE,
  radio,
  tipografia,
} from '../tema';
import { Texto } from './Texto';

export const ETIQUETA_CODIGO = 'Código de 6 dígitos';
const LONGITUD = 6;

interface CampoCodigoProps {
  value: string;
  onChangeText: (codigo: string) => void;
  error?: string | null;
  editable?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

/**
 * Un solo TextInput numérico que se ve como 6 casillas. Para el lector de pantalla es un único
 * campo; las casillas son solo dibujo.
 */
export function CampoCodigo({
  value,
  onChangeText,
  error,
  editable = true,
  autoFocus = false,
  testID,
}: CampoCodigoProps) {
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(`${ETIQUETA_CODIGO}: ${error}`);
  }, [error]);

  const posicionActual = Math.min(value.length, LONGITUD - 1);

  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" accessibilityElementsHidden importantForAccessibility="no">
        {ETIQUETA_CODIGO}
      </Texto>
      <View style={estilos.campo}>
        <View
          style={estilos.casillas}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: LONGITUD }, (_, indice) => {
            const activa = enfocado && indice === posicionActual;
            return (
              <View
                key={indice}
                style={[
                  estilos.casilla,
                  {
                    borderColor: error ? colores.error : activa ? colores.primario : colores.borde,
                    borderWidth: activa || error ? 2 : 1,
                  },
                ]}
              >
                <Texto variante="subtitulo">{value[indice] ?? ''}</Texto>
              </View>
            );
          })}
        </View>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(texto) => onChangeText(texto.replace(/\D/g, '').slice(0, LONGITUD))}
          maxLength={LONGITUD}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus={autoFocus}
          editable={editable}
          caretHidden
          contextMenuHidden
          selectionColor="transparent"
          accessibilityLabel={ETIQUETA_CODIGO}
          accessibilityHint={error ?? 'Escribe los 6 dígitos que te enviamos por correo'}
          accessibilityState={{ disabled: !editable }}
          maxFontSizeMultiplier={MAX_ESCALA_FUENTE}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          style={estilos.entrada}
        />
      </View>
      {error ? (
        <View style={estilos.error}>
          <Ionicons
            name="alert-circle"
            size={18}
            color={colores.error}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Texto
            variante="pequeno"
            color="error"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={estilos.textoError}
          >
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  campo: { minHeight: AREA_TACTIL_MINIMA + espaciado.sm },
  casillas: { flexDirection: 'row', gap: espaciado.sm },
  casilla: {
    flex: 1,
    minHeight: AREA_TACTIL_MINIMA + espaciado.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
    backgroundColor: colores.fondo,
  },
  // El campo real cubre las casillas y su texto es transparente: se escribe "sobre" ellas.
  entrada: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    fontSize: tipografia.cuerpo.fontSize,
  },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoError: { flexShrink: 1 },
});
