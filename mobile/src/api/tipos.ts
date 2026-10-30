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
export type PerfilCandidatoEntrada = Esquemas['PerfilCandidatoEntrada'];
export type Consentimiento = Esquemas['Consentimiento'];
export type NecesidadesEntrada = Esquemas['NecesidadesEntrada'];
export type Necesidades = Esquemas['Necesidades'];
export type EliminarCuenta = Esquemas['EliminarCuenta'];
export type Experiencia = Esquemas['Experiencia'];
export type ExperienciaEntrada = Esquemas['ExperienciaEntrada'];
export type Formacion = Esquemas['Formacion'];
export type FormacionEntrada = Esquemas['FormacionEntrada'];
export type HabilidadCandidato = Esquemas['HabilidadCandidato'];
export type HabilidadesEntrada = Esquemas['HabilidadesEntrada'];
export type CV = Esquemas['CV'];
export type Archivo = Esquemas['Archivo'];
export type CambioContrasena = Esquemas['CambioContrasena'];
export type PostulacionEntrada = Esquemas['PostulacionEntrada'];
export type PostulacionDetalle = Esquemas['PostulacionDetalle'];
export type PostulacionResumen = Esquemas['PostulacionResumen'];
export type PaginaPostulaciones = Esquemas['PaginaPostulaciones'];
export type EventoHistorial = Esquemas['EventoHistorial'];
export type ConsultaPostulaciones = NonNullable<
  operations['get_postulaciones_me']['parameters']['query']
>;
export type Entrevista = Esquemas['Entrevista'];
export type Horario = Esquemas['Horario'];
export type EmpresaResumen = Esquemas['EmpresaResumen'];
export type PaginaEmpresas = Esquemas['PaginaEmpresas'];
export type EmpresaPublica = Esquemas['EmpresaPublica'];
export type ConsultaEmpresas = NonNullable<operations['get_empresas']['parameters']['query']>;
export type EmpresaPropia = Esquemas['EmpresaPropia'];
export type EmpresaEntrada = Esquemas['EmpresaEntrada'];
export type VacanteReclutador = Esquemas['VacanteReclutador'];
export type PaginaVacantesReclutador = Esquemas['PaginaVacantesReclutador'];
export type VacanteEntrada = Esquemas['VacanteEntrada'];
export type VacanteGuardada = Esquemas['VacanteGuardada'];
export type ConsultaMisVacantes = NonNullable<
  operations['get_empresas_me_vacantes']['parameters']['query']
>;
export type Postulado = Esquemas['Postulado'];
export type PaginaPostulados = Esquemas['PaginaPostulados'];
export type PostuladoDetalle = Esquemas['PostuladoDetalle'];
export type CambioEstadoPostulacion = Esquemas['CambioEstadoPostulacion'];
export type ResultadoCambioEstado = Esquemas['ResultadoCambioEstado'];
export type Observacion = Esquemas['Observacion'];
export type HorarioEntrada = Esquemas['HorarioEntrada'];
export type DiaAgenda = Esquemas['DiaAgenda'];
export type ResultadoEntrevista = Esquemas['ResultadoEntrevista'];
export type ConsultaPostulados = NonNullable<
  operations['get_vacantes_id_postulaciones']['parameters']['query']
>;
export type ConsultaAgenda = NonNullable<operations['get_entrevistas_me']['parameters']['query']>;
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
export type SeccionPerfil = Esquemas['PerfilCandidato']['secciones_pendientes'][number];
export type CategoriaAjuste = AjusteRef['categoria'];
export type NivelHabilidad = HabilidadCandidato['nivel'];
export type EstadoFormacion = Formacion['estado'];
export type EstadoEmpresa = Esquemas['EmpresaAdmin']['estado'];
export type EstadoEntrevista = Esquemas['Entrevista']['estado'];
export type EstadoHorario = Esquemas['Horario']['estado'];
export type EstadoReporte = Esquemas['ReporteAdmin']['estado'];
