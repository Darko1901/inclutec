import { useState } from 'react';

import { ApiError, entrevistas } from '../../../api';
import { Aviso, CampoTexto, ModalFormulario, Texto } from '../../../componentes';
import { MAX_MOTIVO } from './horarios';

interface Props {
  entrevistaId: number;
  candidato: string;
  onCerrar: () => void;
  onCancelada: () => void;
}

/** Cancelar una entrevista agendada: el motivo es obligatorio y se le avisa al candidato. */
export function ModalCancelarEntrevista({ entrevistaId, candidato, onCerrar, onCancelada }: Props) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cancelar() {
    setErrorGeneral(null);
    if (motivo.trim() === '') {
      setError('Escribe el motivo de la cancelación. El candidato lo leerá.');
      return;
    }
    setEnviando(true);
    try {
      await entrevistas.registrarResultado(entrevistaId, {
        estado: 'cancelada',
        motivo_cancelacion: motivo.trim(),
      });
      onCancelada();
    } catch (fallo) {
      const apiError = ApiError.desde(fallo);
      setEnviando(false);
      if (apiError.campos?.motivo_cancelacion) setError(apiError.campos.motivo_cancelacion);
      else setErrorGeneral(apiError.detail);
    }
  }

  return (
    <ModalFormulario
      titulo="Cancelar entrevista"
      onCerrar={onCerrar}
      ocupado={enviando}
      pistaVolver="Cierra sin cancelar la entrevista"
      accion={{
        titulo: 'Cancelar entrevista',
        onPress: () => void cancelar(),
        cargando: enviando,
        peligro: true,
      }}
      testID="modal-cancelar-entrevista"
    >
      <Texto>{`Vas a cancelar la entrevista con ${candidato}. Le avisaremos por la app y por correo, y podrá elegir otro horario.`}</Texto>
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      <CampoTexto
        etiqueta="Motivo de la cancelación"
        ayuda="El candidato verá este motivo."
        value={motivo}
        onChangeText={(texto) => {
          setMotivo(texto);
          setError(null);
        }}
        multiline
        maxLength={MAX_MOTIVO}
        contador
        error={error}
        testID="campo-motivo-cancelacion"
      />
    </ModalFormulario>
  );
}
