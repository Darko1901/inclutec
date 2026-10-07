import { configurarSesionApi } from '../../sesionApi';
import { CandidatosMock } from '../candidatos.mock';
import { obtenerEstado } from '../datos';
import { PostulacionesMock } from '../postulaciones.mock';
import { ReportesMock } from '../reportes.mock';
import { crearToken } from '../tokens';
import { VacantesMock } from '../vacantes.mock';

const vacantes = new VacantesMock();
const postulaciones = new PostulacionesMock();
const reportes = new ReportesMock();
const candidatos = new CandidatosMock();

const MARIANA = 3;
const JORGE = 4;
const LUCIA = 101; // perfil vacío

function conSesion(id: number, rol: 'candidato' | 'reclutador' | 'administrador' = 'candidato') {
  const { token } = crearToken(id, rol);
  configurarSesionApi({ obtenerToken: () => token });
}

const ids = async (consulta: Parameters<VacantesMock['buscar']>[0]) =>
  (await vacantes.buscar(consulta)).items.map((v) => v.id);

describe('vacantes mock · recomendadas', () => {
  it('Mariana: solo las 6 publicadas, la de soporte (88 %) primero y por compatibilidad', async () => {
    conSesion(MARIANA);
    const pagina = await vacantes.recomendadas();
    expect(pagina).toMatchObject({ total: 6, page: 1, size: 20 });
    expect(pagina.items.map((v) => [v.id, v.compatibilidad])).toEqual([
      [1, 88],
      [2, 55],
      [4, 43],
      [3, 26],
      [5, 25],
      [6, 15],
    ]);
  });

  it('el primer elemento coincide con el ejemplo del contrato', async () => {
    conSesion(MARIANA);
    const [primera] = (await vacantes.recomendadas()).items;
    expect(primera).toMatchObject({
      id: 1,
      titulo: 'Técnico de soporte de TI',
      empresa: { id: 1, nombre_comercial: 'TecnoQro', validada: true },
      modalidad: { id: 3, nombre: 'Híbrido' },
      municipio: { id: 3, nombre: 'Querétaro', entidad: { id: 22, nombre: 'Querétaro' } },
      salario: { min: 14000, max: 18000 },
      compatibilidad: 88,
      cubre_mis_necesidades: true,
      postulacion_id: 1,
    });
    expect(primera.ajustes).toEqual([
      { id: 1, nombre: 'Acceso con rampa', categoria: 'movilidad', tipo: 'existente' },
      { id: 3, nombre: 'Baño accesible', categoria: 'movilidad', tipo: 'existente' },
      { id: 12, nombre: 'Horario flexible', categoria: 'general', tipo: 'bajo_solicitud' },
    ]);
  });

  it('no incluye borradores y calcula con el candidato de la sesión (Jorge: 79 % primero)', async () => {
    conSesion(JORGE);
    const pagina = await vacantes.recomendadas();
    expect(pagina.items.map((v) => v.id)).not.toContain(7);
    expect(pagina.items.map((v) => v.id)).not.toContain(8);
    expect(pagina.items[0]).toMatchObject({ id: 3, compatibilidad: 79, postulacion_id: 2 });
  });

  it('pagina con page y size', async () => {
    conSesion(MARIANA);
    const segunda = await vacantes.recomendadas({ page: 2, size: 4 });
    expect(segunda).toMatchObject({ total: 6, page: 2, size: 4 });
    expect(segunda.items.map((v) => v.id)).toEqual([5, 6]);
    await expect(vacantes.recomendadas({ size: 101 })).rejects.toMatchObject({ status: 422 });
  });

  it('exige sesión de candidato', async () => {
    await expect(vacantes.recomendadas()).rejects.toMatchObject({
      status: 401,
      codigo: 'no_autenticado',
    });
    conSesion(2, 'reclutador');
    await expect(vacantes.recomendadas()).rejects.toMatchObject({
      status: 403,
      codigo: 'sin_permiso',
    });
  });

  it('no muestra vacantes publicadas de una empresa que no está validada', async () => {
    conSesion(MARIANA);
    obtenerEstado().empresas.find((e) => e.id === 3)!.estado = 'suspendida';
    expect((await vacantes.recomendadas()).items.map((v) => v.id)).not.toContain(4);
  });
});

