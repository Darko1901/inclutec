import axios, { type AxiosRequestConfig } from 'axios';

import { cliente } from '../cliente';
import { EmpresasHttp } from '../empresas';
import { EntrevistasHttp } from '../entrevistas';
import { HorariosHttp } from '../horarios';
import { PostulacionesHttp } from '../postulaciones';
import { VacantesHttp } from '../vacantes';

describe('servicios HTTP de postulaciones, entrevistas y empresas', () => {
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;
  let patch: jest.SpyInstance;
  let borrar: jest.SpyInstance;

  beforeEach(() => {
    get = jest.spyOn(cliente, 'get').mockResolvedValue({ data: {} });
    post = jest.spyOn(cliente, 'post').mockResolvedValue({ data: {} });
    patch = jest.spyOn(cliente, 'patch').mockResolvedValue({ data: {} });
    borrar = jest.spyOn(cliente, 'delete').mockResolvedValue({ data: undefined });
  });
  afterEach(() => jest.restoreAllMocks());

  it('mis postulaciones manda activas, estado y paginación como query', async () => {
    await new PostulacionesHttp().mias({ activas: false, estado: 'retirada', page: 2, size: 20 });

    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(ruta).toBe('/postulaciones/me');
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/postulaciones/me?activas=false&estado=retirada&page=2&size=20',
    );
  });

  it('detalle, retirar y agendar usan las rutas del contrato', async () => {
    const servicio = new PostulacionesHttp();
    await servicio.detalle(1);
    await servicio.retirar(1);
    await servicio.agendarEntrevista(1, 2);

    expect(get.mock.calls[0][0]).toBe('/postulaciones/1');
    expect(patch.mock.calls[0][0]).toBe('/postulaciones/1/retirar');
    expect(post.mock.calls[0]).toEqual(['/postulaciones/1/entrevista', { horario_id: 2 }]);
  });

  it('los horarios disponibles piden la vacante con disponible=true', async () => {
    await new HorariosHttp().disponibles(1);

    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/horarios-entrevista?vacante_id=1&disponible=true',
    );
  });

  it('cancelar una entrevista manda el motivo en el cuerpo del DELETE', async () => {
    await new EntrevistasHttp().cancelar(3, 'Tengo un compromiso médico ese día.');
    await new EntrevistasHttp().cancelar(4);

    expect(borrar.mock.calls).toEqual([
      ['/entrevistas/3', { data: { motivo: 'Tengo un compromiso médico ese día.' } }],
      ['/entrevistas/4', { data: { motivo: null } }],
    ]);
  });

  it('el directorio manda q y sector_id; la ficha va por id', async () => {
    const servicio = new EmpresasHttp();
    await servicio.listar({ q: 'logi', sector_id: 1, page: 1, size: 20 });
    await servicio.detalle(1);

    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/empresas?q=logi&sector_id=1&page=1&size=20',
    );
    expect(get.mock.calls[1][0]).toBe('/empresas/1');
  });
});

describe('servicios HTTP de la organización y las vacantes del reclutador', () => {
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;
  let put: jest.SpyInstance;
  let patch: jest.SpyInstance;

  beforeEach(() => {
    get = jest.spyOn(cliente, 'get').mockResolvedValue({ data: {} });
    post = jest.spyOn(cliente, 'post').mockResolvedValue({ data: {} });
    put = jest.spyOn(cliente, 'put').mockResolvedValue({ data: {} });
    patch = jest.spyOn(cliente, 'patch').mockResolvedValue({ data: {} });
  });
  afterEach(() => jest.restoreAllMocks());

  it('usa las rutas del contrato', async () => {
    const empresas = new EmpresasHttp();
    const vacantes = new VacantesHttp();
    const archivo = { uri: 'file:///a.pdf', nombre: 'a.pdf', tipo: 'application/pdf' };
    await empresas.miOrganizacion();
    await empresas.misVacantes({ estado: 'borrador', page: 2, size: 20 });
    await empresas.actualizarMiOrganizacion({
      nombre_comercial: 'TecnoQro',
      sector_id: 4,
      tamano_empresa_id: 3,
      municipio_id: 3,
    });
    await empresas.subirLogo(archivo);
    await empresas.subirConstancia(archivo);
    await vacantes.cambiarEstado(1, 'pausada');
    await vacantes.duplicar(1);

    const [rutaGet, config] = get.mock.calls[1] as [string, AxiosRequestConfig];
    expect(get.mock.calls[0][0]).toBe('/empresas/me');
    expect(axios.getUri({ url: rutaGet, ...config })).toBe(
      '/empresas/me/vacantes?estado=borrador&page=2&size=20',
    );
    expect(put.mock.calls[0][0]).toBe('/empresas/me');
    expect(post.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/empresas/me/logo',
      '/empresas/me/documento',
      '/vacantes/1/duplicar',
    ]);
    expect(patch.mock.calls[0]).toEqual(['/vacantes/1/estado', { estado: 'pausada' }]);
  });

  it('sube el archivo como multipart en el campo «archivo»', async () => {
    await new EmpresasHttp().subirConstancia({
      uri: 'file:///a.pdf',
      nombre: 'a.pdf',
      tipo: 'application/pdf',
    });
    const [, cuerpo, config] = post.mock.calls[0] as [string, FormData, AxiosRequestConfig];
    expect(cuerpo).toBeInstanceOf(FormData);
    expect(cuerpo.has('archivo')).toBe(true);
    expect(config.headers).toMatchObject({ 'Content-Type': 'multipart/form-data' });
  });

  it('crea y edita vacantes con POST /vacantes y PUT /vacantes/{id}', async () => {
    const vacantes = new VacantesHttp();
    const entrada = { titulo: 'x' } as Parameters<VacantesHttp['crear']>[0];
    await vacantes.crear(entrada);
    await vacantes.editar(3, entrada);
    expect(post.mock.calls[0]).toEqual(['/vacantes', entrada]);
    expect(put.mock.calls[0]).toEqual(['/vacantes/3', entrada]);
  });
});

