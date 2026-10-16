import { useState } from 'react';

import { ApiError, candidatos, useCatalogo } from '../../../api';
import {
  Aviso,
  Boton,
  Casilla,
  Interruptor,
  SeccionDesplegable,
  Selector,
  Texto,
} from '../../../componentes';
import { entradaDePerfil, type PropiedadesSeccion } from './textosPerfil';

const alternar = (ids: number[], id: number, marcada: boolean) =>
  marcada ? [...ids, id] : ids.filter((actual) => actual !== id);

/** «Preferencias laborales» de CAN-03: modalidades, categorías, jornada y reubicación. */
export function SeccionPreferencias({
  refBoton,
  perfil,
  expandida,
  onAlternar,
  aviso,
  onGuardado,
}: PropiedadesSeccion) {
  const [modalidadIds, setModalidadIds] = useState(perfil.modalidades.map((m) => m.id));
  const [categoriaIds, setCategoriaIds] = useState(perfil.categorias.map((c) => c.id));
  const [jornadaId, setJornadaId] = useState<number | null>(perfil.jornada?.id ?? null);
  const [reubicacion, setReubicacion] = useState(perfil.disponible_reubicacion);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const modalidades = useCatalogo('modalidades');
  const categorias = useCatalogo('categorias');
  const jornadas = useCatalogo('jornadas');
  const errorCatalogo = modalidades.error ?? categorias.error ?? jornadas.error;

  async function guardar() {
    setErrorGeneral(null);
    setErrores({});
    setGuardando(true);
    try {
      const nuevo = await candidatos.actualizarPerfil({
        ...entradaDePerfil(perfil),
        modalidad_ids: modalidadIds,
        categoria_ids: categoriaIds,
        jornada_id: jornadaId,
        disponible_reubicacion: reubicacion,
      });
      onGuardado('Preferencias laborales guardadas.', nuevo);
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      if (error.campos) setErrores(error.campos);
      if (!error.campos || error.detail !== 'Revisa los datos marcados.') {
        setErrorGeneral(error.detail);
      }
    }
    setGuardando(false);
  }

  return (
    <SeccionDesplegable
      ref={refBoton}
      titulo="Preferencias laborales"
      icono="options-outline"
      expandida={expandida}
      onAlternar={onAlternar}
      testID="seccion-preferencias"
    >
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      {errorCatalogo ? (
        <>
          <Aviso variante="error" mensaje={errorCatalogo.detail} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            icono="refresh"
            onPress={() => {
              modalidades.recargar();
              categorias.recargar();
              jornadas.recargar();
            }}
          />
        </>
      ) : null}

      <Texto variante="etiqueta" accessibilityRole="header">
        Modalidades de interés
      </Texto>
      {modalidades.datos.map((modalidad) => (
        <Casilla
          key={modalidad.id}
          texto={modalidad.nombre}
          marcada={modalidadIds.includes(modalidad.id)}
          onCambio={(marcada) => setModalidadIds((ids) => alternar(ids, modalidad.id, marcada))}
          testID={`modalidad-${modalidad.id}`}
        />
      ))}
      {errores.modalidad_ids ? <Aviso variante="error" mensaje={errores.modalidad_ids} /> : null}

      <Texto variante="etiqueta" accessibilityRole="header">
        Categorías de interés
      </Texto>
      {categorias.datos.map((categoria) => (
        <Casilla
          key={categoria.id}
          texto={categoria.nombre}
          ayuda={categoria.descripcion ?? undefined}
          marcada={categoriaIds.includes(categoria.id)}
          onCambio={(marcada) => setCategoriaIds((ids) => alternar(ids, categoria.id, marcada))}
          testID={`categoria-${categoria.id}`}
        />
      ))}
      {errores.categoria_ids ? <Aviso variante="error" mensaje={errores.categoria_ids} /> : null}

      <Selector
        etiqueta="Jornada deseada"
        opciones={jornadas.datos.map(({ id, nombre }) => ({ id, nombre }))}
        valor={jornadaId}
        cargando={jornadas.cargando}
        onChange={setJornadaId}
        error={errores.jornada_id}
        placeholder="Elige la jornada"
        testID="selector-jornada"
      />
      <Interruptor
        etiqueta="Disponible para reubicarme"
        valor={reubicacion}
        onCambio={setReubicacion}
        testID="interruptor-reubicacion"
      />
      <Boton
        titulo="Guardar"
        accessibilityLabel="Guardar preferencias laborales"
        onPress={() => void guardar()}
        cargando={guardando}
        testID="guardar-preferencias"
      />
      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}
    </SeccionDesplegable>
  );
}
