import type { ArchivoLocal } from './candidatos';
import { cliente } from './cliente';
import type {
  Archivo,
  ConsultaEmpresas,
  ConsultaMisVacantes,
  EmpresaEntrada,
  EmpresaPropia,
  EmpresaPublica,
  PaginaEmpresas,
  PaginaVacantesReclutador,
} from './tipos';

/** Directorio de empresas validadas y organización del reclutador (sección «Empresas» del contrato). */
export interface EmpresasServicio {
  /** GET /empresas */
  listar(consulta?: ConsultaEmpresas): Promise<PaginaEmpresas>;
  /** GET /empresas/{id} */
  detalle(id: number): Promise<EmpresaPublica>;
  /** GET /empresas/me */
  miOrganizacion(): Promise<EmpresaPropia>;
  /** PUT /empresas/me; razón social y RFC solo se aceptan mientras la empresa no esté validada. */
  actualizarMiOrganizacion(datos: EmpresaEntrada): Promise<EmpresaPropia>;
  /** POST /empresas/me/logo (multipart, campo `archivo`): JPG o PNG de hasta 2 MB. */
  subirLogo(archivo: ArchivoLocal): Promise<Archivo>;
  /** POST /empresas/me/documento (multipart, campo `archivo`): PDF de hasta 5 MB. */
  subirConstancia(archivo: ArchivoLocal): Promise<Archivo>;
  /** GET /empresas/me/vacantes */
  misVacantes(consulta?: ConsultaMisVacantes): Promise<PaginaVacantesReclutador>;
}

/** En React Native el archivo se describe con uri, name y type en lugar de un Blob. */
function comoFormulario(archivo: ArchivoLocal): FormData {
  const formulario = new FormData();
  formulario.append('archivo', {
    uri: archivo.uri,
    name: archivo.nombre,
    type: archivo.tipo,
  } as unknown as Blob);
  return formulario;
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export class EmpresasHttp implements EmpresasServicio {
  async listar(consulta?: ConsultaEmpresas) {
    return (await cliente.get<PaginaEmpresas>('/empresas', { params: consulta })).data;
  }

  async detalle(id: number) {
    return (await cliente.get<EmpresaPublica>(`/empresas/${id}`)).data;
  }

  async miOrganizacion() {
    return (await cliente.get<EmpresaPropia>('/empresas/me')).data;
  }

  async actualizarMiOrganizacion(datos: EmpresaEntrada) {
    return (await cliente.put<EmpresaPropia>('/empresas/me', datos)).data;
  }

  async subirLogo(archivo: ArchivoLocal) {
    return (await cliente.post<Archivo>('/empresas/me/logo', comoFormulario(archivo), MULTIPART))
      .data;
  }

  async subirConstancia(archivo: ArchivoLocal) {
    return (
      await cliente.post<Archivo>('/empresas/me/documento', comoFormulario(archivo), MULTIPART)
    ).data;
  }

  async misVacantes(consulta?: ConsultaMisVacantes) {
    return (
      await cliente.get<PaginaVacantesReclutador>('/empresas/me/vacantes', { params: consulta })
    ).data;
  }
}
