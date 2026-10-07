// Único punto por donde la app obtiene los servicios. EXPO_PUBLIC_USE_MOCK decide si responden
// los datos simulados o el API real; las pantallas y los componentes solo importan de aquí.
import { AuthHttp, type AuthServicio } from './auth';
import { CandidatosHttp, type CandidatosServicio } from './candidatos';
import { CatalogosHttp, type CatalogosServicio } from './catalogos';
import { USAR_MOCK } from './config';
import { AuthMock } from './mock/auth.mock';
import { CandidatosMock } from './mock/candidatos.mock';
import { CatalogosMock } from './mock/catalogos.mock';
import { NotificacionesMock } from './mock/notificaciones.mock';
import { PostulacionesMock } from './mock/postulaciones.mock';
import { ReportesMock } from './mock/reportes.mock';
import { VacantesMock } from './mock/vacantes.mock';
import { NotificacionesHttp, type NotificacionesServicio } from './notificaciones';
import { PostulacionesHttp, type PostulacionesServicio } from './postulaciones';
import { ReportesHttp, type ReportesServicio } from './reportes';
import { VacantesHttp, type VacantesServicio } from './vacantes';

export const auth: AuthServicio = USAR_MOCK ? new AuthMock() : new AuthHttp();
export const catalogos: CatalogosServicio = USAR_MOCK ? new CatalogosMock() : new CatalogosHttp();
export const notificaciones: NotificacionesServicio = USAR_MOCK
  ? new NotificacionesMock()
  : new NotificacionesHttp();
export const vacantes: VacantesServicio = USAR_MOCK ? new VacantesMock() : new VacantesHttp();
export const postulaciones: PostulacionesServicio = USAR_MOCK
  ? new PostulacionesMock()
  : new PostulacionesHttp();
export const reportes: ReportesServicio = USAR_MOCK ? new ReportesMock() : new ReportesHttp();
export const candidatos: CandidatosServicio = USAR_MOCK
  ? new CandidatosMock()
  : new CandidatosHttp();
