import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useCatalogo } from '../../../api';
import {
  Boton,
  Casilla,
  CampoTexto,
  EncabezadoModal,
  Selector,
  Texto,
  VentanaModal,
  type OpcionSelector,
} from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { CATEGORIAS_AJUSTE } from './categoriasAjuste';
import { OPCIONES_COMPATIBILIDAD, SIN_FILTROS, type Filtros } from './filtros';
import { porcentajeAccesible } from './textos';

interface Props {
  visible: boolean;
  filtros: Filtros;
  onAplicar: (filtros: Filtros) => void;
  onCerrar: () => void;
}

/** Sin valor: el selector no tiene «quitar», así que «Cualquiera» ocupa su lugar. */
const CUALQUIERA: OpcionSelector = { id: 0, nombre: 'Cualquiera' };

const conCualquiera = (opciones: { id: number; nombre: string }[]): OpcionSelector[] => [
  CUALQUIERA,
  ...opciones.map(({ id, nombre }) => ({ id, nombre })),
];

const valorODefecto = (id: number | undefined) => id ?? 0;
const aFiltro = (id: number) => (id === 0 ? undefined : id);

function Contenido({ filtros, onAplicar, onCerrar }: Omit<Props, 'visible'>) {
  const [borrador, setBorrador] = useState<Filtros>(filtros);
  const [salario, setSalario] = useState(
    filtros.salario_min === undefined ? '' : String(filtros.salario_min),
  );
  const [errorSalario, setErrorSalario] = useState<string | null>(null);

  const modalidades = useCatalogo('modalidades');
  const categorias = useCatalogo('categorias');
  const jornadas = useCatalogo('jornadas');
  const entidades = useCatalogo('entidades');
  const hayEntidad = borrador.entidad_id !== undefined;
  const municipios = useCatalogo(
    'municipios',
    hayEntidad ? { entidad_id: borrador.entidad_id } : undefined,
    hayEntidad,
  );
  const ajustes = useCatalogo('ajustes');

  const ajustesPorCategoria = useMemo(
    () =>
      CATEGORIAS_AJUSTE.map((categoria) => ({
        ...categoria,
        ajustes: ajustes.datos.filter((ajuste) => ajuste.categoria === categoria.id),
      })).filter((grupo) => grupo.ajustes.length > 0),
    [ajustes.datos],
  );

  const opcionesCompatibilidad: OpcionSelector[] = [
    CUALQUIERA,
    ...OPCIONES_COMPATIBILIDAD.map((valor) => ({
      id: valor,
      nombre: `${valor} % o más`,
      etiquetaAccesible: `${porcentajeAccesible(valor)} o más`,
    })),
  ];

  function cambiar(cambio: Partial<Filtros>) {
    setBorrador((actual) => ({ ...actual, ...cambio }));
  }

  function alternarAjuste(id: number, marcado: boolean) {
    setBorrador((actual) => ({
      ...actual,
      ajuste_ids: marcado
        ? [...actual.ajuste_ids, id]
        : actual.ajuste_ids.filter((elegido) => elegido !== id),
    }));
  }

  function limpiar() {
    setBorrador(SIN_FILTROS);
    setSalario('');
    setErrorSalario(null);
  }

  function aplicar() {
    const texto = salario.trim();
    if (texto !== '' && !/^\d+$/.test(texto)) {
      setErrorSalario('Escribe solo números, sin comas ni signos. Por ejemplo: 12000.');
      return;
    }
    onAplicar({ ...borrador, salario_min: texto === '' ? undefined : Number(texto) });
  }

  return (
    <VentanaModal visible onCerrar={onCerrar} testID="modal-filtros">
      <EncabezadoModal
        titulo="Filtros"
        onVolver={onCerrar}
        pistaVolver="Cierra los filtros sin aplicar los cambios"
      />
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Selector
          etiqueta="Modalidad"
          opciones={conCualquiera(modalidades.datos)}
          valor={valorODefecto(borrador.modalidad_id)}
          onChange={(id) => cambiar({ modalidad_id: aFiltro(id) })}
          cargando={modalidades.cargando}
          testID="filtro-modalidad"
        />
        <Selector
          etiqueta="Categoría"
          opciones={conCualquiera(categorias.datos)}
          valor={valorODefecto(borrador.categoria_id)}
          onChange={(id) => cambiar({ categoria_id: aFiltro(id) })}
          cargando={categorias.cargando}
          testID="filtro-categoria"
        />
        <Selector
          etiqueta="Entidad"
          opciones={conCualquiera(entidades.datos)}
          valor={valorODefecto(borrador.entidad_id)}
          onChange={(id) => cambiar({ entidad_id: aFiltro(id), municipio_id: undefined })}
          cargando={entidades.cargando}
          buscable
          testID="filtro-entidad"
        />
        <Selector
          etiqueta="Municipio"
          opciones={conCualquiera(municipios.datos)}
          valor={valorODefecto(borrador.municipio_id)}
          onChange={(id) => cambiar({ municipio_id: aFiltro(id) })}
          deshabilitado={!hayEntidad}
          ayudaDeshabilitado="Elige primero una entidad"
          cargando={hayEntidad && municipios.cargando}
          buscable
          testID="filtro-municipio"
        />
        <Selector
          etiqueta="Jornada"
          opciones={conCualquiera(jornadas.datos)}
          valor={valorODefecto(borrador.jornada_id)}
          onChange={(id) => cambiar({ jornada_id: aFiltro(id) })}
          cargando={jornadas.cargando}
          testID="filtro-jornada"
        />
        <CampoTexto
          etiqueta="Salario mínimo (pesos al mes)"
          value={salario}
          onChangeText={(texto) => {
            setSalario(texto);
            setErrorSalario(null);
          }}
          keyboardType="number-pad"
          placeholder="Por ejemplo, 12000"
          ayuda="Solo vacantes cuyo salario publicado llega a esta cantidad."
          error={errorSalario}
          testID="filtro-salario"
        />
        <Selector
          etiqueta="Compatibilidad mínima"
          opciones={opcionesCompatibilidad}
          valor={valorODefecto(borrador.compatibilidad_min)}
          onChange={(id) => cambiar({ compatibilidad_min: aFiltro(id) })}
          testID="filtro-compatibilidad"
        />

        <View style={estilos.grupo}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Ajustes de accesibilidad
          </Texto>
          <Texto color="textoSecundarioSobreGris">
            Solo verás vacantes que declaran todos los ajustes que elijas.
          </Texto>
          {ajustes.cargando ? (
            <Texto color="textoSecundarioSobreGris">Cargando ajustes…</Texto>
          ) : null}
          {ajustesPorCategoria.map((grupo) => (
            <View key={grupo.id} style={estilos.grupo}>
              <Texto variante="cuerpoFuerte" accessibilityRole="header">
                {grupo.nombre}
              </Texto>
              {grupo.ajustes.map((ajuste) => (
                <Casilla
                  key={ajuste.id}
                  texto={ajuste.nombre}
                  marcada={borrador.ajuste_ids.includes(ajuste.id)}
                  onCambio={(marcada) => alternarAjuste(ajuste.id, marcada)}
                  testID={`ajuste-${ajuste.id}`}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={estilos.acciones}>
        <Boton
          titulo="Limpiar"
          variante="secundario"
          onPress={limpiar}
          style={estilos.accion}
          accessibilityHint="Quita todos los filtros elegidos; después toca Aplicar"
        />
        <Boton titulo="Aplicar" onPress={aplicar} style={estilos.accion} />
      </View>
    </VentanaModal>
  );
}

/** Panel de filtros de CAN-01 (CAN-01b): modal de pantalla completa con «Limpiar» y «Aplicar». */
export function ModalFiltros({ visible, ...resto }: Props) {
  // Solo existe mientras está abierto: cada vez parte de los filtros que están aplicados.
  return visible ? <Contenido {...resto} /> : null;
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  grupo: { gap: espaciado.sm },
  acciones: {
    flexDirection: 'row',
    gap: espaciado.md,
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
  accion: { flex: 1 },
});
