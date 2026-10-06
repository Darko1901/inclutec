import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PantallaMarcador } from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';
import { BotonCerrarSesion } from '../compartidas/BotonCerrarSesion';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'Organizacion'>;

export default function REC01Organizacion({ route }: Props) {
  const id = route.params?.empresa_id;
  return (
    <PantallaMarcador
      codigo="REC-01"
      nombre="Organización"
      detalle={id ? `Empresa n.º ${id}` : undefined}
    >
      <BotonCerrarSesion />
    </PantallaMarcador>
  );
}
