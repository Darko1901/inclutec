import type { NavigatorScreenParams } from '@react-navigation/native';

// Aún no hay parámetros: se agregan en las tareas de cada pantalla (por ejemplo, el id de la vacante).
export type CandidatoTabsParamList = {
  Vacantes: undefined;
  Postulaciones: undefined;
  Empresas: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

export type ReclutadorTabsParamList = {
  MisVacantes: undefined;
  Agenda: undefined;
  Notificaciones: undefined;
  Organizacion: undefined;
};

export type RootStackParamList = {
  // MOV-00
  Splash: undefined;
  // Sin sesión: MOV-01, MOV-02, MOV-03
  InicioSesion: undefined;
  Registro: undefined;
  RecuperarContrasena: undefined;
  // Candidato: barra inferior y pantallas de detalle (CAN-02, CAN-04, CAN-06)
  CandidatoTabs: NavigatorScreenParams<CandidatoTabsParamList> | undefined;
  DetalleVacante: undefined;
  MiCV: undefined;
  DetallePostulacion: undefined;
  // Reclutador: barra inferior y pantallas de detalle (REC-03, REC-04, REC-05)
  ReclutadorTabs: NavigatorScreenParams<ReclutadorTabsParamList> | undefined;
  EditarVacante: undefined;
  Postulados: undefined;
  DetallePostulado: undefined;
};