describe('vacantes mock · buscar', () => {
  beforeEach(() => conSesion(MARIANA));

  it('«soporte» da la vacante 1 (sin importar mayúsculas ni acentos)', async () => {
    expect(await ids({ q: 'soporte' })).toEqual([1]);
    expect(await ids({ q: 'SOPORTE' })).toEqual([1]);
    expect(await ids({ q: 'tecnico' })).toEqual([1]);
  });

  it('busca también en la descripción y en el nombre de la empresa', async () => {
    expect(await ids({ q: 'concentro' })).toEqual([4, 5]);
    expect(await ids({ q: 'conciliaciones' })).toEqual([4]);
  });

  it('pide al menos 3 caracteres', async () => {
    await expect(vacantes.buscar({ q: 'so' })).rejects.toMatchObject({
      status: 422,
      codigo: 'validacion',
      campos: { q: 'Escribe al menos 3 caracteres.' },
    });
  });

  it('modalidad Remoto da las vacantes 4 y 6', async () => {
    expect((await ids({ modalidad_id: 2 })).sort()).toEqual([4, 6]);
  });

  it('ajuste «Intérprete de LSM» (id 6) da las vacantes 2 y 6', async () => {
    expect((await ids({ ajuste_id: [6] })).sort()).toEqual([2, 6]);
  });

  it('con varios ajustes pide que la vacante los declare todos', async () => {
    expect(await ids({ ajuste_id: [6, 1] })).toEqual([2]);
    expect(await ids({ ajuste_id: [6, 4] })).toEqual([6]);
    expect(await ids({ ajuste_id: [6, 13] })).toEqual([]);
  });

  it('cubre_mis_necesidades deja solo las vacantes 1 y 2', async () => {
    expect(await ids({ cubre_mis_necesidades: true })).toEqual([1, 2]);
  });

  it('filtra por categoría, entidad, municipio y jornada', async () => {
    expect((await ids({ categoria_id: 1 })).sort()).toEqual([1, 3, 6]);
    expect((await ids({ entidad_id: 22 })).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await ids({ entidad_id: 14 })).toEqual([]);
    expect((await ids({ municipio_id: 1 })).sort()).toEqual([4, 5]);
    expect(await ids({ jornada_id: 2 })).toEqual([4]);
  });

  it('salario_min usa el salario máximo publicado y descarta los que no lo muestran', async () => {
    expect((await ids({ salario_min: 15000 })).sort()).toEqual([1, 3, 6]);
    // La vacante 4 paga 9000 pero no lo muestra: nunca entra por salario.
    expect((await ids({ salario_min: 1000 })).sort()).toEqual([1, 2, 3, 5, 6]);
  });

  it('compatibilidad_min deja solo las que igualan o superan el puntaje', async () => {
    expect(await ids({ compatibilidad_min: 50 })).toEqual([1, 2]);
    expect(await ids({ compatibilidad_min: 89 })).toEqual([]);
    await expect(vacantes.buscar({ compatibilidad_min: 101 })).rejects.toMatchObject({
      status: 422,
    });
  });

  it('combina todos los filtros con «y»', async () => {
    expect(await ids({ categoria_id: 1, modalidad_id: 2 })).toEqual([6]);
    expect(await ids({ categoria_id: 1, modalidad_id: 1 })).toEqual([]);
  });

  it('ordena por compatibilidad (por omisión) o por las más recientes', async () => {
    expect(await ids({})).toEqual([1, 2, 4, 3, 5, 6]);
    expect(await ids({ orden: 'recientes' })).toEqual([1, 4, 2, 6, 3, 5]);
    await expect(vacantes.buscar({ orden: 'azar' })).rejects.toMatchObject({ status: 422 });
  });

  it('Jorge (sin consentimiento): todas cubren sus necesidades porque no registró ninguna', async () => {
    conSesion(JORGE);
    expect((await ids({ cubre_mis_necesidades: true })).length).toBe(6);
  });
});

