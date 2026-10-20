import type {
  CompartirAjustes,
  EstadoEmpresa,
  EstadoEntrevista,
  EstadoFormacion,
  EstadoHorario,
  EstadoPostulacion,
  EstadoReporte,
  EstadoVacante,
  NivelHabilidad,
  TipoAjusteVacante,
} from '../tipos';

// Datos de negocio del mock: los mismos registros e ids que db/semillas/S002__datos_prueba.sql.
// Las fechas relativas ("now() - interval ...") se calculan al arrancar la app.

export type { EstadoFormacion };

export interface ExperienciaMock {
  id: number;
  puesto: string;
  empresa: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  actual: boolean;
  descripcion: string | null;
}

export interface FormacionMock {
  id: number;
  nivel_educativo_id: number;
  institucion: string;
  carrera: string | null;
  estado: EstadoFormacion;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface HabilidadMock {
  habilidad_id: number;
  nivel: NivelHabilidad;
}

export interface EmpresaMock {
  id: number;
  razon_social: string;
  nombre_comercial: string;
  rfc: string;
  direccion: string | null;
  /** Constancia de situación fiscal subida por el reclutador. */
  documento_url: string | null;
  /** Motivo del rechazo o la suspensión. */
  motivo_estado: string | null;
  validada_en: string | null;
  logo_url: string | null;
  municipio_id: number;
  sector_id: number;
  tamano_empresa_id: number;
  descripcion: string | null;
  sitio_web: string | null;
  practicas_inclusion: string | null;
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
  habilidades: HabilidadMock[];
  necesidad_ids: number[];
  formaciones: FormacionMock[];
  experiencias: ExperienciaMock[];
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

export interface HorarioMock {
  id: number;
  vacante_id: number;
  reclutador_id: number;
  inicio: string;
  duracion_min: 30 | 45 | 60;
  liga: string;
  estado: EstadoHorario;
  /** Solo del mock: otro candidato lo toma justo cuando se intenta reservar (prueba el 409). */
  lo_toma_otro?: boolean;
}

export interface EntrevistaMock {
  id: number;
  horario_id: number;
  postulacion_id: number;
  estado: EstadoEntrevista;
  motivo_cancelacion: string | null;
  creado_en: string;
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

const HORA_MS = 3600 * 1000;
const DIA_MS = 24 * HORA_MS;

/** ISO 8601 sin milisegundos, como responde el API. */
export function aIso(fecha: Date): string {
  return fecha.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface NegocioMock {
  empresas: EmpresaMock[];
  vacantes: VacanteMock[];
  candidatos: CandidatoMock[];
  postulaciones: PostulacionMock[];
  horarios: HorarioMock[];
  entrevistas: EntrevistaMock[];
  reportes: ReporteMock[];
}

export function crearNegocioInicial(ahora = Date.now()): NegocioMock {
  const hace = (dias: number) => aIso(new Date(ahora - dias * DIA_MS));
  const ahoraIso = aIso(new Date(ahora));

  // Datos de S002 (sector, tamaño, descripción y prácticas de inclusión). S002 no guarda el sitio
  // web: el de TecnoQro es el del ejemplo del contrato; el de LogiBajío es solo del mock.
  const empresas: EmpresaMock[] = [
    {
      id: 1,
      razon_social: 'Tecnologías Querétaro S.A. de C.V.',
      nombre_comercial: 'TecnoQro',
      rfc: 'TQU150312AB1',
      direccion: 'Av. Constituyentes 100, Querétaro',
      documento_url: '/archivos/documentos/empresa-1.pdf',
      motivo_estado: null,
      validada_en: hace(22),
      logo_url: '/archivos/logos/empresa-1.png',
      municipio_id: 3,
      sector_id: 4,
      tamano_empresa_id: 3,
      descripcion: 'Empresa de desarrollo de software y soporte técnico.',
      sitio_web: 'https://tecnoqro.mx',
      practicas_inclusion:
        'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
      estado: 'validada',
    },
    {
      id: 2,
      razon_social: 'Logística Bajío Norte S.A. de C.V.',
      nombre_comercial: 'LogiBajío',
      rfc: 'LBN180725KQ3',
      direccion: 'Parque Industrial Bernardo Quintana, El Marqués',
      documento_url: '/archivos/documentos/empresa-2.pdf',
      motivo_estado: null,
      validada_en: hace(20),
      logo_url: null,
      municipio_id: 2,
      sector_id: 1,
      tamano_empresa_id: 4,
      descripcion: 'Centro de distribución y logística para la industria automotriz.',
      sitio_web: 'https://logibajio.mx',
      practicas_inclusion:
        'Almacén con rampas y alertas visuales; convenio con una asociación de personas sordas.',
      estado: 'validada',
    },
    {
      id: 3,
      razon_social: 'Contadores Asociados del Centro S.C.',
      nombre_comercial: 'ConCentro',
      rfc: 'CAC0904158T2',
      direccion: 'Calle Josefa Vergara 25, Corregidora',
      documento_url: '/archivos/documentos/empresa-3.pdf',
      motivo_estado: null,
      validada_en: hace(18),
      logo_url: null,
      municipio_id: 1,
      sector_id: 3,
      tamano_empresa_id: 2,
      descripcion: 'Despacho contable con clientes pymes de la región.',
      sitio_web: null,
      practicas_inclusion: 'Trabajo remoto y comunicación por escrito para todo el equipo.',
      estado: 'validada',
    },
    {
      id: 4,
      razon_social: 'Estudio Trazo Diseño S.A.S.',
      nombre_comercial: 'Estudio Trazo',
      rfc: 'ETR2101119P4',
      direccion: 'Calle 5 de Mayo 40, Centro, Querétaro',
      documento_url: null,
      motivo_estado: null,
      validada_en: null,
      logo_url: null,
      municipio_id: 3,
      sector_id: 3,
      tamano_empresa_id: 1,
      descripcion: 'Estudio de diseño gráfico e ilustración.',
      sitio_web: null,
      practicas_inclusion: null,
      estado: 'pendiente',
    },
    // Empresas solo del mock (ids desde 100) para ver las otras dos variantes del banner de REC-01.
    {
      id: 100,
      razon_social: 'Construcciones Rivera del Bajío S.A. de C.V.',
      nombre_comercial: 'Constructora Rivera',
      rfc: 'CRB190418HK7',
      direccion: 'Blvd. Bernardo Quintana 300, Querétaro',
      documento_url: '/archivos/documentos/empresa-100.pdf',
      motivo_estado:
        'La constancia de situación fiscal se ve borrosa y no se alcanza a leer el RFC.',
      validada_en: null,
      logo_url: null,
      municipio_id: 3,
      sector_id: 2,
      tamano_empresa_id: 2,
      descripcion: 'Construcción y remodelación de oficinas.',
      sitio_web: null,
      practicas_inclusion: null,
      estado: 'rechazada',
    },
    {
      id: 101,
      razon_social: 'Servicios Educativos Alameda S.C.',
      nombre_comercial: 'Academia Alameda',
      rfc: 'SEA170930LM2',
      direccion: 'Calle Hidalgo 12, Centro, Querétaro',
      documento_url: '/archivos/documentos/empresa-101.pdf',
      motivo_estado: 'Se recibió un reporte sobre información falsa y la cuenta está en revisión.',
      validada_en: hace(40),
      logo_url: null,
      municipio_id: 3,
      sector_id: 6,
      tamano_empresa_id: 1,
      descripcion: 'Cursos de regularización y computación para adultos.',
      sitio_web: null,
      practicas_inclusion: null,
      estado: 'suspendida',
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
      habilidades: [
        { habilidad_id: 4, nivel: 'avanzado' },
        { habilidad_id: 5, nivel: 'intermedio' },
        { habilidad_id: 6, nivel: 'basico' },
        { habilidad_id: 11, nivel: 'avanzado' },
      ],
      necesidad_ids: [1, 3],
      formaciones: [
        {
          id: 1,
          nivel_educativo_id: 4,
          institucion: 'Universidad Tecnológica de Querétaro',
          carrera: 'TSU en Tecnologías de la Información',
          estado: 'concluida',
          fecha_inicio: '2020-09-01',
          fecha_fin: '2022-08-31',
        },
      ],
      experiencias: [
        {
          id: 1,
          puesto: 'Auxiliar de soporte técnico',
          empresa: 'Servicios Integrales del Bajío',
          fecha_inicio: '2023-02-01',
          fecha_fin: '2025-06-30',
          actual: false,
          descripcion: 'Atención de tickets y mantenimiento de equipos.',
        },
      ],
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
      habilidades: [
        { habilidad_id: 1, nivel: 'intermedio' },
        { habilidad_id: 3, nivel: 'intermedio' },
        { habilidad_id: 6, nivel: 'avanzado' },
      ],
      necesidad_ids: [],
      formaciones: [
        {
          id: 2,
          nivel_educativo_id: 5,
          institucion: 'Universidad Politécnica de Querétaro',
          carrera: 'Ingeniería en Sistemas Computacionales',
          estado: 'en_curso',
          fecha_inicio: '2023-09-01',
          fecha_fin: null,
        },
      ],
      experiencias: [],
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

  // Solo del mock (ids desde 100), para probar CAN-05 y CAN-06. Se evita la vacante 2 (la usan las
  // pruebas para postularse) y la 5; Mariana tiene las tres postulaciones finalizadas y Jorge, la
  // entrevista que empieza en menos de 24 h.
  const despues = (horas: number) => aIso(new Date(ahora + horas * HORA_MS));
  const antes = (horas: number) => despues(-horas);
  const evento = (
    anterior: PostulacionMock['estado'] | null,
    nuevo: PostulacionMock['estado'],
    horas: number,
    mensaje: string | null = null,
  ): EventoHistorialMock => ({
    estado_anterior: anterior,
    estado_nuevo: nuevo,
    mensaje,
    creado_en: antes(horas),
  });
  const postulacionExtra = (
    id: number,
    candidatoId: number,
    vacanteId: number,
    historial: EventoHistorialMock[],
    mensaje: string | null,
  ): PostulacionMock => ({
    id,
    candidato_id: candidatoId,
    vacante_id: vacanteId,
    estado: historial[historial.length - 1].estado_nuevo,
    mensaje,
    comparte_ajustes: false,
    creado_en: historial[0].creado_en,
    actualizado_en: historial[historial.length - 1].creado_en,
    historial,
  });

  postulaciones.push(
    // Jorge · vacante 6 · entrevista dentro de 5 horas: no se puede cancelar.
    postulacionExtra(
      100,
      4,
      6,
      [
        evento(null, 'postulada', 60),
        evento('postulada', 'en_revision', 48),
        evento('en_revision', 'entrevista', 30, 'Nos gustaría conocerte; la entrevista es hoy.'),
      ],
      'Me interesa crecer en desarrollo web.',
    ),
    // Mariana · vacante 6 · aceptada, con su entrevista ya realizada.
    postulacionExtra(
      101,
      3,
      6,
      [
        evento(null, 'postulada', 70),
        evento('postulada', 'en_revision', 60),
        evento('en_revision', 'entrevista', 50, 'Agenda un horario para conocernos.'),
        evento(
          'entrevista',
          'aceptada',
          20,
          '¡Felicidades! Nos dará gusto tenerte en el equipo; te escribiremos con los siguientes pasos.',
        ),
      ],
      null,
    ),
    // Mariana · vacante 3 · no seleccionada, con el mensaje del reclutador.
    postulacionExtra(
      102,
      3,
      3,
      [
        evento(null, 'postulada', 110),
        evento('postulada', 'en_revision', 100),
        evento(
          'en_revision',
          'no_seleccionada',
          40,
          'Por ahora avanzamos con otros perfiles. Gracias por tu interés.',
        ),
      ],
      'Tengo experiencia en reportes.',
    ),
    // Mariana · vacante 4 · retirada por ella.
    postulacionExtra(
      103,
      3,
      4,
      [evento(null, 'postulada', 20), evento('postulada', 'retirada', 7)],
      null,
    ),
  );

  const horarios: HorarioMock[] = [
    // S002: el 1 está agendado con la entrevista 1 y el 2 sigue libre.
    {
      id: 1,
      vacante_id: 1,
      reclutador_id: 2,
      inicio: despues(72),
      duracion_min: 45,
      liga: 'https://meet.google.com/abc-defg-hij',
      estado: 'agendado',
    },
    {
      id: 2,
      vacante_id: 1,
      reclutador_id: 2,
      inicio: despues(73),
      duracion_min: 45,
      liga: 'https://meet.google.com/abc-defg-hij',
      estado: 'libre',
    },
    // Más horarios libres de la vacante 1 para elegir (el 102 lo toma otro candidato: 409).
    horarioLibre(100, despues(3), 30),
    horarioLibre(101, despues(27), 45),
    { ...horarioLibre(102, despues(30), 60), lo_toma_otro: true },
    horarioLibre(103, despues(120), 30),
    horarioLibre(104, despues(121), 45),
    // De las postulaciones 100 (en 5 horas) y 101 (ya realizada), ambas de la vacante 6.
    {
      ...horarioLibre(105, despues(5), 45),
      vacante_id: 6,
      liga: 'https://teams.microsoft.com/l/meetup-join/prueba-tecnoqro',
      estado: 'agendado',
    },
    {
      ...horarioLibre(106, antes(30), 60),
      vacante_id: 6,
      liga: 'https://meet.google.com/pru-ebac-onc',
      estado: 'agendado',
    },
  ];

  const entrevistas: EntrevistaMock[] = [
    {
      id: 1,
      horario_id: 1,
      postulacion_id: 1,
      estado: 'agendada',
      motivo_cancelacion: null,
      creado_en: '2026-10-02T19:05:00Z',
    },
    {
      id: 100,
      horario_id: 105,
      postulacion_id: 100,
      estado: 'agendada',
      motivo_cancelacion: null,
      creado_en: antes(26),
    },
    {
      id: 101,
      horario_id: 106,
      postulacion_id: 101,
      estado: 'realizada',
      motivo_cancelacion: null,
      creado_en: antes(45),
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

  return { empresas, vacantes, candidatos, postulaciones, horarios, entrevistas, reportes };
}

/** Horario libre de la vacante 1 publicado por Laura (TecnoQro). */
function horarioLibre(
  id: number,
  inicio: string,
  duracion: HorarioMock['duracion_min'],
): HorarioMock {
  return {
    id,
    vacante_id: 1,
    reclutador_id: 2,
    inicio,
    duracion_min: duracion,
    liga: 'https://meet.google.com/abc-defg-hij',
    estado: 'libre',
  };
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
    habilidades: [],
    necesidad_ids: [],
    formaciones: [],
    experiencias: [],
    actualizado_en: aIso(new Date()),
  };
}
