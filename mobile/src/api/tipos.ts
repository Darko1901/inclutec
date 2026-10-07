// Los tipos salen del contrato (esquema.d.ts, generado de docs/api/openapi.yaml con `npm run tipos`).
// Aquí solo se les pone nombre; no se escriben interfaces a mano.
import type { components, operations } from './esquema';

type Esquemas = components['schemas'];

export type Usuario = Esquemas['Usuario'];
export type Sesion = Esquemas['Sesion'];
export type Login = Esquemas['Login'];
export type Logout = Esquemas['Logout'];
export type Mensaje = Esquemas['Mensaje'];
export type RegistroCandidato = Esquemas['RegistroCandidato'];
export type RegistroReclutador = Esquemas['RegistroReclutador'];
export type SolicitudCodigo = Esquemas['SolicitudCodigo'];
export type VerificacionCodigo = Esquemas['VerificacionCodigo'];
export type Restablecimiento = Esquemas['Restablecimiento'];

export type CatalogoItem = Esquemas['CatalogoItem'];
export type ConsultaCatalogo = NonNullable<operations['get_catalogos_tipo']['parameters']['query']>;

export type Dispositivo = Esquemas['Dispositivo'];
export type Notificacion = Esquemas['Notificacion'];
export type PaginaNotificaciones = Esquemas['PaginaNotificaciones'];
export type ResumenNotificaciones = Esquemas['ResumenNotificaciones'];
export type PreferenciaNotificacion = Esquemas['PreferenciaNotificacion'];
export type ConsultaNotificaciones = NonNullable<
  operations['get_notificaciones']['parameters']['query']
>;

export type AjusteRef = Esquemas['AjusteRef'];
export type VacanteResumen = Esquemas['VacanteResumen'];
export type PaginaVacantes = Esquemas['PaginaVacantes'];
export type VacanteDetalle = Esquemas['VacanteDetalle'];
export type Compatibilidad = Esquemas['Compatibilidad'];
export type ConsultaRecomendadas = NonNullable<
  operations['get_vacantes_recomendadas']['parameters']['query']
>;
export type ConsultaVacantes = NonNullable<operations['get_vacantes']['parameters']['query']>;

export type PerfilCandidato = Esquemas['PerfilCandidato'];
export type PostulacionEntrada = Esquemas['PostulacionEntrada'];
export type PostulacionDetalle = Esquemas['PostulacionDetalle'];
export type ReporteEntrada = Esquemas['ReporteEntrada'];
export type ReporteCreado = Esquemas['ReporteCreado'];

export type RolUsuario = Usuario['rol'];
export type EstadoUsuario = Usuario['estado'];
export type TipoNotificacion = Notificacion['tipo'];

/** Estados por entidad (tabla 3.4 de docs/diseno/pantallas.md), tomados del contrato. */
export type EstadoPostulacion = Esquemas['PostulacionResumen']['estado'];
export type EstadoVacante = Esquemas['VacanteDetalle']['estado'];
export type TipoAjusteVacante = Esquemas['VacanteResumen']['ajustes'][number]['tipo'];
export type CompartirAjustes = Esquemas['PerfilCandidato']['compartir_ajustes'];
export type EstadoEmpresa = Esquemas['EmpresaAdmin']['estado'];
export type EstadoEntrevista = Esquemas['Entrevista']['estado'];
export type EstadoHorario = Esquemas['Horario']['estado'];
export type EstadoReporte = Esquemas['ReporteAdmin']['estado'];
