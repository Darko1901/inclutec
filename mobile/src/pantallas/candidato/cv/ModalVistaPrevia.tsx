import { candidatos } from '../../../api';
import { Cargando, EstadoError, ModalFormulario, Texto } from '../../../componentes';
import { useCarga } from '../../../utilidades/useCarga';
import { CvCandidato } from '../../compartidas/CvCandidato';

export const AVISO_CONTACTO =
  'Tu correo y teléfono se muestran a la empresa cuando te invite a entrevista.';

const cargar = () => candidatos.vistaPrevia();

function Contenido({ onCerrar }: { onCerrar: () => void }) {
  const { estado, recargar } = useCarga(cargar);
  return (
    <ModalFormulario
      titulo="Vista previa de mi CV"
      onCerrar={onCerrar}
      pistaVolver="Cierra la vista previa"
      accion={{ titulo: 'Cerrar', onPress: onCerrar }}
      testID="modal-vista-previa"
    >
      <Texto color="textoSecundarioSobreGris">
        Así verá tu CV la empresa a la que te postules.
      </Texto>
      {estado.fase === 'cargando' ? <Cargando mensaje="Preparando la vista previa…" /> : null}
      {estado.fase === 'error' ? (
        <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
      ) : null}
      {estado.fase === 'listo' ? (
        <CvCandidato cv={estado.datos} avisoContacto={AVISO_CONTACTO} />
      ) : null}
    </ModalFormulario>
  );
}

/** Modal de solo lectura con el CV como lo ve una empresa: sin correo ni teléfono. */
export function ModalVistaPrevia({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  return visible ? <Contenido onCerrar={onCerrar} /> : null;
}
