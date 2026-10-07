import { cliente } from './cliente';
import type { ReporteCreado, ReporteEntrada } from './tipos';

/** Reportes de vacantes, empresas o candidatos (sección «Reportes» del contrato). */
export interface ReportesServicio {
  /** POST /reportes */
  crear(datos: ReporteEntrada): Promise<ReporteCreado>;
}

export class ReportesHttp implements ReportesServicio {
  async crear(datos: ReporteEntrada) {
    return (await cliente.post<ReporteCreado>('/reportes', datos)).data;
  }
}
