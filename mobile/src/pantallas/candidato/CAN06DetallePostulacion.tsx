import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PantallaMarcador } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';

type Props = NativeStackScreenProps<RootStackParamList, 'DetallePostulacion'>;

export default function CAN06DetallePostulacion({ route }: Props) {
  return (
    <PantallaMarcador
      codigo="CAN-06"
      nombre="Detalle de postulación y entrevista"
      detalle={`Postulación n.º ${route.params.id}`}
    />
  );
}
