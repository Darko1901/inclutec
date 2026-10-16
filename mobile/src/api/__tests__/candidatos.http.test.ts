import { AuthHttp } from '../auth';
import { CandidatosHttp } from '../candidatos';
import { cliente } from '../cliente';

describe('servicios HTTP del perfil y el CV', () => {
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;
  let put: jest.SpyInstance;
  let borrar: jest.SpyInstance;

  beforeEach(() => {
    get = jest.spyOn(cliente, 'get').mockResolvedValue({ data: [] });
    post = jest.spyOn(cliente, 'post').mockResolvedValue({ data: {} });
    put = jest.spyOn(cliente, 'put').mockResolvedValue({ data: {} });
    borrar = jest.spyOn(cliente, 'delete').mockResolvedValue({ data: undefined });
  });
  afterEach(() => jest.restoreAllMocks());

  it('usa los métodos y las rutas del contrato', async () => {
    const servicio = new CandidatosHttp();
    await servicio.listarExperiencias();
    await servicio.listarFormaciones();
    await servicio.listarHabilidades();
    await servicio.vistaPrevia();
    expect(get.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/candidatos/me/experiencias',
      '/candidatos/me/formaciones',
      '/candidatos/me/habilidades',
      '/candidatos/me/vista-previa',
    ]);

    await servicio.cambiarConsentimiento(false);
    await servicio.guardarNecesidades({ ajuste_ids: [1], nota_ajustes: null });
    await servicio.editarExperiencia(7, {
      puesto: 'a',
      empresa: 'b',
      fecha_inicio: '2025-01-01',
      fecha_fin: null,
      actual: true,
      descripcion: null,
    });
    await servicio.guardarHabilidades({ habilidades: [{ habilidad_id: 1, nivel: 'basico' }] });
    expect(put.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/candidatos/me/consentimiento',
      '/candidatos/me/necesidades',
      '/candidatos/me/experiencias/7',
      '/candidatos/me/habilidades',
    ]);
    expect(put.mock.calls[0][1]).toEqual({ otorgado: false });

    await servicio.crearFormacion({
      nivel_educativo_id: 3,
      institucion: 'CBTis',
      carrera: null,
      estado: 'en_curso',
      fecha_inicio: null,
      fecha_fin: null,
    });
    expect(post.mock.calls[0][0]).toBe('/candidatos/me/formaciones');

    await servicio.quitarFoto();
    await servicio.eliminarExperiencia(2);
    await servicio.eliminarFormacion(3);
    await servicio.eliminarCuenta({ contrasena: 'Inclutec2026' });
    expect(borrar.mock.calls.map((llamada: unknown[]) => llamada[0])).toEqual([
      '/candidatos/me/foto',
      '/candidatos/me/experiencias/2',
      '/candidatos/me/formaciones/3',
      '/candidatos/me',
    ]);
    // DELETE /candidatos/me lleva la contraseña en el cuerpo.
    expect(borrar.mock.calls[3][1]).toEqual({ data: { contrasena: 'Inclutec2026' } });
  });

  it('la foto se sube como multipart en el campo «archivo»', async () => {
    const agregar = jest.spyOn(FormData.prototype, 'append');
    await new CandidatosHttp().subirFoto({
      uri: 'file:///fotos/yo.jpg',
      nombre: 'yo.jpg',
      tipo: 'image/jpeg',
    });

    const [ruta, cuerpo, config] = post.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ];
    expect(ruta).toBe('/candidatos/me/foto');
    expect(cuerpo).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(agregar).toHaveBeenCalledWith('archivo', {
      uri: 'file:///fotos/yo.jpg',
      name: 'yo.jpg',
      type: 'image/jpeg',
    });
  });

  it('cambiar contraseña usa PUT /auth/password', async () => {
    const cuerpo = { contrasena_actual: 'Inclutec2026', contrasena_nueva: 'NuevaClave2026' };
    await new AuthHttp().cambiarContrasena(cuerpo);
    expect(put).toHaveBeenCalledWith('/auth/password', cuerpo);
  });
});
