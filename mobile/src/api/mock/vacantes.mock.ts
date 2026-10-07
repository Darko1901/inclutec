import type { VacantesServicio } from '../vacantes';
import type { ConsultaRecomendadas, ConsultaVacantes, PaginaVacantes } from '../tipos';
import { CATALOGOS } from './catalogos.datos';
import { exigirSesion, obtenerEstado } from './datos';
import { fallo, simular } from './simulador';
import {
  candidatoDe,
  compatibilidadDe,
  desgloseDeCompatibilidad,
  detalleDeVacante,
  empresaDe,
  esVisibleParaCandidato,
  resumenDeVacante,
} from './vistas';

const TAMANO_MAXIMO = 100;
const MINIMO_BUSQUEDA = 3;
const ORDENES = ['compatibilidad', 'recientes'];

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function lanzarSiHayCampos(campos: Record<string, string>): void {
  if (Object.keys(campos).length > 0) {
    throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
  }
}

function leerPagina(consulta: { page?: number; size?: number }) {
  const page = consulta.page ?? 1;
  const size = consulta.size ?? 20;
  const campos: Record<string, string> = {};
  if (!Number.isInteger(page) || page < 1) campos.page = 'La página empieza en 1.';
  if (!Number.isInteger(size) || size < 1 || size > TAMANO_MAXIMO) {
    campos.size = `El tamaño de página va de 1 a ${TAMANO_MAXIMO}.`;
  }
  lanzarSiHayCampos(campos);
  return { page, size };
}

/** Los filtros numéricos llegan como enteros; cualquier otra cosa es un 422. */
function validarFiltros(consulta: ConsultaVacantes) {
  const campos: Record<string, string> = {};
  const q = consulta.q?.trim();
  if (q !== undefined && q.length < MINIMO_BUSQUEDA) {
    campos.q = `Escribe al menos ${MINIMO_BUSQUEDA} caracteres.`;
  }
  for (const nombre of [
    'modalidad_id',
    'categoria_id',
    'entidad_id',
    'municipio_id',
    'jornada_id',
  ] as const) {
    const valor = consulta[nombre];
    if (valor !== undefined && !Number.isInteger(valor)) campos[nombre] = 'Debe ser un número.';
  }
  const { salario_min: salario, compatibilidad_min: minima } = consulta;
  if (salario !== undefined && !(Number.isFinite(salario) && salario >= 0)) {
    campos.salario_min = 'Debe ser un número mayor o igual a 0.';
  }
  if (minima !== undefined && !(Number.isInteger(minima) && minima >= 0 && minima <= 100)) {
    campos.compatibilidad_min = 'Debe ser un número de 0 a 100.';
  }
  if (consulta.orden !== undefined && !ORDENES.includes(consulta.orden)) {
    campos.orden = 'El orden puede ser «compatibilidad» o «recientes».';
  }
  lanzarSiHayCampos(campos);
  return q;
}

function comoLista(valor: number | number[] | undefined): number[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

export class VacantesMock implements VacantesServicio {
  recomendadas(consulta: ConsultaRecomendadas = {}) {
    return simular(() => {
      const { page, size } = leerPagina(consulta);
      return paginar(listar(), page, size);
    });
  }

  buscar(consulta: ConsultaVacantes = {}) {
    return simular(() => {
      const { page, size } = leerPagina(consulta);
      const q = validarFiltros(consulta);
      return paginar(listar({ ...consulta, q }), page, size);
    });
  }

  detalle(id: number) {
    return simular(() => {
      const usuario = exigirSesion(['candidato']);
      const candidato = candidatoDe(usuario);
      const vacante = obtenerEstado().vacantes.find((v) => v.id === id);
      // Ve las publicadas y aquellas a las que ya se postuló (aunque ya no estén publicadas);
      // los borradores nunca.
      const postulada = obtenerEstado().postulaciones.some(
        (p) => p.candidato_id === candidato.usuario_id && p.vacante_id === id,
      );
      if (!vacante || (!esVisibleParaCandidato(vacante) && !postulada)) throw noEncontrada();
      return detalleDeVacante(vacante, candidato);
    });
  }

  compatibilidad(id: number) {
    return simular(() => {
      const candidato = candidatoDe(exigirSesion(['candidato']));
      const vacante = obtenerEstado().vacantes.find((v) => v.id === id);
      if (!vacante || vacante.estado === 'borrador') throw noEncontrada();
      return desgloseDeCompatibilidad(vacante, candidato);
    });
  }
}

function noEncontrada() {
  return fallo(404, 'no_encontrado', 'La vacante no existe o ya no está disponible.');
}

/** Vacantes publicadas de empresas validadas, filtradas y ordenadas para el candidato de la sesión. */
function listar(consulta: ConsultaVacantes = {}) {
  const candidato = candidatoDe(exigirSesion(['candidato']));
  const texto = consulta.q ? sinAcentos(consulta.q) : null;
  const ajustesPedidos = comoLista(consulta.ajuste_id);

  const filas = obtenerEstado()
    .vacantes.filter(esVisibleParaCandidato)
    .filter((v) => {
      if (texto) {
        const pajar = sinAcentos(
          `${v.titulo} ${v.descripcion} ${empresaDe(v.empresa_id).nombre_comercial}`,
        );
        if (!pajar.includes(texto)) return false;
      }
      if (consulta.modalidad_id !== undefined && v.modalidad_id !== consulta.modalidad_id) {
        return false;
      }
      if (consulta.categoria_id !== undefined && v.categoria_id !== consulta.categoria_id) {
        return false;
      }
      if (consulta.municipio_id !== undefined && v.municipio_id !== consulta.municipio_id) {
        return false;
      }
      if (consulta.entidad_id !== undefined) {
        const municipio = CATALOGOS.municipios.find((m) => m.id === v.municipio_id);
        if (municipio?.entidad_federativa_id !== consulta.entidad_id) return false;
      }
      if (consulta.jornada_id !== undefined && v.jornada_id !== consulta.jornada_id) return false;
      // Solo cuenta el salario que la empresa publica.
      if (consulta.salario_min !== undefined) {
        if (!v.mostrar_salario || (v.salario_max ?? 0) < consulta.salario_min) return false;
      }
      // Declara todos los ajustes pedidos, sean existentes o bajo solicitud.
      return ajustesPedidos.every((id) => v.ajustes.some((a) => a.ajuste_id === id));
    })
    .map((vacante) => ({
      vacante,
      puntaje: compatibilidadDe(candidato, vacante).puntaje_candidato,
      resumen: resumenDeVacante(vacante, candidato),
    }))
    .filter(({ puntaje }) => puntaje >= (consulta.compatibilidad_min ?? 0))
    .filter(({ resumen }) => !consulta.cubre_mis_necesidades || resumen.cubre_mis_necesidades);

  const reciente = (a: (typeof filas)[number], b: (typeof filas)[number]) =>
    (b.vacante.publicada_en ?? '').localeCompare(a.vacante.publicada_en ?? '') ||
    a.vacante.id - b.vacante.id;
  filas.sort(
    consulta.orden === 'recientes' ? reciente : (a, b) => b.puntaje - a.puntaje || reciente(a, b),
  );
  return filas.map(({ resumen }) => resumen);
}

function paginar(items: PaginaVacantes['items'], page: number, size: number): PaginaVacantes {
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, size };
}