describe('vacantes mock · detalle y compatibilidad', () => {
  it('detalle de la vacante 1 con habilidades obligatorias, ajustes y postulacion_id', async () => {
    conSesion(MARIANA);
    const detalle = await vacantes.detalle(1);
    expect(detalle).toMatchObject({
      id: 1,
      plazas: 2,
      tipo_contrato: { id: 1, nombre: 'Indefinido' },
      nivel_educativo: { id: 4, nombre: 'Técnico superior universitario', orden: 4 },
      experiencia_anios: 1,
      sin_condiciones_accesibilidad: false,
      postulacion_id: 1,
      estado: 'publicada',
    });
    expect(detalle.habilidades.filter((h) => h.obligatoria).map((h) => h.nombre)).toEqual([
      'Soporte técnico',
      'Redes',
      'SQL',
      'Comunicación escrita',
    ]);
    expect(detalle.ajustes[2]).toMatchObject({ id: 12, tipo: 'bajo_solicitud' });
    expect(detalle.ajustes[0].descripcion).toMatch(/silla de ruedas/);
  });

  it('la vacante de ConCentro de atención telefónica declara que no tiene condiciones', async () => {
    conSesion(MARIANA);
    const detalle = await vacantes.detalle(5);
    expect(detalle).toMatchObject({
      sin_condiciones_accesibilidad: true,
      ajustes: [],
      postulacion_id: null,
    });
  });

  it('el salario es null si la empresa no lo muestra', async () => {
    conSesion(MARIANA);
    expect((await vacantes.detalle(4)).salario).toBeNull();
  });

  it('un borrador o una vacante inexistente responde 404', async () => {
    conSesion(MARIANA);
    await expect(vacantes.detalle(7)).rejects.toMatchObject({
      status: 404,
      codigo: 'no_encontrado',
    });
    await expect(vacantes.detalle(999)).rejects.toMatchObject({ status: 404 });
    await expect(vacantes.compatibilidad(8)).rejects.toMatchObject({ status: 404 });
  });

  it('desglose de Mariana con la vacante 1, como el ejemplo del contrato', async () => {
    conSesion(MARIANA);
    const desglose = await vacantes.compatibilidad(1);
    expect(desglose).toMatchObject({
      puntaje: 88,
      componentes: { h: 0.7, a: 1, m: 1, f: 1 },
      habilidades: {
        obligatorias_cumplidas: [
          { id: 4, nombre: 'Soporte técnico' },
          { id: 5, nombre: 'Redes' },
          { id: 11, nombre: 'Comunicación escrita' },
        ],
        obligatorias_faltantes: [{ id: 3, nombre: 'SQL' }],
        deseables_cumplidas: [{ id: 6, nombre: 'Excel' }],
        deseables_faltantes: [{ id: 2, nombre: 'JavaScript' }],
      },
      modalidad: { vacante: { id: 3, nombre: 'Híbrido' }, coincide: true },
      formacion: {
        requerida: { id: 4, nombre: 'Técnico superior universitario', orden: 4 },
        cumple: 'si',
      },
    });
    expect(desglose.necesidades.cubiertas).toEqual([
      { id: 1, nombre: 'Acceso con rampa', categoria: 'movilidad', tipo: 'existente' },
      { id: 3, nombre: 'Baño accesible', categoria: 'movilidad', tipo: 'existente' },
    ]);
    expect(desglose.necesidades.no_cubiertas).toEqual([]);
  });

  it('el desglose de Jorge marca modalidad que no coincide y formación «cursando»', async () => {
    conSesion(JORGE);
    expect(await vacantes.compatibilidad(1)).toMatchObject({
      puntaje: 57,
      modalidad: { coincide: false },
      formacion: { cumple: 'cursando' },
    });
  });
});

