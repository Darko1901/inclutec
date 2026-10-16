import { useState } from 'react';

import { ApiError, candidatos, useCatalogo } from '../../../api';
import { Aviso, Boton, CampoTexto, SeccionDesplegable, Selector } from '../../../componentes';
import { esTelefonoValido } from '../../../utilidades/validaciones';
import { entradaDePerfil, MAX_RESUMEN, type PropiedadesSeccion } from './textosPerfil';

type Campo = 'nombre' | 'apellidos' | 'telefono' | 'municipio_id' | 'resumen';
type Errores = Partial<Record<Campo, string>>;

/** «Datos personales» de CAN-03: nombre, teléfono, ubicación y resumen profesional. */
export function SeccionDatos({
  refBoton,
  perfil,
  expandida,
  onAlternar,
  aviso,
  onGuardado,
}: PropiedadesSeccion) {
  const [nombre, setNombre] = useState(perfil.usuario.nombre);
  const [apellidos, setApellidos] = useState(perfil.usuario.apellidos);
  const [telefono, setTelefono] = useState(perfil.usuario.telefono ?? '');
  const [entidadId, setEntidadId] = useState<number | null>(perfil.municipio?.entidad.id ?? null);
  const [municipioId, setMunicipioId] = useState<number | null>(perfil.municipio?.id ?? null);
  const [resumen, setResumen] = useState(perfil.resumen ?? '');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const entidades = useCatalogo('entidades');
  const municipios = useCatalogo(
    'municipios',
    { entidad_id: entidadId ?? undefined },
    entidadId !== null,
  );

  function limpiar(campo: Campo) {
    setErrores((previo) => ({ ...previo, [campo]: undefined }));
  }

  function validar(): Errores {
    const encontrados: Errores = {};
    if (nombre.trim() === '') encontrados.nombre = 'Escribe tu nombre.';
    if (apellidos.trim() === '') encontrados.apellidos = 'Escribe tus apellidos.';
    if (telefono !== '' && !esTelefonoValido(telefono)) {
      encontrados.telefono = 'El teléfono debe tener 10 dígitos, sin espacios ni guiones.';
    }
    if (municipioId === null) {
      encontrados.municipio_id = 'Elige tu entidad y tu municipio. Los necesitas para postularte.';
    }
    return encontrados;
  }

  async function guardar() {
    setErrorGeneral(null);
    const encontrados = validar();
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    try {
      const nuevo = await candidatos.actualizarPerfil({
        ...entradaDePerfil(perfil),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono === '' ? null : telefono,
        municipio_id: municipioId,
        resumen: resumen.trim() === '' ? null : resumen.trim(),
      });
      onGuardado('Datos personales guardados.', nuevo);
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      if (error.campos) {
        setErrores(error.campos as Errores);
        if (error.detail !== 'Revisa los datos marcados.') setErrorGeneral(error.detail);
      } else {
        setErrorGeneral(error.detail);
      }
    }
    setGuardando(false);
  }

  return (
    <SeccionDesplegable
      ref={refBoton}
      titulo="Datos personales"
      icono="person-outline"
      expandida={expandida}
      onAlternar={onAlternar}
      testID="seccion-datos"
    >
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      <CampoTexto
        etiqueta="Nombre(s)"
        value={nombre}
        onChangeText={(texto) => {
          setNombre(texto);
          limpiar('nombre');
        }}
        maxLength={80}
        autoComplete="given-name"
        error={errores.nombre}
        testID="campo-nombre"
      />
      <CampoTexto
        etiqueta="Apellidos"
        value={apellidos}
        onChangeText={(texto) => {
          setApellidos(texto);
          limpiar('apellidos');
        }}
        maxLength={120}
        autoComplete="family-name"
        error={errores.apellidos}
        testID="campo-apellidos"
      />
      <CampoTexto
        etiqueta="Teléfono (10 dígitos)"
        value={telefono}
        onChangeText={(texto) => {
          setTelefono(texto.replace(/\D/g, ''));
          limpiar('telefono');
        }}
        maxLength={10}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errores.telefono}
        testID="campo-telefono"
      />
      <Selector
        etiqueta="Entidad"
        opciones={entidades.datos.map(({ id, nombre: n }) => ({ id, nombre: n }))}
        valor={entidadId}
        cargando={entidades.cargando}
        onChange={(id) => {
          if (id !== entidadId) setMunicipioId(null);
          setEntidadId(id);
        }}
        placeholder="Elige la entidad"
        testID="selector-entidad"
      />
      <Selector
        etiqueta="Municipio"
        opciones={municipios.datos.map(({ id, nombre: n }) => ({ id, nombre: n }))}
        valor={municipioId}
        cargando={municipios.cargando}
        deshabilitado={entidadId === null}
        ayudaDeshabilitado="Elige primero la entidad."
        onChange={(id) => {
          setMunicipioId(id);
          limpiar('municipio_id');
        }}
        error={errores.municipio_id}
        placeholder="Elige el municipio"
        buscable
        testID="selector-municipio"
      />
      <CampoTexto
        etiqueta="Resumen profesional (opcional)"
        value={resumen}
        onChangeText={(texto) => {
          setResumen(texto);
          limpiar('resumen');
        }}
        maxLength={MAX_RESUMEN}
        contador
        multiline
        error={errores.resumen}
        testID="campo-resumen"
      />
      <Boton
        titulo="Guardar"
        accessibilityLabel="Guardar datos personales"
        onPress={() => void guardar()}
        cargando={guardando}
        testID="guardar-datos"
      />
      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}
    </SeccionDesplegable>
  );
}
