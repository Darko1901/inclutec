import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { BarraProgreso, Texto } from '../../../componentes';
import { espaciado } from '../../../tema';
import { TITULOS_PASO, TOTAL_PASOS, type Paso } from './formulario';

interface Props {
  paso: Paso;
}

/** «Paso 2 de 4»: se anuncia cada vez que cambia el paso. */
export function IndicadorPasos({ paso }: Props) {
  const texto = `Paso ${paso} de ${TOTAL_PASOS}`;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${texto}: ${TITULOS_PASO[paso]}`);
  }, [texto, paso]);

  return (
    <View style={estilos.contenedor}>
      <Texto
        variante="cuerpoFuerte"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${texto}, ${TITULOS_PASO[paso]}`}
        testID="indicador-paso"
      >
        {texto}
      </Texto>
      <BarraProgreso
        etiqueta="Avance de la vacante"
        valor={(paso / TOTAL_PASOS) * 100}
        valorAccesible={texto}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.sm },
});
