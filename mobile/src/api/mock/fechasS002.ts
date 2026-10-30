// Las fechas de S002 van del 30 de septiembre al 5 de octubre de 2026. Para que la demostración se
// vea igual el día que se grabe, el mock las mueve todas juntas de modo que lo más reciente (la
// postulación de Jorge, del 5 de octubre a las 17:30 UTC) ocurra hace poco y todo lo demás conserve
// su distancia: Mariana se postuló hace unos 5 días, el reporte 1 hace 2, etc. Nada queda en el futuro.
const ULTIMO_EVENTO_S002_MS = Date.parse('2026-10-05T17:30:00Z');
const HORAS_DESDE_EL_ULTIMO_EVENTO = 2;

/** Una fecha de S002 (ISO en UTC) movida para que sea relativa a `ahora`. */
export function relativaAHoy(isoS002: string, ahora = Date.now()): string {
  const desfase = ahora - HORAS_DESDE_EL_ULTIMO_EVENTO * 3600 * 1000 - ULTIMO_EVENTO_S002_MS;
  return new Date(Date.parse(isoS002) + desfase).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
