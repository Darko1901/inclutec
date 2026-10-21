import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { PostuladoDetalle } from '../../../api';
import { Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { textoFormacion, textoModalidad } from './textosPostulado';

type Compatibilidad = PostuladoDetalle['compatibilidad'];

interface Props {
  compatibilidad: Compatibilidad;
}

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** Una línea del desglose: ícono y texto (nunca solo color); se lee como una sola frase. */
function Linea({
  cumple,
  texto,
  etiqueta,
  testID,
}: {
  cumple: boolean | 'parcial';
  texto: string;
  etiqueta?: string;
  testID?: string;
}) {
  const icono =
    cumple === true ? 'checkmark-circle' : cumple === 'parcial' ? 'time' : 'close-circle';
  const color =
    cumple === true
      ? colores.exitoTexto
      : cumple === 'parcial'
        ? colores.advertenciaTexto
        : colores.errorTexto;
  return (
    <View accessible accessibilityLabel={etiqueta ?? texto} style={estilos.linea} testID={testID}>
      <Ionicons name={icono} size={22} color={color} {...ocultar} />
      <Texto style={estilos.texto} {...ocultar}>
        {texto}
      </Texto>
    </View>
  );
}

function Grupo({
  titulo,
  cumplidas,
  faltantes,
  testID,
}: {
  titulo: string;
  cumplidas: { id: number; nombre: string }[];
  faltantes: { id: number; nombre: string }[];
  testID: string;
}) {
  if (cumplidas.length + faltantes.length === 0) return null;
  return (
    <View style={estilos.grupo} testID={testID}>
      <Texto variante="cuerpoFuerte" accessibilityRole="header">
        {titulo}
      </Texto>
      {cumplidas.map((h) => (
        <Linea key={h.id} cumple texto={`✓ ${h.nombre}`} etiqueta={`${h.nombre}: cumple`} />
      ))}
      {faltantes.map((h) => (
        <Linea
          key={h.id}
          cumple={false}
          texto={`✕ ${h.nombre}`}
          etiqueta={`${h.nombre}: no cumple`}
        />
      ))}
    </View>
  );
}

/** Habilidades obligatorias y deseables, formación y modalidad: lo que cumple y lo que no. */
export function DesgloseCompatibilidad({ compatibilidad }: Props) {
  const { habilidades, formacion, modalidad } = compatibilidad;
  const f = textoFormacion(formacion);
  return (
    <Tarjeta testID="desglose">
      <Texto variante="subtitulo" accessibilityRole="header">
        Desglose de la compatibilidad
      </Texto>
      <Grupo
        titulo="Habilidades obligatorias"
        cumplidas={habilidades.obligatorias_cumplidas}
        faltantes={habilidades.obligatorias_faltantes}
        testID="desglose-obligatorias"
      />
      <Grupo
        titulo="Habilidades deseables"
        cumplidas={habilidades.deseables_cumplidas}
        faltantes={habilidades.deseables_faltantes}
        testID="desglose-deseables"
      />
      <View style={estilos.grupo}>
        <Texto variante="cuerpoFuerte" accessibilityRole="header">
          Formación y modalidad
        </Texto>
        <Linea
          cumple={f.cumple === 'cursando' ? 'parcial' : f.cumple !== 'no'}
          texto={f.texto}
          testID="desglose-formacion"
        />
        <Linea
          cumple={modalidad.coincide}
          texto={textoModalidad(modalidad)}
          testID="desglose-modalidad"
        />
      </View>
      <Texto variante="pequeno" color="textoSecundarioSobreGris">
        Este puntaje solo considera habilidades, formación y modalidad.
      </Texto>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  linea: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  texto: { flex: 1 },
});
