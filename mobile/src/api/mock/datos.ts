import { obtenerToken } from '../sesionApi';
import type {
  Notificacion,
  PreferenciaNotificacion,
  RolUsuario,
  TipoNotificacion,
  Usuario,
} from '../tipos';
import { crearNegocioInicial, type NegocioMock } from './negocio.datos';
import { fallo } from './simulador';
import { leerToken } from './tokens';

// Datos de los ejemplos del contrato y de db/semillas/S002__datos_prueba.sql.
// La contraseña de todas las cuentas es Inclutec2026.
export const CONTRASENA_PRUEBA = 'Inclutec2026';
export const CODIGO_RECUPERACION_PRUEBA = '123456';

export interface UsuarioMock {
  usuario: Usuario;
  contrasena: string;
}

interface NotificacionMock extends Notificacion {
  usuario_id: number;
}

interface IntentosLogin {
  fallidos: number;
  bloqueadoHasta: number | null;
}

interface CodigoRecuperacion {
  codigo: string;
  creadoEn: number;
  intentos: number;
}

export interface EstadoMock extends NegocioMock {
  usuarios: UsuarioMock[];
  siguienteIdPostulacion: number;
  siguienteIdReporte: number;
  siguienteIdNotificacion: number;
  rfcRegistrados: string[];
  siguienteIdUsuario: number;
  siguienteIdEmpresa: number;
  notificaciones: NotificacionMock[];
  preferencias: Map<number, PreferenciaNotificacion[]>;
  dispositivos: Map<string, { usuarioId: number; plataforma: string }>;
  intentosLogin: Map<string, IntentosLogin>;
  codigos: Map<string, CodigoRecuperacion>;
}

export const TIPOS_POR_ROL: Record<RolUsuario, TipoNotificacion[]> = {
  candidato: [
    'cambio_estado',
    'entrevista_cancelada',
    'recordatorio_entrevista',
    'vacante_suspendida',
    'reporte_resuelto',
  ],
  reclutador: [
    'nueva_postulacion',
    'entrevista_agendada',
    'entrevista_cancelada',
    'recordatorio_entrevista',
    'empresa_validada',
    'empresa_rechazada',
    'vacante_suspendida',
    'reporte_resuelto',
  ],
  administrador: [],
};

export function preferenciasPorOmision(rol: RolUsuario): PreferenciaNotificacion[] {
  return TIPOS_POR_ROL[rol].map((tipo) => ({ tipo, push: true, correo: true }));
}

