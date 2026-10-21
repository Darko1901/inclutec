import type {
  AjusteRef,
  Compatibilidad,
  CV,
  EmpresaPropia,
  EmpresaPublica,
  EmpresaResumen,
  Entrevista,
  Experiencia,
  Formacion,
  HabilidadCandidato,
  PerfilCandidato,
  PostulacionDetalle,
  PostulacionResumen,
  Usuario,
  VacanteDetalle,
  VacanteReclutador,
  VacanteResumen,
} from '../tipos';
import { calcularCompatibilidad, entradaDeCandidato, entradaDeVacante } from './compatibilidad';
import { CATALOGOS } from './catalogos.datos';
import { obtenerEstado, type UsuarioMock } from './datos';
import {
  aIso,
  type CandidatoMock,
  type EmpresaMock,
  type EntrevistaMock,
  type ExperienciaMock,
  type FormacionMock,
  type PostulacionMock,
  type VacanteMock,
} from './negocio.datos';
import { fallo } from './simulador';

// Arman los objetos del contrato (VacanteResumen, VacanteDetalle, Compatibilidad, PerfilCandidato)
// a partir de los datos del mock: resuelven los catálogos y calculan lo que depende del candidato.

type Catalogo = 'categorias' | 'modalidades' | 'jornadas' | 'tipos-contrato';
type CategoriaAjuste = AjusteRef['categoria'];

export function itemDe(tipo: string, id: number) {
  const item = CATALOGOS[tipo]?.find((registro) => registro.id === id);
  if (!item) throw new Error(`El mock no tiene ${tipo} con id ${id}.`);
  return item;
}

export function refDe(tipo: Catalogo, id: number) {
  return { id, nombre: itemDe(tipo, id).nombre };
}

export function nivelDe(id: number) {
  const { nombre, orden } = itemDe('niveles-educativos', id);
  return { id, nombre, orden: orden ?? 0 };
}

export function municipioDe(id: number) {
  const municipio = itemDe('municipios', id);
  const entidad = itemDe('entidades', municipio.entidad_federativa_id ?? 0);
  return {
    id,
    nombre: municipio.nombre,
    entidad: { id: entidad.id, nombre: entidad.nombre },
  };
}

export function ajusteRefDe(id: number): AjusteRef {
  const ajuste = itemDe('ajustes', id);
  return { id, nombre: ajuste.nombre, categoria: ajuste.categoria as CategoriaAjuste };
}

export function empresaDe(id: number): EmpresaMock {
  const empresa = obtenerEstado().empresas.find((e) => e.id === id);
  if (!empresa) throw new Error(`El mock no tiene la empresa ${id}.`);
  return empresa;
}

/** Perfil de candidato de la sesión; si la cuenta no tiene (no debería pasar) responde 404. */
export function candidatoDe(usuario: UsuarioMock): CandidatoMock {
  const candidato = obtenerEstado().candidatos.find((c) => c.usuario_id === usuario.usuario.id);
  if (!candidato) throw fallo(404, 'no_encontrado', 'No encontramos tu perfil de candidato.');
  return candidato;
}

export function postulacionDe(candidatoId: number, vacanteId: number) {
  return obtenerEstado().postulaciones.find(
    (p) => p.candidato_id === candidatoId && p.vacante_id === vacanteId,
  );
}

/** Lo que ve el candidato en listas y detalle: publicada y de una empresa validada. */
export function esVisibleParaCandidato(vacante: VacanteMock): boolean {
  return vacante.estado === 'publicada' && empresaDe(vacante.empresa_id).estado === 'validada';
}

export function compatibilidadDe(candidato: CandidatoMock, vacante: VacanteMock) {
  return calcularCompatibilidad(entradaDeCandidato(candidato), entradaDeVacante(vacante));
}

