import type { EmpresasServicio } from '../empresas';
import type { ConsultaEmpresas, EmpresaPublica, PaginaEmpresas } from '../tipos';
import { exigirSesion, obtenerEstado } from './datos';
import { lanzarSiHayCampos, leerPagina, paginar } from './paginacion';
import { fallo, simular } from './simulador';
import { fichaDeEmpresa, resumenDeEmpresa } from './vistas';

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Solo las empresas validadas son públicas. */
function validadas() {
  return obtenerEstado().empresas.filter((e) => e.estado === 'validada');
}

export class EmpresasMock implements EmpresasServicio {
  listar(consulta: ConsultaEmpresas = {}) {
    return simular((): PaginaEmpresas => {
      exigirSesion();
      const { page, size } = leerPagina(consulta);
      if (consulta.sector_id !== undefined && !Number.isInteger(consulta.sector_id)) {
        lanzarSiHayCampos({ sector_id: 'Debe ser un número.' });
      }
      const texto = consulta.q?.trim() ? sinAcentos(consulta.q.trim()) : null;
      const filas = validadas()
        .filter((e) => !texto || sinAcentos(e.nombre_comercial).includes(texto))
        .filter((e) => consulta.sector_id === undefined || e.sector_id === consulta.sector_id)
        .sort((a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial, 'es'))
        .map(resumenDeEmpresa);
      return paginar(filas, page, size);
    });
  }

  detalle(id: number) {
    return simular((): EmpresaPublica => {
      const usuario = exigirSesion();
      const empresa = validadas().find((e) => e.id === id);
      if (!empresa)
        throw fallo(404, 'no_encontrado', 'La empresa no existe o ya no está disponible.');
      const candidato =
        usuario.usuario.rol === 'candidato'
          ? (obtenerEstado().candidatos.find((c) => c.usuario_id === usuario.usuario.id) ?? null)
          : null;
      return fichaDeEmpresa(empresa, candidato);
    });
  }
}
