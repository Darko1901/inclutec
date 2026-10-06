// Único punto por donde la app obtiene los servicios (ver servicios.ts). Las pantallas y los
// componentes solo importan de aquí.
export { auth, catalogos, notificaciones } from './servicios';
export { ApiError, MENSAJE_SERVICIO_NO_DISPONIBLE } from './errores';
export { configurarSesionApi } from './sesionApi';
export { useCatalogo } from './useCatalogo';
export { TIPOS_CATALOGO } from './catalogos';
export type { TipoCatalogo, CatalogosServicio } from './catalogos';
export type { AuthServicio } from './auth';
export type { NotificacionesServicio } from './notificaciones';
export * from './tipos';
