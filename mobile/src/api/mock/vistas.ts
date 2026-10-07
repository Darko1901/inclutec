import type {
  AjusteRef,
  Compatibilidad,
  PerfilCandidato,
  VacanteDetalle,
  VacanteResumen,
} from '../tipos';
import { calcularCompatibilidad, entradaDeCandidato, entradaDeVacante } from './compatibilidad';
import { CATALOGOS } from './catalogos.datos';
import { obtenerEstado, type UsuarioMock } from './datos';
import { aIso, type CandidatoMock, type EmpresaMock, type VacanteMock } from './negocio.datos';
import { fallo } from './simulador';

// Arman los objetos del contrato (VacanteResumen, VacanteDetalle, Compatibilidad, PerfilCandidato)
// a partir de los datos del mock: resuelven los catálogos y calculan lo que depende del candidato.

type Catalogo = 'categorias' | 'modalidades' | 'jornadas' | 'tipos-contrato';
type CategoriaAjuste = AjusteRef['categoria'];

function itemDe(tipo: string, id: number) {
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

export function resumenDeVacante(vacante: VacanteMock, candidato: CandidatoMock): VacanteResumen {
  const empresa = empresaDe(vacante.empresa_id);
  const compat = compatibilidadDe(candidato, vacante);
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
    compatibilidad: compat.puntaje_candidato,
    ajustes: vacante.ajustes.map(({ ajuste_id, tipo }) => ({ ...ajusteRefDe(ajuste_id), tipo })),
    cubre_mis_necesidades: compat.necesidades_no_cubiertas.length === 0,
    publicada_en: vacante.publicada_en ?? vacante.actualizado_en,
    postulacion_id: postulacionDe(candidato.usuario_id, vacante.id)?.id ?? null,
  };
}

export function detalleDeVacante(vacante: VacanteMock, candidato: CandidatoMock): VacanteDetalle {
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
    // Para el candidato el salario es null si la empresa no lo muestra.
    salario: vacante.mostrar_salario
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
    postulacion_id: postulacionDe(candidato.usuario_id, vacante.id)?.id ?? null,
    postulados: null,
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
    experiencia: candidato.experiencias > 0,
    habilidades: candidato.habilidad_ids.length > 0,
  };
  const pendientes = (Object.keys(PUNTOS) as SeccionPendiente[]).filter((s) => !cumple[s]);
  const faltantes: Record<string, string> = {};
  if (!nombre) faltantes.nombre = 'Escribe tu nombre.';
  if (!candidato.municipio_id) faltantes.municipio_id = 'Elige tu municipio.';
  if (candidato.habilidad_ids.length === 0) {
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
