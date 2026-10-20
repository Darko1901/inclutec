import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PantallaMarcador } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';

type Props = NativeStackScreenProps<RootStackParamList, 'Postulados'>;

export default function REC04Postulados({ route }: Props) {
  return (
    <PantallaMarcador
      codigo="REC-04"
      nombre="Postulados"
      detalle={`Vacante n.º ${route.params.vacante_id}`}
    />
  );
}
