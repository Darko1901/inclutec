import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, auth, configurarSesionApi, type Sesion, type Usuario } from '../api';
import { borrarToken, guardarToken, leerTokenGuardado } from './almacen';
import { obtenerTokenPush, olvidarTokenPush, registrarDispositivoPush } from './dispositivoPush';

export type EstadoSesion = 'cargando' | 'sin_sesion' | 'activa';

/** Pestaña a la que se lleva al usuario al entrar (por ejemplo, tras registrarse). */
export type PantallaInicial = 'Perfil' | 'Organizacion';

interface OpcionesInicio {
  pantallaInicial?: PantallaInicial;
}

export const MENSAJE_ADMINISTRADOR = 'El administrador usa el panel web';
export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión de nuevo.';
export const TIEMPO_MAXIMO_SPLASH_MS = 3000;

interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  /** Aviso para MOV-01 (administrador rechazado o sesión vencida). */
  aviso: string | null;
  limpiarAviso: () => void;
  /** MOV-00: valida el token guardado con auth.me. */
  restaurarSesion: () => Promise<void>;
  /** Guarda la sesión que devolvió login o registro. Devuelve false si el rol no puede usar la app. */
  iniciarSesion: (sesion: Sesion, opciones?: OpcionesInicio) => Promise<boolean>;
  /** Pestaña inicial pedida al iniciar sesión; null si debe abrir la predeterminada del rol. */
  pantallaInicial: PantallaInicial | null;
  cerrarSesion: () => Promise<void>;
}

const SesionContext = createContext<ValorSesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pantallaInicial, setPantallaInicial] = useState<PantallaInicial | null>(null);
  const tokenRef = useRef<string | null>(null);

  const terminarSesionLocal = useCallback(async (mensaje: string | null = null) => {
    tokenRef.current = null;
    olvidarTokenPush();
    await borrarToken();
    setUsuario(null);
    setPantallaInicial(null);
    setAviso(mensaje);
    setEstado('sin_sesion');
  }, []);

  useEffect(() => {
    configurarSesionApi({
      obtenerToken: () => tokenRef.current,
      // El API respondió 401 no_autenticado: el token venció o ya no sirve.
      alNoAutenticado: () => {
        if (tokenRef.current !== null) void terminarSesionLocal(MENSAJE_SESION_VENCIDA);
      },
    });
  }, [terminarSesionLocal]);

  const iniciarSesion = useCallback(
    async (sesion: Sesion, opciones: OpcionesInicio = {}) => {
      if (sesion.usuario.rol === 'administrador') {
        await terminarSesionLocal(MENSAJE_ADMINISTRADOR);
        return false;
      }
      tokenRef.current = sesion.access_token;
      await guardarToken(sesion.access_token);
      setUsuario(sesion.usuario);
      setPantallaInicial(opciones.pantallaInicial ?? null);
      setAviso(null);
      setEstado('activa');
      return true;
    },
    [terminarSesionLocal],
  );

  const restaurarSesion = useCallback(async () => {
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const temporizador = new Promise<'tiempo'>((resolver) => {
      reloj = setTimeout(() => resolver('tiempo'), TIEMPO_MAXIMO_SPLASH_MS);
    });
    const validar = async (): Promise<'ok' | 'sin_sesion'> => {
      const token = await leerTokenGuardado();
      if (!token) return 'sin_sesion';
      tokenRef.current = token;
      try {
        const usuarioActual = await auth.me();
        if (usuarioActual.rol === 'administrador') {
          await terminarSesionLocal(MENSAJE_ADMINISTRADOR);
          return 'ok';
        }
        setUsuario(usuarioActual);
        setEstado('activa');
        return 'ok';
      } catch (error) {
        // 401: el cliente ya cerró la sesión local (alNoAutenticado). 423: la cuenta se suspendió
        // después de emitir el token. Un fallo de red conserva el token para el próximo intento.
        if (error instanceof ApiError && error.status === 423) {
          await terminarSesionLocal(error.detail);
        } else if (!(error instanceof ApiError && error.status === 401)) {
          tokenRef.current = null;
        }
        return 'sin_sesion';
      }
    };

    const resultado = await Promise.race([validar(), temporizador]);
    clearTimeout(reloj);
    // Máximo 3 s en el splash: si el API no responde, se pasa a MOV-01.
    if (resultado !== 'ok') {
      setEstado((actual) => (actual === 'cargando' ? 'sin_sesion' : actual));
    }
  }, [terminarSesionLocal]);

  const cerrarSesion = useCallback(async () => {
    try {
      await auth.logout({ expo_push_token: obtenerTokenPush() ?? undefined });
    } catch {
      // El JWT no se revoca en el servidor; basta con borrarlo aquí.
    }
    await terminarSesionLocal(null);
  }, [terminarSesionLocal]);

  const idUsuario = usuario?.id;
  useEffect(() => {
    // Al entrar (login, registro o sesión restaurada) se registra el dispositivo para push.
    if (idUsuario !== undefined) void registrarDispositivoPush();
  }, [idUsuario]);

  const limpiarAviso = useCallback(() => setAviso(null), []);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      aviso,
      pantallaInicial,
      limpiarAviso,
      restaurarSesion,
      iniciarSesion,
      cerrarSesion,
    }),
    [
      estado,
      usuario,
      aviso,
      pantallaInicial,
      limpiarAviso,
      restaurarSesion,
      iniciarSesion,
      cerrarSesion,
    ],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return valor;
}
