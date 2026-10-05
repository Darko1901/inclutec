import type { CatalogoItem } from '../tipos';

// Mismos registros e ids que db/semillas/S001__catalogos.sql (el id es el orden de inserción).
const simples = (nombres: string[]): CatalogoItem[] =>
  nombres.map((nombre, indice) => ({ id: indice + 1, nombre }));

const entidades: CatalogoItem[] = [
  { id: 9, nombre: 'Ciudad de México' },
  { id: 11, nombre: 'Guanajuato' },
  { id: 14, nombre: 'Jalisco' },
  { id: 15, nombre: 'México' },
  { id: 19, nombre: 'Nuevo León' },
  { id: 22, nombre: 'Querétaro' },
];

const municipios: CatalogoItem[] = [
  [22, 'Corregidora'],
  [22, 'El Marqués'],
  [22, 'Querétaro'],
  [22, 'San Juan del Río'],
  [11, 'León'],
  [14, 'Guadalajara'],
  [19, 'Monterrey'],
  [9, 'Cuauhtémoc'],
].map(([entidad, nombre], indice) => ({
  id: indice + 1,
  nombre: nombre as string,
  entidad_federativa_id: entidad as number,
}));

const nivelesEducativos: CatalogoItem[] = [
  'Primaria',
  'Secundaria',
  'Bachillerato',
  'Técnico superior universitario',
  'Licenciatura',
  'Posgrado',
].map((nombre, indice) => ({ id: indice + 1, nombre, orden: indice + 1 }));

const tamanosEmpresa: CatalogoItem[] = [
  ['Micro', '1 a 10 trabajadores'],
  ['Pequeña', '11 a 50 trabajadores'],
  ['Mediana', '51 a 250 trabajadores'],
  ['Grande', 'Más de 250 trabajadores'],
].map(([nombre, rango], indice) => ({ id: indice + 1, nombre, rango }));

const categorias: CatalogoItem[] = [
  ['Tecnologías de la información', 'Desarrollo, soporte y administración de sistemas'],
  ['Administración', 'Gestión administrativa y contable'],
  ['Atención a clientes', 'Servicio y atención presencial o remota'],
  ['Diseño y comunicación', 'Diseño gráfico, contenidos y comunicación'],
  ['Producción y logística', 'Operación, almacén y cadena de suministro'],
].map(([nombre, descripcion], indice) => ({ id: indice + 1, nombre, descripcion }));

const habilidades: CatalogoItem[] = [
  [1, 'Python'],
  [1, 'JavaScript'],
  [1, 'SQL'],
  [1, 'Soporte técnico'],
  [1, 'Redes'],
  [2, 'Excel'],
  [2, 'Contabilidad'],
  [2, 'Facturación electrónica'],
  [3, 'Atención telefónica'],
  [3, 'Manejo de CRM'],
  [3, 'Comunicación escrita'],
  [4, 'Diseño gráfico'],
  [4, 'Redacción'],
  [5, 'Control de inventarios'],
  [5, 'Manejo de ERP'],
].map(([categoria, nombre], indice) => ({
  id: indice + 1,
  nombre: nombre as string,
  categoria_id: categoria as number,
}));

const ajustes: CatalogoItem[] = [
  ['movilidad', 'Acceso con rampa', 'Entrada y áreas de trabajo accesibles en silla de ruedas'],
  ['movilidad', 'Elevador', 'Acceso a pisos superiores sin escaleras'],
  ['movilidad', 'Baño accesible', 'Sanitario adaptado para personas usuarias de silla de ruedas'],
  [
    'visual',
    'Software compatible con lector de pantalla',
    'Herramientas de trabajo que funcionan con NVDA, JAWS o VoiceOver',
  ],
  [
    'visual',
    'Documentos en formato accesible',
    'Materiales en formatos legibles por lector de pantalla o en macrotipo',
  ],
  [
    'auditiva',
    'Intérprete de Lengua de Señas Mexicana',
    'Intérprete de LSM en reuniones y capacitaciones',
  ],
  ['auditiva', 'Comunicación por escrito', 'Instrucciones y avisos por mensaje o correo'],
  ['auditiva', 'Alertas visuales', 'Alarmas y avisos con señal luminosa'],
  ['comunicacion', 'Subtitulado en reuniones', 'Subtítulos en videollamadas y capacitaciones'],
  [
    'cognitiva_psicosocial',
    'Instrucciones por escrito y paso a paso',
    'Tareas explicadas por escrito y en pasos claros',
  ],
  [
    'cognitiva_psicosocial',
    'Espacio de trabajo tranquilo',
    'Área con poco ruido y pocas distracciones',
  ],
  ['general', 'Horario flexible', 'Posibilidad de ajustar horarios de entrada y salida'],
  ['general', 'Trabajo remoto', 'Posibilidad de trabajar desde casa'],
].map(([categoria, nombre, descripcion], indice) => ({
  id: indice + 1,
  nombre,
  categoria,
  descripcion,
}));

const motivosReporte: CatalogoItem[] = [
  ['Discriminación', 'todos'],
  ['Información falsa', 'todos'],
  ['Vacante engañosa o fraudulenta', 'vacante'],
  ['Solicitud de pago al candidato', 'vacante'],
  ['Contenido inapropiado', 'todos'],
  ['Otro', 'todos'],
].map(([nombre, aplicaA], indice) => ({ id: indice + 1, nombre, aplica_a: aplicaA }));

export const CATALOGOS: Record<string, CatalogoItem[]> = {
  entidades,
  municipios,
  modalidades: simples(['Presencial', 'Remoto', 'Híbrido']),
  jornadas: simples(['Tiempo completo', 'Medio tiempo', 'Por horas', 'Fines de semana']),
  'tipos-contrato': simples(['Indefinido', 'Temporal', 'Por proyecto', 'Prácticas profesionales']),
  'niveles-educativos': nivelesEducativos,
  sectores: simples([
    'Manufactura',
    'Comercio',
    'Servicios profesionales',
    'Tecnologías de la información',
    'Salud',
    'Educación',
    'Gobierno',
  ]),
  'tamanos-empresa': tamanosEmpresa,
  categorias,
  habilidades,
  ajustes,
  'motivos-reporte': motivosReporte,
};

export function existeEnCatalogo(tipo: string, id: unknown): boolean {
  return CATALOGOS[tipo]?.some((item) => item.id === id) ?? false;
}
