import type { AuthServicio } from '../auth';
import type {
  Login,
  Logout,
  RegistroCandidato,
  RegistroReclutador,
  Restablecimiento,
  Sesion,
  SolicitudCodigo,
  Usuario,
  VerificacionCodigo,
} from '../tipos';
import {
  esCodigoValido,
  esContrasenaValida,
  esCorreoValido,
  esRfcValido,
  esTelefonoValido,
  LONGITUD_MAX_CONTRASENA,
  LONGITUD_MIN_CONTRASENA,
  normalizarCorreo,
} from '../../utilidades/validaciones';
import { existeEnCatalogo } from './catalogos.datos';
import {
  buscarPorCorreo,
  CODIGO_RECUPERACION_PRUEBA,
  exigirSesion,
  obtenerEstado,
  preferenciasPorOmision,
} from './datos';
import { fallo, simular } from './simulador';
import { crearToken } from './tokens';

const MAX_INTENTOS_FALLIDOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const REENVIO_MS = 60 * 1000;
const VIGENCIA_CODIGO_MS = 15 * 60 * 1000;
const MAX_INTENTOS_CODIGO = 5;

const MENSAJE_VALIDACION = 'Revisa los datos marcados.';
const MENSAJE_CONTRASENA = `La contraseña debe tener de ${LONGITUD_MIN_CONTRASENA} a ${LONGITUD_MAX_CONTRASENA} caracteres, con al menos una letra y un número.`;

function sesionPara(usuario: Usuario): Sesion {
  const { token, expiraEn } = crearToken(usuario.id, usuario.rol);
  return { access_token: token, token_type: 'bearer', expira_en: expiraEn, usuario };
}

function lanzarSiHayCampos(campos: Record<string, string>): void {
  if (Object.keys(campos).length > 0) {
    throw fallo(422, 'validacion', MENSAJE_VALIDACION, { campos });
  }
}

function textoValido(valor: unknown, maximo: number): boolean {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= maximo;
}

