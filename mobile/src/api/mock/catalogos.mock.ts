import type { CatalogosServicio, TipoCatalogo } from '../catalogos';
import type { CatalogoItem, ConsultaCatalogo } from '../tipos';
import { CATALOGOS } from './catalogos.datos';
import { fallo, simular } from './simulador';

const comparar = (a: CatalogoItem, b: CatalogoItem) => a.nombre.localeCompare(b.nombre, 'es');

export class CatalogosMock implements CatalogosServicio {
  listar(tipo: TipoCatalogo, filtros: ConsultaCatalogo = {}) {
    return simular(() => {
      const catalogo = CATALOGOS[tipo];
      if (!catalogo) throw fallo(404, 'no_encontrado', 'El catálogo no existe.');

      let items = catalogo;
      if (tipo === 'municipios' && filtros.entidad_id !== undefined) {
        items = items.filter((item) => item.entidad_federativa_id === filtros.entidad_id);
      }
      if (tipo === 'habilidades') {
        if (filtros.categoria_id !== undefined) {
          items = items.filter((item) => item.categoria_id === filtros.categoria_id);
        }
        if (filtros.q !== undefined) {
          const texto = filtros.q.trim().toLowerCase();
          if (texto.length < 2) {
            throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
              campos: { q: 'Escribe al menos 2 caracteres.' },
            });
          }
          items = items.filter((item) => item.nombre.toLowerCase().includes(texto)).slice(0, 20);
        }
      }
      if (tipo === 'motivos-reporte' && filtros.aplica_a !== undefined) {
        items = items.filter(
          (item) => item.aplica_a === 'todos' || item.aplica_a === filtros.aplica_a,
        );
      }

      // Ordenados por nombre; los niveles educativos, por `orden`.
      return tipo === 'niveles-educativos'
        ? [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        : [...items].sort(comparar);
    });
  }
}
