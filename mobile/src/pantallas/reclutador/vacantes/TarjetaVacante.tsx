import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { VacanteReclutador } from '../../../api';
import { ChipEstado, Texto } from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import {
  accionesDe,
  resumenAccesibleVacante,
  TEXTO_SUSPENDIDA,
  textoFechaPublicacion,
  textoPostulados,
} from './textosVacantes';

interface Props {
  vacante: VacanteReclutador;
  /** Abre los postulados (REC-04). */
  onPress: () => void;
  onMenu: () => void;
  refMenu?: (nodo: View | null) => void;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
const ocultarTodo = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Tarjeta de REC-02. Para el lector de pantalla el cuerpo es un solo elemento con todo su resumen;
 * el menú «Más opciones» es un botón aparte (dos controles no pueden anidarse).
 */
export function TarjetaVacante({ vacante, onPress, onMenu, refMenu }: Props) {
  const suspendida = vacante.estado === 'suspendida';
  const conMenu = accionesDe(vacante.estado).length > 0;

  return (
    <View style={estilos.tarjeta} testID={`vacante-${vacante.id}`}>
      <Pressable
        testID={`abrir-vacante-${vacante.id}`}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={resumenAccesibleVacante(vacante)}
        accessibilityHint="Abre los candidatos postulados"
        style={({ pressed }) => [estilos.cuerpo, pressed && estilos.presionada]}
      >
        <Texto variante="subtitulo" {...ocultar}>
          {vacante.titulo}
        </Texto>
        <Texto color="textoSecundarioSobreGris" {...ocultar}>
          {vacante.modalidad.nombre}
        </Texto>
        <View {...ocultarTodo}>
          <ChipEstado tipo="vacante" estado={vacante.estado} />
        </View>
        <Texto variante="cuerpoFuerte" {...ocultar}>
          {textoPostulados(vacante.postulados, vacante.nuevas)}
        </Texto>
        <Texto variante="pequeno" color="textoSecundarioSobreGris" {...ocultar}>
          {textoFechaPublicacion(vacante.publicada_en)}
        </Texto>
        {suspendida ? (
          <Texto variante="pequeno" color="errorTexto" {...ocultar}>
            {TEXTO_SUSPENDIDA}
          </Texto>
        ) : null}
      </Pressable>
      {conMenu ? (
        <Pressable
          ref={refMenu}
          testID={`menu-vacante-${vacante.id}`}
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel={`Más opciones de ${vacante.titulo}`}
          accessibilityHint="Abre las acciones de esta vacante"
          style={estilos.menu}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colores.primario} {...ocultar} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  cuerpo: {
    flex: 1,
    minHeight: AREA_TACTIL_MINIMA,
    gap: espaciado.xs,
    padding: espaciado.lg,
    borderRadius: radio.lg,
  },
  presionada: { opacity: 0.85 },
  menu: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaciado.sm,
    marginRight: espaciado.xs,
  },
});
