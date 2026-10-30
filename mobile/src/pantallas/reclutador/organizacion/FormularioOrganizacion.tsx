import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ApiError,
  empresas,
  useCatalogo,
  type EmpresaEntrada,
  type EmpresaPropia,
} from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  ErrorCatalogo,
  Selector,
  SelectorUbicacion,
  Texto,
} from '../../../componentes';
import { espaciado } from '../../../tema';
import { esRfcValido } from '../../../utilidades/validaciones';
import { CampoBloqueado } from './CampoBloqueado';
import { AYUDA_DATOS_FISCALES } from './textosOrganizacion';

type Campo =
  | 'nombre_comercial'
  | 'sector_id'
  | 'tamano_empresa_id'
  | 'municipio_id'
  | 'direccion'
  | 'descripcion'
  | 'sitio_web'
  | 'practicas_inclusion'
  | 'razon_social'
  | 'rfc';
type Errores = Partial<Record<Campo, string>>;

const CAMPOS: Campo[] = [
  'nombre_comercial',
  'sector_id',
  'tamano_empresa_id',
  'municipio_id',
  'direccion',
  'descripcion',
  'sitio_web',
  'practicas_inclusion',
  'razon_social',
  'rfc',
];

interface Props {
  empresa: EmpresaPropia;
  /** Se guardó: la pantalla pone la empresa al día. */
  onGuardada: (empresa: EmpresaPropia) => void;
}

