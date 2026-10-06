import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PantallaMarcador } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleVacante'>;

export default function CAN02DetalleVacante({ route }: Props) {
  return (
    <PantallaMarcador
      codigo="CAN-02"
      nombre="Detalle de vacante"
      detalle={`Vacante n.º ${route.params.id}`}
    />
  );
}
