import type { NotificacionesServicio } from '../notificaciones';
import type {
  ConsultaNotificaciones,
  Dispositivo,
  PaginaNotificaciones,
  PreferenciaNotificacion,
} from '../tipos';
import { exigirSesion, obtenerEstado, preferenciasPorOmision, TIPOS_POR_ROL } from './datos';
import { fallo, simular } from './simulador';

const ROLES_CON_NOTIFICACIONES = ['candidato', 'reclutador'] as const;
const TAMANO_MAXIMO = 100;

function exigirUsuario() {
  return exigirSesion([...ROLES_CON_NOTIFICACIONES]).usuario;
}

export class NotificacionesMock implements NotificacionesServicio {
  registrarDispositivo(datos: Dispositivo) {
    return simular(() => {
      const usuario = exigirUsuario();
      const campos: Record<string, string> = {};
      if (!datos.expo_push_token || datos.expo_push_token.length > 255) {
        campos.expo_push_token = 'El token del dispositivo no es válido.';
      }
      if (datos.plataforma !== 'android' && datos.plataforma !== 'ios') {
        campos.plataforma = 'La plataforma debe ser android o ios.';
      }
      if (Object.keys(campos).length > 0) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
      }
      // Si el token ya existe, se reasigna al usuario actual.
      obtenerEstado().dispositivos.set(datos.expo_push_token, {
        usuarioId: usuario.id,
        plataforma: datos.plataforma,
      });
    });
  }

  listar(consulta: ConsultaNotificaciones = {}) {
    return simular((): PaginaNotificaciones => {
      const usuario = exigirUsuario();
      const page = consulta.page ?? 1;
      const size = consulta.size ?? 20;
      const campos: Record<string, string> = {};
      if (!Number.isInteger(page) || page < 1) campos.page = 'La página empieza en 1.';
      if (!Number.isInteger(size) || size < 1 || size > TAMANO_MAXIMO) {
        campos.size = `El tamaño de página va de 1 a ${TAMANO_MAXIMO}.`;
      }
      if (Object.keys(campos).length > 0) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
      }

      const propias = obtenerEstado()
        .notificaciones.filter((n) => n.usuario_id === usuario.id)
        .filter((n) => !consulta.solo_no_leidas || !n.leida)
        .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
      const items = propias
        .slice((page - 1) * size, page * size)
        .map(({ usuario_id: _usuarioId, ...notificacion }) => notificacion);
      return { items, total: propias.length, page, size };
    });
  }

  resumen() {
    return simular(() => {
      const usuario = exigirUsuario();
      const noLeidas = obtenerEstado().notificaciones.filter(
        (n) => n.usuario_id === usuario.id && !n.leida,
      ).length;
      return { no_leidas: noLeidas };
    });
  }

  marcarLeida(id: number) {
    return simular(() => {
      const usuario = exigirUsuario();
      const notificacion = obtenerEstado().notificaciones.find(
        (n) => n.id === id && n.usuario_id === usuario.id,
      );
      if (!notificacion) throw fallo(404, 'no_encontrado', 'La notificación no existe.');
      notificacion.leida = true;
    });
  }

  marcarTodasLeidas() {
    return simular(() => {
      const usuario = exigirUsuario();
      obtenerEstado().notificaciones.forEach((n) => {
        if (n.usuario_id === usuario.id) n.leida = true;
      });
    });
  }

  obtenerPreferencias() {
    return simular(() => {
      const usuario = exigirUsuario();
      const guardadas = obtenerEstado().preferencias.get(usuario.id);
      return guardadas ?? preferenciasPorOmision(usuario.rol);
    });
  }

  guardarPreferencias(preferencias: PreferenciaNotificacion[]) {
    return simular(() => {
      const usuario = exigirUsuario();
      const validos = TIPOS_POR_ROL[usuario.rol];
      const invalido =
        !Array.isArray(preferencias) ||
        preferencias.some(
          (p) =>
            !validos.includes(p.tipo) ||
            typeof p.push !== 'boolean' ||
            typeof p.correo !== 'boolean',
        );
      if (invalido) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
          campos: {
            preferencias: 'Hay tipos de aviso que no existen o valores que no son sí o no.',
          },
        });
      }
      // Recibe la lista completa; los tipos que falten conservan su valor anterior.
      const actuales =
        obtenerEstado().preferencias.get(usuario.id) ?? preferenciasPorOmision(usuario.rol);
      const guardadas = actuales.map(
        (actual) => preferencias.find((p) => p.tipo === actual.tipo) ?? actual,
      );
      obtenerEstado().preferencias.set(usuario.id, guardadas);
      return guardadas;
    });
  }
}
