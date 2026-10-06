import type { RegistroCandidato, RegistroReclutador } from '../../../api';
import {
  mensajeConfirmacion,
  mensajeContrasenaRegistro,
  mensajeCorreo,
  mensajeRfc,
  mensajeTelefono,
  mensajeTexto,
  normalizarCorreo,
} from '../../../utilidades/validaciones';

export type TipoCuenta = 'candidato' | 'reclutador';

/** Todos los campos del formulario de registro (los del candidato y los del reclutador). */
export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  contrasena: string;
  confirmar: string;
  // Entidad es solo de la pantalla: el API recibe el municipio.
  entidadId: number | null;
  municipioId: number | null;
  puesto: string;
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  sectorId: number | null;
  tamanoId: number | null;
  aceptaAviso: boolean;
  consentimiento: boolean;
}

export type CampoRegistro = keyof DatosRegistro;
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

export const DATOS_INICIALES: DatosRegistro = {
  nombre: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmar: '',
  entidadId: null,
  municipioId: null,
  puesto: '',
  razonSocial: '',
  nombreComercial: '',
  rfc: '',
  sectorId: null,
  tamanoId: null,
  aceptaAviso: false,
  consentimiento: false,
};

/** Campos que se capturan en el paso 2, según el tipo de cuenta. */
export const CAMPOS_PASO_2: Record<TipoCuenta, CampoRegistro[]> = {
  candidato: [
    'nombre',
    'apellidos',
    'correo',
    'telefono',
    'entidadId',
    'municipioId',
    'contrasena',
    'confirmar',
  ],
  reclutador: [
    'nombre',
    'apellidos',
    'puesto',
    'correo',
    'telefono',
    'contrasena',
    'confirmar',
    'razonSocial',
    'nombreComercial',
    'rfc',
    'sectorId',
    'tamanoId',
    'entidadId',
    'municipioId',
  ],
};

/** Valida el paso 2; devuelve un mensaje por cada campo con problema. */
export function validarDatos(tipo: TipoCuenta, datos: DatosRegistro): ErroresRegistro {
  const errores: ErroresRegistro = {};
  const poner = (campo: CampoRegistro, mensaje: string | null) => {
    if (mensaje) errores[campo] = mensaje;
  };

  poner('nombre', mensajeTexto(datos.nombre, 'tu nombre', 80));
  poner('apellidos', mensajeTexto(datos.apellidos, 'tus apellidos', 120));
  poner('correo', mensajeCorreo(datos.correo));
  poner('telefono', mensajeTelefono(datos.telefono));
  poner('contrasena', mensajeContrasenaRegistro(datos.contrasena));
  poner('confirmar', mensajeConfirmacion(datos.contrasena, datos.confirmar));
  poner('entidadId', datos.entidadId === null ? 'Elige la entidad.' : null);
  poner('municipioId', datos.municipioId === null ? 'Elige el municipio.' : null);

  if (tipo === 'reclutador') {
    poner('puesto', mensajeTexto(datos.puesto, 'tu puesto', 100));
    poner('razonSocial', mensajeTexto(datos.razonSocial, 'la razón social', 200));
    poner('nombreComercial', mensajeTexto(datos.nombreComercial, 'el nombre comercial', 150));
    poner('rfc', mensajeRfc(datos.rfc));
    poner('sectorId', datos.sectorId === null ? 'Elige el sector de la empresa.' : null);
    poner('tamanoId', datos.tamanoId === null ? 'Elige el tamaño de la empresa.' : null);
  }
  return errores;
}

/** Campo del formulario al que corresponde cada clave de `campos` del contrato. */
const CLAVES_API: Record<TipoCuenta, Record<string, CampoRegistro>> = {
  candidato: {
    nombre: 'nombre',
    apellidos: 'apellidos',
    correo: 'correo',
    telefono: 'telefono',
    municipio_id: 'municipioId',
    contrasena: 'contrasena',
    acepta_aviso: 'aceptaAviso',
    consentimiento_sensibles: 'consentimiento',
  },
  reclutador: {
    'reclutador.nombre': 'nombre',
    'reclutador.apellidos': 'apellidos',
    'reclutador.puesto': 'puesto',
    'reclutador.correo': 'correo',
    'reclutador.telefono': 'telefono',
    'reclutador.contrasena': 'contrasena',
    'empresa.razon_social': 'razonSocial',
    'empresa.nombre_comercial': 'nombreComercial',
    'empresa.rfc': 'rfc',
    'empresa.sector_id': 'sectorId',
    'empresa.tamano_empresa_id': 'tamanoId',
    'empresa.municipio_id': 'municipioId',
    acepta_aviso: 'aceptaAviso',
  },
};

/** Convierte `campos` del API en errores por campo del formulario; lo que no se reconoce va a `sinCampo`. */
export function erroresDeApi(
  tipo: TipoCuenta,
  campos: Record<string, string>,
): { errores: ErroresRegistro; sinCampo: string[] } {
  const errores: ErroresRegistro = {};
  const sinCampo: string[] = [];
  for (const [clave, mensaje] of Object.entries(campos)) {
    const campo = CLAVES_API[tipo][clave];
    if (campo) errores[campo] = mensaje;
    else sinCampo.push(mensaje);
  }
  return { errores, sinCampo };
}

/** Paso (2 o 3) en el que está un campo; sirve para regresar al paso del primer error. */
export function pasoDeCampo(tipo: TipoCuenta, campo: CampoRegistro): 2 | 3 {
  return CAMPOS_PASO_2[tipo].includes(campo) ? 2 : 3;
}

export function cuerpoCandidato(datos: DatosRegistro): RegistroCandidato {
  return {
    nombre: datos.nombre.trim(),
    apellidos: datos.apellidos.trim(),
    correo: normalizarCorreo(datos.correo),
    telefono: datos.telefono,
    municipio_id: datos.municipioId as number,
    contrasena: datos.contrasena,
    acepta_aviso: datos.aceptaAviso,
    consentimiento_sensibles: datos.consentimiento,
  };
}

export function cuerpoReclutador(datos: DatosRegistro): RegistroReclutador {
  return {
    reclutador: {
      nombre: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      puesto: datos.puesto.trim(),
      correo: normalizarCorreo(datos.correo),
      telefono: datos.telefono,
      contrasena: datos.contrasena,
    },
    empresa: {
      razon_social: datos.razonSocial.trim(),
      nombre_comercial: datos.nombreComercial.trim(),
      rfc: datos.rfc,
      sector_id: datos.sectorId as number,
      tamano_empresa_id: datos.tamanoId as number,
      municipio_id: datos.municipioId as number,
    },
    acepta_aviso: datos.aceptaAviso,
  };
}
