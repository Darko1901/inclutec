// Fechas del CV: el API guarda «AAAA-MM-DD» y la app solo pide mes y año (siempre el día 1).
// Se trabaja con el texto, sin crear fechas, para que la zona horaria nunca mueva el mes.

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const NOMBRES_MESES: readonly string[] = MESES;

export interface MesAnio {
  mes: number | null;
  anio: number | null;
}

export const SIN_FECHA: MesAnio = { mes: null, anio: null };

/** «2023-02-15» → { mes: 2, anio: 2023 }; null o texto inválido → vacío. */
export function leerMesAnio(fecha: string | null): MesAnio {
  const coincidencia = fecha ? /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha) : null;
  if (!coincidencia) return SIN_FECHA;
  return { mes: Number(coincidencia[2]), anio: Number(coincidencia[1]) };
}

/** { mes: 2, anio: 2023 } → «2023-02-01»; incompleto → null. */
export function aFechaApi({ mes, anio }: MesAnio): string | null {
  if (mes === null || anio === null) return null;
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/** «2023-02-01» → «feb 2023». */
export function mesAnioCorto(fecha: string): string {
  const { mes, anio } = leerMesAnio(fecha);
  return mes === null ? '' : `${MESES[mes - 1].slice(0, 3)} ${anio}`;
}

/** «2023-02-01» → «febrero de 2023» (para el lector de pantalla). */
export function mesAnioLargo(fecha: string): string {
  const { mes, anio } = leerMesAnio(fecha);
  return mes === null ? '' : `${MESES[mes - 1]} de ${anio}`;
}

interface Periodo {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  /** Solo las experiencias: «Trabajo aquí actualmente». */
  actual?: boolean;
}

/** «feb 2023 – jun 2025», «feb 2023 – actual» o solo el inicio/fin que haya. */
export function periodoCorto({ fecha_inicio, fecha_fin, actual }: Periodo): string {
  const inicio = fecha_inicio ? mesAnioCorto(fecha_inicio) : '';
  const fin = actual ? 'actual' : fecha_fin ? mesAnioCorto(fecha_fin) : '';
  if (inicio && fin) return `${inicio} – ${fin}`;
  return inicio || fin;
}

/** El mismo periodo dicho en voz alta: «de febrero de 2023 a junio de 2025». */
export function periodoAccesible({ fecha_inicio, fecha_fin, actual }: Periodo): string {
  const inicio = fecha_inicio ? mesAnioLargo(fecha_inicio) : '';
  const fin = actual ? 'la fecha' : fecha_fin ? mesAnioLargo(fecha_fin) : '';
  if (inicio && fin) return `de ${inicio} a ${fin}`;
  if (inicio) return `desde ${inicio}`;
  return fin ? `hasta ${fin}` : '';
}
