import type { NavigatorScreenParams } from '@react-navigation/native';

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
  // `publicar_vacante_id` abre «Publicar horarios» con esa vacante (desde REC-05).
  Agenda: { entrevista_id?: number; publicar_vacante_id?: number } | undefined;
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
  // Candidato: barra inferior y pantallas de detalle (CAN-02, CAN-04, CAN-06, CAN-07b)
  CandidatoTabs: NavigatorScreenParams<CandidatoTabsParamList> | undefined;
  DetalleVacante: { id: number };
  // `pestana` llega desde CAN-03 al tocar una sección pendiente del perfil.
  MiCV: { pestana?: 'experiencia' | 'formacion' | 'habilidades' } | undefined;
  DetallePostulacion: { id: number };
  // Ficha de una empresa (CAN-07b): se abre desde el directorio, CAN-02 y CAN-06.
  FichaEmpresa: { id: number };
  // Reclutador: barra inferior y pantallas de detalle (REC-03, REC-04, REC-05)
  ReclutadorTabs: NavigatorScreenParams<ReclutadorTabsParamList> | undefined;
  // Sin `vacante_id` se crea una vacante; con él se edita esa vacante (REC-02 → REC-03).
  EditarVacante: { vacante_id?: number } | undefined;
  // REC-04: postulados de una vacante.
  Postulados: { vacante_id: number };
  DetallePostulado: { id: number };
};
