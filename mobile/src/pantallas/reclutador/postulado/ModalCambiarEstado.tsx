import { useState } from 'react';

import {
  ApiError,
  postulaciones,
  type EstadoPostulacion,
  type ResultadoCambioEstado,
} from '../../../api';
import { Aviso, CampoTexto, GrupoRadio, ModalFormulario, Texto } from '../../../componentes';
import { textoEstadoPostulacion } from '../postulados/textosPostulados';
import {
  ACLARACION_MENSAJE,
  AYUDA_ESTADO,
  MAX_MENSAJE_ESTADO,
  MENSAJE_CONFIRMACION,
  PIDEN_CONFIRMACION,
} from './textosPostulado';

interface Props {
  postulacionId: number;
  nombre: string;
  /** Estados a los que se puede pasar ahora (`transiciones_permitidas` del API). */
  permitidos: EstadoPostulacion[];
  onCerrar: () => void;
  /** El estado cambió. */
  onCambiado: (resultado: ResultadoCambioEstado) => void;
}

type Opcion = EstadoPostulacion | '';

/**
 * «Cambiar estado»: solo los estados permitidos (radios) y un mensaje opcional para el candidato.
 * Aceptar o no seleccionar piden confirmar en el mismo modal antes de enviarse.
 */
export function ModalCambiarEstado({
  postulacionId,
  nombre,
  permitidos,
  onCerrar,
  onCambiado,
}: Props) {
  const [elegido, setElegido] = useState<Opcion>('');
  const [mensaje, setMensaje] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  async function enviar() {
    if (elegido === '') return;
    setError(null);
    setEnviando(true);
    try {
      const resultado = await postulaciones.cambiarEstado(postulacionId, {
        estado: elegido as Exclude<EstadoPostulacion, 'postulada' | 'retirada'>,
        mensaje: mensaje.trim() === '' ? null : mensaje.trim(),
      });
      onCambiado(resultado);
    } catch (fallo) {
      const apiError = ApiError.desde(fallo);
      setEnviando(false);
      setConfirmando(false);
      setErrorMensaje(apiError.campos?.mensaje ?? null);
      setError(
        apiError.codigo === 'transicion_invalida'
          ? 'El estado de esta postulación cambió mientras tanto. Cierra esta ventana y revisa el estado actual.'
          : apiError.campos?.mensaje
            ? null
            : apiError.detail,
      );
    }
  }

  function alPresionar() {
    if (elegido === '') {
      setError('Elige a qué estado pasa la postulación.');
      return;
    }
    if (PIDEN_CONFIRMACION.includes(elegido)) setConfirmando(true);
    else void enviar();
  }

  if (confirmando && elegido !== '') {
    const textos = MENSAJE_CONFIRMACION[elegido]!;
    return (
      <ModalFormulario
        titulo="Confirmar cambio"
        onCerrar={() => setConfirmando(false)}
        ocupado={enviando}
        pistaVolver="Regresa sin cambiar el estado"
        accion={{
          titulo: textos.boton,
          onPress: () => void enviar(),
          cargando: enviando,
          peligro: elegido === 'no_seleccionada',
        }}
        testID="modal-confirmar-estado"
      >
        <Texto variante="subtitulo" accessibilityRole="header">
          {textos.titulo}
        </Texto>
        <Texto>{`${nombre}. ${textos.mensaje}`}</Texto>
        {mensaje.trim() !== '' ? (
          <Texto color="textoSecundarioSobreGris">{`Mensaje para el candidato: ${mensaje.trim()}`}</Texto>
        ) : (
          <Texto color="textoSecundarioSobreGris">No agregaste un mensaje para el candidato.</Texto>
        )}
      </ModalFormulario>
    );
  }

  return (
    <ModalFormulario
      titulo="Cambiar estado"
      onCerrar={onCerrar}
      ocupado={enviando}
      pistaVolver="Cierra sin cambiar el estado"
      accion={{
        titulo: 'Cambiar estado',
        onPress: alPresionar,
        cargando: enviando,
        deshabilitada: elegido === '',
      }}
      testID="modal-cambiar-estado"
    >
      <Texto color="textoSecundarioSobreGris">{`Estado de ${nombre}. Solo puedes elegir los estados a los que puede pasar ahora.`}</Texto>
      {error ? <Aviso variante="error" mensaje={error} /> : null}
      <GrupoRadio<Opcion>
        etiqueta="Nuevo estado"
        opciones={permitidos.map((estado) => ({
          valor: estado,
          titulo: textoEstadoPostulacion(estado),
          ayuda: AYUDA_ESTADO[estado],
        }))}
        valor={elegido}
        onCambio={(estado) => {
          setElegido(estado);
          setError(null);
        }}
        testID="grupo-estados"
      />
      <CampoTexto
        etiqueta="Mensaje para el candidato (opcional)"
        ayuda={ACLARACION_MENSAJE}
        value={mensaje}
        onChangeText={(texto) => {
          setMensaje(texto);
          setErrorMensaje(null);
        }}
        multiline
        maxLength={MAX_MENSAJE_ESTADO}
        contador
        error={errorMensaje}
        testID="campo-mensaje-estado"
      />
    </ModalFormulario>
  );
}
