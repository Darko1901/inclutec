import { ApiError } from './errores';

// Puente entre la capa de servicios y la sesión: el cliente HTTP y el mock leen el token de aquí
// y avisan cuando el API ya no acepta la sesión. La sesión lo configura al arrancar.
interface ManejadoresSesion {
  obtenerToken: () => string | null;
  /** 401 no_autenticado: el token venció o ya no sirve. */
  alNoAutenticado: () => void;
  /** 423 cuenta_suspendida: la cuenta se suspendió o se dio de baja con la sesión abierta. */
  alCuentaSuspendida: (mensaje: string) => void;
}

let manejadores: ManejadoresSesion = {
  obtenerToken: () => null,
  alNoAutenticado: () => undefined,
  alCuentaSuspendida: () => undefined,
};

export function configurarSesionApi(nuevos: Partial<ManejadoresSesion>): void {
  manejadores = { ...manejadores, ...nuevos };
}

export function obtenerToken(): string | null {
  return manejadores.obtenerToken();
}

/** Todo error pasa por aquí; un 401 no_autenticado o un 423 cuenta_suspendida cierran la sesión local. */
export function manejarError(error: ApiError): void {
  if (error.status === 401 && error.codigo === 'no_autenticado') {
    manejadores.alNoAutenticado();
  } else if (error.status === 423 && error.codigo === 'cuenta_suspendida') {
    manejadores.alCuentaSuspendida(error.detail);
  }
}
