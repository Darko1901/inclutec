import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '../../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  EstadoVacio,
  ModalConfirmacion,
  Tarjeta,
  Texto,
  useRetornoFoco,
} from '../../../componentes';
import { espaciado } from '../../../tema';
import { useCarga } from '../../../utilidades/useCarga';

export interface TextosPanelCV {
  /** «Experiencia»: título de la lista. */
  encabezado: string;
  agregarEtiqueta: string;
  vacioTitulo: string;
  vacioMensaje: string;
  /** Botón del estado vacío, por ejemplo «Agrega tu primera experiencia». */
  vacioAccion: string;
  eliminarTitulo: string;
  avisoEliminada: string;
}

export interface TarjetaCV {
  titulo: string;
  lineas: string[];
  /** Todo lo de la tarjeta dicho de corrido para el lector de pantalla. */
  etiqueta: string;
  /** Cómo se nombra el registro en los botones: «Editar experiencia Auxiliar…». */
  nombre: string;
}

export interface PropiedadesModalCV<T> {
  /** El registro que se edita; null si se agrega uno nuevo. */
  item: T | null;
  onCerrar: () => void;
  /** Se guardó: el panel recarga la lista y anuncia el mensaje. */
  onGuardado: (mensaje: string) => void;
}

interface Props<T extends { id: number }> {
  textos: TextosPanelCV;
  /** Debe ser estable (una función fuera del componente). */
  cargar: () => Promise<T[]>;
  eliminar: (id: number) => Promise<void>;
  describir: (item: T) => TarjetaCV;
  modal: (propiedades: PropiedadesModalCV<T>) => ReactNode;
  testID?: string;
}

type EstadoModal = { abierto: false } | { abierto: true; item: unknown };

/**
 * Lista de tarjetas de CAN-04 (experiencia y formación): «+ Agregar», editar y eliminar con
 * confirmación, estado vacío con llamado a la acción y avisos que el lector de pantalla anuncia.
 */
export function PanelListaCV<T extends { id: number }>({
  textos,
  cargar,
  eliminar,
  describir,
  modal,
  testID,
}: Props<T>) {
  const { estado, recargar, recargarSilencioso } = useCarga(cargar);
  const [formulario, setFormulario] = useState<EstadoModal>({ abierto: false });
  const [porEliminar, setPorEliminar] = useState<T | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [aviso, setAviso] = useState<{ variante: 'exito' | 'error'; mensaje: string; n: number }>();
  const { registrar, recordar, devolver } = useRetornoFoco();

  function abrir(clave: string, item: T | null) {
    recordar(clave);
    setFormulario({ abierto: true, item });
  }

  function cerrarFormulario() {
    setFormulario({ abierto: false });
    devolver('agregar');
  }

  function avisar(variante: 'exito' | 'error', mensaje: string) {
    setAviso((previo) => ({ variante, mensaje, n: (previo?.n ?? 0) + 1 }));
  }

  async function confirmarEliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      await eliminar(porEliminar.id);
      await recargarSilencioso();
      avisar('exito', textos.avisoEliminada);
    } catch (fallo) {
      avisar('error', ApiError.desde(fallo).detail);
    }
    setEliminando(false);
    setPorEliminar(null);
    devolver('agregar');
  }

  if (estado.fase === 'cargando')
    return <Cargando mensaje={`Cargando ${textos.encabezado.toLowerCase()}…`} />;
  if (estado.fase === 'error') {
    return <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />;
  }

  const items = estado.datos;
  return (
    <View testID={testID} style={estilos.panel}>
      {aviso ? (
        <Aviso key={aviso.n} variante={aviso.variante} mensaje={aviso.mensaje} testID="aviso-cv" />
      ) : null}

      {items.length === 0 ? (
        <EstadoVacio
          titulo={textos.vacioTitulo}
          mensaje={textos.vacioMensaje}
          icono="document-text-outline"
          accion={{ titulo: textos.vacioAccion, onPress: () => abrir('agregar', null) }}
        />
      ) : (
        <>
          <View style={estilos.encabezado}>
            <Texto variante="subtitulo" accessibilityRole="header" style={estilos.titulo}>
              {textos.encabezado}
            </Texto>
            <Boton
              ref={registrar('agregar')}
              titulo="+ Agregar"
              accessibilityLabel={textos.agregarEtiqueta}
              variante="secundario"
              onPress={() => abrir('agregar', null)}
            />
          </View>
          {items.map((item) => {
            const tarjeta = describir(item);
            return (
              <Tarjeta key={item.id} testID={`tarjeta-${item.id}`}>
                <View accessible accessibilityLabel={tarjeta.etiqueta} style={estilos.textos}>
                  <Texto variante="cuerpoFuerte">{tarjeta.titulo}</Texto>
                  {tarjeta.lineas.map((linea) => (
                    <Texto key={linea} color="textoSecundarioSobreGris">
                      {linea}
                    </Texto>
                  ))}
                </View>
                <View style={estilos.acciones}>
                  <Boton
                    ref={registrar(`editar-${item.id}`)}
                    titulo="Editar"
                    accessibilityLabel={`Editar ${tarjeta.nombre}`}
                    icono="create-outline"
                    variante="secundario"
                    onPress={() => abrir(`editar-${item.id}`, item)}
                  />
                  <Boton
                    ref={registrar(`eliminar-${item.id}`)}
                    titulo="Eliminar"
                    accessibilityLabel={`Eliminar ${tarjeta.nombre}`}
                    icono="trash-outline"
                    variante="texto"
                    onPress={() => {
                      recordar(`eliminar-${item.id}`);
                      setPorEliminar(item);
                    }}
                  />
                </View>
              </Tarjeta>
            );
          })}
        </>
      )}

      {formulario.abierto
        ? modal({
            item: formulario.item as T | null,
            onCerrar: cerrarFormulario,
            onGuardado: (mensaje) => {
              setFormulario({ abierto: false });
              void recargarSilencioso();
              avisar('exito', mensaje);
              devolver('agregar');
            },
          })
        : null}

      <ModalConfirmacion
        visible={porEliminar !== null}
        titulo={textos.eliminarTitulo}
        mensaje={
          porEliminar
            ? `Se quitará «${describir(porEliminar).titulo}» de tu CV. Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        peligro
        cargando={eliminando}
        onConfirmar={() => void confirmarEliminar()}
        onCancelar={() => {
          setPorEliminar(null);
          devolver();
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  panel: { gap: espaciado.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  titulo: { flex: 1 },
  textos: { gap: espaciado.xs },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
});
