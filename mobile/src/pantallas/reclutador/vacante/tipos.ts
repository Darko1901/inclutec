import type { VacanteDetalle } from '../../../api';
import type { Errores, FormularioVacante } from './formulario';

export interface PropiedadesPaso {
  formulario: FormularioVacante;
  /** Cambia uno o varios campos del formulario. */
  cambiar: (cambio: Partial<FormularioVacante>) => void;
  errores: Errores;
  /** Quita el error de un campo cuando la persona lo corrige. */
  limpiar: (...campos: string[]) => void;
  /** La vacante que se edita (null si es nueva): sus opciones se muestran aunque ya no se ofrezcan. */
  guardada: VacanteDetalle | null;
}
