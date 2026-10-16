import { cliente } from './cliente';
import type {
  Archivo,
  CV,
  EliminarCuenta,
  Experiencia,
  ExperienciaEntrada,
  Formacion,
  FormacionEntrada,
  HabilidadCandidato,
  HabilidadesEntrada,
  NecesidadesEntrada,
  Necesidades,
  PerfilCandidato,
  PerfilCandidatoEntrada,
} from './tipos';

/** Archivo elegido en el teléfono (galería o cámara), listo para subirse como `archivo`. */
export interface ArchivoLocal {
  uri: string;
  nombre: string;
  /** Tipo MIME, por ejemplo `image/jpeg`. */
  tipo: string;
  /** Tamaño en bytes, si el sistema lo informa. */
  tamano?: number;
}

/** Perfil y CV del candidato (sección «Perfil y CV del candidato» del contrato). */
export interface CandidatosServicio {
  /** GET /candidatos/me */
  obtenerPerfil(): Promise<PerfilCandidato>;
  /** PUT /candidatos/me */
  actualizarPerfil(datos: PerfilCandidatoEntrada): Promise<PerfilCandidato>;
  /** POST /candidatos/me/foto (multipart, campo `archivo`) */
  subirFoto(archivo: ArchivoLocal): Promise<Archivo>;
  /** DELETE /candidatos/me/foto */
  quitarFoto(): Promise<void>;
  /** PUT /candidatos/me/consentimiento; al revocarlo se borran las necesidades y la nota. */
  cambiarConsentimiento(otorgado: boolean): Promise<PerfilCandidato>;
  /** PUT /candidatos/me/necesidades (reemplaza la lista completa) */
  guardarNecesidades(datos: NecesidadesEntrada): Promise<Necesidades>;
  /** DELETE /candidatos/me */
  eliminarCuenta(datos: EliminarCuenta): Promise<void>;

  /** GET /candidatos/me/experiencias */
  listarExperiencias(): Promise<Experiencia[]>;
  /** POST /candidatos/me/experiencias */
  crearExperiencia(datos: ExperienciaEntrada): Promise<Experiencia>;
  /** PUT /candidatos/me/experiencias/{id} */
  editarExperiencia(id: number, datos: ExperienciaEntrada): Promise<Experiencia>;
  /** DELETE /candidatos/me/experiencias/{id} */
  eliminarExperiencia(id: number): Promise<void>;

  /** GET /candidatos/me/formaciones */
  listarFormaciones(): Promise<Formacion[]>;
  /** POST /candidatos/me/formaciones */
  crearFormacion(datos: FormacionEntrada): Promise<Formacion>;
  /** PUT /candidatos/me/formaciones/{id} */
  editarFormacion(id: number, datos: FormacionEntrada): Promise<Formacion>;
  /** DELETE /candidatos/me/formaciones/{id} */
  eliminarFormacion(id: number): Promise<void>;

  /** GET /candidatos/me/habilidades */
  listarHabilidades(): Promise<HabilidadCandidato[]>;
  /** PUT /candidatos/me/habilidades (reemplaza la lista completa; máximo 30) */
  guardarHabilidades(datos: HabilidadesEntrada): Promise<HabilidadCandidato[]>;

  /** GET /candidatos/me/vista-previa */
  vistaPrevia(): Promise<CV>;
}

export class CandidatosHttp implements CandidatosServicio {
  async obtenerPerfil() {
    return (await cliente.get<PerfilCandidato>('/candidatos/me')).data;
  }

  async actualizarPerfil(datos: PerfilCandidatoEntrada) {
    return (await cliente.put<PerfilCandidato>('/candidatos/me', datos)).data;
  }

  async subirFoto(archivo: ArchivoLocal) {
    const formulario = new FormData();
    // En React Native el archivo se describe con uri, name y type en lugar de un Blob.
    formulario.append('archivo', {
      uri: archivo.uri,
      name: archivo.nombre,
      type: archivo.tipo,
    } as unknown as Blob);
    return (
      await cliente.post<Archivo>('/candidatos/me/foto', formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }

  async quitarFoto() {
    await cliente.delete('/candidatos/me/foto');
  }

  async cambiarConsentimiento(otorgado: boolean) {
    return (await cliente.put<PerfilCandidato>('/candidatos/me/consentimiento', { otorgado })).data;
  }

  async guardarNecesidades(datos: NecesidadesEntrada) {
    return (await cliente.put<Necesidades>('/candidatos/me/necesidades', datos)).data;
  }

  async eliminarCuenta(datos: EliminarCuenta) {
    await cliente.delete('/candidatos/me', { data: datos });
  }

  async listarExperiencias() {
    return (await cliente.get<Experiencia[]>('/candidatos/me/experiencias')).data;
  }

  async crearExperiencia(datos: ExperienciaEntrada) {
    return (await cliente.post<Experiencia>('/candidatos/me/experiencias', datos)).data;
  }

  async editarExperiencia(id: number, datos: ExperienciaEntrada) {
    return (await cliente.put<Experiencia>(`/candidatos/me/experiencias/${id}`, datos)).data;
  }

  async eliminarExperiencia(id: number) {
    await cliente.delete(`/candidatos/me/experiencias/${id}`);
  }

  async listarFormaciones() {
    return (await cliente.get<Formacion[]>('/candidatos/me/formaciones')).data;
  }

  async crearFormacion(datos: FormacionEntrada) {
    return (await cliente.post<Formacion>('/candidatos/me/formaciones', datos)).data;
  }

  async editarFormacion(id: number, datos: FormacionEntrada) {
    return (await cliente.put<Formacion>(`/candidatos/me/formaciones/${id}`, datos)).data;
  }

  async eliminarFormacion(id: number) {
    await cliente.delete(`/candidatos/me/formaciones/${id}`);
  }

  async listarHabilidades() {
    return (await cliente.get<HabilidadCandidato[]>('/candidatos/me/habilidades')).data;
  }

  async guardarHabilidades(datos: HabilidadesEntrada) {
    return (await cliente.put<HabilidadCandidato[]>('/candidatos/me/habilidades', datos)).data;
  }

  async vistaPrevia() {
    return (await cliente.get<CV>('/candidatos/me/vista-previa')).data;
  }
}
