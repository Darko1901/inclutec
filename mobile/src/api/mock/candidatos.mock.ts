import type { ArchivoLocal, CandidatosServicio } from '../candidatos';
import type {
  CV,
  EliminarCuenta,
  Experiencia,
  ExperienciaEntrada,
  Formacion,
  FormacionEntrada,
  HabilidadCandidato,
  HabilidadesEntrada,
  NecesidadesEntrada,
  PerfilCandidatoEntrada,
} from '../tipos';
import {
  lanzarSiHayCampos,
  MAX_FOTO_BYTES,
  validarExperiencia,
  validarFormacion,
  validarHabilidades,
  validarNecesidades,
  validarPerfil,
} from './candidatos.validacion';
import { exigirSesion, obtenerEstado, type UsuarioMock } from './datos';
import {
  aIso,
  type CandidatoMock,
  type ExperienciaMock,
  type FormacionMock,
} from './negocio.datos';
import { fallo, simular } from './simulador';
import {
  ajusteRefDe,
  candidatoDe,
  itemDe,
  municipioDe,
  nivelDe,
  perfilDeCandidato,
  refDe,
} from './vistas';

// Cada operación guarda el cambio en el candidato y deja que la completitud, las secciones
// pendientes y la compatibilidad con las vacantes publicadas se calculen al leerlas
// (analizarPerfil y compatibilidad.ts): así nunca quedan desfasadas de los datos.

function sesionCandidato(): { usuario: UsuarioMock; candidato: CandidatoMock } {
  const usuario = exigirSesion(['candidato']);
  return { usuario, candidato: candidatoDe(usuario) };
}

const tocar = (candidato: CandidatoMock) => {
  candidato.actualizado_en = aIso(new Date());
};

const textoONulo = (valor: string | null | undefined) => {
  const texto = valor?.trim();
  return texto ? texto : null;
};

const sinRepetidos = (ids: number[]) => [...new Set(ids)];

function noEncontrado(): never {
  throw fallo(404, 'no_encontrado', 'No encontramos ese registro.');
}

function esFotoValida(archivo: ArchivoLocal): boolean {
  const tipo = archivo.tipo?.toLowerCase();
  if (tipo) return ['image/jpeg', 'image/jpg', 'image/png'].includes(tipo);
  return /\.(jpe?g|png)$/i.test(archivo.nombre ?? archivo.uri ?? '');
}

// Experiencias de la más reciente a la más antigua: primero el trabajo actual y luego por fin.
function claveReciente(experiencia: ExperienciaMock): string {
  return `${experiencia.actual ? '9999-12-31' : (experiencia.fecha_fin ?? '')}|${experiencia.fecha_inicio}`;
}

const vistaExperiencia = (e: ExperienciaMock): Experiencia => ({ ...e });

function vistaFormacion(f: FormacionMock): Formacion {
  return {
    id: f.id,
    nivel_educativo: nivelDe(f.nivel_educativo_id),
    institucion: f.institucion,
    carrera: f.carrera,
    estado: f.estado,
    fecha_inicio: f.fecha_inicio,
    fecha_fin: f.fecha_fin,
  };
}

const vistaHabilidades = (candidato: CandidatoMock): HabilidadCandidato[] =>
  candidato.habilidades.map(({ habilidad_id, nivel }) => ({
    id: habilidad_id,
    nombre: itemDe('habilidades', habilidad_id).nombre,
    nivel,
  }));

function datosDeExperiencia(datos: ExperienciaEntrada): Omit<ExperienciaMock, 'id'> {
  return {
    puesto: datos.puesto.trim(),
    empresa: datos.empresa.trim(),
    fecha_inicio: datos.fecha_inicio,
    fecha_fin: datos.actual ? null : datos.fecha_fin,
    actual: datos.actual,
    descripcion: textoONulo(datos.descripcion),
  };
}

function datosDeFormacion(datos: FormacionEntrada): Omit<FormacionMock, 'id'> {
  return {
    nivel_educativo_id: datos.nivel_educativo_id,
    institucion: datos.institucion.trim(),
    carrera: textoONulo(datos.carrera),
    estado: datos.estado,
    fecha_inicio: datos.fecha_inicio,
    fecha_fin: datos.fecha_fin,
  };
}

export class CandidatosMock implements CandidatosServicio {
  obtenerPerfil() {
    return simular(() => {
      const { usuario, candidato } = sesionCandidato();
      return perfilDeCandidato(usuario, candidato);
    });
  }

