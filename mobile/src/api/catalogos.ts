import { cliente } from './cliente';
import type { CatalogoItem, ConsultaCatalogo } from './tipos';

export const TIPOS_CATALOGO = [
  'entidades',
  'municipios',
  'modalidades',
  'jornadas',
  'tipos-contrato',
  'niveles-educativos',
  'sectores',
  'tamanos-empresa',
  'categorias',
  'habilidades',
  'ajustes',
  'motivos-reporte',
] as const;

export type TipoCatalogo = (typeof TIPOS_CATALOGO)[number];

/** Catálogos públicos (GET /catalogos/{tipo}). */
export interface CatalogosServicio {
  listar(tipo: TipoCatalogo, filtros?: ConsultaCatalogo): Promise<CatalogoItem[]>;
}

export class CatalogosHttp implements CatalogosServicio {
  async listar(tipo: TipoCatalogo, filtros?: ConsultaCatalogo) {
    return (await cliente.get<CatalogoItem[]>(`/catalogos/${tipo}`, { params: filtros })).data;
  }
}
