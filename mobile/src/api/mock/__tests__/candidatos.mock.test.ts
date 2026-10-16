import { ApiError } from '../../errores';
import { configurarSesionApi } from '../../sesionApi';
import type { ExperienciaEntrada, FormacionEntrada, HabilidadesEntrada } from '../../tipos';
import { AuthMock } from '../auth.mock';
import { CandidatosMock } from '../candidatos.mock';
import { obtenerEstado } from '../datos';
import { crearToken } from '../tokens';
import { VacantesMock } from '../vacantes.mock';

const candidatos = new CandidatosMock();
const vacantes = new VacantesMock();
const auth = new AuthMock();

const MARIANA = 3;
const JORGE = 4;

function conSesion(id: number) {
  const { token } = crearToken(id, 'candidato');
  configurarSesionApi({ obtenerToken: () => token });
}

async function errorDe(promesa: Promise<unknown>): Promise<ApiError> {
  try {
    await promesa;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Se esperaba un error y la operación terminó bien.');
}

const foto = { uri: 'file:///fotos/yo.jpg', nombre: 'yo.jpg', tipo: 'image/jpeg', tamano: 120000 };

const experiencia: ExperienciaEntrada = {
  puesto: 'Soporte en sitio',
  empresa: 'Redes del Centro',
  fecha_inicio: '2025-07-01',
  fecha_fin: null,
  actual: true,
  descripcion: null,
};

const formacion: FormacionEntrada = {
  nivel_educativo_id: 3,
  institucion: 'CBTis 105',
  carrera: null,
  estado: 'concluida',
  fecha_inicio: '2017-09-01',
  fecha_fin: '2020-07-01',
};

const habilidades = (cantidad: number): HabilidadesEntrada => ({
  habilidades: Array.from({ length: cantidad }, (_, indice) => ({
    habilidad_id: indice + 1,
    nivel: 'basico' as const,
  })),
});

describe('candidatos mock · completitud', () => {
  it('Mariana empieza en 90 % y solo le falta la foto; Jorge en 80 %', async () => {
    conSesion(MARIANA);
    const perfil = await candidatos.obtenerPerfil();
    expect(perfil.completitud).toBe(90);
    expect(perfil.secciones_pendientes).toEqual(['foto']);
    expect(perfil.perfil_minimo).toBe(true);

    conSesion(JORGE);
    const jorge = await candidatos.obtenerPerfil();
    expect(jorge.completitud).toBe(80);
    expect(jorge.secciones_pendientes).toEqual(['foto', 'experiencia']);
  });

  it('sube a 100 % con la foto y regresa a 90 % al quitarla', async () => {
    conSesion(MARIANA);
    expect(await candidatos.subirFoto(foto)).toEqual({ url: foto.uri });

    const completo = await candidatos.obtenerPerfil();
    expect(completo.completitud).toBe(100);
    expect(completo.secciones_pendientes).toEqual([]);
    expect(completo.foto_url).toBe(foto.uri);

    await candidatos.quitarFoto();
    const sinFoto = await candidatos.obtenerPerfil();
    expect(sinFoto.completitud).toBe(90);
    expect(sinFoto.foto_url).toBeNull();
  });

  it('baja al borrar la formación y también recalcula la compatibilidad', async () => {
    conSesion(MARIANA);
    expect((await vacantes.compatibilidad(1)).puntaje).toBe(88);

    await candidatos.eliminarFormacion(1);

    const perfil = await candidatos.obtenerPerfil();
    expect(perfil.completitud).toBe(70);
    expect(perfil.secciones_pendientes).toEqual(['foto', 'formacion']);
    expect(perfil.perfil_minimo).toBe(false);
    // F pasa de 1 a 0: 88 − 15 puntos.
    expect((await vacantes.compatibilidad(1)).puntaje).toBe(73);
  });

  it('cada sección del contrato suma sus puntos al cumplirse', async () => {
    conSesion(JORGE);
    await candidatos.crearExperiencia(experiencia);
    expect((await candidatos.obtenerPerfil()).completitud).toBe(90);
    await candidatos.subirFoto(foto);
    expect((await candidatos.obtenerPerfil()).completitud).toBe(100);

    const perfil = await candidatos.obtenerPerfil();
    await candidatos.actualizarPerfil({
      nombre: perfil.usuario.nombre,
      apellidos: perfil.usuario.apellidos,
      telefono: null,
      municipio_id: 3,
      jornada_id: 1,
      resumen: null,
      disponible_reubicacion: false,
      modalidad_ids: [1],
      categoria_ids: [],
      compartir_ajustes: 'nunca',
    });
    const sinDatos = await candidatos.obtenerPerfil();
    // Sin teléfono (−20) y sin resumen (−10).
    expect(sinDatos.completitud).toBe(70);
    expect(sinDatos.secciones_pendientes).toEqual(['datos_personales', 'resumen']);
  });
});

describe('candidatos mock · perfil y foto', () => {
  it('guarda los datos y se ven al volver a leer el perfil', async () => {
    conSesion(MARIANA);
    const antes = await candidatos.obtenerPerfil();
    const guardado = await candidatos.actualizarPerfil({
      nombre: '  Mariana ',
      apellidos: 'López García',
      telefono: '4429998877',
      municipio_id: 3,
      jornada_id: 2,
      resumen: 'Nuevo resumen',
      disponible_reubicacion: true,
      modalidad_ids: [1, 1, 2],
      categoria_ids: [1, 3],
      compartir_ajustes: 'siempre',
    });
    expect(guardado.usuario.nombre).toBe('Mariana');
    expect(guardado.usuario.telefono).toBe('4429998877');

    const despues = await candidatos.obtenerPerfil();
    expect(despues).toEqual(guardado);
    expect(despues.municipio?.nombre).toBe('Querétaro');
    expect(despues.jornada?.nombre).toBe('Medio tiempo');
    expect(despues.modalidades.map((m) => m.id)).toEqual([1, 2]);
    expect(despues.categorias.map((c) => c.id)).toEqual([1, 3]);
    expect(despues.compartir_ajustes).toBe('siempre');
    expect(despues.disponible_reubicacion).toBe(true);
    expect(despues.actualizado_en >= antes.actualizado_en).toBe(true);
  });

  it('responde 422 con un mensaje por campo', async () => {
    conSesion(MARIANA);
    const error = await errorDe(
      candidatos.actualizarPerfil({
        nombre: '',
        apellidos: 'x'.repeat(121),
        telefono: '123',
        municipio_id: 999,
        jornada_id: null,
        resumen: 'x'.repeat(501),
        disponible_reubicacion: false,
        modalidad_ids: [],
        categoria_ids: [],
        compartir_ajustes: 'preguntar',
      }),
    );
    expect(error.status).toBe(422);
    expect(error.codigo).toBe('validacion');
    expect(Object.keys(error.campos ?? {}).sort()).toEqual([
      'apellidos',
      'municipio_id',
      'nombre',
      'resumen',
      'telefono',
    ]);
    // No se guardó nada.
    expect((await candidatos.obtenerPerfil()).usuario.telefono).toBe('4427654321');
  });

  it('la foto solo acepta JPG o PNG de hasta 2 MB (422 archivo_invalido)', async () => {
    conSesion(MARIANA);
    const gif = await errorDe(
      candidatos.subirFoto({ ...foto, nombre: 'a.gif', tipo: 'image/gif' }),
    );
    expect([gif.status, gif.codigo]).toEqual([422, 'archivo_invalido']);

    const pesada = await errorDe(candidatos.subirFoto({ ...foto, tamano: 2 * 1024 * 1024 + 1 }));
    expect([pesada.status, pesada.codigo]).toEqual([422, 'archivo_invalido']);

    await candidatos.subirFoto({
      ...foto,
      nombre: 'a.png',
      tipo: 'image/png',
      tamano: 2 * 1024 * 1024,
    });
    expect((await candidatos.obtenerPerfil()).foto_url).toBe(foto.uri);
  });

  it('un administrador o una sesión vencida no pueden usar el servicio', async () => {
    const { token } = crearToken(1, 'administrador');
    configurarSesionApi({ obtenerToken: () => token });
    expect((await errorDe(candidatos.obtenerPerfil())).status).toBe(403);

    configurarSesionApi({ obtenerToken: () => null });
    expect((await errorDe(candidatos.obtenerPerfil())).codigo).toBe('no_autenticado');
  });
});

describe('candidatos mock · consentimiento y necesidades', () => {
  it('revocar el consentimiento borra las necesidades y la nota; luego guardarlas da 403', async () => {
    conSesion(MARIANA);
    await candidatos.guardarNecesidades({ ajuste_ids: [1, 3], nota_ajustes: 'Llego en silla' });
    expect((await candidatos.obtenerPerfil()).nota_ajustes).toBe('Llego en silla');

    const revocado = await candidatos.cambiarConsentimiento(false);
    expect(revocado.consentimiento_sensibles_en).toBeNull();
    expect(revocado.necesidades).toEqual([]);
    expect(revocado.nota_ajustes).toBeNull();

    const error = await errorDe(
      candidatos.guardarNecesidades({ ajuste_ids: [1], nota_ajustes: null }),
    );
    expect([error.status, error.codigo]).toEqual([403, 'sin_consentimiento']);

    // Volver a darlo no recupera lo borrado.
    const otorgado = await candidatos.cambiarConsentimiento(true);
    expect(otorgado.consentimiento_sensibles_en).not.toBeNull();
    expect(otorgado.necesidades).toEqual([]);
  });

  it('Jorge da su consentimiento y ya puede registrar necesidades', async () => {
    conSesion(JORGE);
    const sin = await errorDe(
      candidatos.guardarNecesidades({ ajuste_ids: [6], nota_ajustes: null }),
    );
    expect(sin.codigo).toBe('sin_consentimiento');

    await candidatos.cambiarConsentimiento(true);
    const resultado = await candidatos.guardarNecesidades({
      ajuste_ids: [6, 6, 12],
      nota_ajustes: '  ',
    });
    expect(resultado.necesidades.map((n) => n.id)).toEqual([6, 12]);
    expect(resultado.nota_ajustes).toBeNull();

    const perfil = await candidatos.obtenerPerfil();
    expect(perfil.necesidades.map((n) => n.nombre)).toEqual([
      'Intérprete de Lengua de Señas Mexicana',
      'Horario flexible',
    ]);
    // Las necesidades nunca cambian la completitud.
    expect(perfil.completitud).toBe(80);
  });

  it('las necesidades cambian la compatibilidad (componente A)', async () => {
    conSesion(JORGE);
    const antes = (await vacantes.compatibilidad(1)).componentes.a;
    await candidatos.cambiarConsentimiento(true);
    await candidatos.guardarNecesidades({ ajuste_ids: [6], nota_ajustes: null });
    const despues = await vacantes.compatibilidad(1);
    expect(antes).toBe(1);
    expect(despues.componentes.a).toBe(0);
    expect(despues.necesidades.no_cubiertas.map((n) => n.id)).toEqual([6]);
  });

  it('valida los ajustes y la nota de 300 caracteres', async () => {
    conSesion(MARIANA);
    const error = await errorDe(
      candidatos.guardarNecesidades({ ajuste_ids: [1, 999], nota_ajustes: 'x'.repeat(301) }),
    );
    expect(error.codigo).toBe('validacion');
    expect(Object.keys(error.campos ?? {}).sort()).toEqual(['ajuste_ids', 'nota_ajustes']);
  });
});

describe('candidatos mock · experiencias', () => {
  it('agrega, lista de la más reciente a la más antigua, edita y elimina', async () => {
    conSesion(MARIANA);
    const creada = await candidatos.crearExperiencia(experiencia);
    expect(creada.id).toBe(2);

    const lista = await candidatos.listarExperiencias();
    expect(lista.map((e) => e.puesto)).toEqual(['Soporte en sitio', 'Auxiliar de soporte técnico']);

    const editada = await candidatos.editarExperiencia(2, {
      ...experiencia,
      puesto: 'Soporte N2',
      actual: false,
      fecha_fin: '2026-01-01',
    });
    expect(editada).toMatchObject({ puesto: 'Soporte N2', actual: false, fecha_fin: '2026-01-01' });

    await candidatos.eliminarExperiencia(2);
    expect((await candidatos.listarExperiencias()).map((e) => e.id)).toEqual([1]);
    expect((await errorDe(candidatos.eliminarExperiencia(2))).status).toBe(404);
    expect((await errorDe(candidatos.editarExperiencia(77, experiencia))).codigo).toBe(
      'no_encontrado',
    );
  });

  it('una fecha de fin anterior al inicio da 422 en el campo fecha_fin', async () => {
    conSesion(MARIANA);
    const error = await errorDe(
      candidatos.crearExperiencia({
        ...experiencia,
        actual: false,
        fecha_inicio: '2025-06-01',
        fecha_fin: '2025-01-01',
      }),
    );
    expect([error.status, error.codigo]).toEqual([422, 'validacion']);
    expect(error.campos).toEqual({
      fecha_fin: 'La fecha de fin no puede ser anterior a la de inicio.',
    });
    expect(await candidatos.listarExperiencias()).toHaveLength(1);
  });

  it('exige fecha de fin si no es actual, y no la admite si es actual', async () => {
    conSesion(MARIANA);
    const sinFin = await errorDe(
      candidatos.crearExperiencia({ ...experiencia, actual: false, fecha_fin: null }),
    );
    expect(Object.keys(sinFin.campos ?? {})).toEqual(['fecha_fin']);

    const conFin = await errorDe(
      candidatos.crearExperiencia({ ...experiencia, fecha_fin: '2026-01-01' }),
    );
    expect(Object.keys(conFin.campos ?? {})).toEqual(['fecha_fin']);
  });

  it('valida longitudes: puesto 100, empresa 120 y descripción 500', async () => {
    conSesion(MARIANA);
    const error = await errorDe(
      candidatos.crearExperiencia({
        ...experiencia,
        puesto: 'x'.repeat(101),
        empresa: ' ',
        descripcion: 'x'.repeat(501),
      }),
    );
    expect(Object.keys(error.campos ?? {}).sort()).toEqual(['descripcion', 'empresa', 'puesto']);
  });
});

describe('candidatos mock · formaciones', () => {
  it('agrega, edita y elimina; el nivel sale del catálogo', async () => {
    conSesion(JORGE);
    const creada = await candidatos.crearFormacion(formacion);
    expect(creada).toMatchObject({
      id: 3,
      nivel_educativo: { id: 3, nombre: 'Bachillerato', orden: 3 },
      institucion: 'CBTis 105',
      carrera: null,
    });
    expect((await candidatos.listarFormaciones()).map((f) => f.id)).toEqual([2, 3]);

    const editada = await candidatos.editarFormacion(3, { ...formacion, carrera: 'Programación' });
    expect(editada.carrera).toBe('Programación');

    await candidatos.eliminarFormacion(3);
    expect((await candidatos.listarFormaciones()).map((f) => f.id)).toEqual([2]);
    expect((await errorDe(candidatos.eliminarFormacion(3))).status).toBe(404);
  });

  it('valida nivel, institución y que la fecha de fin no sea anterior', async () => {
    conSesion(JORGE);
    const error = await errorDe(
      candidatos.crearFormacion({
        ...formacion,
        nivel_educativo_id: 99,
        institucion: '',
        fecha_fin: '2010-01-01',
      }),
    );
    expect(Object.keys(error.campos ?? {}).sort()).toEqual([
      'fecha_fin',
      'institucion',
      'nivel_educativo_id',
    ]);
  });

  it('una formación en curso puede ir sin fecha de fin', async () => {
    conSesion(JORGE);
    const creada = await candidatos.crearFormacion({
      ...formacion,
      estado: 'en_curso',
      fecha_fin: null,
    });
    expect(creada.fecha_fin).toBeNull();
  });
});

describe('candidatos mock · habilidades', () => {
  it('guarda hasta 30 con su nivel y devuelve el nombre del catálogo', async () => {
    conSesion(MARIANA);
    expect(await candidatos.listarHabilidades()).toEqual([
      { id: 4, nombre: 'Soporte técnico', nivel: 'avanzado' },
      { id: 5, nombre: 'Redes', nivel: 'intermedio' },
      { id: 6, nombre: 'Excel', nivel: 'basico' },
      { id: 11, nombre: 'Comunicación escrita', nivel: 'avanzado' },
    ]);

    const guardadas = await candidatos.guardarHabilidades({
      habilidades: [{ habilidad_id: 1, nivel: 'intermedio' }],
    });
    expect(guardadas).toEqual([{ id: 1, nombre: 'Python', nivel: 'intermedio' }]);
    expect(await candidatos.listarHabilidades()).toEqual(guardadas);
  });

  it('acepta 30 habilidades y con 31 responde 422 limite_habilidades', async () => {
    conSesion(MARIANA);
    const guardadas = await candidatos.guardarHabilidades(habilidades(30));
    expect(guardadas).toHaveLength(30);
    expect(await candidatos.listarHabilidades()).toHaveLength(30);

    const exceso = await errorDe(candidatos.guardarHabilidades(habilidades(31)));
    expect([exceso.status, exceso.codigo]).toEqual([422, 'limite_habilidades']);
    expect(exceso.detail).toMatch(/máximo 30/);
    // Nada cambió.
    expect(await candidatos.listarHabilidades()).toEqual(guardadas);
  });

  it('rechaza repetidos, habilidades que no existen y niveles inválidos', async () => {
    conSesion(MARIANA);
    const repetida = await errorDe(
      candidatos.guardarHabilidades({
        habilidades: [
          { habilidad_id: 1, nivel: 'basico' },
          { habilidad_id: 1, nivel: 'avanzado' },
        ],
      }),
    );
    expect(repetida.codigo).toBe('limite_habilidades');

    const invalida = await errorDe(
      candidatos.guardarHabilidades({
        habilidades: [{ habilidad_id: 999, nivel: 'experto' as 'basico' }],
      }),
    );
    expect(invalida.codigo).toBe('validacion');
    expect(Object.keys(invalida.campos ?? {}).sort()).toEqual([
      'habilidades.0.habilidad_id',
      'habilidades.0.nivel',
    ]);
  });

  it('quitar todas las habilidades baja la completitud 15 puntos', async () => {
    conSesion(MARIANA);
    await candidatos.guardarHabilidades({ habilidades: [] });
    const perfil = await candidatos.obtenerPerfil();
    expect(perfil.completitud).toBe(75);
    expect(perfil.perfil_minimo).toBe(false);
  });
});

describe('candidatos mock · vista previa', () => {
  it('muestra el CV sin correo, teléfono ni necesidades', async () => {
    conSesion(MARIANA);
    const cv = await candidatos.vistaPrevia();
    expect(cv).toMatchObject({
      id: 3,
      nombre: 'Mariana',
      apellidos: 'López García',
      correo: null,
      telefono: null,
      municipio: { nombre: 'El Marqués' },
    });
    expect(cv.experiencias).toHaveLength(1);
    expect(cv.formaciones[0].nivel_educativo.nombre).toBe('Técnico superior universitario');
    expect(cv.habilidades).toHaveLength(4);
    expect(cv.modalidades.map((m) => m.nombre)).toEqual(['Remoto', 'Híbrido']);
    expect(JSON.stringify(cv)).not.toMatch(/necesidades|nota_ajustes|mariana\.lopez|4427654321/);
  });
});

describe('candidatos mock · eliminar cuenta', () => {
  it('con la contraseña incorrecta responde 400 y no cambia nada', async () => {
    conSesion(MARIANA);
    const error = await errorDe(candidatos.eliminarCuenta({ contrasena: 'incorrecta1' }));
    expect([error.status, error.codigo]).toEqual([400, 'contrasena_incorrecta']);
    expect((await candidatos.obtenerPerfil()).completitud).toBe(90);
    expect(obtenerEstado().postulaciones.find((p) => p.id === 1)?.estado).toBe('entrevista');
  });

  it('con la contraseña correcta retira las postulaciones activas y da de baja la cuenta', async () => {
    conSesion(MARIANA);
    await candidatos.eliminarCuenta({ contrasena: 'Inclutec2026' });

    const postulacion = obtenerEstado().postulaciones.find((p) => p.id === 1);
    expect(postulacion?.estado).toBe('retirada');
    expect(postulacion?.historial.at(-1)).toMatchObject({
      estado_anterior: 'entrevista',
      estado_nuevo: 'retirada',
    });
    // La de Jorge no se toca.
    expect(obtenerEstado().postulaciones.find((p) => p.id === 2)?.estado).toBe('postulada');

    const sesion = await errorDe(candidatos.obtenerPerfil());
    expect(sesion.status).toBe(423);
    const login = await errorDe(
      auth.login({ correo: 'mariana.lopez@correo.mx', contrasena: 'Inclutec2026' }),
    );
    expect(login.codigo).toBe('cuenta_suspendida');
  });
});

describe('auth mock · cambiar contraseña', () => {
  it('responde 400 si la actual no coincide y 422 si la nueva no cumple la política', async () => {
    conSesion(MARIANA);
    const incorrecta = await errorDe(
      auth.cambiarContrasena({
        contrasena_actual: 'Otra12345',
        contrasena_nueva: 'NuevaClave2026',
      }),
    );
    expect([incorrecta.status, incorrecta.codigo]).toEqual([400, 'contrasena_incorrecta']);

    const debil = await errorDe(
      auth.cambiarContrasena({ contrasena_actual: 'Inclutec2026', contrasena_nueva: 'corta' }),
    );
    expect([debil.status, debil.codigo]).toEqual([422, 'validacion']);
    expect(Object.keys(debil.campos ?? {})).toEqual(['contrasena_nueva']);
  });

  it('con datos correctos la nueva contraseña sirve para iniciar sesión y la anterior ya no', async () => {
    conSesion(MARIANA);
    await auth.cambiarContrasena({
      contrasena_actual: 'Inclutec2026',
      contrasena_nueva: 'NuevaClave2026',
    });

    const sesion = await auth.login({
      correo: 'mariana.lopez@correo.mx',
      contrasena: 'NuevaClave2026',
    });
    expect(sesion.usuario.id).toBe(MARIANA);
    expect(
      (await errorDe(auth.login({ correo: 'mariana.lopez@correo.mx', contrasena: 'Inclutec2026' })))
        .codigo,
    ).toBe('credenciales_invalidas');
  });
});