/** Sin candidato (reclutador o administrador) no hay compatibilidad ni postulación. */
export function resumenDeVacante(
  vacante: VacanteMock,
  candidato: CandidatoMock | null,
): VacanteResumen {
  const empresa = empresaDe(vacante.empresa_id);
  const compat = candidato ? compatibilidadDe(candidato, vacante) : null;
  return {
    id: vacante.id,
    titulo: vacante.titulo,
    empresa: {
      id: empresa.id,
      nombre_comercial: empresa.nombre_comercial,
      logo_url: empresa.logo_url,
      validada: empresa.estado === 'validada',
    },
    categoria: refDe('categorias', vacante.categoria_id),
    modalidad: refDe('modalidades', vacante.modalidad_id),
    jornada: refDe('jornadas', vacante.jornada_id),
    municipio: municipioDe(vacante.municipio_id),
    salario: vacante.mostrar_salario
      ? { min: vacante.salario_min, max: vacante.salario_max }
      : null,
    compatibilidad: compat?.puntaje_candidato ?? null,
    ajustes: vacante.ajustes.map(({ ajuste_id, tipo }) => ({ ...ajusteRefDe(ajuste_id), tipo })),
    cubre_mis_necesidades: compat ? compat.necesidades_no_cubiertas.length === 0 : false,
    publicada_en: vacante.publicada_en ?? vacante.actualizado_en,
    postulacion_id: candidato
      ? (postulacionDe(candidato.usuario_id, vacante.id)?.id ?? null)
      : null,
  };
}

function armarDetalle(
  vacante: VacanteMock,
  extras: Pick<VacanteDetalle, 'postulacion_id' | 'postulados'>,
  mostrarSalario: boolean,
): VacanteDetalle {
  const empresa = empresaDe(vacante.empresa_id);
  return {
    id: vacante.id,
    titulo: vacante.titulo,
    descripcion: vacante.descripcion,
    empresa: {
      id: empresa.id,
      nombre_comercial: empresa.nombre_comercial,
      logo_url: empresa.logo_url,
      validada: empresa.estado === 'validada',
    },
    categoria: refDe('categorias', vacante.categoria_id),
    modalidad: refDe('modalidades', vacante.modalidad_id),
    jornada: refDe('jornadas', vacante.jornada_id),
    tipo_contrato: refDe('tipos-contrato', vacante.tipo_contrato_id),
    municipio: municipioDe(vacante.municipio_id),
    direccion: vacante.direccion,
    plazas: vacante.plazas,
    salario:
      mostrarSalario || vacante.mostrar_salario
        ? { min: vacante.salario_min, max: vacante.salario_max }
        : null,
    mostrar_salario: vacante.mostrar_salario,
    nivel_educativo: vacante.nivel_educativo_id ? nivelDe(vacante.nivel_educativo_id) : null,
    experiencia_anios: vacante.experiencia_anios,
    habilidades: vacante.habilidades.map(({ habilidad_id, obligatoria }) => ({
      id: habilidad_id,
      nombre: itemDe('habilidades', habilidad_id).nombre,
      obligatoria,
    })),
    ajustes: vacante.ajustes.map(({ ajuste_id, tipo }) => ({
      ...ajusteRefDe(ajuste_id),
      descripcion: itemDe('ajustes', ajuste_id).descripcion ?? '',
      tipo,
    })),
    sin_condiciones_accesibilidad: vacante.sin_condiciones_accesibilidad,
    notas_accesibilidad: vacante.notas_accesibilidad,
    estado: vacante.estado,
    motivo_estado: null,
    publicada_en: vacante.publicada_en,
    actualizado_en: vacante.actualizado_en,
    ...extras,
  };
}

export function detalleDeVacante(vacante: VacanteMock, candidato: CandidatoMock): VacanteDetalle {
  // Para el candidato el salario es null si la empresa no lo muestra.
  return armarDetalle(
    vacante,
    {
      postulacion_id: postulacionDe(candidato.usuario_id, vacante.id)?.id ?? null,
      postulados: null,
    },
    false,
  );
}

/** Postulaciones de la vacante que cuentan como postulados (las retiradas ya no). */
export function postuladosDe(vacanteId: number) {
  return obtenerEstado().postulaciones.filter(
    (p) => p.vacante_id === vacanteId && p.estado !== 'retirada',
  );
}

/** El reclutador dueño ve el salario aunque no se muestre a los candidatos, y los postulados. */
export function detalleParaReclutador(vacante: VacanteMock): VacanteDetalle {
  return armarDetalle(
    vacante,
    { postulacion_id: null, postulados: postuladosDe(vacante.id).length },
    true,
  );
}

export function resumenParaReclutador(vacante: VacanteMock): VacanteReclutador {
  const postulados = postuladosDe(vacante.id);
  return {
    id: vacante.id,
    titulo: vacante.titulo,
    estado: vacante.estado,
    modalidad: refDe('modalidades', vacante.modalidad_id),
    postulados: postulados.length,
    nuevas: postulados.filter((p) => p.estado === 'postulada').length,
    publicada_en: vacante.publicada_en,
    actualizado_en: vacante.actualizado_en,
  };
}

