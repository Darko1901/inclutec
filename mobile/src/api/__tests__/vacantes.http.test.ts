import axios, { type AxiosRequestConfig } from 'axios';

import { CandidatosHttp } from '../candidatos';
import { cliente } from '../cliente';
import { PostulacionesHttp } from '../postulaciones';
import { ReportesHttp } from '../reportes';
import { VacantesHttp } from '../vacantes';

describe('servicios HTTP de vacantes', () => {
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;

  beforeEach(() => {
    get = jest.spyOn(cliente, 'get').mockResolvedValue({ data: { items: [] } });
    post = jest.spyOn(cliente, 'post').mockResolvedValue({ data: {} });
  });
  afterEach(() => jest.restoreAllMocks());

  it('buscar repite ajuste_id sin corchetes, como pide el contrato', async () => {
    await new VacantesHttp().buscar({
      q: 'soporte',
      ajuste_id: [1, 6],
      cubre_mis_necesidades: true,
    });

    const [ruta, config] = get.mock.calls[0] as [string, AxiosRequestConfig];
    expect(ruta).toBe('/vacantes');
    expect(axios.getUri({ url: ruta, ...config })).toBe(
      '/vacantes?q=soporte&ajuste_id=1&ajuste_id=6&cubre_mis_necesidades=true',
    );
  });

  it('usa las rutas del contrato', async () => {
    const servicio = new VacantesHttp();
    await servicio.recomendadas({ page: 2 });
    await servicio.detalle(1);
    await servicio.compatibilidad(1);
    await new CandidatosHttp().obtenerPerfil();

    expect(get.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/vacantes/recomendadas',
      '/vacantes/1',
      '/vacantes/1/compatibilidad',
      '/candidatos/me',
    ]);
    expect(get.mock.calls[0][1]).toEqual({ params: { page: 2 } });
  });

  it('postular y reportar mandan el cuerpo tal cual a sus rutas', async () => {
    const postulacion = { vacante_id: 1, mensaje: 'Hola', compartir_ajustes: true };
    const reporte = { motivo_reporte_id: 2, vacante_id: 5, descripcion: 'Salario distinto' };
    await new PostulacionesHttp().crear(postulacion);
    await new ReportesHttp().crear(reporte);

    expect(post.mock.calls).toEqual([
      ['/postulaciones', postulacion],
      ['/reportes', reporte],
    ]);
  });
});
