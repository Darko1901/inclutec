import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PantallaMarcador } from '../../componentes';
import type { CandidatoTabsParamList } from '../../navegacion';

type Props = BottomTabScreenProps<CandidatoTabsParamList, 'Empresas'>;

export default function CAN07Empresas({ route }: Props) {
  const empresaId = route.params?.empresa_id;
  return (
    <PantallaMarcador
      codigo="CAN-07"
      nombre="Empresas"
      detalle={empresaId === undefined ? undefined : `Empresa n.º ${empresaId}`}
    />
  );
}
