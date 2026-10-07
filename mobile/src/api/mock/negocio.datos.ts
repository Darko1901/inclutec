import type {
  CompartirAjustes,
  EstadoEmpresa,
  EstadoPostulacion,
  EstadoReporte,
  EstadoVacante,
  TipoAjusteVacante,
} from '../tipos';

// Datos de negocio del mock: los mismos registros e ids que db/semillas/S002__datos_prueba.sql.
// Las fechas relativas ("now() - interval ...") se calculan al arrancar la app.

export type EstadoFormacion = 'concluida' | 'en_curso' | 'trunca';

export interface EmpresaMock {
  id: number;
  nombre_comercial: string;
  logo_url: string | null;
  municipio_id: number;
  estado: EstadoEmpresa;
}

export interface VacanteMock {
  id: number;
  empresa_id: number;
  categoria_id: number;
  modalidad_id: number;
  jornada_id: number;
  tipo_contrato_id: number;
  nivel_educativo_id: number | null;
  municipio_id: number;
  titulo: string;
  descripcion: string;
  plazas: number;
  direccion: string | null;
  salario_min: number | null;
  salario_max: number | null;
  mostrar_salario: boolean;
  experiencia_anios: number;
  sin_condiciones_accesibilidad: boolean;
  notas_accesibilidad: string | null;
  estado: EstadoVacante;
  publicada_en: string | null;
  actualizado_en: string;
  habilidades: { habilidad_id: number; obligatoria: boolean }[];
  ajustes: { ajuste_id: number; tipo: TipoAjusteVacante }[];
}

export interface CandidatoMock {
  usuario_id: number;
  municipio_id: number | null;
  jornada_id: number | null;
  resumen: string | null;
  foto_url: string | null;
  disponible_reubicacion: boolean;
  compartir_ajustes: CompartirAjustes;
  /** null si no dio el consentimiento; entonces no hay necesidades registradas. */
  consentimiento_sensibles_en: string | null;
  nota_ajustes: string | null;
  modalidad_ids: number[];
  categoria_ids: number[];
  habilidad_ids: number[];
  necesidad_ids: number[];
  formaciones: { nivel_educativo_id: number; estado: EstadoFormacion }[];
  experiencias: number;
  actualizado_en: string;
}

export interface EventoHistorialMock {
  estado_anterior: EstadoPostulacion | null;
  estado_nuevo: EstadoPostulacion;
  mensaje: string | null;
  creado_en: string;
}

export interface PostulacionMock {
  id: number;
  candidato_id: number;
  vacante_id: number;
  estado: EstadoPostulacion;
  mensaje: string | null;
  comparte_ajustes: boolean;
  creado_en: string;
  actualizado_en: string;
  historial: EventoHistorialMock[];
}

export interface ReporteMock {
  id: number;
  reportante_id: number;
  motivo_reporte_id: number;
  vacante_id: number | null;
  empresa_id: number | null;
  candidato_id: number | null;
  descripcion: string | null;
  estado: EstadoReporte;
  creado_en: string;
}

/** Fila de la tabla `compatibilidad` (S002) que el motor debe reproducir. */
export interface CompatibilidadGuardada {
  candidato_id: number;
  vacante_id: number;
  puntaje_candidato: number;
  puntaje_reclutador: number;
  h: number;
  a: number;
  m: number;
  f: number;
}

export const COMPATIBILIDAD_GUARDADA: CompatibilidadGuardada[] = (
  [
    [3, 1, 88, 83, 0.7, 1, 1, 1],
    [3, 2, 55, 36, 0.25, 1, 0, 1],
    [3, 3, 26, 38, 0.286, 0, 1, 0],
    [3, 4, 43, 62, 0.333, 0, 1, 1],
    [3, 5, 25, 36, 0.25, 0, 0, 1],
    [3, 6, 15, 21, 0, 0, 1, 0],
    [4, 1, 57, 39, 0.3, 1, 0.5, 0.5],
    [4, 2, 63, 46, 0.25, 1, 1, 0.5],
    [4, 3, 79, 70, 0.857, 1, 0.5, 0.5],
    [4, 4, 51, 30, 0.333, 1, 0, 0.5],
    [4, 5, 53, 32, 0, 1, 1, 0.5],
    [4, 6, 58, 39, 0.5, 1, 0, 0.5],
  ] as const
).map(([candidato_id, vacante_id, puntaje_candidato, puntaje_reclutador, h, a, m, f]) => ({
  candidato_id,
  vacante_id,
  puntaje_candidato,
  puntaje_reclutador,
  h,
  a,
  m,
  f,
}));

