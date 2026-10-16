import { useState } from 'react';

import { ApiError, auth } from '../../../api';
import { Aviso, CampoTexto, ModalFormulario } from '../../../componentes';
import {
  LONGITUD_MAX_CONTRASENA,
  mensajeConfirmacion,
  mensajeContrasenaRegistro,
} from '../../../utilidades/validaciones';

interface Props {
  onCerrar: () => void;
  /** La contraseña se cambió. */
  onCambiada: () => void;
}

type Campo = 'actual' | 'nueva' | 'confirmacion';
type Errores = Partial<Record<Campo, string>>;

const CAMPOS_API: Record<string, Campo> = {
  contrasena_actual: 'actual',
  contrasena_nueva: 'nueva',
};

/** Cambiar contraseña (PUT /auth/password): actual, nueva y confirmación. */
export function ModalContrasena({ onCerrar, onCambiada }: Props) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const limpiar = (campo: Campo) => setErrores((previo) => ({ ...previo, [campo]: undefined }));

  async function guardar() {
    setErrorGeneral(null);
    const encontrados: Errores = {};
    if (actual === '') encontrados.actual = 'Escribe tu contraseña actual.';
    const errorNueva = mensajeContrasenaRegistro(nueva);
    if (errorNueva) encontrados.nueva = errorNueva;
    else if (nueva === actual) {
      encontrados.nueva = 'La contraseña nueva debe ser distinta de la actual.';
    }
    const errorConfirmacion = mensajeConfirmacion(nueva, confirmacion);
    if (errorConfirmacion) encontrados.confirmacion = errorConfirmacion;
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    try {
      await auth.cambiarContrasena({ contrasena_actual: actual, contrasena_nueva: nueva });
      onCambiada();
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setGuardando(false);
      if (error.codigo === 'contrasena_incorrecta') {
        setErrores({
          actual: 'La contraseña actual no es correcta. Revísala e inténtalo de nuevo.',
        });
      } else if (error.campos) {
        const deApi: Errores = {};
        for (const [campo, mensaje] of Object.entries(error.campos)) {
          if (CAMPOS_API[campo]) deApi[CAMPOS_API[campo]] = mensaje;
        }
        setErrores(deApi);
        if (Object.keys(deApi).length === 0) setErrorGeneral(error.detail);
      } else {
        setErrorGeneral(error.detail);
      }
    }
  }

  return (
    <ModalFormulario
      titulo="Cambiar contraseña"
      onCerrar={onCerrar}
      ocupado={guardando}
      pistaVolver="Cierra sin cambiar la contraseña"
      accion={{ titulo: 'Cambiar contraseña', onPress: () => void guardar(), cargando: guardando }}
      testID="modal-contrasena"
    >
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      <CampoTexto
        etiqueta="Contraseña actual"
        value={actual}
        onChangeText={(texto) => {
          setActual(texto);
          limpiar('actual');
        }}
        esContrasena
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        maxLength={LONGITUD_MAX_CONTRASENA}
        error={errores.actual}
        testID="campo-contrasena-actual"
      />
      <CampoTexto
        etiqueta="Contraseña nueva"
        ayuda="De 8 a 64 caracteres, con al menos una letra y un número."
        value={nueva}
        onChangeText={(texto) => {
          setNueva(texto);
          limpiar('nueva');
        }}
        esContrasena
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={LONGITUD_MAX_CONTRASENA}
        error={errores.nueva}
        testID="campo-contrasena-nueva"
      />
      <CampoTexto
        etiqueta="Confirma la contraseña nueva"
        value={confirmacion}
        onChangeText={(texto) => {
          setConfirmacion(texto);
          limpiar('confirmacion');
        }}
        esContrasena
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={LONGITUD_MAX_CONTRASENA}
        error={errores.confirmacion}
        testID="campo-contrasena-confirmacion"
      />
    </ModalFormulario>
  );
}
