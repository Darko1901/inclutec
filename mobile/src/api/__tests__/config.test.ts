import { marcarArchivoNuevo, resolverApiUrl, urlArchivo } from '../config';

describe('URL del API', () => {
  it('usa la del .env cuando tiene valor', () => {
    expect(resolverApiUrl('http://10.0.0.5:8000/api/v1', '192.168.100.37:8081')).toBe(
      'http://10.0.0.5:8000/api/v1',
    );
  });

  it('vacía, toma la IP de la computadora desde la que Expo sirvió la app', () => {
    expect(resolverApiUrl('', '192.168.100.37:8081')).toBe('http://192.168.100.37:8000/api/v1');
    expect(resolverApiUrl(undefined, '192.168.1.20:8081')).toBe('http://192.168.1.20:8000/api/v1');
  });

  it('sin .env ni Expo, localhost', () => {
    expect(resolverApiUrl('  ', undefined)).toBe('http://localhost:8000/api/v1');
  });
});

describe('URL de fotos y logotipos', () => {
  it('se sirven fuera de /api/v1 y respeta las URI locales', () => {
    expect(urlArchivo('/archivos/fotos/candidato-3.jpg')).toMatch(
      /^http:\/\/localhost:8000\/archivos\/fotos\/candidato-3\.jpg\?v=\d+$/,
    );
    expect(urlArchivo('file:///tmp/foto.jpg')).toBe('file:///tmp/foto.jpg');
  });

  it('al reemplazar un archivo cambia la URL, para no mostrar la imagen anterior', () => {
    const ruta = '/archivos/logos/empresa-1.png';
    const antes = urlArchivo(ruta);

    marcarArchivoNuevo(ruta);
    const despues = urlArchivo(ruta);
    marcarArchivoNuevo(ruta);

    expect(despues).not.toBe(antes);
    expect(urlArchivo(ruta)).not.toBe(despues);
    // Las demás rutas conservan la suya.
    expect(urlArchivo('/archivos/logos/empresa-2.png')).toBe(
      antes.replace('empresa-1', 'empresa-2'),
    );
  });
});
