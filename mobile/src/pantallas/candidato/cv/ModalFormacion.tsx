import { useState } from 'react';

import { ApiError, candidatos, useCatalogo, type Formacion } from '../../../api';
import {
  Aviso,
  CampoTexto,
  ModalFormulario,
  Selector,
  SelectorMesAnio,
} from '../../../componentes';
import {
  entradaDeFormacion,
  formularioDeFormacion,
  MAX_CARRERA,
  MAX_INSTITUCION,
  validarFormacion,
  type CampoFormacion,
  type ErroresFormacion,
} from './formularios';
import type { PropiedadesModalCV } from './PanelListaCV';
import { OPCIONES_ESTADO_FORMACION } from './textosCV';

// Estudios en curso pueden terminar en el futuro cercano.
const ANIOS_HACIA_ADELANTE = 8;

/** Agregar o editar una formación académica (CU-09). */
export function ModalFormacion({ item, onCerrar, onGuardado }: PropiedadesModalCV<Formacion>) {
  const niveles = useCatalogo('niveles-educativos');
  const [datos, setDatos] = useState(() => formularioDeFormacion(item ?? undefined));
  const [errores, setErrores] = useState<ErroresFormacion>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const anioActual = new Date().getFullYear();
  const estadoId = OPCIONES_ESTADO_FORMACION.find((o) => o.valor === datos.estado)?.id ?? null;

  function cambiar(cambios: Partial<typeof datos>, campo?: CampoFormacion) {
    setDatos((previo) => ({ ...previo, ...cambios }));
    if (campo) setErrores((previo) => ({ ...previo, [campo]: undefined }));
  }

  async function guardar() {
    setErrorGeneral(null);
    const encontrados = validarFormacion(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    try {
      const entrada = entradaDeFormacion(datos);
      if (item) await candidatos.editarFormacion(item.id, entrada);
      else await candidatos.crearFormacion(entrada);
      onGuardado(item ? 'Formación actualizada.' : 'Formación agregada.');
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setGuardando(false);
      if (error.campos) {
        setErrores(error.campos as ErroresFormacion);
        setErrorGeneral(error.detail === 'Revisa los datos marcados.' ? null : error.detail);
      } else {
        setErrorGeneral(error.detail);
      }
    }
  }

  return (
    <ModalFormulario
      titulo={item ? 'Editar formación' : 'Agregar formación'}
      onCerrar={onCerrar}
      ocupado={guardando}
      pistaVolver="Cierra sin guardar los cambios"
      accion={{ titulo: 'Guardar', onPress: () => void guardar(), cargando: guardando }}
      testID="modal-formacion"
    >
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      {niveles.error ? <Aviso variante="error" mensaje={niveles.error.detail} /> : null}
      <Selector
        etiqueta="Nivel educativo"
        opciones={niveles.datos.map(({ id, nombre }) => ({ id, nombre }))}
        valor={datos.nivelId}
        onChange={(nivelId) => cambiar({ nivelId }, 'nivel_educativo_id')}
        cargando={niveles.cargando}
        error={errores.nivel_educativo_id}
        placeholder="Elige el nivel"
        testID="selector-nivel"
      />
      <CampoTexto
        etiqueta="Institución"
        value={datos.institucion}
        onChangeText={(institucion) => cambiar({ institucion }, 'institucion')}
        maxLength={MAX_INSTITUCION}
        error={errores.institucion}
        testID="campo-institucion"
      />
      <CampoTexto
        etiqueta="Carrera o especialidad (opcional)"
        value={datos.carrera}
        onChangeText={(carrera) => cambiar({ carrera }, 'carrera')}
        maxLength={MAX_CARRERA}
        error={errores.carrera}
        testID="campo-carrera"
      />
      <Selector
        etiqueta="Estado"
        opciones={OPCIONES_ESTADO_FORMACION.map(({ id, nombre }) => ({ id, nombre }))}
        valor={estadoId}
        onChange={(id) =>
          cambiar(
            { estado: OPCIONES_ESTADO_FORMACION.find((o) => o.id === id)?.valor ?? null },
            'estado',
          )
        }
        error={errores.estado}
        placeholder="Concluida, en curso o trunca"
        testID="selector-estado"
      />
      <SelectorMesAnio
        etiqueta="Fecha de inicio"
        valor={datos.inicio}
        onChange={(inicio) => cambiar({ inicio }, 'fecha_inicio')}
        error={errores.fecha_inicio}
        testID="fecha-inicio"
      />
      <SelectorMesAnio
        etiqueta={datos.estado === 'en_curso' ? 'Fecha de fin (opcional)' : 'Fecha de fin'}
        valor={datos.fin}
        onChange={(fin) => cambiar({ fin }, 'fecha_fin')}
        anioMaximo={anioActual + ANIOS_HACIA_ADELANTE}
        anios={70 + ANIOS_HACIA_ADELANTE}
        error={errores.fecha_fin}
        testID="fecha-fin"
      />
    </ModalFormulario>
  );
}
