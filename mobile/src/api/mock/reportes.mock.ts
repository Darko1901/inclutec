import type { ReportesServicio } from '../reportes';
import type { ReporteCreado, ReporteEntrada } from '../tipos';
import { CATALOGOS } from './catalogos.datos';
import { exigirSesion, obtenerEstado } from './datos';
import { aIso } from './negocio.datos';
import { fallo, simular } from './simulador';
import { esVisibleParaCandidato } from './vistas';

const LONGITUD_MAX_DESCRIPCION = 500;

type Objeto = 'vacante' | 'empresa' | 'candidato';

export class ReportesMock implements ReportesServicio {
  crear(datos: ReporteEntrada) {
    return simular((): ReporteCreado => {
      const { usuario } = exigirSesion(['candidato', 'reclutador']);
      const estado = obtenerEstado();

      const indicados = (['vacante', 'empresa', 'candidato'] as const).filter(
        (objeto) => datos[`${objeto}_id`] !== undefined && datos[`${objeto}_id`] !== null,
      );
      const campos: Record<string, string> = {};
      if (indicados.length !== 1) {
        campos.vacante_id = 'Indica exactamente una vacante, una empresa o un candidato.';
      }
      const objeto: Objeto | undefined = indicados[0];
      const motivo = CATALOGOS['motivos-reporte'].find((m) => m.id === datos.motivo_reporte_id);
      if (!motivo) {
        campos.motivo_reporte_id = 'Elige un motivo de la lista.';
      } else if (objeto && motivo.aplica_a !== 'todos' && motivo.aplica_a !== objeto) {
        campos.motivo_reporte_id = 'Ese motivo no aplica a lo que estás reportando.';
      }
      if (
        datos.descripcion !== undefined &&
        datos.descripcion !== null &&
        datos.descripcion.length > LONGITUD_MAX_DESCRIPCION
      ) {
        campos.descripcion = `La descripción puede tener hasta ${LONGITUD_MAX_DESCRIPCION} caracteres.`;
      }
      if (Object.keys(campos).length > 0) {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', { campos });
      }

      // El candidato reporta vacantes y empresas; el reclutador, candidatos.
      const permitidos: Objeto[] =
        usuario.rol === 'candidato' ? ['vacante', 'empresa'] : ['candidato'];
      if (!objeto || !permitidos.includes(objeto)) {
        throw fallo(403, 'sin_permiso', 'No tienes permiso para realizar esta operación.');
      }
      const noEncontrado = fallo(404, 'no_encontrado', 'Lo que quieres reportar ya no existe.');
      if (objeto === 'vacante') {
        const vacante = estado.vacantes.find((v) => v.id === datos.vacante_id);
        if (!vacante || !esVisibleParaCandidato(vacante)) throw noEncontrado;
      } else if (objeto === 'empresa') {
        const empresa = estado.empresas.find((e) => e.id === datos.empresa_id);
        if (!empresa || empresa.estado !== 'validada') throw noEncontrado;
      } else if (!estado.candidatos.some((c) => c.usuario_id === datos.candidato_id)) {
        throw noEncontrado;
      }

      const reporte = {
        id: estado.siguienteIdReporte++,
        reportante_id: usuario.id,
        motivo_reporte_id: datos.motivo_reporte_id,
        vacante_id: datos.vacante_id ?? null,
        empresa_id: datos.empresa_id ?? null,
        candidato_id: datos.candidato_id ?? null,
        descripcion: datos.descripcion?.trim() ? datos.descripcion.trim() : null,
        estado: 'abierto' as const,
        creado_en: aIso(new Date()),
      };
      estado.reportes.push(reporte);
      return { id: reporte.id, estado: reporte.estado, creado_en: reporte.creado_en };
    });
  }
}
