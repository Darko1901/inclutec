import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PantallaMarcador } from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'MisVacantes'>;

export default function REC02MisVacantes({ route }: Props) {
  const id = route.params?.vacante_id;
  return (
    <PantallaMarcador
      codigo="REC-02"
      nombre="Mis vacantes"
      detalle={id ? `Vacante n.º ${id}` : undefined}
    />
  );
}