export function desgloseDeCompatibilidad(
  vacante: VacanteMock,
  candidato: CandidatoMock,
): Compatibilidad {
  const compat = compatibilidadDe(candidato, vacante);
  const habilidad = (id: number) => ({ id, nombre: itemDe('habilidades', id).nombre });
  return {
    puntaje: compat.puntaje_candidato,
    componentes: { h: compat.h, a: compat.a, m: compat.m, f: compat.f },
    habilidades: {
      obligatorias_cumplidas: compat.obligatorias_cumplidas.map(habilidad),
      obligatorias_faltantes: compat.obligatorias_faltantes.map(habilidad),
      deseables_cumplidas: compat.deseables_cumplidas.map(habilidad),
      deseables_faltantes: compat.deseables_faltantes.map(habilidad),
    },
    necesidades: {
      cubiertas: compat.necesidades_cubiertas.map((id) => ({
        ...ajusteRefDe(id),
        tipo: vacante.ajustes.find((a) => a.ajuste_id === id)?.tipo ?? 'existente',
      })),
      no_cubiertas: compat.necesidades_no_cubiertas.map(ajusteRefDe),
    },
    modalidad: {
      vacante: refDe('modalidades', vacante.modalidad_id),
      coincide: compat.modalidad_coincide,
    },
    formacion: {
      requerida: vacante.nivel_educativo_id ? nivelDe(vacante.nivel_educativo_id) : null,
      cumple: compat.formacion_cumple,
    },
    calculado_en: aIso(new Date()),
  };
}

type SeccionPendiente = PerfilCandidato['secciones_pendientes'][number];

// Puntos de cada sección (sección 2 del contrato, «Perfil del candidato»).
const PUNTOS: Record<SeccionPendiente, number> = {
  datos_personales: 20,
  resumen: 10,
  foto: 10,
  preferencias: 15,
  formacion: 20,
  experiencia: 10,
  habilidades: 15,
};

export interface AnalisisPerfil {
  completitud: number;
  secciones_pendientes: SeccionPendiente[];
  perfil_minimo: boolean;
  /** Lo que falta para postularse, con el mismo nombre de campo que usa el 422 del contrato. */
  faltantes_minimo: Record<string, string>;
}

export function analizarPerfil(usuario: UsuarioMock, candidato: CandidatoMock): AnalisisPerfil {
  const { nombre, apellidos, telefono } = usuario.usuario;
  const cumple: Record<SeccionPendiente, boolean> = {
    datos_personales: Boolean(nombre && apellidos && telefono && candidato.municipio_id),
    resumen: Boolean(candidato.resumen),
    foto: Boolean(candidato.foto_url),
    preferencias: candidato.modalidad_ids.length > 0 && candidato.jornada_id !== null,
    formacion: candidato.formaciones.length > 0,
    experiencia: candidato.experiencias.length > 0,
    habilidades: candidato.habilidades.length > 0,
  };
  const pendientes = (Object.keys(PUNTOS) as SeccionPendiente[]).filter((s) => !cumple[s]);
  const faltantes: Record<string, string> = {};
  if (!nombre) faltantes.nombre = 'Escribe tu nombre.';
  if (!candidato.municipio_id) faltantes.municipio_id = 'Elige tu municipio.';
  if (candidato.habilidades.length === 0) {
    faltantes.habilidades = 'Agrega al menos una habilidad.';
  }
  if (candidato.formaciones.length === 0) {
    faltantes.formaciones = 'Agrega al menos una formación académica.';
  }
  return {
    completitud: 100 - pendientes.reduce((suma, s) => suma + PUNTOS[s], 0),
    secciones_pendientes: pendientes,
    perfil_minimo: Object.keys(faltantes).length === 0,
    faltantes_minimo: faltantes,
  };
}

export function perfilDeCandidato(usuario: UsuarioMock, candidato: CandidatoMock): PerfilCandidato {
  const { id, nombre, apellidos, correo, telefono } = usuario.usuario;
  const analisis = analizarPerfil(usuario, candidato);
  const conConsentimiento = candidato.consentimiento_sensibles_en !== null;
  return {
    usuario: { id, nombre, apellidos, correo, telefono },
    municipio: candidato.municipio_id ? municipioDe(candidato.municipio_id) : null,
    jornada: candidato.jornada_id ? refDe('jornadas', candidato.jornada_id) : null,
    resumen: candidato.resumen,
    foto_url: candidato.foto_url,
    disponible_reubicacion: candidato.disponible_reubicacion,
    modalidades: candidato.modalidad_ids.map((m) => refDe('modalidades', m)),
    categorias: candidato.categoria_ids.map((c) => refDe('categorias', c)),
    compartir_ajustes: candidato.compartir_ajustes,
    consentimiento_sensibles_en: candidato.consentimiento_sensibles_en,
    // Sin consentimiento el contrato manda `necesidades` vacío.
    necesidades: conConsentimiento ? candidato.necesidad_ids.map(ajusteRefDe) : [],
    nota_ajustes: conConsentimiento ? candidato.nota_ajustes : null,
    completitud: analisis.completitud,
    secciones_pendientes: analisis.secciones_pendientes,
    perfil_minimo: analisis.perfil_minimo,
    actualizado_en: candidato.actualizado_en,
  };
}

