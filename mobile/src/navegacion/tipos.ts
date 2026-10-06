import type { NavigatorScreenParams } from '@react-navigation/native';

// Aún no hay parámetros: se agregan en las tareas de cada pantalla (por ejemplo, el id de la vacante).
export type CandidatoTabsParamList = {
  Vacantes: undefined;
  Postulaciones: undefined;
  Empresas: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

// Los parámetros opcionales llegan desde MOV-04 al tocar una notificación (referencia.id).
export type ReclutadorTabsParamList = {
  MisVacantes: { vacante_id?: number } | undefined;
  Agenda: { entrevista_id?: number } | undefined;
  Notificaciones: undefined;
  Organizacion: { empresa_id?: number } | undefined;
};

export type RootStackParamList = {
  // MOV-00
  Splash: undefined;
  // Sin sesión: MOV-01, MOV-02, MOV-03
  InicioSesion: { mensajeExito?: string } | undefined;
  Registro: undefined;
  RecuperarContrasena: undefined;
  AvisoPrivacidad: undefined;
  // Candidato: barra inferior y pantallas de detalle (CAN-02, CAN-04, CAN-06)
  CandidatoTabs: NavigatorScreenParams<CandidatoTabsParamList> | undefined;
  DetalleVacante: { id: number };
  MiCV: undefined;
  DetallePostulacion: { id: number };
  // Reclutador: barra inferior y pantallas de detalle (REC-03, REC-04, REC-05)
  ReclutadorTabs: NavigatorScreenParams<ReclutadorTabsParamList> | undefined;
  EditarVacante: undefined;
  Postulados: undefined;
  DetallePostulado: { id: number };
};
