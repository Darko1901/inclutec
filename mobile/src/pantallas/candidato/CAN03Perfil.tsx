import { PantallaMarcador } from '../../componentes';
import { BotonCerrarSesion } from '../compartidas/BotonCerrarSesion';

export default function CAN03Perfil() {
  return (
    <PantallaMarcador codigo="CAN-03" nombre="Mi perfil">
      <BotonCerrarSesion />
    </PantallaMarcador>
  );
}
