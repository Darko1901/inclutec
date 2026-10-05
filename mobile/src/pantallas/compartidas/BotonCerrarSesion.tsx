import { useState } from 'react';

import { Boton, ModalConfirmacion } from '../../componentes';
import { useSesion } from '../../sesion';

/** «Cerrar sesión» con confirmación; al terminar, la navegación vuelve a MOV-01. */
export function BotonCerrarSesion() {
  const { cerrarSesion } = useSesion();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  async function confirmar() {
    setCerrando(true);
    await cerrarSesion();
  }

  return (
    <>
      <Boton
        titulo="Cerrar sesión"
        icono="log-out-outline"
        variante="secundario"
        onPress={() => setConfirmando(true)}
      />
      <ModalConfirmacion
        visible={confirmando}
        titulo="¿Cerrar sesión?"
        mensaje="Tendrás que escribir tu correo y contraseña para volver a entrar."
        textoConfirmar="Cerrar sesión"
        cargando={cerrando}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
