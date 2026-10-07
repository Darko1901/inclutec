import { CATALOGOS } from './catalogos.datos';
import type { CandidatoMock, EstadoFormacion, VacanteMock } from './negocio.datos';

// Motor de compatibilidad con las reglas de la sección 2 del contrato (y de
// db/pruebas/P002__compatibilidad.sql). Es una función pura: no lee el estado del mock.

export type CumpleFormacion = 'si' | 'cursando' | 'no';

export interface EntradaCandidato {
  habilidad_ids: number[];
  /** Vacío si el candidato no registró necesidades o no dio su consentimiento. */
  necesidad_ids: number[];
  modalidad_ids: number[];
  formaciones: { nivel_educativo_id: number; estado: EstadoFormacion }[];
}

export interface EntradaVacante {
  modalidad_id: number;
  nivel_educativo_id: number | null;
  habilidades: { habilidad_id: number; obligatoria: boolean }[];
  /** Ajustes que declara la vacante, sean existentes o bajo solicitud. */
  ajuste_ids: number[];
}

export interface ResultadoCompatibilidad {
  /** Componentes de 0 a 1, redondeados a 3 decimales como en la tabla `compatibilidad`. */
  h: number;
  a: number;
  m: number;
  f: number;
  puntaje_candidato: number;
  puntaje_reclutador: number;
  obligatorias_cumplidas: number[];
  obligatorias_faltantes: number[];
  deseables_cumplidas: number[];
  deseables_faltantes: number[];
  necesidades_cubiertas: number[];
  necesidades_no_cubiertas: number[];
  modalidad_coincide: boolean;
  formacion_cumple: CumpleFormacion;
}

const MODALIDAD_HIBRIDA = CATALOGOS.modalidades.find((m) => m.nombre === 'Híbrido')?.id;

function ordenDelNivel(id: number): number {
  return CATALOGOS['niveles-educativos'].find((n) => n.id === id)?.orden ?? 0;
}

const redondear3 = (valor: number) => Math.round(valor * 1000) / 1000;
// El épsilon evita que un 56.4999999… por error de coma flotante se redondee hacia abajo.
const redondearPuntaje = (valor: number) => Math.round(valor + 1e-9);

export function calcularCompatibilidad(
  candidato: EntradaCandidato,
  vacante: EntradaVacante,
): ResultadoCompatibilidad {
  const tiene = new Set(candidato.habilidad_ids);
  const obligatorias = vacante.habilidades.filter((h) => h.obligatoria).map((h) => h.habilidad_id);
  const deseables = vacante.habilidades.filter((h) => !h.obligatoria).map((h) => h.habilidad_id);
  const obligatoriasCumplidas = obligatorias.filter((id) => tiene.has(id));
  const deseablesCumplidas = deseables.filter((id) => tiene.has(id));
  const denominadorH = 2 * obligatorias.length + deseables.length;
  // Una vacante sin requisitos no deja nada por cumplir (el API no deja publicarla así).
  const h =
    denominadorH === 0
      ? 1
      : (2 * obligatoriasCumplidas.length + deseablesCumplidas.length) / denominadorH;

  const declarados = new Set(vacante.ajuste_ids);
  const cubiertas = candidato.necesidad_ids.filter((id) => declarados.has(id));
  const a =
    candidato.necesidad_ids.length === 0 ? 1 : cubiertas.length / candidato.necesidad_ids.length;

  const coincide = candidato.modalidad_ids.includes(vacante.modalidad_id);
  const m = coincide ? 1 : vacante.modalidad_id === MODALIDAD_HIBRIDA ? 0.5 : 0;

  let formacion: CumpleFormacion = 'si';
  if (vacante.nivel_educativo_id !== null) {
    const minimo = ordenDelNivel(vacante.nivel_educativo_id);
    const alcanza = (estado: EstadoFormacion) =>
      candidato.formaciones.some(
        (f) => f.estado === estado && ordenDelNivel(f.nivel_educativo_id) >= minimo,
      );
    formacion = alcanza('concluida') ? 'si' : alcanza('en_curso') ? 'cursando' : 'no';
  }
  const f = formacion === 'si' ? 1 : formacion === 'cursando' ? 0.5 : 0;

  return {
    h: redondear3(h),
    a: redondear3(a),
    m,
    f,
    puntaje_candidato: redondearPuntaje(100 * (0.4 * h + 0.3 * a + 0.15 * m + 0.15 * f)),
    puntaje_reclutador: redondearPuntaje((100 * (0.4 * h + 0.15 * m + 0.15 * f)) / 0.7),
    obligatorias_cumplidas: obligatoriasCumplidas,
    obligatorias_faltantes: obligatorias.filter((id) => !tiene.has(id)),
    deseables_cumplidas: deseablesCumplidas,
    deseables_faltantes: deseables.filter((id) => !tiene.has(id)),
    necesidades_cubiertas: cubiertas,
    necesidades_no_cubiertas: candidato.necesidad_ids.filter((id) => !declarados.has(id)),
    modalidad_coincide: coincide,
    formacion_cumple: formacion,
  };
}

/** Sin consentimiento no hay necesidades que contar (al revocarlo se borran). */
export function entradaDeCandidato(candidato: CandidatoMock): EntradaCandidato {
  return {
    habilidad_ids: candidato.habilidad_ids,
    necesidad_ids: candidato.consentimiento_sensibles_en ? candidato.necesidad_ids : [],
    modalidad_ids: candidato.modalidad_ids,
    formaciones: candidato.formaciones,
  };
}

export function entradaDeVacante(vacante: VacanteMock): EntradaVacante {
  return {
    modalidad_id: vacante.modalidad_id,
    nivel_educativo_id: vacante.nivel_educativo_id,
    habilidades: vacante.habilidades,
    ajuste_ids: vacante.ajustes.map((ajuste) => ajuste.ajuste_id),
  };
}
