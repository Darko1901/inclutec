import type { ArchivoLocal } from '../candidatos';
import type { EmpresasServicio } from '../empresas';
import type {
  ConsultaEmpresas,
  ConsultaMisVacantes,
  EmpresaEntrada,
  EmpresaPropia,
  EmpresaPublica,
  PaginaEmpresas,
  PaginaVacantesReclutador,
} from '../tipos';
import { exigirSesion, obtenerEstado } from './datos';
import {
  exigirConstanciaValida,
  exigirLogoValido,
  lanzarSiEmpresaInvalida,
} from './empresas.validacion';
import type { EmpresaMock } from './negocio.datos';
import { lanzarSiHayCampos, leerPagina, paginar } from './paginacion';
import { fallo, simular } from './simulador';
import {
  fichaDeEmpresa,
  resumenDeEmpresa,
  resumenParaReclutador,
  vistaDeEmpresaPropia,
} from './vistas';

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ESTADOS_VACANTE = ['borrador', 'publicada', 'pausada', 'cerrada', 'suspendida'];

/** Solo las empresas validadas son públicas. */
function validadas() {
  return obtenerEstado().empresas.filter((e) => e.estado === 'validada');
}

/** Empresa del reclutador de la sesión. */
export function empresaDeLaSesion(): EmpresaMock {
  const usuario = exigirSesion(['reclutador']);
  const empresa = obtenerEstado().empresas.find((e) => e.id === usuario.usuario.empresa?.id);
  if (!empresa) throw fallo(404, 'no_encontrado', 'No encontramos tu empresa.');
  return empresa;
}

/** Mantiene al día lo que la sesión dice de la empresa (nombre y estado de validación). */
function sincronizarUsuarios(empresa: EmpresaMock): void {
  for (const { usuario } of obtenerEstado().usuarios) {
    if (usuario.empresa?.id === empresa.id) {
      usuario.empresa = {
        id: empresa.id,
        nombre_comercial: empresa.nombre_comercial,
        estado: empresa.estado,
      };
    }
  }
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

  miOrganizacion() {
    return simular((): EmpresaPropia => vistaDeEmpresaPropia(empresaDeLaSesion()));
  }

  actualizarMiOrganizacion(datos: EmpresaEntrada) {
    return simular((): EmpresaPropia => {
      const empresa = empresaDeLaSesion();
      lanzarSiEmpresaInvalida(datos);

      const cambiaRazon =
        datos.razon_social !== undefined && datos.razon_social.trim() !== empresa.razon_social;
      const cambiaRfc = datos.rfc !== undefined && datos.rfc !== empresa.rfc;
      if (empresa.estado === 'validada' && (cambiaRazon || cambiaRfc)) {
        throw fallo(
          403,
          'datos_fiscales_bloqueados',
          'La razón social y el RFC de una empresa validada solo los cambia soporte.',
        );
      }
      const estado = obtenerEstado();
      if (cambiaRfc && estado.rfcRegistrados.includes(datos.rfc as string)) {
        throw fallo(409, 'rfc_duplicado', 'Otra empresa ya registró ese RFC.', {
          campos: { rfc: 'Otra empresa ya registró ese RFC.' },
        });
      }

      if (cambiaRfc) {
        estado.rfcRegistrados = estado.rfcRegistrados.filter((rfc) => rfc !== empresa.rfc);
        estado.rfcRegistrados.push(datos.rfc as string);
        empresa.rfc = datos.rfc as string;
      }
      if (cambiaRazon) empresa.razon_social = (datos.razon_social as string).trim();
      empresa.nombre_comercial = datos.nombre_comercial.trim();
      empresa.sector_id = datos.sector_id;
      empresa.tamano_empresa_id = datos.tamano_empresa_id;
      empresa.municipio_id = datos.municipio_id;
      empresa.direccion = datos.direccion?.trim() || null;
      empresa.descripcion = datos.descripcion?.trim() || null;
      empresa.sitio_web = datos.sitio_web?.trim() || null;
      empresa.practicas_inclusion = datos.practicas_inclusion?.trim() || null;
      sincronizarUsuarios(empresa);
      return vistaDeEmpresaPropia(empresa);
    });
  }

  subirLogo(archivo: ArchivoLocal) {
    return simular(() => {
      const empresa = empresaDeLaSesion();
      exigirLogoValido(archivo);
      // El mock no tiene servidor de archivos: guarda la URI local y la usa como ruta pública.
      empresa.logo_url = archivo.uri;
      return { url: archivo.uri };
    });
  }

  subirConstancia(archivo: ArchivoLocal) {
    return simular(() => {
      const empresa = empresaDeLaSesion();
      if (empresa.estado === 'validada' || empresa.estado === 'suspendida') {
        throw fallo(
          409,
          'estado_invalido',
          empresa.estado === 'validada'
            ? 'Tu empresa ya está validada: no necesitas subir otra constancia.'
            : 'Tu empresa está suspendida: escribe a soporte para revisarla.',
        );
      }
      exigirConstanciaValida(archivo);
      empresa.documento_url = archivo.uri;
      // Una empresa rechazada vuelve a «pendiente» para una nueva revisión.
      if (empresa.estado === 'rechazada') {
        empresa.estado = 'pendiente';
        empresa.motivo_estado = null;
        sincronizarUsuarios(empresa);
      }
      return { url: archivo.uri };
    });
  }

  misVacantes(consulta: ConsultaMisVacantes = {}) {
    return simular((): PaginaVacantesReclutador => {
      const empresa = empresaDeLaSesion();
      const { page, size } = leerPagina(consulta);
      if (consulta.estado !== undefined && !ESTADOS_VACANTE.includes(consulta.estado)) {
        lanzarSiHayCampos({
          estado: 'El estado puede ser borrador, publicada, pausada, cerrada o suspendida.',
        });
      }
      const filas = obtenerEstado()
        .vacantes.filter((v) => v.empresa_id === empresa.id)
        .filter((v) => consulta.estado === undefined || v.estado === consulta.estado)
        // Más recientes primero.
        .sort(
          (a, b) =>
            (b.publicada_en ?? b.actualizado_en).localeCompare(
              a.publicada_en ?? a.actualizado_en,
            ) || b.id - a.id,
        )
        .map(resumenParaReclutador);
      return paginar(filas, page, size);
    });
  }
}
