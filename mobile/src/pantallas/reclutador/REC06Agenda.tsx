import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PantallaMarcador } from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'Agenda'>;

export default function REC06Agenda({ route }: Props) {
  const id = route.params?.entrevista_id;
  return (
    <PantallaMarcador
      codigo="REC-06"
      nombre="Agenda de entrevistas"
      detalle={id ? `Entrevista n.º ${id}` : undefined}
    />
  );
}
