import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

import { empresas } from '../../api';
import { Cargando, EstadoError, Pantalla, Texto, useRetornoFoco } from '../../componentes';
import type { ReclutadorTabsParamList } from '../../navegacion';
import { useCarga } from '../../utilidades/useCarga';
import { BannerValidacion } from './organizacion/BannerValidacion';
import { BloqueLogo } from './organizacion/BloqueLogo';
import { FormularioOrganizacion } from './organizacion/FormularioOrganizacion';
import { SeccionCuentaReclutador } from './organizacion/SeccionCuentaReclutador';
import { SeccionDocumento } from './organizacion/SeccionDocumento';

type Props = BottomTabScreenProps<ReclutadorTabsParamList, 'Organizacion'>;

const cargarEmpresa = () => empresas.miOrganizacion();

/** REC-01: estado de validación, logo, datos de la organización, constancia y cuenta. */
export default function REC01Organizacion(_: Props) {
  const { estado, recargar, recargarSilencioso, establecer } = useCarga(cargarEmpresa);
  const { registrar, recordar, devolver } = useRetornoFoco();

  // Al volver a la pestaña el estado puede haber cambiado (por ejemplo, tras la validación).
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) primeraVez.current = false;
      else void recargarSilencioso();
    }, [recargarSilencioso]),
  );

  if (estado.fase === 'cargando') {
    return (
      <Pantalla>
        <Cargando mensaje="Cargando tu organización…" />
      </Pantalla>
    );
  }
  if (estado.fase === 'error') {
    return (
      <Pantalla>
        <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
      </Pantalla>
    );
  }

  const empresa = estado.datos;
  return (
    <Pantalla desplazable>
      <Texto variante="titulo" accessibilityRole="header">
        Organización
      </Texto>
      <BannerValidacion estado={empresa.estado} motivo={empresa.motivo_estado} />
      <BloqueLogo
        empresa={empresa}
        onCambiado={recargarSilencioso}
        refBoton={registrar('logo')}
        onAbrirDialogo={() => recordar('logo')}
        onCerrarDialogo={() => devolver()}
      />
      <FormularioOrganizacion key={empresa.id} empresa={empresa} onGuardada={establecer} />
      <SeccionDocumento empresa={empresa} onSubida={recargarSilencioso} />
      <SeccionCuentaReclutador />
    </Pantalla>
  );
}