export const ESTADOS_ACTIVOS: PostulacionMock['estado'][] = [
  'postulada',
  'en_revision',
  'entrevista',
];
const HORAS_CANCELACION = 24;
const HORA_MS = 3600 * 1000;

export function horarioDe(id: number) {
  const horario = obtenerEstado().horarios.find((h) => h.id === id);
  if (!horario) throw new Error(`El mock no tiene el horario ${id}.`);
  return horario;
}

/** Entrevista vigente de la postulación (agendada o realizada), si existe. */
export function entrevistaVigenteDe(postulacionId: number): EntrevistaMock | undefined {
  return obtenerEstado().entrevistas.find(
    (e) => e.postulacion_id === postulacionId && ['agendada', 'realizada'].includes(e.estado),
  );
}

export function vistaDeEntrevista(entrevista: EntrevistaMock): Entrevista {
  const horario = horarioDe(entrevista.horario_id);
  const vacante = obtenerEstado().vacantes.find((v) => v.id === horario.vacante_id)!;
  const empresa = empresaDe(vacante.empresa_id);
  const inicio = new Date(horario.inicio).getTime();
  return {
    id: entrevista.id,
    estado: entrevista.estado,
    inicio: horario.inicio,
    fin: aIso(new Date(inicio + horario.duracion_min * 60000)),
    duracion_min: horario.duracion_min,
    liga: horario.liga,
    // Solo se puede cancelar una entrevista agendada y con al menos 24 h de anticipación.
    puede_cancelar:
      entrevista.estado === 'agendada' && inicio - Date.now() >= HORAS_CANCELACION * HORA_MS,
    vacante: { id: vacante.id, titulo: vacante.titulo },
    empresa: { id: empresa.id, nombre_comercial: empresa.nombre_comercial },
    creado_en: entrevista.creado_en,
  };
}

function vacanteDePostulacion(postulacion: PostulacionMock) {
  const vacante = obtenerEstado().vacantes.find((v) => v.id === postulacion.vacante_id)!;
  const empresa = empresaDe(vacante.empresa_id);
  return {
    id: vacante.id,
    titulo: vacante.titulo,
    empresa: {
      id: empresa.id,
      nombre_comercial: empresa.nombre_comercial,
      logo_url: empresa.logo_url,
    },
  };
}

export function detalleDePostulacion(postulacion: PostulacionMock): PostulacionDetalle {
  const entrevista = entrevistaVigenteDe(postulacion.id);
  return {
    id: postulacion.id,
    vacante: vacanteDePostulacion(postulacion),
    estado: postulacion.estado,
    mensaje: postulacion.mensaje,
    comparte_ajustes: postulacion.comparte_ajustes,
    creado_en: postulacion.creado_en,
    actualizado_en: postulacion.actualizado_en,
    historial: postulacion.historial.map((evento) => ({ ...evento })),
    entrevista: entrevista ? vistaDeEntrevista(entrevista) : null,
    puede_retirar: ESTADOS_ACTIVOS.includes(postulacion.estado),
  };
}

export function resumenDePostulacion(postulacion: PostulacionMock): PostulacionResumen {
  const entrevista = entrevistaVigenteDe(postulacion.id);
  return {
    id: postulacion.id,
    vacante: vacanteDePostulacion(postulacion),
    estado: postulacion.estado,
    creado_en: postulacion.creado_en,
    actualizado_en: postulacion.actualizado_en,
    // Solo cuenta la entrevista que sigue agendada.
    entrevista_inicio:
      entrevista?.estado === 'agendada' ? horarioDe(entrevista.horario_id).inicio : null,
  };
}

export function publicadasDeEmpresa(empresaId: number): VacanteMock[] {
  return obtenerEstado().vacantes.filter(
    (v) => v.empresa_id === empresaId && v.estado === 'publicada',
  );
}

