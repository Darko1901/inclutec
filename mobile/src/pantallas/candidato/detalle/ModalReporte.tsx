import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, reportes, useCatalogo } from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  EncabezadoModal,
  Selector,
  Texto,
  VentanaModal,
} from '../../../componentes';
import { colores, espaciado } from '../../../tema';

const MAX_DESCRIPCION = 500;

interface Props {
  visible: boolean;
  vacante: { id: number; titulo: string };
  onCerrar: () => void;
  /** El reporte se envió. */
  onEnviado: () => void;
}

function Contenido({ vacante, onCerrar, onEnviado }: Omit<Props, 'visible'>) {
  const motivos = useCatalogo('motivos-reporte', { aplica_a: 'vacante' });
  const [motivo, setMotivo] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [errorDescripcion, setErrorDescripcion] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErrorGeneral(null);
    if (motivo === null) {
      setErrorMotivo('Elige un motivo para poder enviar el reporte.');
      return;
    }
    setEnviando(true);
    try {
      await reportes.crear({
        motivo_reporte_id: motivo,
        vacante_id: vacante.id,
        descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
      });
      onEnviado();
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setEnviando(false);
      if (error.status === 404) {
        setErrorGeneral('Esta vacante ya no está disponible, así que no se puede reportar.');
      } else if (error.codigo === 'validacion' && error.campos) {
        setErrorMotivo(error.campos.motivo_reporte_id ?? null);
        setErrorDescripcion(error.campos.descripcion ?? null);
        setErrorGeneral(
          error.campos.motivo_reporte_id || error.campos.descripcion ? null : error.detail,
        );
      } else {
        setErrorGeneral(error.detail);
      }
    }
  }

  return (
    <VentanaModal visible onCerrar={enviando ? () => undefined : onCerrar} testID="modal-reporte">
      <EncabezadoModal
        titulo="Reportar vacante"
        onVolver={onCerrar}
        pistaVolver="Cierra sin enviar el reporte"
        volverDeshabilitado={enviando}
      />
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Texto color="textoSecundarioSobreGris">
          {`Cuéntanos qué pasa con «${vacante.titulo}». Nuestro equipo revisará tu reporte.`}
        </Texto>
        {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
        <Selector
          etiqueta="Motivo"
          placeholder="Elige un motivo"
          opciones={motivos.datos.map(({ id, nombre }) => ({ id, nombre }))}
          valor={motivo}
          onChange={(id) => {
            setMotivo(id);
            setErrorMotivo(null);
          }}
          cargando={motivos.cargando}
          error={errorMotivo}
          testID="motivo-reporte"
        />
        <CampoTexto
          etiqueta="Descripción (opcional)"
          value={descripcion}
          onChangeText={(texto) => {
            setDescripcion(texto);
            setErrorDescripcion(null);
          }}
          maxLength={MAX_DESCRIPCION}
          contador
          multiline
          error={errorDescripcion}
          testID="descripcion-reporte"
        />
      </ScrollView>
      <View style={estilos.pie}>
        <Boton titulo="Enviar reporte" onPress={() => void enviar()} cargando={enviando} />
      </View>
    </VentanaModal>
  );
}

/** Modal para reportar una vacante: motivo del catálogo y descripción opcional. */
export function ModalReporte({ visible, ...resto }: Props) {
  return visible ? <Contenido {...resto} /> : null;
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  pie: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
