// Único punto por donde la app obtiene los servicios. EXPO_PUBLIC_USE_MOCK decide si responden
// los datos simulados o el API real; las pantallas y los componentes solo importan de aquí.
import { AuthHttp, type AuthServicio } from './auth';
import { CatalogosHttp, type CatalogosServicio } from './catalogos';
import { USAR_MOCK } from './config';
import { AuthMock } from './mock/auth.mock';
import { CatalogosMock } from './mock/catalogos.mock';
import { NotificacionesMock } from './mock/notificaciones.mock';
import { NotificacionesHttp, type NotificacionesServicio } from './notificaciones';

export const auth: AuthServicio = USAR_MOCK ? new AuthMock() : new AuthHttp();
export const catalogos: CatalogosServicio = USAR_MOCK ? new CatalogosMock() : new CatalogosHttp();
export const notificaciones: NotificacionesServicio = USAR_MOCK
  ? new NotificacionesMock()
  : new NotificacionesHttp();

export { ApiError, MENSAJE_SERVICIO_NO_DISPONIBLE } from './errores';
export { configurarSesionApi } from './sesionApi';
export { TIPOS_CATALOGO } from './catalogos';
export type { TipoCatalogo, CatalogosServicio } from './catalogos';
export type { AuthServicio } from './auth';
export type { NotificacionesServicio } from './notificaciones';
export * from './tipos';
