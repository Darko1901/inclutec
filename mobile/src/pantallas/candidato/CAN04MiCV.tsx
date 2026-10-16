import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Texto, useRetornoFoco } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../tema';
import { ModalVistaPrevia } from './cv/ModalVistaPrevia';
import { TabExperiencia } from './cv/TabExperiencia';
import { TabFormacion } from './cv/TabFormacion';
import { TabHabilidades } from './cv/TabHabilidades';
import { PESTANAS_CV, type PestanaCV } from './cv/textosCV';

/** CAN-04: Mi CV con las pestañas Experiencia, Formación y Habilidades, y la vista previa. */
export default function CAN04MiCV() {
  const ruta = useRoute<RouteProp<RootStackParamList, 'MiCV'>>();
  const [pestana, setPestana] = useState<PestanaCV>(ruta.params?.pestana ?? 'experiencia');
  // Cada pestaña se monta la primera vez que se abre y ya no se desmonta, para no perder lo escrito.
  const [visitadas, setVisitadas] = useState<PestanaCV[]>([pestana]);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const { registrar, recordar, devolver } = useRetornoFoco();

  return (
    <SafeAreaView style={estilos.pantalla} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Boton
          ref={registrar('vista-previa')}
          titulo="Vista previa de mi CV"
          icono="eye-outline"
          variante="secundario"
          accessibilityHint="Muestra tu CV como lo verá una empresa"
          onPress={() => {
            recordar('vista-previa');
            setVistaPrevia(true);
          }}
          testID="abrir-vista-previa"
        />

        <View accessibilityRole="tablist" style={estilos.pestanas}>
          {PESTANAS_CV.map(({ id, titulo }) => {
            const seleccionada = id === pestana;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setPestana(id);
                  setVisitadas((previas) => (previas.includes(id) ? previas : [...previas, id]));
                }}
                accessibilityRole="tab"
                accessibilityLabel={titulo}
                accessibilityState={{ selected: seleccionada }}
                style={[estilos.pestana, seleccionada && estilos.pestanaActiva]}
                testID={`pestana-${id}`}
              >
                <View style={estilos.tituloPestana}>
                  {seleccionada ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colores.sobrePrimario}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : null}
                  <Texto
                    variante="boton"
                    style={{ color: seleccionada ? colores.sobrePrimario : colores.primario }}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    {titulo}
                  </Texto>
                </View>
              </Pressable>
            );
          })}
        </View>

        {visitadas.includes('experiencia') ? (
          <View style={pestana === 'experiencia' ? undefined : estilos.oculta}>
            <TabExperiencia />
          </View>
        ) : null}
        {visitadas.includes('formacion') ? (
          <View style={pestana === 'formacion' ? undefined : estilos.oculta}>
            <TabFormacion />
          </View>
        ) : null}
        {visitadas.includes('habilidades') ? (
          <View style={pestana === 'habilidades' ? undefined : estilos.oculta}>
            <TabHabilidades />
          </View>
        ) : null}
      </ScrollView>

      <ModalVistaPrevia
        visible={vistaPrevia}
        onCerrar={() => {
          setVistaPrevia(false);
          devolver();
        }}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  pestanas: {
    flexDirection: 'row',
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: colores.primario,
    overflow: 'hidden',
    backgroundColor: colores.fondo,
  },
  pestana: {
    flex: 1,
    minHeight: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.xs,
  },
  pestanaActiva: { backgroundColor: colores.primario },
  tituloPestana: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  oculta: { display: 'none' },
});