  actualizarPerfil(datos: PerfilCandidatoEntrada) {
    return simular(() => {
      const { usuario, candidato } = sesionCandidato();
      lanzarSiHayCampos(validarPerfil(datos));

      usuario.usuario.nombre = datos.nombre.trim();
      usuario.usuario.apellidos = datos.apellidos.trim();
      usuario.usuario.telefono = datos.telefono;
      candidato.municipio_id = datos.municipio_id;
      candidato.jornada_id = datos.jornada_id;
      candidato.resumen = textoONulo(datos.resumen);
      candidato.disponible_reubicacion = datos.disponible_reubicacion;
      candidato.modalidad_ids = sinRepetidos(datos.modalidad_ids);
      candidato.categoria_ids = sinRepetidos(datos.categoria_ids);
      candidato.compartir_ajustes = datos.compartir_ajustes;
      tocar(candidato);
      return perfilDeCandidato(usuario, candidato);
    });
  }

  subirFoto(archivo: ArchivoLocal) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      if (!archivo?.uri || !esFotoValida(archivo)) {
        throw fallo(422, 'archivo_invalido', 'La foto debe ser JPG o PNG.');
      }
      if (archivo.tamano !== undefined && archivo.tamano > MAX_FOTO_BYTES) {
        throw fallo(422, 'archivo_invalido', 'La foto pesa más de 2 MB. Elige una más ligera.');
      }
      // El mock no tiene servidor de archivos: guarda la URI local y la usa como ruta pública.
      candidato.foto_url = archivo.uri;
      tocar(candidato);
      return { url: archivo.uri };
    });
  }

  quitarFoto() {
    return simular(() => {
      const { candidato } = sesionCandidato();
      candidato.foto_url = null;
      tocar(candidato);
    });
  }

  cambiarConsentimiento(otorgado: boolean) {
    return simular(() => {
      const { usuario, candidato } = sesionCandidato();
      if (typeof otorgado !== 'boolean') {
        throw fallo(422, 'validacion', 'Revisa los datos marcados.', {
          campos: { otorgado: 'Indica si otorgas o retiras tu consentimiento.' },
        });
      }
      if (otorgado) {
        candidato.consentimiento_sensibles_en ??= aIso(new Date());
      } else {
        // Al revocarlo se borran las necesidades de ajuste y la nota.
        candidato.consentimiento_sensibles_en = null;
        candidato.necesidad_ids = [];
        candidato.nota_ajustes = null;
      }
      usuario.usuario.consentimiento_sensibles = otorgado;
      tocar(candidato);
      return perfilDeCandidato(usuario, candidato);
    });
  }

  guardarNecesidades(datos: NecesidadesEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      if (candidato.consentimiento_sensibles_en === null) {
        throw fallo(
          403,
          'sin_consentimiento',
          'Para registrar tus necesidades de ajuste, primero da tu consentimiento.',
        );
      }
      lanzarSiHayCampos(validarNecesidades(datos));
      candidato.necesidad_ids = sinRepetidos(datos.ajuste_ids);
      candidato.nota_ajustes = textoONulo(datos.nota_ajustes);
      tocar(candidato);
      return {
        necesidades: candidato.necesidad_ids.map(ajusteRefDe),
        nota_ajustes: candidato.nota_ajustes,
      };
    });
  }

  eliminarCuenta(datos: EliminarCuenta) {
    return simular(() => {
      const { usuario, candidato } = sesionCandidato();
      if (usuario.contrasena !== datos?.contrasena) {
        throw fallo(400, 'contrasena_incorrecta', 'La contraseña no coincide.');
      }
      const estado = obtenerEstado();
      const ahora = aIso(new Date());
      // Las postulaciones activas pasan a «retirada» y queda el rastro en su historial.
      estado.postulaciones
        .filter(
          (p) =>
            p.candidato_id === candidato.usuario_id &&
            ['postulada', 'en_revision', 'entrevista'].includes(p.estado),
        )
        .forEach((p) => {
          p.historial.push({
            estado_anterior: p.estado,
            estado_nuevo: 'retirada',
            mensaje: null,
            creado_en: ahora,
          });
          p.estado = 'retirada';
          p.actualizado_en = ahora;
        });
      // Baja lógica: se borran necesidades, foto, CV y dispositivos.
      candidato.consentimiento_sensibles_en = null;
      candidato.necesidad_ids = [];
      candidato.nota_ajustes = null;
      candidato.foto_url = null;
      candidato.experiencias = [];
      candidato.formaciones = [];
      candidato.habilidades = [];
      tocar(candidato);
      for (const [token, dispositivo] of estado.dispositivos) {
        if (dispositivo.usuarioId === usuario.usuario.id) estado.dispositivos.delete(token);
      }
      usuario.usuario.estado = 'eliminado';
    });
  }

  listarExperiencias() {
    return simular(() => {
      const { candidato } = sesionCandidato();
      return [...candidato.experiencias]
        .sort((a, b) => claveReciente(b).localeCompare(claveReciente(a)))
        .map(vistaExperiencia);
    });
  }

  crearExperiencia(datos: ExperienciaEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      lanzarSiHayCampos(validarExperiencia(datos));
      const experiencia = {
        id: obtenerEstado().siguienteIdExperiencia++,
        ...datosDeExperiencia(datos),
      };
      candidato.experiencias.push(experiencia);
      tocar(candidato);
      return vistaExperiencia(experiencia);
    });
  }

  editarExperiencia(id: number, datos: ExperienciaEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      const experiencia = candidato.experiencias.find((e) => e.id === id) ?? noEncontrado();
      lanzarSiHayCampos(validarExperiencia(datos));
      Object.assign(experiencia, datosDeExperiencia(datos));
      tocar(candidato);
      return vistaExperiencia(experiencia);
    });
  }

  eliminarExperiencia(id: number) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      if (!candidato.experiencias.some((e) => e.id === id)) noEncontrado();
      candidato.experiencias = candidato.experiencias.filter((e) => e.id !== id);
      tocar(candidato);
    });
  }

  listarFormaciones() {
    return simular(() => {
      const { candidato } = sesionCandidato();
      return [...candidato.formaciones]
        .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? ''))
        .map(vistaFormacion);
    });
  }

  crearFormacion(datos: FormacionEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      lanzarSiHayCampos(validarFormacion(datos));
      const formacion = {
        id: obtenerEstado().siguienteIdFormacion++,
        ...datosDeFormacion(datos),
      };
      candidato.formaciones.push(formacion);
      tocar(candidato);
      return vistaFormacion(formacion);
    });
  }

  editarFormacion(id: number, datos: FormacionEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      const formacion = candidato.formaciones.find((f) => f.id === id) ?? noEncontrado();
      lanzarSiHayCampos(validarFormacion(datos));
      Object.assign(formacion, datosDeFormacion(datos));
      tocar(candidato);
      return vistaFormacion(formacion);
    });
  }

  eliminarFormacion(id: number) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      if (!candidato.formaciones.some((f) => f.id === id)) noEncontrado();
      candidato.formaciones = candidato.formaciones.filter((f) => f.id !== id);
      tocar(candidato);
    });
  }

  listarHabilidades() {
    return simular(() => vistaHabilidades(sesionCandidato().candidato));
  }

  guardarHabilidades(datos: HabilidadesEntrada) {
    return simular(() => {
      const { candidato } = sesionCandidato();
      validarHabilidades(datos);
      candidato.habilidades = datos.habilidades.map(({ habilidad_id, nivel }) => ({
        habilidad_id,
        nivel,
      }));
      tocar(candidato);
      return vistaHabilidades(candidato);
    });
  }

  vistaPrevia() {
    return simular((): CV => {
      const { usuario, candidato } = sesionCandidato();
      const { id, nombre, apellidos } = usuario.usuario;
      return {
        id,
        nombre,
        apellidos,
        foto_url: candidato.foto_url,
        municipio: candidato.municipio_id ? municipioDe(candidato.municipio_id) : null,
        resumen: candidato.resumen,
        modalidades: candidato.modalidad_ids.map((m) => refDe('modalidades', m)),
        experiencias: [...candidato.experiencias]
          .sort((a, b) => claveReciente(b).localeCompare(claveReciente(a)))
          .map(vistaExperiencia),
        formaciones: [...candidato.formaciones]
          .sort((a, b) => (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? ''))
          .map(vistaFormacion),
        habilidades: vistaHabilidades(candidato),
        // El contacto se muestra a la empresa solo desde el estado «entrevista».
        correo: null,
        telefono: null,
      };
    });
  }
}
