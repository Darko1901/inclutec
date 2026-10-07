import { View } from 'react-native';

import { ApiError, useCatalogo } from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  Selector,
  Texto,
  type OpcionSelector,
} from '../../../componentes';
import { espaciado } from '../../../tema';
import type { DatosRegistro, CampoRegistro, ErroresRegistro, TipoCuenta } from './formulario';

interface Props {
  tipo: TipoCuenta;
  datos: DatosRegistro;
  /** Error que se muestra en cada campo (ya filtrado: solo los que el usuario debe ver). */
  errores: ErroresRegistro;
  alCambiar: <C extends CampoRegistro>(campo: C, valor: DatosRegistro[C]) => void;
  alTocar: (campo: CampoRegistro) => void;
}

const aOpciones = (
  items: { id: number; nombre: string; rango?: string | null }[],
): OpcionSelector[] =>
  items.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    detalle: item.rango ?? undefined,
  }));

function ErrorCatalogo({ error, alReintentar }: { error: ApiError; alReintentar: () => void }) {
  return (
    <View style={{ gap: espaciado.sm }}>
      <Aviso variante="error" mensaje={error.detail} />
      <Boton titulo="Reintentar" variante="secundario" icono="refresh" onPress={alReintentar} />
    </View>
  );
}

/** Paso 2: datos de la persona (y de la empresa, si es reclutador). */
export function PasoDatos({ tipo, datos, errores, alCambiar, alTocar }: Props) {
  const entidades = useCatalogo('entidades');
  const municipios = useCatalogo(
    'municipios',
    { entidad_id: datos.entidadId ?? undefined },
    datos.entidadId !== null,
  );
  const sectores = useCatalogo('sectores', undefined, tipo === 'reclutador');
  const tamanos = useCatalogo('tamanos-empresa', undefined, tipo === 'reclutador');
  const esReclutador = tipo === 'reclutador';
  const errorDeCatalogo = entidades.error ?? municipios.error ?? sectores.error ?? tamanos.error;

  const campo = (
    id: CampoRegistro,
    etiqueta: string,
    extra: Partial<React.ComponentProps<typeof CampoTexto>> = {},
  ) => (
    <CampoTexto
      etiqueta={etiqueta}
      testID={`campo-${id}`}
      value={datos[id] as string}
      onChangeText={(texto) => alCambiar(id, texto as never)}
      onBlur={() => alTocar(id)}
      error={errores[id]}
      {...extra}
    />
  );

  const contrasenas = (
    <>
      {campo('contrasena', 'Contraseña', {
        esContrasena: true,
        autoCapitalize: 'none',
        autoComplete: 'new-password',
        textContentType: 'newPassword',
        ayuda: 'De 8 a 64 caracteres, con al menos una letra y un número.',
        maxLength: 64,
      })}
      {campo('confirmar', 'Confirmar contraseña', {
        esContrasena: true,
        autoCapitalize: 'none',
        autoComplete: 'new-password',
        textContentType: 'newPassword',
        maxLength: 64,
      })}
    </>
  );

  const ubicacion = (sufijo: string) => (
    <>
      <Selector
        etiqueta={`Entidad${sufijo}`}
        testID="selector-entidad"
        opciones={aOpciones(entidades.datos)}
        valor={datos.entidadId}
        cargando={entidades.cargando}
        onChange={(id) => {
          alCambiar('entidadId', id);
          alCambiar('municipioId', null);
        }}
        error={errores.entidadId}
        placeholder="Elige la entidad"
      />
      <Selector
        etiqueta={`Municipio${sufijo}`}
        testID="selector-municipio"
        opciones={aOpciones(municipios.datos)}
        valor={datos.municipioId}
        cargando={municipios.cargando}
        deshabilitado={datos.entidadId === null}
        ayudaDeshabilitado="Elige primero la entidad."
        onChange={(id) => alCambiar('municipioId', id)}
        error={errores.municipioId}
        placeholder="Elige el municipio"
        buscable
      />
    </>
  );

  const telefono = campo('telefono', 'Teléfono (10 dígitos)', {
    keyboardType: 'phone-pad',
    autoComplete: 'tel',
    textContentType: 'telephoneNumber',
    maxLength: 10,
  });

  return (
    <>
      {errorDeCatalogo ? (
        <ErrorCatalogo
          error={errorDeCatalogo}
          alReintentar={() => {
            if (entidades.error) entidades.recargar();
            if (municipios.error) municipios.recargar();
            if (sectores.error) sectores.recargar();
            if (tamanos.error) tamanos.recargar();
          }}
        />
      ) : null}

      {esReclutador ? (
        <Texto variante="subtitulo" accessibilityRole="header">
          Tus datos
        </Texto>
      ) : null}
      {campo('nombre', 'Nombre(s)', { autoComplete: 'given-name', maxLength: 80 })}
      {campo('apellidos', 'Apellidos', { autoComplete: 'family-name', maxLength: 120 })}
      {esReclutador ? campo('puesto', 'Puesto', { maxLength: 100 }) : null}
      {campo('correo', 'Correo', {
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        autoComplete: 'email',
        textContentType: 'emailAddress',
        maxLength: 254,
      })}
      {telefono}

      {esReclutador ? (
        <>
          {contrasenas}
          <Texto variante="subtitulo" accessibilityRole="header">
            Tu empresa
          </Texto>
          {campo('razonSocial', 'Razón social', { maxLength: 200 })}
          {campo('nombreComercial', 'Nombre comercial', { maxLength: 150 })}
          {campo('rfc', 'RFC', {
            autoCapitalize: 'characters',
            maxLength: 13,
            ayuda: '12 o 13 caracteres, por ejemplo TQU150312AB1.',
            onChangeText: (texto) => alCambiar('rfc', texto.toUpperCase()),
          })}
          <Selector
            etiqueta="Sector"
            testID="selector-sector"
            opciones={aOpciones(sectores.datos)}
            valor={datos.sectorId}
            cargando={sectores.cargando}
            onChange={(id) => alCambiar('sectorId', id)}
            error={errores.sectorId}
            placeholder="Elige el sector"
          />
          <Selector
            etiqueta="Tamaño de la empresa"
            testID="selector-tamano"
            opciones={aOpciones(tamanos.datos)}
            valor={datos.tamanoId}
            cargando={tamanos.cargando}
            onChange={(id) => alCambiar('tamanoId', id)}
            error={errores.tamanoId}
            placeholder="Elige el tamaño"
          />
          {ubicacion(' de la empresa')}
        </>
      ) : (
        <>
          {ubicacion('')}
          {contrasenas}
        </>
      )}
    </>
  );
}