export function resumenDeEmpresa(empresa: EmpresaMock): EmpresaResumen {
  return {
    id: empresa.id,
    nombre_comercial: empresa.nombre_comercial,
    logo_url: empresa.logo_url,
    sector: refDeSector(empresa.sector_id),
    tamano_empresa: tamanoDe(empresa.tamano_empresa_id),
    municipio: municipioDe(empresa.municipio_id),
    vacantes_publicadas: publicadasDeEmpresa(empresa.id).length,
  };
}

export function fichaDeEmpresa(
  empresa: EmpresaMock,
  candidato: CandidatoMock | null,
): EmpresaPublica {
  return {
    id: empresa.id,
    nombre_comercial: empresa.nombre_comercial,
    logo_url: empresa.logo_url,
    sector: refDeSector(empresa.sector_id),
    tamano_empresa: tamanoDe(empresa.tamano_empresa_id),
    municipio: municipioDe(empresa.municipio_id),
    descripcion: empresa.descripcion,
    sitio_web: empresa.sitio_web,
    practicas_inclusion: empresa.practicas_inclusion,
    vacantes: publicadasDeEmpresa(empresa.id).map((v) => resumenDeVacante(v, candidato)),
  };
}

export function vistaDeEmpresaPropia(empresa: EmpresaMock): EmpresaPropia {
  return {
    id: empresa.id,
    razon_social: empresa.razon_social,
    nombre_comercial: empresa.nombre_comercial,
    rfc: empresa.rfc,
    sector: refDeSector(empresa.sector_id),
    tamano_empresa: tamanoDe(empresa.tamano_empresa_id),
    municipio: municipioDe(empresa.municipio_id),
    direccion: empresa.direccion,
    descripcion: empresa.descripcion,
    sitio_web: empresa.sitio_web,
    logo_url: empresa.logo_url,
    practicas_inclusion: empresa.practicas_inclusion,
    documento_url: empresa.documento_url,
    estado: empresa.estado,
    motivo_estado: empresa.motivo_estado,
    validada_en: empresa.validada_en,
    datos_fiscales_editables: empresa.estado !== 'validada',
  };
}

function refDeSector(id: number) {
  return { id, nombre: itemDe('sectores', id).nombre };
}

function tamanoDe(id: number) {
  const { nombre, rango } = itemDe('tamanos-empresa', id);
  return { id, nombre, rango: rango ?? '' };
}

// Experiencias de la más reciente a la más antigua: primero el trabajo actual y luego por fin.
export function claveReciente(experiencia: ExperienciaMock): string {
  return `${experiencia.actual ? '9999-12-31' : (experiencia.fecha_fin ?? '')}|${experiencia.fecha_inicio}`;
}

export const vistaExperiencia = (e: ExperienciaMock): Experiencia => ({ ...e });

export function vistaFormacion(f: FormacionMock): Formacion {
  return {
    id: f.id,
    nivel_educativo: nivelDe(f.nivel_educativo_id),
    institucion: f.institucion,
    carrera: f.carrera,
    estado: f.estado,
    fecha_inicio: f.fecha_inicio,
    fecha_fin: f.fecha_fin,
  };
}

export const vistaHabilidades = (candidato: CandidatoMock): HabilidadCandidato[] =>
  candidato.habilidades.map(({ habilidad_id, nivel }) => ({
    id: habilidad_id,
    nombre: itemDe('habilidades', habilidad_id).nombre,
    nivel,
  }));

/** CV tal como lo ve una empresa (sin necesidades de ajuste); el contacto solo si se indica. */
export function cvDeCandidato(
  usuario: Pick<Usuario, 'id' | 'nombre' | 'apellidos' | 'correo' | 'telefono'>,
  candidato: CandidatoMock,
  conContacto: boolean,
): CV {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    foto_url: candidato.foto_url,
    municipio: candidato.municipio_id ? municipioDe(candidato.municipio_id) : null,
    resumen: candidato.resumen,
    modalidades: candidato.modalidad_ids.map((m) => refDe('modalidades', m)),
    experiencias: [...candidato.experiencias]
      .sort((a, b) => claveReciente(b).localeCompare(claveReciente(a)))
      .map(vistaExperiencia),
    formaciones: [...candidato.formaciones]
      .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? ''))
      .map(vistaFormacion),
    habilidades: vistaHabilidades(candidato),
    correo: conContacto ? usuario.correo : null,
    telefono: conContacto ? usuario.telefono : null,
  };
}
