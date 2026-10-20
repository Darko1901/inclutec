import { StyleSheet, View } from 'react-native';

import type { VacanteReclutador } from '../../../api';
import { Boton, Texto, useFocoEnTitulo, VentanaModal } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import {
  accionesDe,
  requiereEmpresaValidada,
  TITULO_ACCION,
  type AccionVacante,
} from './textosVacantes';

interface Props {
  /** Vacante cuyo menú está abierto; null = cerrado. */
  vacante: VacanteReclutador | null;
  empresaValidada: boolean;
  onElegir: (accion: AccionVacante, vacante: VacanteReclutador) => void;
  onCancelar: () => void;
  onCerrado?: () => void;
}

const ICONOS = {
  editar: 'create-outline',
  publicar: 'megaphone-outline',
  pausar: 'pause-circle-outline',
  reanudar: 'play-circle-outline',
  cerrar: 'lock-closed-outline',
  duplicar: 'copy-outline',
} as const;

function Contenido({
  vacante,
  empresaValidada,
  onElegir,
  onCancelar,
}: Omit<Props, 'onCerrado'> & { vacante: VacanteReclutador }) {
  const referenciaTitulo = useFocoEnTitulo();
  return (
    <View style={estilos.fondo}>
      <View accessibilityViewIsModal style={estilos.cuadro}>
        <Texto ref={referenciaTitulo} variante="subtitulo" accessibilityRole="header">
          Más opciones
        </Texto>
        <Texto color="textoSecundarioSobreGris">{vacante.titulo}</Texto>
        <View style={estilos.acciones}>
          {accionesDe(vacante.estado).map((accion) => {
            const bloqueada = requiereEmpresaValidada(accion) && !empresaValidada;
            return (
              <Boton
                key={accion}
                titulo={TITULO_ACCION[accion]}
                icono={ICONOS[accion]}
                variante={accion === 'editar' ? 'primario' : 'secundario'}
                deshabilitado={bloqueada}
                accessibilityHint={bloqueada ? 'Disponible cuando validemos tu empresa' : undefined}
                onPress={() => onElegir(accion, vacante)}
                testID={`accion-${accion}`}
              />
            );
          })}
          {!empresaValidada ? (
            <Texto variante="pequeno" color="textoSecundarioSobreGris">
              Podrás publicar cuando validemos tu empresa.
            </Texto>
          ) : null}
          <Boton titulo="Cancelar" variante="texto" onPress={onCancelar} />
        </View>
      </View>
    </View>
  );
}

/** Menú ⋮ de la tarjeta: solo las acciones que permite el estado de la vacante. */
export function MenuVacante({ vacante, onCerrado, ...resto }: Props) {
  return (
    <VentanaModal
      visible={vacante !== null}
      tipo="dialogo"
      onCerrar={resto.onCancelar}
      onCerrado={onCerrado}
      testID="menu-acciones"
    >
      {vacante ? <Contenido vacante={vacante} {...resto} /> : <View />}
    </VentanaModal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', padding: espaciado.xl },
  cuadro: {
    gap: espaciado.md,
    padding: espaciado.xl,
    borderRadius: radio.lg,
    backgroundColor: colores.fondo,
  },
  acciones: { gap: espaciado.sm },
});
