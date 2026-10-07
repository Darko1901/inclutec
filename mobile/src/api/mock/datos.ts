import { obtenerToken } from '../sesionApi';
import type {
  Notificacion,
  PreferenciaNotificacion,
  RolUsuario,
  TipoNotificacion,
  Usuario,
} from '../tipos';
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

export interface EstadoMock {
  usuarios: UsuarioMock[];
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
    // Las cuentas 5 y 6 existen solo en el mock (no están en la base de datos de prueba):
    // la suspendida prueba el error 423 y la de las 45 notificaciones prueba la paginación.
    {
      contrasena: CONTRASENA_PRUEBA,
      usuario: {
        id: 5,
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
        id: 6,
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

  // Las dos primeras son las de S002; el resto son datos extra (ya leídos) para ver más tipos.
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
      usuario_id: 3,
      id: 3,
      tipo: 'recordatorio_entrevista',
      titulo: 'Tienes una entrevista mañana',
      mensaje: 'Tu entrevista para Técnico de soporte de TI es mañana a las 10:00.',
      referencia: { tipo: 'postulacion', id: 1 },
      leida: true,
      creado_en: hace(30),
    },
    {
      usuario_id: 2,
      id: 4,
      tipo: 'nueva_postulacion',
      titulo: 'Nueva postulación',
      mensaje: 'Mariana López García se postuló a Técnico de soporte de TI.',
      referencia: { tipo: 'postulacion', id: 1 },
      leida: true,
      creado_en: hace(72),
    },
    {
      usuario_id: 2,
      id: 5,
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
      usuario_id: 6,
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
    rfcRegistrados: ['TQU150312AB1'],
    siguienteIdUsuario: 7,
    siguienteIdEmpresa: 2,
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
