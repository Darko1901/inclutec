import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCatalogo } from '../../../api';
import { CampoTexto, Cargando, Texto } from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import { MAX_DIRECCION, TITULOS_PASO } from './formulario';
import { TituloPaso } from './TituloPaso';
import type { PropiedadesPaso } from './tipos';

const DETALLE: Record<string, { icono: keyof typeof Ionicons.glyphMap; texto: string }> = {
  Presencial: {
    icono: 'business-outline',
    texto: 'Se trabaja en las instalaciones de la empresa.',
  },
  Remoto: { icono: 'home-outline', texto: 'Se trabaja desde casa, sin ir a la empresa.' },
  Híbrido: {
    icono: 'swap-horizontal-outline',
    texto: 'Se combinan días en la empresa y días en casa.',
  },
};

/** Paso 3: modalidad en tarjetas seleccionables y la dirección si hay que ir a la empresa. */
export function PasoModalidad({ formulario: f, cambiar, errores, limpiar }: PropiedadesPaso) {
  const modalidades = useCatalogo('modalidades');
  const nombreElegida = modalidades.datos.find((m) => m.id === f.modalidadId)?.nombre;
  const requiereDireccion = nombreElegida === 'Presencial' || nombreElegida === 'Híbrido';

  return (
    <View style={estilos.paso}>
      <TituloPaso texto={TITULOS_PASO[3]} />
      {modalidades.cargando ? (
        <Cargando mensaje="Cargando modalidades…" />
      ) : (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Modalidad de trabajo"
          style={estilos.grupo}
          testID="grupo-modalidad"
        >
          {modalidades.datos.map(({ id, nombre }) => {
            const elegida = f.modalidadId === id;
            const detalle = DETALLE[nombre];
            return (
              <Pressable
                key={id}
                testID={`modalidad-${id}`}
                onPress={() => {
                  cambiar({ modalidadId: id });
                  limpiar('modalidad_id', 'direccion');
                }}
                accessibilityRole="radio"
                accessibilityLabel={nombre}
                accessibilityHint={detalle?.texto}
                accessibilityState={{ checked: elegida, selected: elegida }}
                style={[estilos.tarjeta, elegida && estilos.tarjetaElegida]}
              >
                <Ionicons
                  name={detalle?.icono ?? 'briefcase-outline'}
                  size={28}
                  color={elegida ? colores.primario : colores.textoSecundarioSobreGris}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={estilos.textos}>
                  <Texto
                    variante={elegida ? 'cuerpoFuerte' : 'cuerpo'}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    {nombre}
                  </Texto>
                  {detalle ? (
                    <Texto
                      variante="pequeno"
                      color="textoSecundarioSobreGris"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {detalle.texto}
                    </Texto>
                  ) : null}
                </View>
                <Ionicons
                  name={elegida ? 'radio-button-on' : 'radio-button-off'}
                  size={26}
                  color={colores.primario}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            );
          })}
        </View>
      )}
      {errores.modalidad_id ? (
        <Texto color="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errores.modalidad_id}
        </Texto>
      ) : null}

      <CampoTexto
        etiqueta={requiereDireccion ? 'Dirección (obligatoria para publicar)' : 'Dirección'}
        ayuda={
          requiereDireccion
            ? 'La vacante es presencial o híbrida: para publicarla necesitamos la dirección.'
            : 'Opcional en una vacante remota.'
        }
        value={f.direccion}
        onChangeText={(direccion) => {
          cambiar({ direccion });
          limpiar('direccion');
        }}
        maxLength={MAX_DIRECCION}
        error={errores.direccion}
        testID="campo-direccion-vacante"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: espaciado.lg },
  grupo: { gap: espaciado.md },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    padding: espaciado.md,
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 2,
    borderColor: colores.bordeSuave,
  },
  tarjetaElegida: { borderColor: colores.primario, backgroundColor: colores.infoFondo },
  textos: { flex: 1, gap: espaciado.xs },
});
