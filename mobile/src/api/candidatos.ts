import { cliente } from './cliente';
import type { PerfilCandidato } from './tipos';

/** Perfil del candidato (sección «Perfil y CV del candidato» del contrato). */
export interface CandidatosServicio {
  /** GET /candidatos/me */
  obtenerPerfil(): Promise<PerfilCandidato>;
}

export class CandidatosHttp implements CandidatosServicio {
  async obtenerPerfil() {
    return (await cliente.get<PerfilCandidato>('/candidatos/me')).data;
  }
}
