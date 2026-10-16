import { candidatos, type Formacion } from '../../../api';
import { ModalFormacion } from './ModalFormacion';
import { PanelListaCV, type TarjetaCV } from './PanelListaCV';
import { etiquetaFormacion, NOMBRE_ESTADO_FORMACION, periodoFormacion } from './textosCV';

const cargar = () => candidatos.listarFormaciones();
const eliminar = (id: number) => candidatos.eliminarFormacion(id);

function describir(formacion: Formacion): TarjetaCV {
  const titulo = formacion.carrera ?? formacion.nivel_educativo.nombre;
  return {
    titulo,
    lineas: [
      formacion.carrera
        ? `${formacion.nivel_educativo.nombre} · ${formacion.institucion}`
        : formacion.institucion,
      [NOMBRE_ESTADO_FORMACION[formacion.estado], periodoFormacion(formacion)]
        .filter(Boolean)
        .join(' · '),
    ],
    etiqueta: etiquetaFormacion(formacion),
    nombre: `formación ${titulo}`,
  };
}

/** Pestaña «Formación» de Mi CV. */
export function TabFormacion() {
  return (
    <PanelListaCV<Formacion>
      testID="panel-formacion"
      textos={{
        encabezado: 'Formación',
        agregarEtiqueta: 'Agregar formación',
        vacioTitulo: 'Aún no agregas formación',
        vacioMensaje: 'Agrega tus estudios: las vacantes piden un nivel educativo mínimo.',
        vacioAccion: 'Agrega tu primera formación',
        eliminarTitulo: '¿Eliminar esta formación?',
        avisoEliminada: 'Formación eliminada.',
      }}
      cargar={cargar}
      eliminar={eliminar}
      describir={describir}
      modal={(propiedades) => <ModalFormacion {...propiedades} />}
    />
  );
}