function crearEstadoInicial(): EstadoMock {
  const usuarios: UsuarioMock[] = [
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 1,
        correo: 'admin@inclutec.mx',
        nombre: 'Admin',
        apellidos: 'IncluTec',
        telefono: null,
        rol: 'administrador',
        estado: 'activo',
        empresa: null,
        consentimiento_sensibles: null,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 2,
        correo: 'rh@tecnoqro.mx',
        nombre: 'Laura',
        apellidos: 'Hernández Ruiz',
        telefono: '4421234567',
        rol: 'reclutador',
        estado: 'activo',
        empresa: { id: 1, nombre_comercial: 'TecnoQro', estado: 'validada' },
        consentimiento_sensibles: null,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 3,
        correo: 'mariana.lopez@correo.mx',
        nombre: 'Mariana',
        apellidos: 'López García',
        telefono: '4427654321',
        rol: 'candidato',
        estado: 'activo',
        empresa: null,
        consentimiento_sensibles: true,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 4,
        correo: 'jorge.ramirez@correo.mx',
        nombre: 'Jorge',
        apellidos: 'Ramírez Soto',
        telefono: '4421112233',
        rol: 'candidato',
        estado: 'activo',
        empresa: null,
        consentimiento_sensibles: false,
      },
    },
    // Reclutadores de las empresas que amplían S002 (Estudio Trazo sigue pendiente de validar).
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 5,
        correo: 'rh@logibajio.mx',
        nombre: 'Roberto',
        apellidos: 'Sánchez Mejía',
        telefono: '4422345678',
        rol: 'reclutador',
        estado: 'activo',
        empresa: { id: 2, nombre_comercial: 'LogiBajío', estado: 'validada' },
        consentimiento_sensibles: null,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 6,
        correo: 'talento@concentro.mx',
        nombre: 'Patricia',
        apellidos: 'Núñez Ortega',
        telefono: '4423456789',
        rol: 'reclutador',
        estado: 'activo',
        empresa: { id: 3, nombre_comercial: 'ConCentro', estado: 'validada' },
        consentimiento_sensibles: null,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 7,
        correo: 'contacto@estudiotrazo.mx',
        nombre: 'Daniel',
        apellidos: 'Ortiz Vega',
        telefono: '4424567890',
        rol: 'reclutador',
        estado: 'activo',
        empresa: { id: 4, nombre_comercial: 'Estudio Trazo', estado: 'pendiente' },
        consentimiento_sensibles: null,
      },
    },
    // Las cuentas 100 y 101 existen solo en el mock (no están en la base de datos de prueba; sus
    // ids empiezan en 100 para no chocar con los de S002): la suspendida prueba el error 423 y la
    // de las 45 notificaciones prueba la paginación.
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 100,
        correo: 'suspendida@correo.mx',
        nombre: 'Sofía',
        apellidos: 'Cuenta Suspendida',
        telefono: '4425550000',
        rol: 'candidato',
        estado: 'suspendido',
        empresa: null,
        consentimiento_sensibles: false,
      },
    },
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 101,
        correo: 'notificaciones@correo.mx',
        nombre: 'Lucía',
        apellidos: 'Muchas Notificaciones',
        telefono: '4425551111',
        rol: 'candidato',
        estado: 'activo',
        empresa: null,
        consentimiento_sensibles: true,
      },
    },
  ];

  const hace = (horas: number) =>
    new Date(Date.now() - horas * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Las tres primeras son las de S002 (la tercera es la de Roberto); las de id 90 en adelante son
  // datos extra solo del mock (ya leídos) para ver más tipos.
  const notificaciones: NotificacionMock[] = [
    {
      usuario_id: 3,
      id: 1,
      tipo: 'cambio_estado',
      titulo: 'Tu postulación avanzó',
      mensaje: 'Tu postulación a Técnico de soporte de TI pasó a Entrevista.',
      referencia: { tipo: 'postulacion', id: 1 },
      leida: false,
      creado_en: '2026-10-02T16:30:00Z',
    },
    {
      usuario_id: 2,
      id: 2,
      tipo: 'entrevista_agendada',
      titulo: 'Nueva entrevista',
      mensaje: 'Se agendó una entrevista para Técnico de soporte de TI.',
      referencia: { tipo: 'entrevista', id: 1 },
      leida: false,
      creado_en: '2026-10-02T17:00:00Z',
    },
    {
      usuario_id: 5,
      id: 3,
      tipo: 'nueva_postulacion',
      titulo: 'Nueva postulación',
      mensaje: 'Jorge Ramírez Soto se postuló a Analista de datos de operaciones.',
      referencia: { tipo: 'postulacion', id: 2 },
      leida: false,
      creado_en: '2026-10-05T17:30:00Z',
    },
    {
      usuario_id: 3,
      id: 90,
      tipo: 'recordatorio_entrevista',
      titulo: 'Tienes una entrevista mañana',
      mensaje: 'Tu entrevista para Técnico de soporte de TI es mañana a las 10:00.',
      referencia: { tipo: 'postulacion', id: 1 },
      leida: true,
      creado_en: hace(30),
    },
    {
      usuario_id: 2,
      id: 91,
      tipo: 'nueva_postulacion',
      titulo: 'Nueva postulación',
      mensaje: 'Mariana López García se postuló a Técnico de soporte de TI.',
      referencia: { tipo: 'postulacion', id: 1 },
      leida: true,
      creado_en: hace(72),
    },
    {
      usuario_id: 2,
      id: 92,
      tipo: 'empresa_validada',
      titulo: 'Tu empresa fue validada',
      mensaje: 'TecnoQro ya puede publicar vacantes.',
      referencia: { tipo: 'empresa', id: 1 },
      leida: true,
      creado_en: hace(120),
    },
  ];

  // Lucía: 45 notificaciones (las 5 más recientes sin leer) para probar el desplazamiento infinito.
  const tiposCandidato = TIPOS_POR_ROL.candidato;
  for (let indice = 0; indice < 45; indice++) {
    const tipo = tiposCandidato[indice % tiposCandidato.length];
    notificaciones.push({
      usuario_id: 101,
      id: 100 + indice,
      tipo,
      titulo: `Aviso ${indice + 1}`,
      mensaje: `Notificación de prueba número ${indice + 1} (${tipo}).`,
      referencia:
        tipo === 'reporte_resuelto' ? { tipo: 'reporte', id: 1 } : { tipo: 'postulacion', id: 1 },
      leida: indice >= 5,
      creado_en: hace(indice * 3 + 1),
    });
  }

  return {
    usuarios,
    rfcRegistrados: ['TQU150312AB1', 'LBN180725KQ3', 'CAC0904158T2', 'ETR2101119P4'],
    // Después de los ids de S002 (1 a 7) y de las cuentas solo del mock (100 y 101).
    siguienteIdUsuario: 102,
    siguienteIdEmpresa: 5,
    siguienteIdPostulacion: 3,
    siguienteIdReporte: 2,
    siguienteIdNotificacion: 200,
    ...crearNegocioInicial(),
    notificaciones,
    preferencias: new Map(),
    dispositivos: new Map(),
    intentosLogin: new Map(),
    codigos: new Map(),
  };
}

let estado = crearEstadoInicial();

export function obtenerEstado(): EstadoMock {
  return estado;
}

/** Vuelve a los datos iniciales (lo usan las pruebas). */
export function reiniciarMock(): void {
  estado = crearEstadoInicial();
}

export function buscarPorCorreo(correo: string): UsuarioMock | undefined {
  return estado.usuarios.find((u) => u.usuario.correo.toLowerCase() === correo);
}

/** Usuario dueño del token de la sesión; responde como el API si no hay sesión válida. */
export function exigirSesion(roles?: RolUsuario[]): UsuarioMock {
  const carga = leerToken(obtenerToken());
  const usuario = carga && estado.usuarios.find((u) => String(u.usuario.id) === carga.sub);
  if (!usuario) {
    throw fallo(401, 'no_autenticado', 'Tu sesión venció. Inicia sesión de nuevo.');
  }
  if (usuario.usuario.estado !== 'activo') {
    throw fallo(423, 'cuenta_suspendida', 'Tu cuenta está suspendida.');
  }
  if (roles && !roles.includes(usuario.usuario.rol)) {
    throw fallo(403, 'sin_permiso', 'No tienes permiso para realizar esta operación.');
  }
  return usuario;
}
