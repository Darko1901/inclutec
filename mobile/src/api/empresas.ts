import { cliente } from './cliente';
import type { ConsultaEmpresas, EmpresaPublica, PaginaEmpresas } from './tipos';

/** Directorio de empresas validadas (sección «Empresas» del contrato). */
export interface EmpresasServicio {
  /** GET /empresas */
  listar(consulta?: ConsultaEmpresas): Promise<PaginaEmpresas>;
  /** GET /empresas/{id} */
  detalle(id: number): Promise<EmpresaPublica>;
}

export class EmpresasHttp implements EmpresasServicio {
  async listar(consulta?: ConsultaEmpresas) {
    return (await cliente.get<PaginaEmpresas>('/empresas', { params: consulta })).data;
  }

  async detalle(id: number) {
    return (await cliente.get<EmpresaPublica>(`/empresas/${id}`)).data;
  }
}
