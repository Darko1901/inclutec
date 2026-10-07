import { Boton, Casilla, Texto } from '../../../componentes';
import type { TipoCuenta } from './formulario';

interface Props {
  tipo: TipoCuenta;
  aceptaAviso: boolean;
  consentimiento: boolean;
  errorAviso?: string;
  alCambiarAviso: (marcada: boolean) => void;
  alCambiarConsentimiento: (marcada: boolean) => void;
  alLeerAviso: () => void;
}

export const TEXTO_AVISO = 'Acepto el aviso de privacidad';
export const TEXTO_CONSENTIMIENTO =
  'Autorizo el tratamiento de mis necesidades de ajuste para recomendarme vacantes';
export const AYUDA_CONSENTIMIENTO =
  'Se usan solo para mostrarte vacantes que cubran lo que necesitas y calcular tu compatibilidad. ' +
  'Es opcional y puedes cambiarlo después en Mi perfil.';

/** Paso 3: aviso de privacidad y, solo para candidatos, el consentimiento para datos sensibles. */
export function PasoPrivacidad({
  tipo,
  aceptaAviso,
  consentimiento,
  errorAviso,
  alCambiarAviso,
  alCambiarConsentimiento,
  alLeerAviso,
}: Props) {
  return (
    <>
      <Texto>Antes de crear tu cuenta, necesitamos que revises cómo cuidamos tus datos.</Texto>
      <Casilla
        testID="casilla-aviso"
        texto={TEXTO_AVISO}
        marcada={aceptaAviso}
        onCambio={alCambiarAviso}
        error={errorAviso}
      />
      <Boton
        titulo="Leer el aviso de privacidad"
        variante="texto"
        icono="document-text-outline"
        onPress={alLeerAviso}
      />
      {tipo === 'candidato' ? (
        <Casilla
          testID="casilla-consentimiento"
          texto={TEXTO_CONSENTIMIENTO}
          ayuda={AYUDA_CONSENTIMIENTO}
          marcada={consentimiento}
          onCambio={alCambiarConsentimiento}
        />
      ) : null}
    </>
  );
}
