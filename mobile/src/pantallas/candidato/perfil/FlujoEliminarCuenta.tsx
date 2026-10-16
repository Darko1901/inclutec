import { useState } from 'react';

import { ApiError, candidatos } from '../../../api';
import { CampoTexto, ModalConfirmacion, ModalFormulario, Texto } from '../../../componentes';
import { useSesion } from '../../../sesion';
import { LONGITUD_MAX_CONTRASENA } from '../../../utilidades/validaciones';

export const AVISO_CUENTA_ELIMINADA =
  'Tu cuenta se eliminó. Borramos tu CV, tu foto y tus necesidades de ajuste, y retiramos tus postulaciones activas.';

interface Props {
  onCerrar: () => void;
}

function PedirContrasena({ onCerrar }: Props) {
  const { cerrarSesion } = useSesion();
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    if (contrasena === '') {
      setError('Escribe tu contraseña para confirmar.');
      return;
    }
    setError(null);
    setEliminando(true);
    try {
      await candidatos.eliminarCuenta({ contrasena });
    } catch (fallo) {
      const apiError = ApiError.desde(fallo);
      setEliminando(false);
      setError(
        apiError.codigo === 'contrasena_incorrecta'
          ? 'La contraseña no es correcta. Revísala e inténtalo de nuevo.'
          : apiError.detail,
      );
      return;
    }
    // La cuenta ya no existe: se cierra la sesión y MOV-01 muestra el aviso.
    await cerrarSesion(AVISO_CUENTA_ELIMINADA);
  }

  return (
    <ModalFormulario
      titulo="Confirma con tu contraseña"
      onCerrar={onCerrar}
      ocupado={eliminando}
      pistaVolver="Cierra sin eliminar tu cuenta"
      accion={{
        titulo: 'Eliminar mi cuenta',
        onPress: () => void eliminar(),
        cargando: eliminando,
        peligro: true,
      }}
      testID="modal-eliminar-cuenta"
    >
      <Texto>
        Para eliminar tu cuenta escribe tu contraseña. Después de esto no podrás recuperar tus
        datos.
      </Texto>
      <CampoTexto
        etiqueta="Contraseña"
        value={contrasena}
        onChangeText={(texto) => {
          setContrasena(texto);
          setError(null);
        }}
        esContrasena
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        maxLength={LONGITUD_MAX_CONTRASENA}
        error={error}
        testID="campo-contrasena-eliminar"
      />
    </ModalFormulario>
  );
}

/**
 * «Eliminar mi cuenta» con doble confirmación (CU-08): primero explica qué se borra y qué pasa
 * con las postulaciones activas; después pide la contraseña.
 */
export function FlujoEliminarCuenta({ onCerrar }: Props) {
  const [paso, setPaso] = useState<'explicar' | 'contrasena'>('explicar');
  if (paso === 'contrasena') return <PedirContrasena onCerrar={onCerrar} />;
  return (
    <ModalConfirmacion
      visible
      titulo="¿Eliminar tu cuenta?"
      mensaje="Se borrarán tu CV, tu foto y tus necesidades de ajuste, y tus postulaciones activas se retirarán. Tu cuenta se dará de baja y no podrás recuperarla. En el siguiente paso te pediremos tu contraseña."
      textoConfirmar="Continuar"
      peligro
      onConfirmar={() => setPaso('contrasena')}
      onCancelar={onCerrar}
    />
  );
}
