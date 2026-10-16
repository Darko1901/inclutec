import { useState } from 'react';

import { ApiError, candidatos, type Experiencia } from '../../../api';
import { Aviso, CampoTexto, Casilla, ModalFormulario, SelectorMesAnio } from '../../../componentes';
import {
  entradaDeExperiencia,
  formularioDeExperiencia,
  MAX_DESCRIPCION,
  MAX_EMPRESA,
  MAX_PUESTO,
  validarExperiencia,
  type CampoExperiencia,
  type ErroresExperiencia,
} from './formularios';
import type { PropiedadesModalCV } from './PanelListaCV';

/** Agregar o editar una experiencia (CU-09): fechas de mes y año, y «Trabajo aquí actualmente». */
export function ModalExperiencia({ item, onCerrar, onGuardado }: PropiedadesModalCV<Experiencia>) {
  const [datos, setDatos] = useState(() => formularioDeExperiencia(item ?? undefined));
  const [errores, setErrores] = useState<ErroresExperiencia>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(cambios: Partial<typeof datos>, campo?: CampoExperiencia) {
    setDatos((previo) => ({ ...previo, ...cambios }));
    if (campo) setErrores((previo) => ({ ...previo, [campo]: undefined }));
  }

  async function guardar() {
    setErrorGeneral(null);
    const encontrados = validarExperiencia(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    try {
      const entrada = entradaDeExperiencia(datos);
      if (item) await candidatos.editarExperiencia(item.id, entrada);
      else await candidatos.crearExperiencia(entrada);
      onGuardado(item ? 'Experiencia actualizada.' : 'Experiencia agregada.');
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      setGuardando(false);
      if (error.campos) {
        setErrores(error.campos as ErroresExperiencia);
        setErrorGeneral(error.detail === 'Revisa los datos marcados.' ? null : error.detail);
      } else {
        setErrorGeneral(error.detail);
      }
    }
  }

  return (
    <ModalFormulario
      titulo={item ? 'Editar experiencia' : 'Agregar experiencia'}
      onCerrar={onCerrar}
      ocupado={guardando}
      pistaVolver="Cierra sin guardar los cambios"
      accion={{ titulo: 'Guardar', onPress: () => void guardar(), cargando: guardando }}
      testID="modal-experiencia"
    >
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      <CampoTexto
        etiqueta="Puesto"
        value={datos.puesto}
        onChangeText={(puesto) => cambiar({ puesto }, 'puesto')}
        maxLength={MAX_PUESTO}
        error={errores.puesto}
        testID="campo-puesto"
      />
      <CampoTexto
        etiqueta="Empresa"
        value={datos.empresa}
        onChangeText={(empresa) => cambiar({ empresa }, 'empresa')}
        maxLength={MAX_EMPRESA}
        error={errores.empresa}
        testID="campo-empresa"
      />
      <SelectorMesAnio
        etiqueta="Fecha de inicio"
        valor={datos.inicio}
        onChange={(inicio) => cambiar({ inicio }, 'fecha_inicio')}
        error={errores.fecha_inicio}
        testID="fecha-inicio"
      />
      <Casilla
        texto="Trabajo aquí actualmente"
        marcada={datos.actual}
        onCambio={(actual) => cambiar({ actual }, 'fecha_fin')}
        testID="casilla-actual"
      />
      {datos.actual ? null : (
        <SelectorMesAnio
          etiqueta="Fecha de fin"
          valor={datos.fin}
          onChange={(fin) => cambiar({ fin }, 'fecha_fin')}
          error={errores.fecha_fin}
          testID="fecha-fin"
        />
      )}
      <CampoTexto
        etiqueta="Descripción (opcional)"
        value={datos.descripcion}
        onChangeText={(descripcion) => cambiar({ descripcion }, 'descripcion')}
        maxLength={MAX_DESCRIPCION}
        contador
        multiline
        error={errores.descripcion}
        testID="campo-descripcion"
      />
    </ModalFormulario>
  );
}
