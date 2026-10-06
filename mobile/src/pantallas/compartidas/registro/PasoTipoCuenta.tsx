import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Boton, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import type { TipoCuenta } from './formulario';

interface Opcion {
  tipo: TipoCuenta;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}

const OPCIONES: Opcion[] = [
  {
    tipo: 'candidato',
    titulo: 'Busco empleo',
    descripcion: 'Crea tu perfil y postúlate a vacantes que se ajusten a ti.',
    icono: 'person-outline',
  },
  {
    tipo: 'reclutador',
    titulo: 'Represento a una empresa',
    descripcion: 'Registra tu empresa, publica vacantes y conoce a los candidatos.',
    icono: 'business-outline',
  },
];

interface Props {
  alElegir: (tipo: TipoCuenta) => void;
  alIrAInicioSesion: () => void;
}

/** Paso 1: ¿qué tipo de cuenta quiere crear? */
export function PasoTipoCuenta({ alElegir, alIrAInicioSesion }: Props) {
  return (
    <>
      <Texto>¿Cómo vas a usar IncluTec?</Texto>
      {OPCIONES.map((opcion) => (
        <Tarjeta
          key={opcion.tipo}
          testID={`tarjeta-${opcion.tipo}`}
          onPress={() => alElegir(opcion.tipo)}
          accessibilityLabel={`${opcion.titulo}. ${opcion.descripcion}`}
          style={estilos.tarjeta}
        >
          <View style={estilos.fila}>
            <Ionicons
              name={opcion.icono}
              size={32}
              color={colores.primario}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={estilos.textos}>
              <Texto
                variante="subtitulo"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {opcion.titulo}
              </Texto>
              <Texto
                color="textoSecundario"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {opcion.descripcion}
              </Texto>
            </View>
          </View>
        </Tarjeta>
      ))}
      <Boton titulo="Ya tengo una cuenta" variante="texto" onPress={alIrAInicioSesion} />
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { minHeight: 96, justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.lg },
  textos: { flex: 1, gap: espaciado.xs },
});
