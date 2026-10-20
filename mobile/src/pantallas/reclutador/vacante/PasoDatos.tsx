import { StyleSheet, View } from 'react-native';

import { useCatalogo } from '../../../api';
import { Casilla, CampoTexto, Selector, SelectorUbicacion } from '../../../componentes';
import { espaciado } from '../../../tema';
import { MAX_DESCRIPCION, MAX_TITULO, TITULOS_PASO } from './formulario';
import { TituloPaso } from './TituloPaso';
import type { PropiedadesPaso } from './tipos';

interface Props extends PropiedadesPaso {
  /** Entidad del municipio ya guardado, para precargar el selector. */
  entidadInicial: number | null;
}

const opciones = (datos: { id: number; nombre: string }[]) =>
  datos.map(({ id, nombre }) => ({ id, nombre }));

/** Paso 1: título, categoría, descripción, jornada, contrato, plazas, ubicación y salario. */
export function PasoDatos({ formulario: f, cambiar, errores, limpiar, entidadInicial }: Props) {
  const categorias = useCatalogo('categorias');
  const jornadas = useCatalogo('jornadas');
  const contratos = useCatalogo('tipos-contrato');

  return (
    <View style={estilos.paso}>
      <TituloPaso texto={TITULOS_PASO[1]} />
      <CampoTexto
        etiqueta="Título de la vacante"
        value={f.titulo}
        onChangeText={(titulo) => {
          cambiar({ titulo });
          limpiar('titulo');
        }}
        maxLength={MAX_TITULO}
        error={errores.titulo}
        testID="campo-titulo"
      />
      <Selector
        etiqueta="Categoría"
        opciones={opciones(categorias.datos)}
        valor={f.categoriaId}
        cargando={categorias.cargando}
        onChange={(categoriaId) => {
          cambiar({ categoriaId });
          limpiar('categoria_id');
        }}
        error={errores.categoria_id}
        placeholder="Elige la categoría"
        testID="selector-categoria"
      />
      <CampoTexto
        etiqueta="Descripción"
        ayuda="Cuenta qué hará la persona y cómo es el equipo."
        value={f.descripcion}
        onChangeText={(descripcion) => {
          cambiar({ descripcion });
          limpiar('descripcion');
        }}
        multiline
        maxLength={MAX_DESCRIPCION}
        contador
        error={errores.descripcion}
        testID="campo-descripcion-vacante"
      />
      <Selector
        etiqueta="Jornada"
        opciones={opciones(jornadas.datos)}
        valor={f.jornadaId}
        cargando={jornadas.cargando}
        onChange={(jornadaId) => {
          cambiar({ jornadaId });
          limpiar('jornada_id');
        }}
        error={errores.jornada_id}
        placeholder="Elige la jornada"
        testID="selector-jornada"
      />
      <Selector
        etiqueta="Tipo de contrato"
        opciones={opciones(contratos.datos)}
        valor={f.tipoContratoId}
        cargando={contratos.cargando}
        onChange={(tipoContratoId) => {
          cambiar({ tipoContratoId });
          limpiar('tipo_contrato_id');
        }}
        error={errores.tipo_contrato_id}
        placeholder="Elige el tipo de contrato"
        testID="selector-contrato"
      />
      <CampoTexto
        etiqueta="Número de plazas"
        value={f.plazas}
        onChangeText={(plazas) => {
          cambiar({ plazas: plazas.replace(/\D/g, '') });
          limpiar('plazas');
        }}
        keyboardType="number-pad"
        maxLength={4}
        error={errores.plazas}
        testID="campo-plazas"
      />
      <SelectorUbicacion
        entidadInicial={entidadInicial}
        municipioId={f.municipioId}
        onMunicipio={(municipioId) => {
          cambiar({ municipioId });
          limpiar('municipio_id');
        }}
        error={errores.municipio_id}
      />
      <CampoTexto
        etiqueta="Salario mínimo mensual (MXN)"
        ayuda="Opcional."
        value={f.salarioMin}
        onChangeText={(salarioMin) => {
          cambiar({ salarioMin });
          limpiar('salario_min', 'salario_max');
        }}
        keyboardType="decimal-pad"
        maxLength={10}
        error={errores.salario_min}
        testID="campo-salario-min"
      />
      <CampoTexto
        etiqueta="Salario máximo mensual (MXN)"
        ayuda="Opcional. No puede ser menor que el mínimo."
        value={f.salarioMax}
        onChangeText={(salarioMax) => {
          cambiar({ salarioMax });
          limpiar('salario_max');
        }}
        keyboardType="decimal-pad"
        maxLength={10}
        error={errores.salario_max}
        testID="campo-salario-max"
      />
      <Casilla
        texto="Mostrar salario a los candidatos"
        ayuda="Si no lo marcas, los candidatos no verán el rango."
        marcada={f.mostrarSalario}
        onCambio={(mostrarSalario) => cambiar({ mostrarSalario })}
        testID="casilla-mostrar-salario"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: espaciado.lg },
});
