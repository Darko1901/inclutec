import { cliente } from './cliente';
import type {
  Login,
  Logout,
  Mensaje,
  RegistroCandidato,
  RegistroReclutador,
  Restablecimiento,
  Sesion,
  SolicitudCodigo,
  Usuario,
  VerificacionCodigo,
} from './tipos';

/** Autenticación y cuenta (sección «Autenticación y cuenta» del contrato). */
export interface AuthServicio {
  /** POST /auth/login */
  login(datos: Login): Promise<Sesion>;
  /** GET /auth/me */
  me(): Promise<Usuario>;
  /** POST /auth/logout */
  logout(datos?: Logout): Promise<void>;
  /** POST /auth/password/solicitar */
  solicitarCodigo(datos: SolicitudCodigo): Promise<Mensaje>;
  /** POST /auth/password/verificar */
  verificarCodigo(datos: VerificacionCodigo): Promise<Mensaje>;
  /** POST /auth/password/restablecer */
  restablecerContrasena(datos: Restablecimiento): Promise<Mensaje>;
  /** POST /auth/registro/candidato */
  registrarCandidato(datos: RegistroCandidato): Promise<Sesion>;
  /** POST /auth/registro/reclutador */
  registrarReclutador(datos: RegistroReclutador): Promise<Sesion>;
}

export class AuthHttp implements AuthServicio {
  async login(datos: Login) {
    return (await cliente.post<Sesion>('/auth/login', datos)).data;
  }

  async me() {
    return (await cliente.get<Usuario>('/auth/me')).data;
  }

  async logout(datos: Logout = {}) {
    await cliente.post('/auth/logout', datos);
  }

  async solicitarCodigo(datos: SolicitudCodigo) {
    return (await cliente.post<Mensaje>('/auth/password/solicitar', datos)).data;
  }

  async verificarCodigo(datos: VerificacionCodigo) {
    return (await cliente.post<Mensaje>('/auth/password/verificar', datos)).data;
  }

  async restablecerContrasena(datos: Restablecimiento) {
    return (await cliente.post<Mensaje>('/auth/password/restablecer', datos)).data;
  }

  async registrarCandidato(datos: RegistroCandidato) {
    return (await cliente.post<Sesion>('/auth/registro/candidato', datos)).data;
  }

  async registrarReclutador(datos: RegistroReclutador) {
    return (await cliente.post<Sesion>('/auth/registro/reclutador', datos)).data;
  }
}