const DIA_MS = 24 * 3600 * 1000;

/** ISO 8601 sin milisegundos, como responde el API. */
export function aIso(fecha: Date): string {
  return fecha.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface NegocioMock {
  empresas: EmpresaMock[];
  vacantes: VacanteMock[];
  candidatos: CandidatoMock[];
  postulaciones: PostulacionMock[];
  reportes: ReporteMock[];
}

export function crearNegocioInicial(ahora = Date.now()): NegocioMock {
  const hace = (dias: number) => aIso(new Date(ahora - dias * DIA_MS));
  const ahoraIso = aIso(new Date(ahora));

  const empresas: EmpresaMock[] = [
    {
      id: 1,
      nombre_comercial: 'TecnoQro',
      logo_url: '/archivos/logos/empresa-1.png',
      municipio_id: 3,
      estado: 'validada',
    },
    { id: 2, nombre_comercial: 'LogiBajío', logo_url: null, municipio_id: 2, estado: 'validada' },
    { id: 3, nombre_comercial: 'ConCentro', logo_url: null, municipio_id: 1, estado: 'validada' },
    {
      id: 4,
      nombre_comercial: 'Estudio Trazo',
      logo_url: null,
      municipio_id: 3,
      estado: 'pendiente',
    },
  ];

  const base = {
    mostrar_salario: true,
    experiencia_anios: 0,
    sin_condiciones_accesibilidad: false,
    notas_accesibilidad: null,
    estado: 'publicada',
    actualizado_en: ahoraIso,
  } as const;

  const vacantes: VacanteMock[] = [
    {
      ...base,
      id: 1,
      empresa_id: 1,
      categoria_id: 1,
      modalidad_id: 3,
      jornada_id: 1,
      tipo_contrato_id: 1,
      nivel_educativo_id: 4,
      municipio_id: 3,
      titulo: 'Técnico de soporte de TI',
      descripcion: 'Atención a usuarios internos, mantenimiento de equipos y redes.',
      plazas: 2,
      direccion: 'Av. Constituyentes 100, Querétaro',
      salario_min: 14000,
      salario_max: 18000,
      experiencia_anios: 1,
      publicada_en: ahoraIso,
      habilidades: [
        { habilidad_id: 4, obligatoria: true },
        { habilidad_id: 5, obligatoria: true },
        { habilidad_id: 3, obligatoria: true },
        { habilidad_id: 11, obligatoria: true },
        { habilidad_id: 2, obligatoria: false },
        { habilidad_id: 6, obligatoria: false },
      ],
      ajustes: [
        { ajuste_id: 1, tipo: 'existente' },
        { ajuste_id: 3, tipo: 'existente' },
        { ajuste_id: 12, tipo: 'bajo_solicitud' },
      ],
    },
    {
      ...base,
      id: 2,
      empresa_id: 2,
      categoria_id: 5,
      modalidad_id: 1,
      jornada_id: 1,
      tipo_contrato_id: 1,
      nivel_educativo_id: 3,
      municipio_id: 2,
      titulo: 'Auxiliar de almacén',
      descripcion: 'Recepción, acomodo y surtido de mercancía con apoyo de terminal portátil.',
      plazas: 3,
      direccion: 'Parque Industrial Bernardo Quintana, El Marqués',
      salario_min: 9500,
      salario_max: 11000,
      notas_accesibilidad: 'Pasillos de 1.5 m y estaciones de trabajo a dos alturas.',
      publicada_en: hace(2),
      habilidades: [
        { habilidad_id: 14, obligatoria: true },
        { habilidad_id: 15, obligatoria: false },
        { habilidad_id: 6, obligatoria: false },
      ],
      ajustes: [
        { ajuste_id: 1, tipo: 'existente' },
        { ajuste_id: 2, tipo: 'existente' },
        { ajuste_id: 3, tipo: 'existente' },
        { ajuste_id: 8, tipo: 'existente' },
        { ajuste_id: 6, tipo: 'bajo_solicitud' },
      ],
    },
    {
      ...base,
      id: 3,
      empresa_id: 2,
      categoria_id: 1,
      modalidad_id: 3,
      jornada_id: 1,
      tipo_contrato_id: 1,
      nivel_educativo_id: 5,
      municipio_id: 2,
      titulo: 'Analista de datos de operaciones',
      descripcion: 'Reportes de inventario y tableros de indicadores para el área de operaciones.',
      plazas: 1,
      direccion: 'Parque Industrial Bernardo Quintana, El Marqués',
      salario_min: 16000,
      salario_max: 21000,
      experiencia_anios: 1,
      publicada_en: hace(5),
      habilidades: [
        { habilidad_id: 3, obligatoria: true },
        { habilidad_id: 1, obligatoria: true },
        { habilidad_id: 6, obligatoria: true },
        { habilidad_id: 14, obligatoria: false },
      ],
      ajustes: [
        { ajuste_id: 4, tipo: 'existente' },
        { ajuste_id: 5, tipo: 'existente' },
        { ajuste_id: 12, tipo: 'bajo_solicitud' },
      ],
    },
    {
      ...base,
      id: 4,
      empresa_id: 3,
      categoria_id: 2,
      modalidad_id: 2,
      jornada_id: 2,
      tipo_contrato_id: 2,
      nivel_educativo_id: 4,
      municipio_id: 1,
      titulo: 'Auxiliar contable',
      descripcion: 'Registro de pólizas, conciliaciones bancarias y emisión de facturas.',
      plazas: 1,
      direccion: null,
      salario_min: 8000,
      salario_max: 9000,
      mostrar_salario: false,
      experiencia_anios: 1,
      publicada_en: hace(1),
      habilidades: [
        { habilidad_id: 7, obligatoria: true },
        { habilidad_id: 8, obligatoria: true },
        { habilidad_id: 6, obligatoria: true },
      ],
      ajustes: [
        { ajuste_id: 13, tipo: 'existente' },
        { ajuste_id: 7, tipo: 'existente' },
        { ajuste_id: 10, tipo: 'existente' },
      ],
    },
    {
      ...base,
      id: 5,
      empresa_id: 3,
      categoria_id: 3,
      modalidad_id: 1,
      jornada_id: 1,
      tipo_contrato_id: 1,
      nivel_educativo_id: 3,
      municipio_id: 1,
      titulo: 'Ejecutivo de atención telefónica',
      descripcion: 'Atención de llamadas de clientes y registro de casos en el CRM.',
      plazas: 2,
      direccion: 'Calle Josefa Vergara 25, Corregidora',
      salario_min: 10000,
      salario_max: 12000,
      sin_condiciones_accesibilidad: true,
      publicada_en: hace(8),
      habilidades: [
        { habilidad_id: 9, obligatoria: true },
        { habilidad_id: 10, obligatoria: false },
        { habilidad_id: 11, obligatoria: false },
      ],
      ajustes: [],
    },
    {
      ...base,
      id: 6,
      empresa_id: 1,
      categoria_id: 1,
      modalidad_id: 2,
      jornada_id: 1,
      tipo_contrato_id: 1,
      nivel_educativo_id: 5,
      municipio_id: 3,
      titulo: 'Desarrollador web junior',
      descripcion: 'Desarrollo y mantenimiento de aplicaciones web internas.',
      plazas: 1,
      direccion: null,
      salario_min: 15000,
      salario_max: 20000,
      publicada_en: hace(3),
      habilidades: [
        { habilidad_id: 2, obligatoria: true },
        { habilidad_id: 3, obligatoria: false },
        { habilidad_id: 1, obligatoria: false },
      ],
      ajustes: [
        { ajuste_id: 4, tipo: 'existente' },
        { ajuste_id: 9, tipo: 'existente' },
        { ajuste_id: 12, tipo: 'existente' },
        { ajuste_id: 6, tipo: 'bajo_solicitud' },
      ],
    },
    {
      ...base,
      id: 7,
      empresa_id: 1,
      categoria_id: 4,
      modalidad_id: 3,
      jornada_id: 2,
      tipo_contrato_id: 3,
      nivel_educativo_id: null,
      municipio_id: 3,
      titulo: 'Diseñador gráfico',
      descripcion: 'Material gráfico para redes sociales y presentaciones.',
      plazas: 1,
      direccion: null,
      salario_min: null,
      salario_max: null,
      mostrar_salario: false,
      estado: 'borrador',
      publicada_en: null,
      habilidades: [
        { habilidad_id: 12, obligatoria: true },
        { habilidad_id: 13, obligatoria: false },
      ],
      ajustes: [],
    },
    {
      ...base,
      id: 8,
      empresa_id: 4,
      categoria_id: 4,
      modalidad_id: 2,
      jornada_id: 3,
      tipo_contrato_id: 3,
      nivel_educativo_id: null,
      municipio_id: 3,
      titulo: 'Ilustrador digital',
      descripcion: 'Ilustraciones para proyectos editoriales.',
      plazas: 1,
      direccion: null,
      salario_min: null,
      salario_max: null,
      mostrar_salario: false,
      experiencia_anios: 1,
      estado: 'borrador',
      publicada_en: null,
      habilidades: [{ habilidad_id: 12, obligatoria: true }],
      ajustes: [],
    },
  ];

  const candidatos: CandidatoMock[] = [
    {
      usuario_id: 3,
      municipio_id: 2,
      jornada_id: 1,
      resumen: 'Técnica en sistemas con experiencia en soporte y atención a usuarios.',
      foto_url: null,
      disponible_reubicacion: false,
      compartir_ajustes: 'preguntar',
      consentimiento_sensibles_en: '2026-09-28T17:00:00Z',
      nota_ajustes: null,
      modalidad_ids: [2, 3],
      categoria_ids: [1],
      habilidad_ids: [4, 5, 6, 11],
      necesidad_ids: [1, 3],
      formaciones: [{ nivel_educativo_id: 4, estado: 'concluida' }],
      experiencias: 1,
      actualizado_en: '2026-09-30T17:00:00Z',
    },
    {
      usuario_id: 4,
      municipio_id: 3,
      jornada_id: 1,
      resumen: 'Analista de datos en formación.',
      foto_url: null,
      disponible_reubicacion: false,
      compartir_ajustes: 'nunca',
      consentimiento_sensibles_en: null,
      nota_ajustes: null,
      modalidad_ids: [1],
      categoria_ids: [1, 2],
      habilidad_ids: [1, 3, 6],
      necesidad_ids: [],
      formaciones: [{ nivel_educativo_id: 5, estado: 'en_curso' }],
      experiencias: 0,
      actualizado_en: '2026-09-30T17:00:00Z',
    },
    // Solo en el mock: la candidata suspendida y la de las 45 notificaciones tienen el perfil
    // vacío, así que no cumplen el perfil mínimo (sirven para probar el bloqueo de CAN-02).
    perfilVacio(100, 3, null),
    perfilVacio(101, 3, '2026-09-28T17:00:00Z'),
  ];

  const postulaciones: PostulacionMock[] = [
    {
      id: 1,
      candidato_id: 3,
      vacante_id: 1,
      estado: 'entrevista',
      mensaje: 'Me interesa mucho el puesto; tengo experiencia en soporte.',
      comparte_ajustes: true,
      creado_en: '2026-09-30T17:20:00Z',
      actualizado_en: '2026-10-02T16:30:00Z',
      historial: [
        {
          estado_anterior: null,
          estado_nuevo: 'postulada',
          mensaje: null,
          creado_en: '2026-09-30T17:20:00Z',
        },
        {
          estado_anterior: 'postulada',
          estado_nuevo: 'en_revision',
          mensaje: null,
          creado_en: '2026-10-01T15:00:00Z',
        },
        {
          estado_anterior: 'en_revision',
          estado_nuevo: 'entrevista',
          mensaje: 'Nos gustaría conocerte; agenda un horario.',
          creado_en: '2026-10-02T16:30:00Z',
        },
      ],
    },
    {
      id: 2,
      candidato_id: 4,
      vacante_id: 3,
      estado: 'postulada',
      mensaje: 'Estoy terminando Ingeniería en Sistemas y manejo SQL y Python.',
      comparte_ajustes: false,
      creado_en: '2026-10-05T17:30:00Z',
      actualizado_en: '2026-10-05T17:30:00Z',
      historial: [
        {
          estado_anterior: null,
          estado_nuevo: 'postulada',
          mensaje: null,
          creado_en: '2026-10-05T17:30:00Z',
        },
      ],
    },
  ];

  const reportes: ReporteMock[] = [
    {
      id: 1,
      reportante_id: 4,
      motivo_reporte_id: 2,
      vacante_id: 5,
      empresa_id: null,
      candidato_id: null,
      descripcion: 'El salario publicado no coincide con lo que me dijeron por teléfono.',
      estado: 'abierto',
      creado_en: '2026-10-03T18:00:00Z',
    },
  ];

  return { empresas, vacantes, candidatos, postulaciones, reportes };
}

/** Perfil de un candidato recién creado: solo lo que pidió el registro. */
export function perfilVacio(
  usuarioId: number,
  municipioId: number | null,
  consentimientoEn: string | null,
): CandidatoMock {
  return {
    usuario_id: usuarioId,
    municipio_id: municipioId,
    jornada_id: null,
    resumen: null,
    foto_url: null,
    disponible_reubicacion: false,
    compartir_ajustes: 'preguntar',
    consentimiento_sensibles_en: consentimientoEn,
    nota_ajustes: null,
    modalidad_ids: [],
    categoria_ids: [],
    habilidad_ids: [],
    necesidad_ids: [],
    formaciones: [],
    experiencias: 0,
    actualizado_en: aIso(new Date()),
  };
}
