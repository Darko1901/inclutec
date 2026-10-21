import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, postulaciones, type Observacion } from '../../../api';
import { Aviso, Boton, CampoTexto, Tarjeta, Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { formatearFechaHora, formatearFechaHoraHablada } from '../../../utilidades/fechas';
import { ETIQUETA_OBSERVACIONES, MAX_OBSERVACION } from './textosPostulado';

interface Props {
  postulacionId: number;
  observaciones: Observacion[];
  /** Se agregó una observación: la pantalla vuelve a pedir la lista. */
  onAgregada: () => Promise<void> | void;
}

/** Observaciones internas: lista con fecha y autor, campo para agregar y la aclaración de privacidad. */
export function SeccionObservaciones({ postulacionId, observaciones, onAgregada }: Props) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ mensaje: string; n: number }>();
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    setAviso(undefined);
    if (texto.trim() === '') {
      setError('Escribe la observación antes de agregarla.');
      return;
    }
    setGuardando(true);
    try {
      await postulaciones.agregarObservacion(postulacionId, texto.trim());
      await onAgregada();
      setTexto('');
      setError(null);
      setAviso({ mensaje: 'Observación guardada.', n: (aviso?.n ?? 0) + 1 });
    } catch (fallo) {
      const apiError = ApiError.desde(fallo);
      setError(apiError.campos?.texto ?? apiError.detail);
    }
    setGuardando(false);
  }

  return (
    <Tarjeta testID="seccion-observaciones">
      <Texto variante="subtitulo" accessibilityRole="header">
        Observaciones internas
      </Texto>
      <View
        accessible
        accessibilityLabel={ETIQUETA_OBSERVACIONES}
        style={estilos.etiqueta}
        testID="etiqueta-observaciones"
      >
        <Ionicons
          name="eye-off-outline"
          size={18}
          color={colores.neutroTexto}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Texto
          variante="pequeno"
          style={estilos.textoEtiqueta}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {ETIQUETA_OBSERVACIONES}
        </Texto>
      </View>

      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}
      <CampoTexto
        etiqueta="Nueva observación"
        value={texto}
        onChangeText={(valor) => {
          setTexto(valor);
          setError(null);
        }}
        multiline
        maxLength={MAX_OBSERVACION}
        contador
        error={error}
        testID="campo-observacion"
      />
      <Boton
        titulo="Agregar observación"
        icono="add-circle-outline"
        variante="secundario"
        cargando={guardando}
        onPress={() => void agregar()}
        testID="agregar-observacion"
      />

      {observaciones.length === 0 ? (
        <Texto color="textoSecundarioSobreGris">Aún no hay observaciones.</Texto>
      ) : (
        <View accessibilityRole="list" style={estilos.lista}>
          {observaciones.map((o) => (
            <View
              key={o.id}
              accessible
              accessibilityLabel={`${o.autor.nombre} ${o.autor.apellidos}, ${formatearFechaHoraHablada(o.creado_en)}. ${o.texto}`}
              style={estilos.observacion}
              testID={`observacion-${o.id}`}
            >
              <Texto
                variante="pequeno"
                color="textoSecundarioSobreGris"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {`${o.autor.nombre} ${o.autor.apellidos} · ${formatearFechaHora(o.creado_en)}`}
              </Texto>
              <Texto accessibilityElementsHidden importantForAccessibility="no">
                {o.texto}
              </Texto>
            </View>
          ))}
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: radio.completo,
    backgroundColor: colores.neutroFondo,
  },
  textoEtiqueta: { color: colores.neutroTexto, fontWeight: '600' },
  lista: { gap: espaciado.md },
  observacion: {
    gap: espaciado.xs,
    padding: espaciado.md,
    borderRadius: radio.md,
    backgroundColor: colores.fondoSuave,
  },
});
