import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';

import { ApiError, postulaciones, type CompartirAjustes, type PerfilCandidato } from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  EncabezadoModal,
  ModalConfirmacion,
  Texto,
  VentanaModal,
} from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';

export const MAX_MENSAJE = 500;

/** Cómo terminó el intento de postularse, para que CAN-02 actualice el botón y los avisos. */
export type ResultadoPostulacion =
  | { tipo: 'creada'; id: number }
  | { tipo: 'duplicada'; detail: string }
  | { tipo: 'no_disponible'; detail: string }
  | { tipo: 'perfil_incompleto'; detail: string };

interface Props {
  visible: boolean;
  vacante: { id: number; titulo: string; empresa: string };
  perfil: PerfilCandidato;
  onCerrar: () => void;
  onTerminar: (resultado: ResultadoPostulacion) => void;
}

/** Respuesta inicial de «¿Compartir tus necesidades?» según la preferencia del perfil. */
export function respuestaInicial(compartir: CompartirAjustes): boolean | null {
  return compartir === 'siempre' ? true : compartir === 'nunca' ? false : null;
}

function Contenido({ vacante, perfil, onCerrar, onTerminar }: Omit<Props, 'visible'>) {
  const conConsentimiento = perfil.consentimiento_sensibles_en !== null;
  const [mensaje, setMensaje] = useState('');
  const [comparte, setComparte] = useState<boolean | null>(
    conConsentimiento ? respuestaInicial(perfil.compartir_ajustes) : false,
  );
  const [errorComparte, setErrorComparte] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function revisar() {
    setErrorGeneral(null);
    if (comparte === null) {
      setErrorComparte('Elige Sí o No para continuar.');
      return;
    }
    setConfirmando(true);
  }

  async function enviar() {
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const creada = await postulaciones.crear({
        vacante_id: vacante.id,
        mensaje: mensaje.trim() === '' ? null : mensaje.trim(),
        compartir_ajustes: comparte === true,
      });
      onTerminar({ tipo: 'creada', id: creada.id });
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setConfirmando(false);
      setEnviando(false);
      switch (error.codigo) {
        case 'postulacion_duplicada':
          onTerminar({ tipo: 'duplicada', detail: error.detail });
          break;
        case 'vacante_no_disponible':
          onTerminar({ tipo: 'no_disponible', detail: error.detail });
          break;
        case 'perfil_incompleto':
          onTerminar({ tipo: 'perfil_incompleto', detail: error.detail });
          break;
        case 'validacion':
          setErrorMensaje(error.campos?.mensaje ?? null);
          setErrorComparte(error.campos?.compartir_ajustes ?? null);
          setErrorGeneral(error.campos ? null : error.detail);
          break;
        default:
          setErrorGeneral(error.detail);
      }
    }
  }

  return (
    <VentanaModal
      visible
      onCerrar={enviando ? () => undefined : onCerrar}
      testID="modal-postulacion"
    >
      <EncabezadoModal
        titulo="Postularme"
        onVolver={onCerrar}
        pistaVolver="Cierra sin enviar tu postulación"
        volverDeshabilitado={enviando}
      />
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <View style={estilos.resumen}>
          <Texto variante="subtitulo">{vacante.titulo}</Texto>
          <Texto color="textoSecundarioSobreGris">{vacante.empresa}</Texto>
        </View>

        {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}

        <CampoTexto
          etiqueta="Mensaje para la empresa (opcional)"
          value={mensaje}
          onChangeText={(texto) => {
            setMensaje(texto);
            setErrorMensaje(null);
          }}
          maxLength={MAX_MENSAJE}
          contador
          multiline
          error={errorMensaje}
          ayuda="Cuéntale a la empresa por qué te interesa el puesto."
          testID="mensaje-postulacion"
        />

        {conConsentimiento ? (
          <View
            style={estilos.pregunta}
            accessibilityRole="radiogroup"
            accessibilityLabel="¿Compartir tus necesidades de ajuste con esta empresa?"
          >
            <Texto variante="etiqueta" accessibilityElementsHidden importantForAccessibility="no">
              ¿Compartir tus necesidades de ajuste con esta empresa?
            </Texto>
            <Texto variante="pequeno" color="textoSecundarioSobreGris">
              Tus necesidades son privadas: la empresa solo las verá si eliges «Sí».
            </Texto>
            <View style={estilos.opciones}>
              {([true, false] as const).map((valor) => {
                const marcada = comparte === valor;
                return (
                  <Pressable
                    key={String(valor)}
                    testID={valor ? 'compartir-si' : 'compartir-no'}
                    onPress={() => {
                      setComparte(valor);
                      setErrorComparte(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={valor ? 'Sí' : 'No'}
                    accessibilityState={{ checked: marcada, selected: marcada }}
                    style={[estilos.opcion, marcada && estilos.opcionMarcada]}
                  >
                    <Ionicons
                      name={marcada ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={marcada ? colores.primario : colores.borde}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Texto
                      variante="cuerpoFuerte"
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {valor ? 'Sí' : 'No'}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
            {errorComparte ? (
              <View style={estilos.error}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colores.error}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Texto
                  variante="pequeno"
                  color="error"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={estilos.textoError}
                >
                  {errorComparte}
                </Texto>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={estilos.sinConsentimiento} accessible>
            <Texto variante="etiqueta">Necesidades de ajuste</Texto>
            <Texto>
              No hay necesidades de ajuste para compartir: aún no has dado tu consentimiento para
              registrarlas. Si quieres hacerlo, puedes hacerlo en tu perfil.
            </Texto>
          </View>
        )}
      </ScrollView>

      <View style={estilos.pie}>
        <Boton titulo="Enviar postulación" onPress={revisar} cargando={enviando} />
      </View>

      <ModalConfirmacion
        visible={confirmando}
        titulo="¿Enviar tu postulación?"
        mensaje={`Se enviará a ${vacante.empresa} para la vacante ${vacante.titulo}. ${
          comparte
            ? 'La empresa podrá ver tus necesidades de ajuste.'
            : 'La empresa no verá tus necesidades de ajuste.'
        }`}
        textoConfirmar="Sí, enviar"
        textoCancelar="Revisar"
        cargando={enviando}
        onConfirmar={() => void enviar()}
        onCancelar={() => setConfirmando(false)}
      />
    </VentanaModal>
  );
}

/** Modal de postulación: mensaje opcional y si se comparten las necesidades de ajuste. */
export function ModalPostulacion({ visible, ...resto }: Props) {
  // Solo existe mientras está abierto: cada vez parte de la preferencia del perfil.
  return visible ? <Contenido {...resto} /> : null;
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.lg },
  resumen: { gap: espaciado.xs },
  pregunta: { gap: espaciado.sm },
  opciones: { flexDirection: 'row', gap: espaciado.md },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: AREA_TACTIL_MINIMA,
    padding: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.fondo,
  },
  opcionMarcada: {
    borderColor: colores.primario,
    borderWidth: 2,
    backgroundColor: colores.infoFondo,
  },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.xs },
  textoError: { flexShrink: 1 },
  sinConsentimiento: {
    gap: espaciado.xs,
    padding: espaciado.md,
    borderRadius: radio.md,
    backgroundColor: colores.fondoSuave,
  },
  pie: {
    padding: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