export class AuthMock implements AuthServicio {
  login(datos: Login) {
    return simular(() => {
      const estado = obtenerEstado();
      const campos: Record<string, string> = {};
      if (!esCorreoValido(datos.correo ?? '')) campos.correo = 'Escribe un correo válido.';
      const contrasena = datos.contrasena ?? '';
      if (
        contrasena.length < LONGITUD_MIN_CONTRASENA ||
        contrasena.length > LONGITUD_MAX_CONTRASENA
      ) {
        campos.contrasena = `Debe tener de ${LONGITUD_MIN_CONTRASENA} a ${LONGITUD_MAX_CONTRASENA} caracteres.`;
      }
      lanzarSiHayCampos(campos);

      const correo = normalizarCorreo(datos.correo);
      const intentos = estado.intentosLogin.get(correo) ?? { fallidos: 0, bloqueadoHasta: null };

      // Tras 5 intentos fallidos con el mismo correo, el acceso se bloquea 15 minutos.
      if (intentos.bloqueadoHasta !== null && intentos.bloqueadoHasta > Date.now()) {
        const segundos = Math.ceil((intentos.bloqueadoHasta - Date.now()) / 1000);
        throw fallo(
          429,
          'demasiados_intentos',
          'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
          { reintentarEn: segundos },
        );
      }
      if (intentos.bloqueadoHasta !== null) {
        intentos.fallidos = 0;
        intentos.bloqueadoHasta = null;
      }

      const cuenta = buscarPorCorreo(correo);
      if (!cuenta || cuenta.contrasena !== datos.contrasena) {
        intentos.fallidos += 1;
        if (intentos.fallidos >= MAX_INTENTOS_FALLIDOS) {
          intentos.bloqueadoHasta = Date.now() + BLOQUEO_MS;
        }
        estado.intentosLogin.set(correo, intentos);
        throw fallo(401, 'credenciales_invalidas', 'Correo o contraseña incorrectos.');
      }

      estado.intentosLogin.delete(correo);
      if (cuenta.usuario.estado !== 'activo') {
        throw fallo(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
      }
      return sesionPara(cuenta.usuario);
    });
  }

  me() {
    return simular(() => exigirSesion().usuario);
  }

  logout(datos: Logout = {}) {
    return simular(() => {
      exigirSesion();
      if (datos.expo_push_token) obtenerEstado().dispositivos.delete(datos.expo_push_token);
    });
  }

  solicitarCodigo(datos: SolicitudCodigo) {
    return simular(() => {
      const estado = obtenerEstado();
      if (!esCorreoValido(datos.correo ?? '')) {
        throw fallo(422, 'validacion', MENSAJE_VALIDACION, {
          campos: { correo: 'Escribe un correo válido.' },
        });
      }
      const correo = normalizarCorreo(datos.correo);
      const previo = estado.codigos.get(correo);
      if (previo && Date.now() - previo.creadoEn < REENVIO_MS) {
        const segundos = Math.ceil((REENVIO_MS - (Date.now() - previo.creadoEn)) / 1000);
        throw fallo(
          429,
          'reenvio_prematuro',
          'Aún no pasan 60 segundos. Espera para pedir otro código.',
          {
            reintentarEn: segundos,
          },
        );
      }
      // Responde lo mismo exista o no la cuenta; solo se guarda el código si existe.
      if (buscarPorCorreo(correo)) {
        estado.codigos.set(correo, {
          codigo: CODIGO_RECUPERACION_PRUEBA,
          creadoEn: Date.now(),
          intentos: 0,
        });
      }
      return { detail: 'Si el correo está registrado, te enviamos un código de 6 dígitos.' };
    });
  }

  verificarCodigo(datos: VerificacionCodigo) {
    return simular(() => {
      comprobarCodigo(datos.correo, datos.codigo);
      return { detail: 'Código correcto.' };
    });
  }

  restablecerContrasena(datos: Restablecimiento) {
    return simular(() => {
      const campos: Record<string, string> = {};
      if (!esCorreoValido(datos.correo ?? '')) campos.correo = 'Escribe un correo válido.';
      if (!esCodigoValido(datos.codigo ?? '')) campos.codigo = 'Escribe los 6 dígitos del código.';
      if (!esContrasenaValida(datos.contrasena ?? '')) campos.contrasena = MENSAJE_CONTRASENA;
      lanzarSiHayCampos(campos);

      const correo = normalizarCorreo(datos.correo);
      comprobarCodigo(correo, datos.codigo);
      const cuenta = buscarPorCorreo(correo);
      if (cuenta) cuenta.contrasena = datos.contrasena;
      const estado = obtenerEstado();
      estado.codigos.delete(correo);
      estado.intentosLogin.delete(correo);
      return { detail: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' };
    });
  }

  registrarCandidato(datos: RegistroCandidato) {
    return simular(() => {
      const campos: Record<string, string> = {};
      if (!textoValido(datos.nombre, 80))
        campos.nombre = 'Escribe tu nombre (máximo 80 caracteres).';
      if (!textoValido(datos.apellidos, 120)) {
        campos.apellidos = 'Escribe tus apellidos (máximo 120 caracteres).';
      }
      if (!esCorreoValido(datos.correo ?? '')) campos.correo = 'Escribe un correo válido.';
      if (!esTelefonoValido(datos.telefono ?? '')) {
        campos.telefono = 'Escribe un teléfono de 10 dígitos, sin espacios.';
      }
      if (!existeEnCatalogo('municipios', datos.municipio_id))
        campos.municipio_id = 'Elige tu municipio.';
      if (!esContrasenaValida(datos.contrasena ?? '')) campos.contrasena = MENSAJE_CONTRASENA;
      if (datos.acepta_aviso !== true)
        campos.acepta_aviso = 'Debes aceptar el aviso de privacidad.';
      lanzarSiHayCampos(campos);

      const correo = normalizarCorreo(datos.correo);
      if (buscarPorCorreo(correo)) throw correoDuplicado();

      const estado = obtenerEstado();
      const usuario: Usuario = {
        id: estado.siguienteIdUsuario++,
        correo,
        nombre: datos.nombre.trim(),
        apellidos: datos.apellidos.trim(),
        telefono: datos.telefono,
        rol: 'candidato',
        estado: 'activo',
        empresa: null,
        consentimiento_sensibles: datos.consentimiento_sensibles === true,
      };
      estado.usuarios.push({ usuario, contrasena: datos.contrasena });
      estado.preferencias.set(usuario.id, preferenciasPorOmision('candidato'));
      return sesionPara(usuario);
    });
  }

  registrarReclutador(datos: RegistroReclutador) {
    return simular(() => {
      const { reclutador, empresa } = datos;
      const campos: Record<string, string> = {};
      if (!textoValido(reclutador?.nombre, 80)) campos['reclutador.nombre'] = 'Escribe tu nombre.';
      if (!textoValido(reclutador?.apellidos, 120)) {
        campos['reclutador.apellidos'] = 'Escribe tus apellidos.';
      }
      if (!textoValido(reclutador?.puesto, 100)) campos['reclutador.puesto'] = 'Escribe tu puesto.';
      if (!esCorreoValido(reclutador?.correo ?? '')) {
        campos['reclutador.correo'] = 'Escribe un correo válido.';
      }
      if (!esTelefonoValido(reclutador?.telefono ?? '')) {
        campos['reclutador.telefono'] = 'Escribe un teléfono de 10 dígitos, sin espacios.';
      }
      if (!esContrasenaValida(reclutador?.contrasena ?? '')) {
        campos['reclutador.contrasena'] = MENSAJE_CONTRASENA;
      }
      if (!textoValido(empresa?.razon_social, 200)) {
        campos['empresa.razon_social'] = 'Escribe la razón social.';
      }
      if (!textoValido(empresa?.nombre_comercial, 150)) {
        campos['empresa.nombre_comercial'] = 'Escribe el nombre comercial.';
      }
      if (!esRfcValido(empresa?.rfc ?? '')) {
        campos['empresa.rfc'] = 'Escribe un RFC de 12 o 13 caracteres, en mayúsculas.';
      }
      if (!existeEnCatalogo('sectores', empresa?.sector_id))
        campos['empresa.sector_id'] = 'Elige un sector.';
      if (!existeEnCatalogo('tamanos-empresa', empresa?.tamano_empresa_id)) {
        campos['empresa.tamano_empresa_id'] = 'Elige el tamaño de la empresa.';
      }
      if (!existeEnCatalogo('municipios', empresa?.municipio_id)) {
        campos['empresa.municipio_id'] = 'Elige el municipio.';
      }
      if (datos.acepta_aviso !== true)
        campos.acepta_aviso = 'Debes aceptar el aviso de privacidad.';
      lanzarSiHayCampos(campos);

      const correo = normalizarCorreo(reclutador.correo);
      if (buscarPorCorreo(correo)) throw correoDuplicado();
      const estado = obtenerEstado();
      if (estado.rfcRegistrados.includes(empresa.rfc)) {
        throw fallo(409, 'rfc_duplicado', 'Otra empresa ya registró ese RFC.', {
          campos: { 'empresa.rfc': 'Otra empresa ya registró ese RFC.' },
        });
      }

      estado.rfcRegistrados.push(empresa.rfc);
      const usuario: Usuario = {
        id: estado.siguienteIdUsuario++,
        correo,
        nombre: reclutador.nombre.trim(),
        apellidos: reclutador.apellidos.trim(),
        telefono: reclutador.telefono,
        rol: 'reclutador',
        estado: 'activo',
        empresa: {
          id: estado.siguienteIdEmpresa++,
          nombre_comercial: empresa.nombre_comercial.trim(),
          estado: 'pendiente',
        },
        consentimiento_sensibles: null,
      };
      estado.usuarios.push({ usuario, contrasena: reclutador.contrasena });
      estado.preferencias.set(usuario.id, preferenciasPorOmision('reclutador'));
      return sesionPara(usuario);
    });
  }
}

function correoDuplicado() {
  return fallo(409, 'correo_duplicado', 'Ese correo ya está registrado.', {
    campos: { correo: 'Ese correo ya está registrado.' },
  });
}

/** Valida el código de recuperación sin consumirlo; cada intento fallido cuenta (máximo 5). */
function comprobarCodigo(correoCrudo: string, codigo: string): void {
  const estado = obtenerEstado();
  if (!esCorreoValido(correoCrudo ?? '') || !esCodigoValido(codigo ?? '')) {
    throw fallo(422, 'validacion', MENSAJE_VALIDACION, {
      campos: {
        ...(esCorreoValido(correoCrudo ?? '') ? {} : { correo: 'Escribe un correo válido.' }),
        ...(esCodigoValido(codigo ?? '') ? {} : { codigo: 'Escribe los 6 dígitos del código.' }),
      },
    });
  }
  const correo = normalizarCorreo(correoCrudo);
  const registro = estado.codigos.get(correo);
  const vencido = 'El código venció. Pide uno nuevo.';
  if (!registro || Date.now() - registro.creadoEn > VIGENCIA_CODIGO_MS) {
    throw fallo(410, 'codigo_vencido', vencido);
  }
  if (registro.codigo !== codigo) {
    registro.intentos += 1;
    const quedan = MAX_INTENTOS_CODIGO - registro.intentos;
    if (quedan <= 0) {
      estado.codigos.delete(correo);
      throw fallo(410, 'codigo_vencido', 'Agotaste los intentos. Pide un código nuevo.');
    }
    throw fallo(
      400,
      'codigo_invalido',
      `Código incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`,
    );
  }
}
