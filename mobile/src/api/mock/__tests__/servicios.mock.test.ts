import { ApiError } from '../../errores';
import { configurarSesionApi } from '../../sesionApi';
import { CatalogosMock } from '../catalogos.mock';
import { NotificacionesMock } from '../notificaciones.mock';
import { crearToken } from '../tokens';

const notificaciones = new NotificacionesMock();
const catalogos = new CatalogosMock();

function conSesion(id: number, rol: 'candidato' | 'reclutador' | 'administrador') {
  const { token } = crearToken(id, rol);
  configurarSesionApi({ obtenerToken: () => token });
}

describe('notificaciones mock', () => {
  it('Mariana tiene 1 sin leer y su notificación coincide con el contrato', async () => {
    conSesion(3, 'candidato');

    expect(await notificaciones.resumen()).toEqual({ no_leidas: 1 });
    const pagina = await notificaciones.listar({ solo_no_leidas: true });
    expect(pagina).toEqual({
      items: [
        {
          id: 1,
          tipo: 'cambio_estado',
          titulo: 'Tu postulación avanzó',
          mensaje: 'Tu postulación a Técnico de soporte de TI pasó a Entrevista.',
          referencia: { tipo: 'postulacion', id: 1 },
          leida: false,
          creado_en: '2026-10-02T16:30:00Z',
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });
  });

  it('cada usuario ve solo las suyas, de la más reciente a la más antigua', async () => {
    conSesion(2, 'reclutador');
    const pagina = await notificaciones.listar();
    expect(pagina.items.map((n) => n.id).sort()).toEqual([2, 91, 92]);
    const fechas = pagina.items.map((n) => n.creado_en);
    expect(fechas).toEqual([...fechas].sort().reverse());

    conSesion(4, 'candidato');
    expect((await notificaciones.listar()).total).toBe(0);
  });

  it('Lucía tiene 45 notificaciones: 5 sin leer y varias páginas de 20', async () => {
    conSesion(101, 'candidato');
    expect(await notificaciones.resumen()).toEqual({ no_leidas: 5 });

    const primera = await notificaciones.listar();
    const segunda = await notificaciones.listar({ page: 2 });
    const tercera = await notificaciones.listar({ page: 3 });
    expect([primera.items.length, segunda.items.length, tercera.items.length]).toEqual([20, 20, 5]);
    expect(primera.total).toBe(45);
  });

  it('marca una como leída y baja el contador', async () => {
    conSesion(3, 'candidato');
    await notificaciones.marcarLeida(1);
    expect(await notificaciones.resumen()).toEqual({ no_leidas: 0 });
    expect((await notificaciones.listar({ solo_no_leidas: true })).total).toBe(0);
  });

  it('responde 404 al marcar una notificación ajena', async () => {
    conSesion(3, 'candidato');
    await expect(notificaciones.marcarLeida(2)).rejects.toMatchObject({
      status: 404,
      codigo: 'no_encontrado',
    });
  });

  it('marca todas como leídas', async () => {
    conSesion(101, 'candidato');
    await notificaciones.marcarTodasLeidas();
    expect(await notificaciones.resumen()).toEqual({ no_leidas: 0 });
  });

  it('pagina con page y size', async () => {
    conSesion(3, 'candidato');
    const pagina = await notificaciones.listar({ page: 2, size: 1 });
    expect(pagina).toMatchObject({ total: 2, page: 2, size: 1 });
    expect(pagina.items).toHaveLength(1);
    await expect(notificaciones.listar({ size: 101 })).rejects.toMatchObject({ status: 422 });
  });

  it('el administrador recibe 403 sin_permiso y sin sesión 401', async () => {
    conSesion(1, 'administrador');
    await expect(notificaciones.resumen()).rejects.toMatchObject({
      status: 403,
      codigo: 'sin_permiso',
    });

    configurarSesionApi({ obtenerToken: () => null });
    await expect(notificaciones.resumen()).rejects.toMatchObject({
      status: 401,
      codigo: 'no_autenticado',
    });
  });

  it('guarda las preferencias por rol y rechaza tipos que no le corresponden', async () => {
    conSesion(3, 'candidato');
    const iniciales = await notificaciones.obtenerPreferencias();
    expect(iniciales.map((p) => p.tipo)).toContain('cambio_estado');
    expect(iniciales.every((p) => p.push && p.correo)).toBe(true);

    const guardadas = await notificaciones.guardarPreferencias([
      { tipo: 'cambio_estado', push: false, correo: true },
    ]);
    expect(guardadas.find((p) => p.tipo === 'cambio_estado')).toEqual({
      tipo: 'cambio_estado',
      push: false,
      correo: true,
    });
    expect(await notificaciones.obtenerPreferencias()).toEqual(guardadas);

    await expect(
      notificaciones.guardarPreferencias([{ tipo: 'nueva_postulacion', push: true, correo: true }]),
    ).rejects.toMatchObject({ status: 422, codigo: 'validacion' });
  });

  it('registra el dispositivo (204)', async () => {
    conSesion(3, 'candidato');
    await expect(
      notificaciones.registrarDispositivo({
        expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        plataforma: 'android',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('catálogos mock', () => {
  it('devuelve los 13 ajustes de la semilla con categoría y descripción', async () => {
    const ajustes = await catalogos.listar('ajustes');
    expect(ajustes).toHaveLength(13);
    expect(ajustes.find((a) => a.id === 1)).toEqual({
      id: 1,
      nombre: 'Acceso con rampa',
      categoria: 'movilidad',
      descripcion: 'Entrada y áreas de trabajo accesibles en silla de ruedas',
    });
  });

  it('no requiere sesión', async () => {
    configurarSesionApi({ obtenerToken: () => null });
    expect(await catalogos.listar('modalidades')).toEqual([
      { id: 3, nombre: 'Híbrido' },
      { id: 1, nombre: 'Presencial' },
      { id: 2, nombre: 'Remoto' },
    ]);
  });

  it('filtra municipios por entidad y habilidades por categoría y texto', async () => {
    const municipios = await catalogos.listar('municipios', { entidad_id: 22 });
    expect(municipios.map((m) => m.nombre)).toEqual([
      'Corregidora',
      'El Marqués',
      'Querétaro',
      'San Juan del Río',
    ]);

    expect(
      (await catalogos.listar('habilidades', { categoria_id: 1 })).map((h) => h.id).sort(),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(await catalogos.listar('habilidades', { q: 'sopo' })).toEqual([
      { id: 4, nombre: 'Soporte técnico', categoria_id: 1 },
    ]);
    await expect(catalogos.listar('habilidades', { q: 's' })).rejects.toMatchObject({
      status: 422,
    });
  });

  it('ordena los niveles educativos por orden y filtra los motivos de reporte', async () => {
    const niveles = await catalogos.listar('niveles-educativos');
    expect(niveles.map((n) => n.orden)).toEqual([1, 2, 3, 4, 5, 6]);

    const motivos = await catalogos.listar('motivos-reporte', { aplica_a: 'candidato' });
    expect(motivos.every((m) => m.aplica_a === 'todos')).toBe(true);
  });

  it('responde 404 no_encontrado con un tipo desconocido', async () => {
    const error = await catalogos
      // @ts-expect-error: el tipo no existe a propósito
      .listar('colores')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, codigo: 'no_encontrado' });
  });
});
