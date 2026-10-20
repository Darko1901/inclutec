import type { Errores, FormularioVacante } from './formulario';

export interface PropiedadesPaso {
  formulario: FormularioVacante;
  /** Cambia uno o varios campos del formulario. */
  cambiar: (cambio: Partial<FormularioVacante>) => void;
  errores: Errores;
  /** Quita el error de un campo cuando la persona lo corrige. */
  limpiar: (...campos: string[]) => void;
}
