import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PantallaMarcador } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';

type Props = NativeStackScreenProps<RootStackParamList, 'DetallePostulado'>;

export default function REC05DetallePostulado({ route }: Props) {
  return (
    <PantallaMarcador
      codigo="REC-05"
      nombre="Detalle del postulado"
      detalle={`Postulación n.º ${route.params.id}`}
    />
  );
}