describe('servicios HTTP del reclutador: postulados, horarios y agenda', () => {
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;
  let patch: jest.SpyInstance;
  let borrar: jest.SpyInstance;

  beforeEach(() => {
    get = jest.spyOn(cliente, 'get').mockResolvedValue({ data: {} });
    post = jest.spyOn(cliente, 'post').mockResolvedValue({ data: {} });
    patch = jest.spyOn(cliente, 'patch').mockResolvedValue({ data: {} });
    borrar = jest.spyOn(cliente, 'delete').mockResolvedValue({ data: undefined });
  });
  afterEach(() => jest.restoreAllMocks());

  it('los postulados mandan estado, compatibilidad mínima y paginación como query', async () => {
    await new PostulacionesHttp().postuladosDe(1, {
      estado: 'entrevista',
      compatibilidad_min: 70,
      page: 2,
      size: 20,
    });
    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(ruta).toBe('/vacantes/1/postulaciones');
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/vacantes/1/postulaciones?estado=entrevista&compatibilidad_min=70&page=2&size=20',
    );
  });

  it('usa las rutas del contrato para el detalle, el estado y las observaciones', async () => {
    const servicio = new PostulacionesHttp();
    await servicio.detallePostulado(1);
    await servicio.observaciones(1);
    await servicio.cambiarEstado(1, { estado: 'aceptada', mensaje: 'Felicidades' });
    await servicio.agregarObservacion(1, 'Llamar el lunes.');

    expect(get.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/postulaciones/1/candidato',
      '/postulaciones/1/observaciones',
    ]);
    expect(patch.mock.calls[0]).toEqual([
      '/postulaciones/1/estado',
      { estado: 'aceptada', mensaje: 'Felicidades' },
    ]);
    expect(post.mock.calls[0]).toEqual([
      '/postulaciones/1/observaciones',
      { texto: 'Llamar el lunes.' },
    ]);
  });

  it('publica y elimina horarios con las rutas del contrato', async () => {
    const entrada = {
      vacante_id: 1,
      inicio: '2026-10-06T17:00:00Z',
      duracion_min: 45 as const,
      liga: 'https://meet.google.com/abc-defg-hij',
    };
    await new HorariosHttp().publicar(entrada);
    await new HorariosHttp().eliminar(7);
    expect(post.mock.calls[0]).toEqual(['/horarios-entrevista', entrada]);
    expect(borrar.mock.calls[0][0]).toBe('/horarios-entrevista/7');
  });

  it('la agenda y el resultado de la entrevista usan /entrevistas', async () => {
    await new EntrevistasHttp().miAgenda({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      vacante_id: 1,
    });
    await new EntrevistasHttp().registrarResultado(1, {
      estado: 'cancelada',
      motivo_cancelacion: 'Imprevisto',
    });
    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/entrevistas/me?desde=2026-10-01&hasta=2026-10-31&vacante_id=1',
    );
    expect(patch.mock.calls[0]).toEqual([
      '/entrevistas/1',
      { estado: 'cancelada', motivo_cancelacion: 'Imprevisto' },
    ]);
  });
});
