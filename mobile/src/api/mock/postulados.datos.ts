import { relativaAHoy } from './fechasS002';
import type { NivelHabilidad } from '../tipos';
import type {
  CandidatoMock,
  EstadoFormacion,
  EventoHistorialMock,
  PostulacionMock,
} from './negocio.datos';

// Postulados extra de la vacante 1 de TecnoQro, solo del mock (ids desde 110), para probar REC-04
// y REC-05: distintos estados, compatibilidades y necesidades de ajuste. Sus datos de contacto
// son inventados.

const HORA_MS = 3600 * 1000;

const aIso = (fecha: Date) => fecha.toISOString().replace(/\.\d{3}Z$/, 'Z');

interface CandidatoExtra {
  usuario: { id: number; nombre: string; apellidos: string; correo: string; telefono: string };
  candidato: CandidatoMock;
  postulacion: PostulacionMock;
}

type EstadoPostulacion = PostulacionMock['estado'];

interface Perfil {
  id: number;
  nombre: string;
  apellidos: string;
  /** Habilidades que tiene (ids del catálogo) con nivel intermedio. */
  habilidades: number[];
  /** Modalidades preferidas: 1 presencial, 2 remoto, 3 híbrido. */
  modalidades: number[];
  /** Nivel educativo (4 TSU, 5 licenciatura, 3 bachillerato) y estado de la formación. */
  nivel: number;
  formacion: EstadoFormacion;
  estado: EstadoPostulacion;
  /** Necesidades de ajuste del candidato y si las comparte en esta postulación. */
  necesidades?: number[];
  comparte?: boolean;
  nota?: string;
  /** Horas desde que se postuló. */
  horas: number;
  mensaje?: string;
  resumen?: string;
}

const RUTA: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  postulada: ['postulada'],
  en_revision: ['postulada', 'en_revision'],
  entrevista: ['postulada', 'en_revision', 'entrevista'],
  aceptada: ['postulada', 'en_revision', 'entrevista', 'aceptada'],
  no_seleccionada: ['postulada', 'en_revision', 'no_seleccionada'],
  retirada: ['postulada', 'retirada'],
};

const MENSAJES: Partial<Record<EstadoPostulacion, string>> = {
  entrevista: 'Nos gustaría conocerte; agenda un horario.',
  aceptada: '¡Felicidades! Te contactaremos para la contratación.',
  no_seleccionada: 'Por ahora avanzamos con otros perfiles. Gracias por tu interés.',
};

