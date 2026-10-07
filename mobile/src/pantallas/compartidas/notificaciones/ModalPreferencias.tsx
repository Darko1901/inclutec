import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  ApiError,
  notificaciones,
  type PreferenciaNotificacion,
  type TipoNotificacion,
} from '../../../api';
import {
  Aviso,
  Cargando,
  EncabezadoModal,
  EstadoError,
  Interruptor,
  Texto,
  VentanaModal,
} from '../../../componentes';
import { colores, espaciado } from '../../../tema';
import { TIPOS_NOTIFICACION } from './tiposNotificacion';

interface Props {
  visible: boolean;
  /** Se llama al cerrar; `guardadas` es true si se enviaron cambios al API. */
  onCerrar: (guardadas: boolean) => void;
}

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; original: PreferenciaNotificacion[]; actuales: PreferenciaNotificacion[] };

function Contenido({ onCerrar }: { onCerrar: (guardadas: boolean) => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    notificaciones
      .obtenerPreferencias()
      .then((lista) => {
        if (vigente) setEstado({ fase: 'listo', original: lista, actuales: lista });
      })
      .catch((error: unknown) => {
        if (vigente) setEstado({ fase: 'error', error: ApiError.desde(error) });
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  function cambiar(tipo: TipoNotificacion, canal: 'push' | 'correo', valor: boolean) {
    setEstado((previo) =>
      previo.fase === 'listo'
        ? {
            ...previo,
            actuales: previo.actuales.map((p) => (p.tipo === tipo ? { ...p, [canal]: valor } : p)),
          }
        : previo,
    );
  }

  async function cerrar() {
    if (guardando) return;
    if (estado.fase !== 'listo') {
      onCerrar(false);
      return;
    }
    const hayCambios = JSON.stringify(estado.original) !== JSON.stringify(estado.actuales);
    if (!hayCambios) {
      onCerrar(false);
      return;
    }
    setGuardando(true);
    setErrorAlGuardar(null);
    try {
      await notificaciones.guardarPreferencias(estado.actuales);
      onCerrar(true);
    } catch (fallo) {
      const error = fallo instanceof ApiError ? fallo : ApiError.servicioNoDisponible();
      setErrorAlGuardar(error.detail);
      setGuardando(false);
    }
  }

  return (
    <VentanaModal visible onCerrar={() => void cerrar()} testID="modal-preferencias">
      <EncabezadoModal
        titulo="Preferencias de avisos"
        onVolver={() => void cerrar()}
        pistaVolver="Guarda tus cambios y regresa a las notificaciones"
        volverDeshabilitado={guardando}
      />
      <ScrollView contentContainerStyle={estilos.contenido}>
        {errorAlGuardar ? <Aviso variante="error" mensaje={errorAlGuardar} /> : null}
        {estado.fase === 'cargando' ? <Cargando mensaje="Cargando preferencias…" /> : null}
        {estado.fase === 'error' ? (
          <EstadoError
            mensaje={estado.error.detail}
            onReintentar={() => {
              setEstado({ fase: 'cargando' });
              setIntento((actual) => actual + 1);
            }}
          />
        ) : null}
        {estado.fase === 'listo' ? (
          <>
            <Texto color="textoSecundario">
              Elige cómo quieres recibir cada aviso. Dentro de la app siempre los verás.
            </Texto>
            {estado.actuales.map((preferencia) => {
              const nombre = TIPOS_NOTIFICACION[preferencia.tipo].nombre;
              return (
                <View
                  key={preferencia.tipo}
                  style={estilos.grupo}
                  accessible={false}
                  accessibilityLabel={nombre}
                >
                  <Texto variante="cuerpoFuerte" accessibilityRole="header">
                    {nombre}
                  </Texto>
                  <Interruptor
                    etiqueta="Aviso en el teléfono"
                    etiquetaAccesible={`${nombre}: aviso en el teléfono`}
                    valor={preferencia.push}
                    onCambio={(valor) => cambiar(preferencia.tipo, 'push', valor)}
                    testID={`push-${preferencia.tipo}`}
                  />
                  <Interruptor
                    etiqueta="Correo electrónico"
                    etiquetaAccesible={`${nombre}: correo electrónico`}
                    valor={preferencia.correo}
                    onCambio={(valor) => cambiar(preferencia.tipo, 'correo', valor)}
                    testID={`correo-${preferencia.tipo}`}
                  />
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </VentanaModal>
  );
}

/** Preferencias de canal (push y correo) por tipo de aviso. Se guardan al cerrar. */
export function ModalPreferencias({ visible, onCerrar }: Props) {
  // El contenido (con su Modal) solo existe mientras está abierto, así siempre carga datos frescos.
  return visible ? <Contenido onCerrar={onCerrar} /> : null;
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  grupo: {
    gap: espaciado.xs,
    paddingBottom: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSuave,
  },
});