/** Datos de la organización (PUT /empresas/me). Razón social y RFC solo se editan sin validar. */
export function FormularioOrganizacion({ empresa, onGuardada }: Props) {
  const editableFiscal = empresa.datos_fiscales_editables;
  const [nombre, setNombre] = useState(empresa.nombre_comercial);
  const [sectorId, setSectorId] = useState<number | null>(empresa.sector.id);
  const [tamanoId, setTamanoId] = useState<number | null>(empresa.tamano_empresa.id);
  const [municipioId, setMunicipioId] = useState<number | null>(empresa.municipio.id);
  const [direccion, setDireccion] = useState(empresa.direccion ?? '');
  const [descripcion, setDescripcion] = useState(empresa.descripcion ?? '');
  const [sitioWeb, setSitioWeb] = useState(empresa.sitio_web ?? '');
  const [practicas, setPracticas] = useState(empresa.practicas_inclusion ?? '');
  const [razonSocial, setRazonSocial] = useState(empresa.razon_social);
  const [rfc, setRfc] = useState(empresa.rfc);

  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ mensaje: string; n: number }>();
  const [guardando, setGuardando] = useState(false);

  const sectores = useCatalogo('sectores');
  const tamanos = useCatalogo('tamanos-empresa');

  const limpiar = (campo: Campo) => setErrores((previo) => ({ ...previo, [campo]: undefined }));

  function validar(): Errores {
    const encontrados: Errores = {};
    if (nombre.trim() === '') encontrados.nombre_comercial = 'Escribe el nombre comercial.';
    if (sectorId === null) encontrados.sector_id = 'Elige el sector de tu empresa.';
    if (tamanoId === null) encontrados.tamano_empresa_id = 'Elige el tamaño de tu empresa.';
    if (municipioId === null) {
      encontrados.municipio_id = 'Elige la entidad y el municipio de tu empresa.';
    }
    const sitio = sitioWeb.trim();
    if (sitio !== '' && !/^https?:\/\/\S+\.\S+$/i.test(sitio)) {
      encontrados.sitio_web = 'Escribe la dirección completa, por ejemplo https://tuempresa.mx.';
    }
    if (editableFiscal) {
      if (razonSocial.trim() === '') encontrados.razon_social = 'Escribe la razón social.';
      if (!esRfcValido(rfc)) {
        encontrados.rfc = 'Escribe un RFC de 12 o 13 caracteres, en mayúsculas, sin espacios.';
      }
    }
    return encontrados;
  }

  async function guardar() {
    setErrorGeneral(null);
    setAviso(undefined);
    const encontrados = validar();
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const datos: EmpresaEntrada = {
      nombre_comercial: nombre.trim(),
      sector_id: sectorId as number,
      tamano_empresa_id: tamanoId as number,
      municipio_id: municipioId as number,
      direccion: direccion.trim() || null,
      descripcion: descripcion.trim() || null,
      sitio_web: sitioWeb.trim() || null,
      practicas_inclusion: practicas.trim() || null,
      ...(editableFiscal ? { razon_social: razonSocial.trim(), rfc } : {}),
    };
    setGuardando(true);
    try {
      const guardada = await empresas.actualizarMiOrganizacion(datos);
      onGuardada(guardada);
      setAviso({ mensaje: 'Datos de la organización guardados.', n: (aviso?.n ?? 0) + 1 });
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      const deApi: Errores = {};
      for (const [campo, mensaje] of Object.entries(error.campos ?? {})) {
        if ((CAMPOS as string[]).includes(campo)) deApi[campo as Campo] = mensaje;
      }
      setErrores(deApi);
      if (Object.keys(deApi).length === 0) setErrorGeneral(error.detail);
    }
    setGuardando(false);
  }

  return (
    <View style={estilos.formulario} testID="formulario-organizacion">
      <Texto variante="subtitulo" accessibilityRole="header">
        Datos de la organización
      </Texto>
      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
      <ErrorCatalogo catalogos={[sectores, tamanos]} />

      <CampoTexto
        etiqueta="Nombre comercial"
        value={nombre}
        onChangeText={(texto) => {
          setNombre(texto);
          limpiar('nombre_comercial');
        }}
        maxLength={150}
        error={errores.nombre_comercial}
        testID="campo-nombre-comercial"
      />
      <Selector
        etiqueta="Sector"
        opciones={sectores.datos.map(({ id, nombre: n }) => ({ id, nombre: n }))}
        valor={sectorId}
        cargando={sectores.cargando}
        onChange={(id) => {
          setSectorId(id);
          limpiar('sector_id');
        }}
        error={errores.sector_id}
        placeholder="Elige el sector"
        testID="selector-sector"
      />
      <Selector
        etiqueta="Tamaño de la empresa"
        opciones={tamanos.datos.map(({ id, nombre: n, rango }) => ({
          id,
          nombre: n,
          detalle: rango ?? undefined,
        }))}
        valor={tamanoId}
        cargando={tamanos.cargando}
        onChange={(id) => {
          setTamanoId(id);
          limpiar('tamano_empresa_id');
        }}
        error={errores.tamano_empresa_id}
        placeholder="Elige el tamaño"
        testID="selector-tamano"
      />
      <CampoTexto
        etiqueta="Descripción"
        ayuda="Cuenta a qué se dedica tu empresa."
        value={descripcion}
        onChangeText={(texto) => {
          setDescripcion(texto);
          limpiar('descripcion');
        }}
        multiline
        maxLength={1000}
        contador
        error={errores.descripcion}
        testID="campo-descripcion"
      />
      <CampoTexto
        etiqueta="Sitio web"
        ayuda="Opcional. Por ejemplo https://tuempresa.mx."
        value={sitioWeb}
        onChangeText={(texto) => {
          setSitioWeb(texto);
          limpiar('sitio_web');
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoComplete="off"
        maxLength={255}
        error={errores.sitio_web}
        testID="campo-sitio-web"
      />
      <SelectorUbicacion
        entidadInicial={empresa.municipio.entidad.id}
        municipioId={municipioId}
        onMunicipio={(id) => {
          setMunicipioId(id);
          limpiar('municipio_id');
        }}
        error={errores.municipio_id}
      />
      <CampoTexto
        etiqueta="Dirección"
        value={direccion}
        onChangeText={(texto) => {
          setDireccion(texto);
          limpiar('direccion');
        }}
        maxLength={255}
        error={errores.direccion}
        testID="campo-direccion"
      />
      <CampoTexto
        etiqueta="Prácticas de inclusión"
        ayuda="Cuéntales a los candidatos qué hace tu empresa por la inclusión laboral."
        value={practicas}
        onChangeText={(texto) => {
          setPracticas(texto);
          limpiar('practicas_inclusion');
        }}
        multiline
        maxLength={1000}
        contador
        error={errores.practicas_inclusion}
        testID="campo-practicas"
      />

      {editableFiscal ? (
        <>
          <CampoTexto
            etiqueta="Razón social"
            value={razonSocial}
            onChangeText={(texto) => {
              setRazonSocial(texto);
              limpiar('razon_social');
            }}
            maxLength={200}
            error={errores.razon_social}
            testID="campo-razon-social"
          />
          <CampoTexto
            etiqueta="RFC"
            ayuda="12 o 13 caracteres, en mayúsculas. Cuando validemos tu empresa ya no podrás cambiarlo."
            value={rfc}
            onChangeText={(texto) => {
              setRfc(texto.toUpperCase().replace(/\s/g, ''));
              limpiar('rfc');
            }}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={13}
            error={errores.rfc}
            testID="campo-rfc"
          />
        </>
      ) : (
        <View style={estilos.fiscales}>
          <CampoBloqueado
            etiqueta="Razón social"
            valor={empresa.razon_social}
            testID="razon-social-bloqueada"
          />
          <CampoBloqueado etiqueta="RFC" valor={empresa.rfc} testID="rfc-bloqueado" />
          <Texto variante="pequeno" color="textoSecundarioSobreGris" testID="ayuda-fiscales">
            {AYUDA_DATOS_FISCALES}
          </Texto>
        </View>
      )}

      <Boton
        titulo="Guardar cambios"
        onPress={() => void guardar()}
        cargando={guardando}
        testID="guardar-organizacion"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: espaciado.lg },
  fiscales: { gap: espaciado.md },
});
