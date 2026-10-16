import { candidatos, type Experiencia } from '../../../api';
import { ModalExperiencia } from './ModalExperiencia';
import { PanelListaCV, type TarjetaCV } from './PanelListaCV';
import { etiquetaExperiencia, periodoExperiencia } from './textosCV';

const cargar = () => candidatos.listarExperiencias();
const eliminar = (id: number) => candidatos.eliminarExperiencia(id);

function describir(experiencia: Experiencia): TarjetaCV {
  return {
    titulo: experiencia.puesto,
    lineas: [experiencia.empresa, periodoExperiencia(experiencia)],
    etiqueta: etiquetaExperiencia(experiencia),
    nombre: `experiencia ${experiencia.puesto}`,
  };
}

/** Pestaña «Experiencia» de Mi CV. */
export function TabExperiencia() {
  return (
    <PanelListaCV<Experiencia>
      testID="panel-experiencia"
      textos={{
        encabezado: 'Experiencia',
        agregarEtiqueta: 'Agregar experiencia',
        vacioTitulo: 'Aún no agregas experiencia',
        vacioMensaje:
          'Cuéntale a las empresas dónde has trabajado. Si aún no tienes, puedes dejarla vacía.',
        vacioAccion: 'Agrega tu primera experiencia',
        eliminarTitulo: '¿Eliminar esta experiencia?',
        avisoEliminada: 'Experiencia eliminada.',
      }}
      cargar={cargar}
      eliminar={eliminar}
      describir={describir}
      modal={(propiedades) => <ModalExperiencia {...propiedades} />}
    />
  );
}
