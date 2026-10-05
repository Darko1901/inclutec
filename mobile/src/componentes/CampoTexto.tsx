import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import {
  AREA_TACTIL_MINIMA,
  colores,
  espaciado,
  MAX_ESCALA_FUENTE,
  radio,
  tipografia,
} from '../tema';
import { Texto } from './Texto';

interface CampoTextoProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onBlur'
  | 'onSubmitEditing'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'returnKeyType'
  | 'maxLength'
  | 'multiline'
  | 'editable'
  | 'placeholder'
> {
  etiqueta: string;
  /** Mensaje bajo el campo que explica cómo corregirlo; se anuncia al lector de pantalla. */
  error?: string | null;
  ayuda?: string;
  /** Muestra el botón para mostrar u ocultar el texto. */
  esContrasena?: boolean;
  /** Muestra «n / máximo» cuando hay `maxLength`. */
  contador?: boolean;
  testID?: string;
}

export function CampoTexto({
  etiqueta,
  error,
  ayuda,
  esContrasena = false,
  contador = false,
  maxLength,
  value,
  multiline,
  editable = true,
  testID,
  ...resto
}: CampoTextoProps) {
  const [visible, setVisible] = useState(false);
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(`${etiqueta}: ${error}`);
  }, [error, etiqueta]);

  const colorBorde = error ? colores.error : enfocado ? colores.primario : colores.borde;
  const mensajeAyuda = error ?? ayuda;

  return (
    <View style={estilos.contenedor}>
      {/* El lector de pantalla lee la etiqueta desde el campo; aquí se oculta para no repetirla. */}
      <Texto variante="etiqueta" accessibilityElementsHidden importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <View
        style={[estilos.caja, { borderColor: colorBorde, borderWidth: enfocado || error ? 2 : 1 }]}
      >
        <TextInput
          testID={testID}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          secureTextEntry={esContrasena && !visible}
          accessibilityLabel={etiqueta}
          accessibilityHint={mensajeAyuda ?? undefined}
          accessibilityState={{ disabled: !editable }}
          placeholderTextColor={colores.textoSecundario}
          maxFontSizeMultiplier={MAX_ESCALA_FUENTE}
          style={[estilos.entrada, multiline && estilos.multilinea]}
          {...resto}
          onFocus={() => setEnfocado(true)}
          onBlur={(evento) => {
            setEnfocado(false);
            resto.onBlur?.(evento);
          }}
        />
        {esContrasena ? (
          <Pressable
            onPress={() => setVisible((actual) => !actual)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={estilos.ojo}
            hitSlop={4}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={colores.texto}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        ) : null}
      </View>
      <View style={estilos.pie}>
        {mensajeAyuda ? (
          <View style={estilos.mensaje}>
            {error ? (
              <Ionicons
                name="alert-circle"
                size={18}
                color={colores.error}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ) : null}
            <Texto
              variante="pequeno"
              color={error ? 'error' : 'textoSecundario'}
              accessibilityRole={error ? 'alert' : undefined}
              accessibilityLiveRegion={error ? 'polite' : undefined}
              style={estilos.textoMensaje}
            >
              {mensajeAyuda}
            </Texto>
          </View>
        ) : (
          <View style={estilos.mensaje} />
        )}
        {contador && maxLength ? (
          <Texto
            variante="pequeno"
            color="textoSecundario"
            accessibilityLabel={`${value?.length ?? 0} de ${maxLength} caracteres`}
          >
            {`${value?.length ?? 0} / ${maxLength}`}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AREA_TACTIL_MINIMA,
    borderRadius: radio.md,
    backgroundColor: colores.fondo,
  },
  entrada: {
    flex: 1,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    color: colores.texto,
    fontSize: tipografia.cuerpo.fontSize,
  },
  multilinea: { minHeight: 96, textAlignVertical: 'top' },
  ojo: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pie: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.sm },
  mensaje: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoMensaje: { flexShrink: 1 },
});
