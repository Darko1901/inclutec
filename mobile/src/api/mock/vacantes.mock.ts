import type { VacantesServicio } from '../vacantes';
import type {
  ConsultaRecomendadas,
  ConsultaVacantes,
  EstadoVacante,
  VacanteDetalle,
  VacanteEntrada,
  VacanteGuardada,
} from '../tipos';
import { CATALOGOS } from './catalogos.datos';
import { exigirSesion, obtenerEstado } from './datos';
import { empresaDeLaSesion } from './empresas.mock';
import { aIso, type VacanteMock } from './negocio.datos';
import { exigirVacanteCompleta, lanzarSiVacanteInvalida } from './vacantes.validacion';
import { lanzarSiHayCampos, leerPagina, paginar } from './paginacion';
import { fallo, simular } from './simulador';
import {
  candidatoDe,
  compatibilidadDe,
  desgloseDeCompatibilidad,
  detalleDeVacante,
  detalleParaReclutador,
  postuladosDe,
  empresaDe,
  esVisibleParaCandidato,
  resumenDeVacante,
} from './vistas';

const MINIMO_BUSQUEDA = 3;
const ESTADOS_ACTIVOS = ['postulada', 'en_revision', 'entrevista'];

/** Transiciones que puede pedir el reclutador (sección 2 del contrato). */
const TRANSICIONES: Record<EstadoVacante, EstadoVacante[]> = {
  borrador: ['publicada'],
  publicada: ['pausada', 'cerrada'],
  pausada: ['publicada', 'cerrada'],
  cerrada: [],
  suspendida: [],
};
const ORDENES = ['compatibilidad', 'recientes'];

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
      const usuario = exigirSesion(['candidato', 'reclutador']);
      if (usuario.usuario.rol === 'reclutador') {
        return detalleParaReclutador(vacanteDeMiEmpresa(id));
      }
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

  crear(datos: VacanteEntrada) {
    return simular((): VacanteGuardada => {
      const empresa = empresaDeLaSesion();
      lanzarSiVacanteInvalida(datos);
      exigirPublicable(datos, empresa.estado);
      const estado = obtenerEstado();
      const ahora = aIso(new Date());
      const vacante: VacanteMock = {
        id: estado.siguienteIdVacante++,
        empresa_id: empresa.id,
        ...desdeEntrada(datos),
        estado: datos.estado,
        publicada_en: datos.estado === 'publicada' ? ahora : null,
        actualizado_en: ahora,
      };
      estado.vacantes.push(vacante);
      return { vacante: detalleParaReclutador(vacante), postulados_notificados: 0 };
    });
  }

  editar(id: number, datos: VacanteEntrada) {
    return simular((): VacanteGuardada => {
      const empresa = empresaDeLaSesion();
      const vacante = vacanteDeMiEmpresa(id);
      if (vacante.estado === 'suspendida' || vacante.estado === 'cerrada') {
        throw fallo(
          409,
          'estado_invalido',
          vacante.estado === 'suspendida'
            ? 'La vacante está suspendida por el administrador y no se puede editar.'
            : 'La vacante está cerrada y no se puede editar. Puedes duplicarla como borrador.',
        );
      }
      lanzarSiVacanteInvalida(datos);
      // Una vacante ya publicada o pausada se valida como publicable aunque lleguen como borrador.
      exigirPublicable(
        vacante.estado === 'borrador' ? datos : { ...datos, estado: 'publicada' },
        empresa.estado,
      );

      const antes = firmaDeRequisitos(vacante);
      Object.assign(vacante, desdeEntrada(datos));
      // Publicar o pausar es cosa de PATCH /estado: al editar solo un borrador puede publicarse.
      if (vacante.estado === 'borrador' && datos.estado === 'publicada') {
        vacante.estado = 'publicada';
        vacante.publicada_en = aIso(new Date());
      }
      vacante.actualizado_en = aIso(new Date());

      // La compatibilidad se calcula al consultarla con el motor del mock, así que ya refleja los
      // cambios; solo se cuenta a quién se avisa (los postulados con proceso en curso).
      const cambiaron = antes !== firmaDeRequisitos(vacante);
      const avisados = cambiaron
        ? postuladosDe(vacante.id).filter((p) => ESTADOS_ACTIVOS.includes(p.estado)).length
        : 0;
      return { vacante: detalleParaReclutador(vacante), postulados_notificados: avisados };
    });
  }

  cambiarEstado(
    id: number,
    estadoNuevo: Extract<EstadoVacante, 'publicada' | 'pausada' | 'cerrada'>,
  ) {
    return simular((): VacanteDetalle => {
      const empresa = empresaDeLaSesion();
      const vacante = vacanteDeMiEmpresa(id);
      if (!['publicada', 'pausada', 'cerrada'].includes(estadoNuevo)) {
        lanzarSiHayCampos({ estado: 'El estado puede ser publicada, pausada o cerrada.' });
      }
      if (!TRANSICIONES[vacante.estado].includes(estadoNuevo)) {
        throw fallo(
          409,
          'transicion_invalida',
          `No se puede pasar una vacante de ${vacante.estado} a ${estadoNuevo}.`,
        );
      }
      if (estadoNuevo === 'publicada') {
        if (empresa.estado !== 'validada') throw empresaNoValidada();
        exigirVacanteCompleta({
          habilidades: vacante.habilidades,
          direccion: vacante.direccion,
          modalidad_id: vacante.modalidad_id,
          ajustes: vacante.ajustes,
          sin_condiciones_accesibilidad: vacante.sin_condiciones_accesibilidad,
        });
        vacante.publicada_en ??= aIso(new Date());
      }
      vacante.estado = estadoNuevo;
      vacante.actualizado_en = aIso(new Date());
      return detalleParaReclutador(vacante);
    });
  }

  duplicar(id: number) {
    return simular((): VacanteDetalle => {
      const original = vacanteDeMiEmpresa(id);
      const estado = obtenerEstado();
      const sufijo = ' (copia)';
      const copia: VacanteMock = {
        ...original,
        id: estado.siguienteIdVacante++,
        titulo: `${original.titulo.slice(0, 120 - sufijo.length)}${sufijo}`,
        estado: 'borrador',
        publicada_en: null,
        actualizado_en: aIso(new Date()),
        habilidades: original.habilidades.map((h) => ({ ...h })),
        ajustes: original.ajustes.map((a) => ({ ...a })),
      };
      estado.vacantes.push(copia);
      return detalleParaReclutador(copia);
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

/** Vacante de la empresa del reclutador; una ajena responde como si no existiera. */
function vacanteDeMiEmpresa(id: number): VacanteMock {
  const empresa = empresaDeLaSesion();
  const vacante = obtenerEstado().vacantes.find((v) => v.id === id && v.empresa_id === empresa.id);
  if (!vacante) throw noEncontrada();
  return vacante;
}

function empresaNoValidada() {
  return fallo(
    403,
    'empresa_no_validada',
    'Podrás publicar cuando validemos tu empresa. Mientras tanto puedes guardar borradores.',
  );
}

/** Para publicar: empresa validada y todos los datos obligatorios. Un borrador no exige nada más. */
function exigirPublicable(datos: VacanteEntrada, estadoEmpresa: string) {
  if (datos.estado !== 'publicada') return;
  if (estadoEmpresa !== 'validada') throw empresaNoValidada();
  exigirVacanteCompleta(datos);
}

type DatosEditables = Omit<
  VacanteMock,
  'id' | 'empresa_id' | 'estado' | 'publicada_en' | 'actualizado_en'
>;

/** Convierte el cuerpo del contrato (ids y salario plano) en los campos de la vacante del mock. */
function desdeEntrada(datos: VacanteEntrada): DatosEditables {
  return {
    titulo: datos.titulo.trim(),
    categoria_id: datos.categoria_id,
    descripcion: datos.descripcion.trim(),
    jornada_id: datos.jornada_id,
    tipo_contrato_id: datos.tipo_contrato_id,
    plazas: datos.plazas,
    modalidad_id: datos.modalidad_id,
    municipio_id: datos.municipio_id,
    direccion: datos.direccion?.trim() || null,
    salario_min: datos.salario_min ?? null,
    salario_max: datos.salario_max ?? null,
    mostrar_salario: datos.mostrar_salario,
    nivel_educativo_id: datos.nivel_educativo_id ?? null,
    experiencia_anios: datos.experiencia_anios,
    habilidades: datos.habilidades.map(({ habilidad_id, obligatoria }) => ({
      habilidad_id,
      obligatoria,
    })),
    ajustes: datos.ajustes.map(({ ajuste_id, tipo }) => ({ ajuste_id, tipo })),
    sin_condiciones_accesibilidad: datos.sin_condiciones_accesibilidad,
    notas_accesibilidad: datos.notas_accesibilidad?.trim() || null,
  };
}

/** Lo que, si cambia, obliga a recalcular la compatibilidad y avisar: habilidades, formación, modalidad y ajustes. */
function firmaDeRequisitos(vacante: VacanteMock): string {
  const ordenados = <T>(lista: T[]) => lista.map((x) => JSON.stringify(x)).sort();
  return JSON.stringify([
    ordenados(vacante.habilidades),
    vacante.nivel_educativo_id,
    vacante.modalidad_id,
    ordenados(vacante.ajustes),
    vacante.sin_condiciones_accesibilidad,
  ]);
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
