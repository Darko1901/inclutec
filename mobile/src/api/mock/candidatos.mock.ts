import type { CandidatosServicio } from '../candidatos';
import { exigirSesion } from './datos';
import { simular } from './simulador';
import { candidatoDe, perfilDeCandidato } from './vistas';

export class CandidatosMock implements CandidatosServicio {
  obtenerPerfil() {
    return simular(() => {
      const usuario = exigirSesion(['candidato']);
      return perfilDeCandidato(usuario, candidatoDe(usuario));
    });
  }
}
