import axios, { type AxiosRequestConfig } from 'axios';

import { cliente } from '../cliente';
import { EmpresasHttp } from '../empresas';
import { EntrevistasHttp } from '../entrevistas';
import { HorariosHttp } from '../horarios';
import { PostulacionesHttp } from '../postulaciones';

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