describe('postulaciones mock', () => {
  it('Mariana se postula a otra vacante: 201, estado «postulada» y el listado la marca', async () => {
    conSesion(MARIANA);
    const creada = await postulaciones.crear({
      vacante_id: 2,
      mensaje: 'Me interesa el puesto.',
      compartir_ajustes: true,
    });
    expect(creada).toMatchObject({
      id: 3,
      vacante: { id: 2, titulo: 'Auxiliar de almacén', empresa: { nombre_comercial: 'LogiBajío' } },
      estado: 'postulada',
      mensaje: 'Me interesa el puesto.',
      comparte_ajustes: true,
      entrevista: null,
      puede_retirar: true,
    });
    expect(creada.historial).toHaveLength(1);
    expect((await vacantes.detalle(2)).postulacion_id).toBe(3);
    expect((await vacantes.buscar({ q: 'almacen' })).items[0].postulacion_id).toBe(3);
  });

  it('avisa al reclutador de la empresa con una notificación nueva_postulacion', async () => {
    conSesion(MARIANA);
    const creada = await postulaciones.crear({
      vacante_id: 2,
      mensaje: null,
      compartir_ajustes: false,
    });
    expect(
      obtenerEstado().notificaciones.find((n) => n.usuario_id === 5 && n.id !== 3),
    ).toMatchObject({
      tipo: 'nueva_postulacion',
      mensaje: 'Mariana López García se postuló a Auxiliar de almacén.',
      referencia: { tipo: 'postulacion', id: creada.id },
      leida: false,
    });
  });

  it('responde 409 postulacion_duplicada si ya se postuló (vacante 1)', async () => {
    conSesion(MARIANA);
    await expect(
      postulaciones.crear({ vacante_id: 1, mensaje: null, compartir_ajustes: true }),
    ).rejects.toMatchObject({ status: 409, codigo: 'postulacion_duplicada' });
  });

  it('responde 409 vacante_no_disponible si la vacante ya no está publicada', async () => {
    conSesion(MARIANA);
    obtenerEstado().vacantes.find((v) => v.id === 2)!.estado = 'pausada';
    await expect(
      postulaciones.crear({ vacante_id: 2, mensaje: null, compartir_ajustes: false }),
    ).rejects.toMatchObject({ status: 409, codigo: 'vacante_no_disponible' });
  });

  it('responde 404 con un borrador o una vacante que no existe', async () => {
    conSesion(MARIANA);
    await expect(
      postulaciones.crear({ vacante_id: 7, mensaje: null, compartir_ajustes: false }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      postulaciones.crear({ vacante_id: 999, mensaje: null, compartir_ajustes: false }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('con el perfil incompleto responde 422 perfil_incompleto y dice qué falta', async () => {
    conSesion(LUCIA);
    const error = await postulaciones
      .crear({ vacante_id: 2, mensaje: null, compartir_ajustes: false })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({
      status: 422,
      codigo: 'perfil_incompleto',
      campos: {
        habilidades: 'Agrega al menos una habilidad.',
        formaciones: 'Agrega al menos una formación académica.',
      },
    });
    expect((error as { campos: Record<string, string> }).campos).not.toHaveProperty('nombre');
    expect((await vacantes.detalle(2)).postulacion_id).toBeNull();
  });

  it('si no hay consentimiento guarda comparte_ajustes en false aunque pida true', async () => {
    conSesion(JORGE);
    const creada = await postulaciones.crear({
      vacante_id: 2,
      mensaje: null,
      compartir_ajustes: true,
    });
    expect(creada.comparte_ajustes).toBe(false);
  });

  it('valida mensaje de más de 500 caracteres y compartir_ajustes', async () => {
    conSesion(MARIANA);
    await expect(
      postulaciones.crear({
        vacante_id: 2,
        mensaje: 'x'.repeat(501),
        compartir_ajustes: 'si' as unknown as boolean,
      }),
    ).rejects.toMatchObject({
      status: 422,
      campos: { mensaje: expect.any(String), compartir_ajustes: expect.any(String) },
    });
  });
});

describe('reportes mock', () => {
  it('crea el reporte de una vacante con un motivo que aplica', async () => {
    conSesion(MARIANA);
    const reporte = await reportes.crear({
      motivo_reporte_id: 4,
      vacante_id: 1,
      descripcion: 'Me pidieron un depósito para agendar la entrevista.',
    });
    expect(reporte).toMatchObject({ id: 2, estado: 'abierto' });
    expect(reporte.creado_en).toMatch(/Z$/);
  });

  it('rechaza un motivo que no aplica a vacantes y un reporte sin objeto', async () => {
    conSesion(MARIANA);
    await expect(reportes.crear({ motivo_reporte_id: 99, vacante_id: 1 })).rejects.toMatchObject({
      status: 422,
      campos: { motivo_reporte_id: expect.any(String) },
    });
    await expect(reportes.crear({ motivo_reporte_id: 2 })).rejects.toMatchObject({ status: 422 });
    await expect(
      reportes.crear({ motivo_reporte_id: 2, vacante_id: 1, empresa_id: 1 }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('el candidato no puede reportar candidatos y una vacante inexistente da 404', async () => {
    conSesion(MARIANA);
    await expect(reportes.crear({ motivo_reporte_id: 2, candidato_id: 4 })).rejects.toMatchObject({
      status: 403,
    });
    await expect(reportes.crear({ motivo_reporte_id: 2, vacante_id: 999 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('candidatos mock · GET /candidatos/me', () => {
  it('Mariana: coincide con el ejemplo del contrato (90 %, falta la foto, perfil mínimo)', async () => {
    conSesion(MARIANA);
    expect(await candidatos.obtenerPerfil()).toMatchObject({
      usuario: { id: 3, nombre: 'Mariana', correo: 'mariana.lopez@correo.mx' },
      municipio: { id: 2, nombre: 'El Marqués', entidad: { id: 22, nombre: 'Querétaro' } },
      jornada: { id: 1, nombre: 'Tiempo completo' },
      modalidades: [
        { id: 2, nombre: 'Remoto' },
        { id: 3, nombre: 'Híbrido' },
      ],
      compartir_ajustes: 'preguntar',
      consentimiento_sensibles_en: '2026-09-28T17:00:00Z',
      necesidades: [
        { id: 1, nombre: 'Acceso con rampa', categoria: 'movilidad' },
        { id: 3, nombre: 'Baño accesible', categoria: 'movilidad' },
      ],
      completitud: 90,
      secciones_pendientes: ['foto'],
      perfil_minimo: true,
    });
  });

  it('Jorge: 80 %, sin foto ni experiencia, sin consentimiento ni necesidades', async () => {
    conSesion(JORGE);
    expect(await candidatos.obtenerPerfil()).toMatchObject({
      completitud: 80,
      secciones_pendientes: ['foto', 'experiencia'],
      consentimiento_sensibles_en: null,
      necesidades: [],
      compartir_ajustes: 'nunca',
      perfil_minimo: true,
    });
  });

  it('una cuenta con el perfil vacío no cumple el perfil mínimo', async () => {
    conSesion(LUCIA);
    expect(await candidatos.obtenerPerfil()).toMatchObject({
      perfil_minimo: false,
      completitud: 20,
      secciones_pendientes: expect.arrayContaining(['formacion', 'habilidades', 'resumen']),
    });
  });
});
