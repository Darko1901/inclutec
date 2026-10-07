import type { Compatibilidad, PerfilCandidato } from '../../../api';

export type NivelLinea = 'bien' | 'parcial' | 'mal' | 'neutro';

export interface LineaCompatibilidad {
  clave: 'habilidades' | 'necesidades' | 'modalidad' | 'formacion';
  nivel: NivelLinea;
  texto: string;
}

/** «SQL», «SQL y Redes», «SQL, Redes y Excel». */
function unir(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

const nivelPorAvance = (cubiertas: number, faltantes: number): NivelLinea =>
  faltantes === 0 ? 'bien' : cubiertas > 0 ? 'parcial' : 'mal';

/**
 * Las cuatro líneas de la tarjeta de compatibilidad, en texto («Habilidades: 3 de 4 obligatorias ·
 * te falta SQL»). El nivel decide el ícono; el significado ya está en las palabras.
 */
export function lineasCompatibilidad(desglose: Compatibilidad): LineaCompatibilidad[] {
  const { habilidades, necesidades, formacion, componentes } = desglose;

  const cumplidas = habilidades.obligatorias_cumplidas.length;
  const faltantes = habilidades.obligatorias_faltantes.map((h) => h.nombre);
  const textoHabilidades =
    cumplidas + faltantes.length === 0
      ? 'Habilidades: la vacante no pide habilidades obligatorias'
      : `Habilidades: ${cumplidas} de ${cumplidas + faltantes.length} obligatorias` +
        (faltantes.length === 0
          ? ''
          : ` · ${faltantes.length === 1 ? 'te falta' : 'te faltan'} ${unir(faltantes)}`);

  const cubiertas = necesidades.cubiertas.length;
  const noCubiertas = necesidades.no_cubiertas.map((n) => n.nombre);
  const hayNecesidades = cubiertas + noCubiertas.length > 0;
  const textoNecesidades = hayNecesidades
    ? `Tus necesidades de ajuste: ${cubiertas} de ${cubiertas + noCubiertas.length} cubiertas` +
      (noCubiertas.length === 0 ? '' : ` · no cubre ${unir(noCubiertas)}`)
    : 'Tus necesidades de ajuste: no tienes necesidades registradas que comparar';

  const textoModalidad =
    componentes.m === 1
      ? 'Modalidad: coincide'
      : componentes.m === 0.5
        ? 'Modalidad: la vacante es híbrida y no coincide del todo con tus preferencias'
        : 'Modalidad: no coincide con tus preferencias';

  const requerida = formacion.requerida?.nombre;
  const textoFormacion =
    formacion.cumple === 'si'
      ? requerida
        ? 'Formación: cumple'
        : 'Formación: la vacante no pide formación mínima'
      : formacion.cumple === 'cursando'
        ? `Formación: la estás cursando${requerida ? ` (se pide ${requerida})` : ''}`
        : `Formación: no cumple${requerida ? ` (se pide ${requerida})` : ''}`;

  return [
    {
      clave: 'habilidades',
      nivel:
        cumplidas + faltantes.length === 0 ? 'neutro' : nivelPorAvance(cumplidas, faltantes.length),
      texto: textoHabilidades,
    },
    {
      clave: 'necesidades',
      nivel: hayNecesidades ? nivelPorAvance(cubiertas, noCubiertas.length) : 'neutro',
      texto: textoNecesidades,
    },
    {
      clave: 'modalidad',
      nivel: componentes.m === 1 ? 'bien' : componentes.m === 0.5 ? 'parcial' : 'mal',
      texto: textoModalidad,
    },
    {
      clave: 'formacion',
      nivel:
        formacion.cumple === 'si' ? 'bien' : formacion.cumple === 'cursando' ? 'parcial' : 'mal',
      texto: textoFormacion,
    },
  ];
}

/** Qué falta para postularse, según las secciones pendientes del perfil; null si ya puede. */
export function explicacionPerfilIncompleto(perfil: PerfilCandidato): string | null {
  if (perfil.perfil_minimo) return null;
  const pendientes = perfil.secciones_pendientes;
  const faltan: string[] = [];
  if (pendientes.includes('datos_personales'))
    faltan.push('tus datos personales (nombre y municipio)');
  if (pendientes.includes('habilidades')) faltan.push('al menos una habilidad');
  if (pendientes.includes('formacion')) faltan.push('al menos una formación académica');
  return faltan.length > 0
    ? `Para postularte completa tu perfil: te falta ${unir(faltan)}.`
    : 'Para postularte completa tu perfil.';
}

export function textoExperiencia(anios: number): string {
  if (anios <= 0) return 'No se requiere experiencia previa';
  return `${anios} ${anios === 1 ? 'año' : 'años'} de experiencia`;
}

export function textoPlazas(plazas: number): string {
  return `${plazas} ${plazas === 1 ? 'plaza' : 'plazas'}`;
}
