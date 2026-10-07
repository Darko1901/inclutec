import { ApiError } from '../../errores';
import { configurarSesionApi } from '../../sesionApi';
import { AuthMock } from '../auth.mock';
import { CONTRASENA_PRUEBA } from '../datos';
import { crearToken, leerToken } from '../tokens';

const auth = new AuthMock();

async function errorDe(promesa: Promise<unknown>): Promise<ApiError> {
  const error = await promesa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('auth mock · login', () => {
  it('responde 200 con la sesión de Mariana, con la forma del contrato', async () => {
    const sesion = await auth.login({
      correo: 'mariana.lopez@correo.mx',
      contrasena: CONTRASENA_PRUEBA,
    });

    expect(sesion.token_type).toBe('bearer');
    expect(leerToken(sesion.access_token)).toMatchObject({ sub: '3', rol: 'candidato' });
    expect(sesion.expira_en).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(sesion.usuario).toEqual({
      id: 3,
      correo: 'mariana.lopez@correo.mx',
      nombre: 'Mariana',
      apellidos: 'López García',
      telefono: '4427654321',
      rol: 'candidato',
      estado: 'activo',
      empresa: null,
      consentimiento_sensibles: true,
    });
  });

  it('acepta el correo sin importar mayúsculas ni espacios', async () => {
    const sesion = await auth.login({ correo: ' Rh@TecnoQro.mx ', contrasena: CONTRASENA_PRUEBA });
    expect(sesion.usuario).toMatchObject({
      id: 2,
      rol: 'reclutador',
      empresa: { id: 1, nombre_comercial: 'TecnoQro', estado: 'validada' },
    });
  });

  it('entrega la cuenta de administrador (la app la rechaza según el rol)', async () => {
    const sesion = await auth.login({ correo: 'admin@inclutec.mx', contrasena: CONTRASENA_PRUEBA });
    expect(sesion.usuario.rol).toBe('administrador');
  });

  it('responde 401 credenciales_invalidas con contraseña incorrecta', async () => {
    const error = await errorDe(
      auth.login({ correo: 'mariana.lopez@correo.mx', contrasena: 'ContrasenaMala1' }),
    );
    expect(error).toMatchObject({ status: 401, codigo: 'credenciales_invalidas' });
    expect(error.detail).toBe('Correo o contraseña incorrectos.');
  });

  it('responde lo mismo si el correo no existe', async () => {
    const error = await errorDe(
      auth.login({ correo: 'nadie@correo.mx', contrasena: CONTRASENA_PRUEBA }),
    );
    expect(error).toMatchObject({ status: 401, codigo: 'credenciales_invalidas' });
  });

  it('responde 423 cuenta_suspendida con la cuenta suspendida', async () => {
    const error = await errorDe(
      auth.login({ correo: 'suspendida@correo.mx', contrasena: CONTRASENA_PRUEBA }),
    );
    expect(error).toMatchObject({ status: 423, codigo: 'cuenta_suspendida' });
  });

  it('responde 422 validacion con campos si el cuerpo no cumple el formato', async () => {
    const error = await errorDe(auth.login({ correo: 'no-es-correo', contrasena: 'corta' }));
    expect(error).toMatchObject({ status: 422, codigo: 'validacion' });
    expect(Object.keys(error.campos ?? {})).toEqual(['correo', 'contrasena']);
  });

  it('bloquea con 429 demasiados_intentos tras 5 intentos fallidos, aun con la contraseña buena', async () => {
    const datos = { correo: 'jorge.ramirez@correo.mx', contrasena: 'ContrasenaMala1' };
    for (let intento = 1; intento <= 5; intento++) {
      const error = await errorDe(auth.login(datos));
      expect(error.status).toBe(401);
    }

    const bloqueado = await errorDe(
      auth.login({ correo: datos.correo, contrasena: CONTRASENA_PRUEBA }),
    );
    expect(bloqueado).toMatchObject({ status: 429, codigo: 'demasiados_intentos' });
    expect(bloqueado.reintentarEn).toBeGreaterThan(14 * 60);
    expect(bloqueado.reintentarEn).toBeLessThanOrEqual(15 * 60);
  });

  it('un acceso correcto reinicia el contador de intentos fallidos', async () => {
    const malo = { correo: 'jorge.ramirez@correo.mx', contrasena: 'ContrasenaMala1' };
    for (let intento = 1; intento <= 4; intento++) await errorDe(auth.login(malo));
    await auth.login({ correo: malo.correo, contrasena: CONTRASENA_PRUEBA });

    for (let intento = 1; intento <= 4; intento++) {
      expect((await errorDe(auth.login(malo))).status).toBe(401);
    }
  });
});

describe('auth mock · sesión', () => {
  it('me devuelve el usuario dueño del token', async () => {
    const { token } = crearToken(2, 'reclutador');
    configurarSesionApi({ obtenerToken: () => token });

    const usuario = await auth.me();

    expect(usuario).toMatchObject({ id: 2, correo: 'rh@tecnoqro.mx', rol: 'reclutador' });
  });

  it('me responde 401 no_autenticado sin token y avisa a la sesión', async () => {
    const alNoAutenticado = jest.fn();
    configurarSesionApi({ obtenerToken: () => null, alNoAutenticado });

    const error = await errorDe(auth.me());

    expect(error).toMatchObject({ status: 401, codigo: 'no_autenticado' });
    expect(alNoAutenticado).toHaveBeenCalledTimes(1);
  });

  it('me responde 401 con un token vencido', async () => {
    const { token } = crearToken(3, 'candidato', Date.now() - 9 * 60 * 60 * 1000);
    configurarSesionApi({ obtenerToken: () => token });

    expect(await errorDe(auth.me())).toMatchObject({ status: 401, codigo: 'no_autenticado' });
  });

  it('me responde 423 si la cuenta se suspendió después de emitir el token', async () => {
    const { token } = crearToken(100, 'candidato');
    configurarSesionApi({ obtenerToken: () => token });

    expect(await errorDe(auth.me())).toMatchObject({ status: 423, codigo: 'cuenta_suspendida' });
  });

  it('logout responde sin cuerpo con sesión y 401 sin ella', async () => {
    const { token } = crearToken(3, 'candidato');
    configurarSesionApi({ obtenerToken: () => token });
    await expect(
      auth.logout({ expo_push_token: 'ExponentPushToken[abc]' }),
    ).resolves.toBeUndefined();

    configurarSesionApi({ obtenerToken: () => null });
    expect((await errorDe(auth.logout())).status).toBe(401);
  });

  it('los datos devueltos son copias: modificarlos no cambia el mock', async () => {
    const { token } = crearToken(3, 'candidato');
    configurarSesionApi({ obtenerToken: () => token });
    const usuario = await auth.me();
    usuario.nombre = 'Otro';

    expect((await auth.me()).nombre).toBe('Mariana');
  });
});

describe('auth mock · registro', () => {
  const candidato = {
    nombre: 'Ana',
    apellidos: 'Pérez Luna',
    correo: 'ana.perez@correo.mx',
    telefono: '4421110000',
    municipio_id: 3,
    contrasena: 'Clave2026',
    acepta_aviso: true,
    consentimiento_sensibles: false,
  };

  it('registra un candidato, inicia su sesión y permite volver a entrar', async () => {
    const sesion = await auth.registrarCandidato(candidato);
    expect(sesion.usuario).toMatchObject({
      id: 102,
      rol: 'candidato',
      estado: 'activo',
      consentimiento_sensibles: false,
    });

    const otraVez = await auth.login({
      correo: candidato.correo,
      contrasena: candidato.contrasena,
    });
    expect(otraVez.usuario.id).toBe(102);
  });

  it('registra un candidato que no da el consentimiento para necesidades de ajuste', async () => {
    const sesion = await auth.registrarCandidato(candidato);
    expect(sesion.usuario.consentimiento_sensibles).toBe(false);
  });

  it('registra un candidato con consentimiento', async () => {
    const sesion = await auth.registrarCandidato({ ...candidato, consentimiento_sensibles: true });
    expect(sesion.usuario.consentimiento_sensibles).toBe(true);
  });

  it('responde 409 correo_duplicado con un correo ya registrado', async () => {
    const error = await errorDe(
      auth.registrarCandidato({ ...candidato, correo: 'mariana.lopez@correo.mx' }),
    );
    expect(error).toMatchObject({ status: 409, codigo: 'correo_duplicado' });
  });

  it('responde 422 con un mensaje por campo', async () => {
    const error = await errorDe(
      auth.registrarCandidato({
        ...candidato,
        telefono: '123',
        contrasena: 'sololetras',
        acepta_aviso: false,
      }),
    );
    expect(error.status).toBe(422);
    expect(Object.keys(error.campos ?? {}).sort()).toEqual([
      'acepta_aviso',
      'contrasena',
      'telefono',
    ]);
  });

  it('registra un reclutador con su empresa en estado pendiente', async () => {
    const sesion = await auth.registrarReclutador({
      reclutador: {
        nombre: 'Luis',
        apellidos: 'Mora Díaz',
        puesto: 'Gerente de RH',
        correo: 'luis.mora@empresa.mx',
        telefono: '4429998877',
        contrasena: 'Clave2026',
      },
      empresa: {
        razon_social: 'Soluciones del Bajío S.A. de C.V.',
        nombre_comercial: 'SolBajío',
        rfc: 'SBA200101XY2',
        sector_id: 2,
        tamano_empresa_id: 1,
        municipio_id: 3,
      },
      acepta_aviso: true,
    });
    expect(sesion.usuario.rol).toBe('reclutador');
    expect(sesion.usuario.empresa).toEqual({
      id: 5,
      nombre_comercial: 'SolBajío',
      estado: 'pendiente',
    });
  });

  it('responde 409 rfc_duplicado y marca empresa.rfc', async () => {
    const error = await errorDe(
      auth.registrarReclutador({
        reclutador: {
          nombre: 'Luis',
          apellidos: 'Mora Díaz',
          puesto: 'Gerente de RH',
          correo: 'luis.mora@empresa.mx',
          telefono: '4429998877',
          contrasena: 'Clave2026',
        },
        empresa: {
          razon_social: 'Otra S.A.',
          nombre_comercial: 'Otra',
          rfc: 'TQU150312AB1',
          sector_id: 2,
          tamano_empresa_id: 1,
          municipio_id: 3,
        },
        acepta_aviso: true,
      }),
    );
    expect(error).toMatchObject({ status: 409, codigo: 'rfc_duplicado' });
    expect(error.campos).toHaveProperty(['empresa.rfc']);
  });
});

describe('auth mock · recuperar contraseña', () => {
  const correo = 'jorge.ramirez@correo.mx';

  it('responde 202 con el mismo mensaje exista o no la cuenta', async () => {
    const existe = await auth.solicitarCodigo({ correo });
    const noExiste = await auth.solicitarCodigo({ correo: 'nadie@correo.mx' });
    expect(existe).toEqual(noExiste);
    expect(existe.detail).toBe('Si el correo está registrado, te enviamos un código de 6 dígitos.');
  });

  it('con un correo que no existe, verificar responde como con una cuenta real y nunca acepta el código', async () => {
    const inexistente = 'nadie@correo.mx';
    await auth.solicitarCodigo({ correo: inexistente });

    const error = await errorDe(auth.verificarCodigo({ correo: inexistente, codigo: '123456' }));

    expect(error).toMatchObject({ status: 400, codigo: 'codigo_invalido' });
  });

  it('el código de prueba vence a los 15 minutos', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'queueMicrotask'], now: Date.now() });
    try {
      await auth.solicitarCodigo({ correo });
      jest.setSystemTime(Date.now() + 16 * 60 * 1000);

      expect(await errorDe(auth.verificarCodigo({ correo, codigo: '123456' }))).toMatchObject({
        status: 410,
        codigo: 'codigo_vencido',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('permite pedir otro código después de 60 s', async () => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'queueMicrotask'], now: Date.now() });
    try {
      await auth.solicitarCodigo({ correo });
      jest.setSystemTime(Date.now() + 61 * 1000);

      await expect(auth.solicitarCodigo({ correo })).resolves.toHaveProperty('detail');
    } finally {
      jest.useRealTimers();
    }
  });

  it('responde 429 reenvio_prematuro antes de 60 s', async () => {
    await auth.solicitarCodigo({ correo });
    const error = await errorDe(auth.solicitarCodigo({ correo }));
    expect(error).toMatchObject({ status: 429, codigo: 'reenvio_prematuro' });
    expect(error.reintentarEn).toBeLessThanOrEqual(60);
  });

  it('verifica el código, cuenta los intentos y restablece la contraseña', async () => {
    await auth.solicitarCodigo({ correo });

    const mal = await errorDe(auth.verificarCodigo({ correo, codigo: '000000' }));
    expect(mal).toMatchObject({ status: 400, codigo: 'codigo_invalido' });
    expect(mal.detail).toContain('4 intentos');

    await expect(auth.verificarCodigo({ correo, codigo: '123456' })).resolves.toEqual({
      detail: 'Código correcto.',
    });
    await expect(
      auth.restablecerContrasena({ correo, codigo: '123456', contrasena: 'NuevaClave2026' }),
    ).resolves.toEqual({ detail: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' });

    // El código ya se usó, y la contraseña nueva sirve.
    expect(await errorDe(auth.verificarCodigo({ correo, codigo: '123456' }))).toMatchObject({
      status: 410,
      codigo: 'codigo_vencido',
    });
    const sesion = await auth.login({ correo, contrasena: 'NuevaClave2026' });
    expect(sesion.usuario.id).toBe(4);
  });

  it('responde 410 codigo_vencido tras 5 intentos fallidos', async () => {
    await auth.solicitarCodigo({ correo });
    for (let intento = 1; intento <= 4; intento++) {
      expect((await errorDe(auth.verificarCodigo({ correo, codigo: '111111' }))).status).toBe(400);
    }
    expect(await errorDe(auth.verificarCodigo({ correo, codigo: '111111' }))).toMatchObject({
      status: 410,
      codigo: 'codigo_vencido',
    });
  });
});
