import { ApiError } from '../../errores';
import { configurarSesionApi } from '../../sesionApi';
import { obtenerEstado } from '../datos';
import { EmpresasMock } from '../empresas.mock';
import { EntrevistasMock } from '../entrevistas.mock';
import { HorariosMock } from '../horarios.mock';
import { PostulacionesMock } from '../postulaciones.mock';
import { crearToken } from '../tokens';

const postulaciones = new PostulacionesMock();
const horarios = new HorariosMock();
const entrevistas = new EntrevistasMock();
const empresas = new EmpresasMock();

const MARIANA = 3;
const JORGE = 4;
const LAURA = 2;

function conSesion(id: number, rol: 'candidato' | 'reclutador' = 'candidato') {
  const { token } = crearToken(id, rol);
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

const horario = (id: number) => obtenerEstado().horarios.find((h) => h.id === id)!;

describe('postulaciones mock · mis postulaciones', () => {
  it('Activas: solo la 1 de Mariana, con el inicio de su entrevista agendada', async () => {
    conSesion(MARIANA);
    const pagina = await postulaciones.mias({ activas: true });

    expect(pagina).toMatchObject({ total: 1, page: 1, size: 20 });
    expect(pagina.items[0]).toMatchObject({
      id: 1,
      estado: 'entrevista',
      vacante: {
        id: 1,
        titulo: 'Técnico de soporte de TI',
        empresa: { nombre_comercial: 'TecnoQro' },
      },
    });
    expect(pagina.items[0].entrevista_inicio).toBe(horario(1).inicio);
  });

  it('Finalizadas: aceptada, no seleccionada y retirada, de la más reciente a la más antigua', async () => {
    conSesion(MARIANA);
    const pagina = await postulaciones.mias({ activas: false });

    expect(pagina.items.map((p) => [p.id, p.estado])).toEqual([
      [103, 'retirada'],
      [101, 'aceptada'],
      [102, 'no_seleccionada'],
    ]);
    // Una entrevista ya realizada no cuenta como agendada.
    expect(pagina.items.every((p) => p.entrevista_inicio === null)).toBe(true);
  });

  it('sin filtro trae todas, y `estado` deja solo ese estado', async () => {
    conSesion(MARIANA);
    expect((await postulaciones.mias()).total).toBe(4);
    const aceptadas = await postulaciones.mias({ estado: 'aceptada' });
    expect(aceptadas.items.map((p) => p.id)).toEqual([101]);
    // Un estado activo dentro de las finalizadas no deja nada.
    expect((await postulaciones.mias({ estado: 'entrevista', activas: false })).total).toBe(0);
  });

  it('pagina y valida el estado', async () => {
    conSesion(MARIANA);
    const segunda = await postulaciones.mias({ page: 2, size: 3 });
    expect(segunda).toMatchObject({ total: 4, page: 2, size: 3 });
    expect(segunda.items).toHaveLength(1);

    const error = await errorDe(postulaciones.mias({ estado: 'inventado' }));
    expect([error.status, error.codigo]).toEqual([422, 'validacion']);
    expect(error.campos).toHaveProperty('estado');
  });

  it('cada candidato ve solo las suyas y un reclutador no puede consultarlas', async () => {
    conSesion(JORGE);
    expect((await postulaciones.mias()).items.map((p) => p.id)).toEqual([100, 2]);

    conSesion(LAURA, 'reclutador');
    expect((await errorDe(postulaciones.mias())).status).toBe(403);
  });
});

describe('postulaciones mock · detalle', () => {
  it('trae el historial con el mensaje del reclutador y la entrevista agendada', async () => {
    conSesion(MARIANA);
    const detalle = await postulaciones.detalle(1);

    expect(detalle.puede_retirar).toBe(true);
    expect(detalle.historial.map((e) => e.estado_nuevo)).toEqual([
      'postulada',
      'en_revision',
      'entrevista',
    ]);
    expect(detalle.historial[2].mensaje).toBe('Nos gustaría conocerte; agenda un horario.');
    expect(detalle.entrevista).toMatchObject({
      id: 1,
      estado: 'agendada',
      duracion_min: 45,
      liga: 'https://meet.google.com/abc-defg-hij',
      puede_cancelar: true,
      vacante: { id: 1 },
      empresa: { id: 1, nombre_comercial: 'TecnoQro' },
    });
    expect(
      new Date(detalle.entrevista!.fin).getTime() - new Date(detalle.entrevista!.inicio).getTime(),
    ).toBe(45 * 60000);
  });

  it('las finalizadas no se pueden retirar y la de otro candidato responde 404', async () => {
    conSesion(MARIANA);
    expect((await postulaciones.detalle(102)).puede_retirar).toBe(false);
    expect((await postulaciones.detalle(101)).entrevista?.estado).toBe('realizada');
    expect((await postulaciones.detalle(101)).entrevista?.puede_cancelar).toBe(false);

    expect((await errorDe(postulaciones.detalle(2))).status).toBe(404);
    expect((await errorDe(postulaciones.detalle(999))).codigo).toBe('no_encontrado');
  });
});

describe('postulaciones mock · retirar', () => {
  it('con entrevista agendada: pasa a retirada, queda en el historial y el horario vuelve a libre', async () => {
    conSesion(MARIANA);
    expect(horario(1).estado).toBe('agendado');

    const retirada = await postulaciones.retirar(1);

    expect(retirada).toMatchObject({
      id: 1,
      estado: 'retirada',
      puede_retirar: false,
      entrevista: null,
    });
    expect(retirada.historial.at(-1)).toMatchObject({
      estado_anterior: 'entrevista',
      estado_nuevo: 'retirada',
    });
    expect(horario(1).estado).toBe('libre');
    expect(obtenerEstado().entrevistas.find((e) => e.id === 1)?.estado).toBe('cancelada');

    // Pasa a Finalizadas y avisa al reclutador de la entrevista cancelada.
    expect((await postulaciones.mias({ activas: true })).total).toBe(0);
    expect((await postulaciones.mias({ activas: false })).total).toBe(4);
    const aviso = obtenerEstado().notificaciones.find(
      (n) => n.usuario_id === LAURA && n.tipo === 'entrevista_cancelada',
    );
    expect(aviso).toMatchObject({ referencia: { tipo: 'entrevista', id: 1 }, leida: false });
    expect(aviso?.mensaje).not.toMatch(/ajuste|necesidad/i);
  });

  it('sin entrevista: solo cambia de estado', async () => {
    conSesion(JORGE);
    const avisosAntes = obtenerEstado().notificaciones.length;
    const retirada = await postulaciones.retirar(2);
    expect(retirada.estado).toBe('retirada');
    expect(retirada.historial.at(-1)?.estado_nuevo).toBe('retirada');
    // El contrato no define aviso para un retiro sin entrevista.
    expect(obtenerEstado().notificaciones).toHaveLength(avisosAntes);
  });

  it('una postulación finalizada responde 409 transicion_invalida y no cambia nada', async () => {
    conSesion(MARIANA);
    for (const id of [101, 102, 103]) {
      const error = await errorDe(postulaciones.retirar(id));
      expect([error.status, error.codigo]).toEqual([409, 'transicion_invalida']);
    }
    expect(obtenerEstado().postulaciones.find((p) => p.id === 101)?.estado).toBe('aceptada');
  });

  it('la de otro candidato responde 404', async () => {
    conSesion(JORGE);
    expect((await errorDe(postulaciones.retirar(1))).status).toBe(404);
  });
});

describe('horarios mock', () => {
  it('lista los libres y futuros de la vacante 1, en orden y sin la liga', async () => {
    conSesion(MARIANA);
    const lista = await horarios.disponibles(1);

    expect(lista.map((h) => h.id)).toEqual([100, 101, 102, 2, 103, 104]);
    expect(lista.every((h) => h.estado === 'libre' && h.liga === null && h.vacante_id === 1)).toBe(
      true,
    );
    const inicios = lista.map((h) => h.inicio);
    expect(inicios).toEqual([...inicios].sort());
    expect(lista[0]).toMatchObject({ duracion_min: 30 });
    expect(new Date(lista[0].fin).getTime() - new Date(lista[0].inicio).getTime()).toBe(30 * 60000);
  });

  it('sin una postulación en «entrevista» para esa vacante responde 403', async () => {
    conSesion(MARIANA);
    expect((await errorDe(horarios.disponibles(2))).codigo).toBe('sin_permiso');
    // La 102 ya está no seleccionada.
    expect((await errorDe(horarios.disponibles(3))).status).toBe(403);
    conSesion(JORGE);
    expect((await errorDe(horarios.disponibles(1))).status).toBe(403);
  });
});

describe('postulaciones mock · agendar entrevista', () => {
  async function cancelarLaDeMariana() {
    conSesion(MARIANA);
    await entrevistas.cancelar(1);
  }

  it('toma el horario, crea la entrevista con su liga y avisa al reclutador', async () => {
    await cancelarLaDeMariana();
    const entrevista = await postulaciones.agendarEntrevista(1, 101);

    expect(entrevista).toMatchObject({
      estado: 'agendada',
      duracion_min: 45,
      liga: 'https://meet.google.com/abc-defg-hij',
      puede_cancelar: true,
      vacante: { id: 1 },
      empresa: { id: 1 },
    });
    expect(horario(101).estado).toBe('agendado');
    expect((await postulaciones.detalle(1)).entrevista?.id).toBe(entrevista.id);
    expect((await horarios.disponibles(1)).map((h) => h.id)).not.toContain(101);
    expect(
      obtenerEstado().notificaciones.find(
        (n) => n.usuario_id === LAURA && n.tipo === 'entrevista_agendada' && n.id > 100,
      ),
    ).toMatchObject({ referencia: { tipo: 'entrevista', id: entrevista.id } });
  });

  it('si el horario ya lo tomó otro responde 409 horario_ocupado y no cambia la postulación', async () => {
    await cancelarLaDeMariana();
    const error = await errorDe(postulaciones.agendarEntrevista(1, 102));

    expect([error.status, error.codigo]).toEqual([409, 'horario_ocupado']);
    expect(error.detail).toBe('Ese horario acaba de ser tomado, elige otro.');
    expect((await postulaciones.detalle(1)).entrevista).toBeNull();
    // Ya no aparece entre los libres y reintentar da el mismo error.
    expect((await horarios.disponibles(1)).map((h) => h.id)).not.toContain(102);
    expect((await errorDe(postulaciones.agendarEntrevista(1, 102))).codigo).toBe('horario_ocupado');
  });

  it('con una entrevista agendada responde 409 estado_invalido y no toma el horario', async () => {
    conSesion(MARIANA);
    const error = await errorDe(postulaciones.agendarEntrevista(1, 101));
    expect([error.status, error.codigo]).toEqual([409, 'estado_invalido']);
    expect(horario(101).estado).toBe('libre');
  });

  it('fuera del estado «entrevista» responde 409 estado_invalido', async () => {
    conSesion(JORGE);
    const error = await errorDe(postulaciones.agendarEntrevista(2, 2));
    expect([error.status, error.codigo]).toEqual([409, 'estado_invalido']);
  });

  it('un horario de otra vacante o inexistente responde 404 y un id inválido, 422', async () => {
    await cancelarLaDeMariana();
    expect((await errorDe(postulaciones.agendarEntrevista(1, 105))).codigo).toBe('no_encontrado');
    expect((await errorDe(postulaciones.agendarEntrevista(1, 999))).status).toBe(404);
    const invalido = await errorDe(postulaciones.agendarEntrevista(1, Number.NaN));
    expect([invalido.status, invalido.campos]).toEqual([422, { horario_id: 'Elige un horario.' }]);
  });
});

describe('entrevistas mock · cancelar', () => {
  it('con más de 24 h libera el horario, deja el motivo y avisa al reclutador', async () => {
    conSesion(MARIANA);
    await entrevistas.cancelar(1, '  Tengo un compromiso médico ese día.  ');

    const entrevista = obtenerEstado().entrevistas.find((e) => e.id === 1)!;
    expect(entrevista).toMatchObject({
      estado: 'cancelada',
      motivo_cancelacion: 'Tengo un compromiso médico ese día.',
    });
    expect(horario(1).estado).toBe('libre');
    // La postulación sigue en «entrevista» y ya puede elegir otro horario.
    const detalle = await postulaciones.detalle(1);
    expect([detalle.estado, detalle.entrevista]).toEqual(['entrevista', null]);
    expect((await horarios.disponibles(1)).map((h) => h.id)).toContain(1);
    expect(
      obtenerEstado().notificaciones.some(
        (n) => n.usuario_id === LAURA && n.tipo === 'entrevista_cancelada',
      ),
    ).toBe(true);
  });

  it('con menos de 24 h responde 409 cancelacion_tardia y no cambia nada', async () => {
    conSesion(JORGE);
    expect((await postulaciones.detalle(100)).entrevista?.puede_cancelar).toBe(false);

    const error = await errorDe(entrevistas.cancelar(100));
    expect([error.status, error.codigo]).toEqual([409, 'cancelacion_tardia']);
    expect(obtenerEstado().entrevistas.find((e) => e.id === 100)?.estado).toBe('agendada');
    expect(horario(105).estado).toBe('agendado');
  });

  it('justo en el límite de 24 h todavía se puede cancelar', async () => {
    conSesion(MARIANA);
    horario(1).inicio = new Date(Date.now() + 24 * 3600 * 1000 + 5000).toISOString();
    await expect(entrevistas.cancelar(1)).resolves.toBeUndefined();
  });

  it('no cancela la de otro candidato (404), una ya cancelada (409) ni un motivo largo (422)', async () => {
    conSesion(JORGE);
    expect((await errorDe(entrevistas.cancelar(1))).status).toBe(404);

    conSesion(MARIANA);
    const largo = await errorDe(entrevistas.cancelar(1, 'x'.repeat(256)));
    expect([largo.status, Object.keys(largo.campos ?? {})]).toEqual([422, ['motivo']]);
    await entrevistas.cancelar(1);
    expect((await errorDe(entrevistas.cancelar(1))).codigo).toBe('estado_invalido');
  });
});

describe('empresas mock', () => {
  it('el directorio solo trae las validadas: Estudio Trazo no aparece', async () => {
    conSesion(MARIANA);
    const pagina = await empresas.listar();

    expect(pagina.items.map((e) => e.nombre_comercial)).toEqual([
      'ConCentro',
      'LogiBajío',
      'TecnoQro',
    ]);
    expect(pagina.total).toBe(3);
    expect(pagina.items.find((e) => e.nombre_comercial === 'TecnoQro')).toMatchObject({
      id: 1,
      logo_url: '/archivos/logos/empresa-1.png',
      sector: { id: 4, nombre: 'Tecnologías de la información' },
      tamano_empresa: { id: 3, nombre: 'Mediana', rango: '51 a 250 trabajadores' },
      municipio: { id: 3, nombre: 'Querétaro', entidad: { id: 22 } },
      vacantes_publicadas: 2,
    });
    expect(pagina.items.map((e) => e.vacantes_publicadas)).toEqual([2, 2, 2]);
  });

  it('busca por nombre sin acentos ni mayúsculas, filtra por sector y pagina', async () => {
    conSesion(MARIANA);
    expect((await empresas.listar({ q: 'logibajio' })).items.map((e) => e.id)).toEqual([2]);
    expect((await empresas.listar({ q: 'trazo' })).total).toBe(0);
    expect((await empresas.listar({ sector_id: 4 })).items.map((e) => e.id)).toEqual([1]);
    expect((await empresas.listar({ page: 2, size: 2 })).items.map((e) => e.id)).toEqual([1]);
    expect((await errorDe(empresas.listar({ size: 101 }))).status).toBe(422);
  });

  it('una empresa suspendida deja de aparecer en el directorio y en la ficha', async () => {
    conSesion(MARIANA);
    obtenerEstado().empresas.find((e) => e.id === 3)!.estado = 'suspendida';
    expect((await empresas.listar()).total).toBe(2);
    expect((await errorDe(empresas.detalle(3))).status).toBe(404);
  });

  it('la ficha trae las prácticas de inclusión y las vacantes publicadas con compatibilidad', async () => {
    conSesion(MARIANA);
    const ficha = await empresas.detalle(1);

    expect(ficha).toMatchObject({
      nombre_comercial: 'TecnoQro',
      sitio_web: 'https://tecnoqro.mx',
      descripcion: 'Empresa de desarrollo de software y soporte técnico.',
      practicas_inclusion:
        'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
    });
    expect(ficha.vacantes.map((v) => [v.id, v.compatibilidad])).toEqual([
      [1, 88],
      [6, 15],
    ]);
    expect(ficha.vacantes[0].postulacion_id).toBe(1);
  });

  it('Estudio Trazo y las empresas que no existen responden 404; un reclutador ve la ficha sin compatibilidad', async () => {
    conSesion(MARIANA);
    expect((await errorDe(empresas.detalle(4))).codigo).toBe('no_encontrado');
    expect((await errorDe(empresas.detalle(999))).status).toBe(404);

    conSesion(LAURA, 'reclutador');
    const ficha = await empresas.detalle(2);
    expect(
      ficha.vacantes.every((v) => v.compatibilidad === null && v.postulacion_id === null),
    ).toBe(true);
  });
});
