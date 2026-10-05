import { PantallaMarcador } from '../../componentes';
import { BotonCerrarSesion } from '../compartidas/BotonCerrarSesion';

export default function REC01Organizacion() {
  return (
    <PantallaMarcador codigo="REC-01" nombre="Organización">
      <BotonCerrarSesion />
    </PantallaMarcador>
  );
}