function construir(p: Perfil, ahora: number): CandidatoExtra {
  const ruta = RUTA[p.estado];
  // Cada paso del historial ocurre unas horas después del anterior (sin pasar de «ahora»).
  const separacionHoras = Math.min(3, p.horas / ruta.length);
  const historial: EventoHistorialMock[] = ruta.map((nuevo, indice) => ({
    estado_anterior: indice === 0 ? null : ruta[indice - 1],
    estado_nuevo: nuevo,
    mensaje: indice === 0 ? null : (MENSAJES[nuevo] ?? null),
    creado_en: aIso(new Date(ahora - (p.horas - indice * separacionHoras) * HORA_MS)),
  }));
  const necesidades = p.necesidades ?? [];
  const nivel: NivelHabilidad = 'intermedio';
  const correo = `${p.nombre}.${p.apellidos.split(' ')[0]}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  return {
    usuario: {
      id: p.id,
      nombre: p.nombre,
      apellidos: p.apellidos,
      correo: `${correo}@correo.mx`,
      telefono: `44255${String(p.id).padStart(5, '0')}`,
    },
    candidato: {
      usuario_id: p.id,
      municipio_id: 3,
      jornada_id: 1,
      resumen:
        p.resumen ?? `Perfil de ${p.nombre} con experiencia en soporte y atención a usuarios.`,
      foto_url: null,
      disponible_reubicacion: false,
      compartir_ajustes: 'preguntar',
      consentimiento_sensibles_en:
        necesidades.length > 0 ? relativaAHoy('2026-09-20T17:00:00Z', ahora) : null,
      nota_ajustes: necesidades.length > 0 ? (p.nota ?? null) : null,
      modalidad_ids: p.modalidades,
      categoria_ids: [1],
      habilidades: p.habilidades.map((habilidad_id) => ({ habilidad_id, nivel })),
      necesidad_ids: necesidades,
      formaciones: [
        {
          id: 100 + p.id,
          nivel_educativo_id: p.nivel,
          institucion: 'Universidad Tecnológica de Querétaro',
          carrera: p.nivel === 3 ? null : 'Tecnologías de la Información',
          estado: p.formacion,
          fecha_inicio: '2019-09-01',
          fecha_fin: p.formacion === 'concluida' ? '2022-08-31' : null,
        },
      ],
      experiencias: [
        {
          id: 100 + p.id,
          puesto: 'Auxiliar de soporte',
          empresa: 'Servicios Integrales del Bajío',
          fecha_inicio: '2022-09-01',
          fecha_fin: '2025-03-31',
          actual: false,
          descripcion: 'Atención de tickets y mantenimiento de equipos.',
        },
      ],
      actualizado_en: aIso(new Date(ahora - 24 * HORA_MS)),
    },
    postulacion: {
      id: p.id,
      candidato_id: p.id,
      vacante_id: 1,
      estado: p.estado,
      mensaje: p.mensaje ?? null,
      comparte_ajustes: Boolean(p.comparte) && necesidades.length > 0,
      creado_en: historial[0].creado_en,
      actualizado_en: historial[historial.length - 1].creado_en,
      historial,
    },
  };
}

// Vacante 1: obligatorias 4 (Soporte técnico), 5 (Redes), 3 (SQL) y 11 (Comunicación escrita);
// deseables 2 (JavaScript) y 6 (Excel); híbrida; formación mínima TSU. Ajustes que ya tiene el
// lugar: 1 (rampa) y 3 (baño accesible); el 12 (horario flexible) es bajo solicitud.
const TODAS = [4, 5, 3, 11, 2, 6];

const NOMBRADOS: Perfil[] = [
  {
    id: 110,
    nombre: 'Carlos',
    apellidos: 'Mendoza Ruiz',
    habilidades: TODAS,
    modalidades: [3],
    nivel: 4,
    formacion: 'concluida',
    estado: 'postulada',
    horas: 5,
    mensaje: 'Cumplo con todos los requisitos y me gustaría sumarme al equipo.',
  },
  {
    id: 111,
    nombre: 'Daniela',
    apellidos: 'Ortega Pérez',
    habilidades: [4, 5, 11, 6],
    modalidades: [2],
    nivel: 5,
    formacion: 'concluida',
    estado: 'en_revision',
    necesidades: [1, 3],
    comparte: true,
    horas: 50,
    mensaje: 'Tengo tres años atendiendo usuarios internos.',
  },
  {
    id: 112,
    nombre: 'Fernando',
    apellidos: 'Silva Lara',
    habilidades: [4, 5, 3],
    modalidades: [3],
    nivel: 4,
    formacion: 'en_curso',
    estado: 'postulada',
    necesidades: [4, 5],
    comparte: true,
    nota: 'Uso lector de pantalla; necesito que las herramientas internas sean compatibles.',
    horas: 20,
    mensaje: 'Estoy por terminar mi TSU y quiero crecer en soporte.',
  },
  {
    id: 113,
    nombre: 'Gabriela',
    apellidos: 'Torres Vega',
    habilidades: [11, 6],
    modalidades: [3],
    nivel: 4,
    formacion: 'concluida',
    estado: 'no_seleccionada',
    horas: 140,
  },
  {
    id: 114,
    nombre: 'Héctor',
    apellidos: 'Ramírez Cano',
    habilidades: [4, 5],
    modalidades: [1],
    nivel: 3,
    formacion: 'concluida',
    estado: 'en_revision',
    necesidades: [3, 1, 12],
    comparte: true,
    horas: 80,
  },
  {
    id: 115,
    nombre: 'Irene',
    apellidos: 'Salazar Núñez',
    habilidades: [4, 5, 3, 11, 6],
    modalidades: [3],
    nivel: 4,
    formacion: 'en_curso',
    estado: 'entrevista',
    horas: 110,
    mensaje: 'Me interesa mucho el puesto.',
  },
  {
    id: 116,
    nombre: 'Javier',
    apellidos: 'Campos Rojas',
    habilidades: [4, 3],
    modalidades: [2],
    nivel: 3,
    formacion: 'concluida',
    estado: 'postulada',
    horas: 30,
  },
  {
    id: 117,
    nombre: 'Karla',
    apellidos: 'Medina Soto',
    habilidades: TODAS,
    modalidades: [3],
    nivel: 4,
    formacion: 'concluida',
    estado: 'aceptada',
    horas: 200,
    mensaje: 'Tengo experiencia en mesas de ayuda.',
  },
  {
    id: 118,
    nombre: 'Luis',
    apellidos: 'Herrera Díaz',
    habilidades: [6],
    modalidades: [2],
    nivel: 4,
    formacion: 'concluida',
    estado: 'retirada',
    horas: 90,
  },
  {
    id: 119,
    nombre: 'Mónica',
    apellidos: 'Ibarra Luna',
    habilidades: [4, 5, 3, 11, 6],
    modalidades: [3],
    nivel: 4,
    formacion: 'concluida',
    estado: 'postulada',
    necesidades: [1],
    comparte: true,
    horas: 8,
  },
  {
    id: 120,
    nombre: 'Nicolás',
    apellidos: 'Pineda Ávila',
    habilidades: [4, 5, 11],
    modalidades: [3],
    nivel: 4,
    formacion: 'concluida',
    estado: 'en_revision',
    horas: 70,
  },
  {
    id: 121,
    nombre: 'Olga',
    apellidos: 'Reséndiz Mora',
    habilidades: [4, 5, 3, 11],
    modalidades: [1],
    nivel: 4,
    formacion: 'concluida',
    estado: 'postulada',
    necesidades: [5],
    comparte: true,
    horas: 12,
  },
];

const NOMBRES = ['Pablo', 'Quetzali', 'Rodrigo', 'Sandra', 'Tomás', 'Úrsula', 'Víctor', 'Wendy'];
const APELLIDOS = ['Aguilar Soto', 'Barrera Gil', 'Cortés Ríos', 'Domínguez Paz'];
// Habilidades de relleno: de pocas a casi todas, para repartir las compatibilidades.
const RELLENO = [[4], [4, 5], [4, 5, 3], [4, 5, 3, 11], [5, 6], [2, 6, 11]];

/** Más postulados (ids 130 a 145), casi todos nuevos, para llenar más de una página. */
const GENERADOS: Perfil[] = Array.from({ length: 16 }, (_, indice) => ({
  id: 130 + indice,
  nombre: NOMBRES[indice % NOMBRES.length],
  apellidos: APELLIDOS[Math.floor(indice / NOMBRES.length) + (indice % 2)],
  habilidades: RELLENO[indice % RELLENO.length],
  modalidades: [indice % 3 === 0 ? 3 : indice % 3],
  nivel: indice % 4 === 0 ? 3 : 4,
  formacion: 'concluida' as const,
  estado: (indice % 5 === 0 ? 'en_revision' : 'postulada') as EstadoPostulacion,
  horas: 2 + indice * 4,
}));

export function crearCandidatosExtra(ahora: number): CandidatoExtra[] {
  return [...NOMBRADOS, ...GENERADOS].map((perfil) => construir(perfil, ahora));
}
