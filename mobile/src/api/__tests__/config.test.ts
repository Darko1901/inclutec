import { resolverApiUrl } from '../config';

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
