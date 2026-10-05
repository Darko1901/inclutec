import { ApiError } from './errores';

// Puente entre la capa de servicios y la sesión: el cliente HTTP y el mock leen el token de aquí
// y avisan cuando el API responde 401 no_autenticado. La sesión lo configura al arrancar.
interface ManejadoresSesion {
  obtenerToken: () => string | null;
  alNoAutenticado: () => void;
}

let manejadores: ManejadoresSesion = {
  obtenerToken: () => null,
  alNoAutenticado: () => undefined,
};

export function configurarSesionApi(nuevos: Partial<ManejadoresSesion>): void {
  manejadores = { ...manejadores, ...nuevos };
}

export function obtenerToken(): string | null {
  return manejadores.obtenerToken();
}

/** Todo error pasa por aquí; un 401 no_autenticado cierra la sesión local. */
export function manejarError(error: ApiError): void {
  if (error.status === 401 && error.codigo === 'no_autenticado') {
    manejadores.alNoAutenticado();
  }
}
