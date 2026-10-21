import { configurarSesionApi } from '../../sesionApi';
import { obtenerEstado } from '../datos';
import { EntrevistasMock } from '../entrevistas.mock';
import { HorariosMock } from '../horarios.mock';
import { PostulacionesMock } from '../postulaciones.mock';
import { ReportesMock } from '../reportes.mock';
import { crearToken } from '../tokens';

const postulaciones = new PostulacionesMock();
const horarios = new HorariosMock();
const entrevistas = new EntrevistasMock();
const reportes = new ReportesMock();

const LAURA = 2; // TecnoQro
const ROBERTO = 5; // LogiBajío
const MARIANA = 3;
const HORA = 3600 * 1000;

function conSesion(id: number, rol: 'candidato' | 'reclutador' = 'reclutador') {
  const { token } = crearToken(id, rol);
  configurarSesionApi({ obtenerToken: () => token });
}

const enHoras = (horas: number) => new Date(Date.now() + horas * HORA).toISOString();
const LIGA = 'https://meet.google.com/abc-defg-hij';

/** Todas las páginas de los postulados de una vacante. */
async function todos(consulta: Parameters<PostulacionesMock['postuladosDe']>[1] = {}) {
  const pagina = await postulaciones.postuladosDe(1, { ...consulta, size: 100 });
  return pagina.items;
}

describe('postulados de una vacante (REC-04)', () => {
  beforeEach(() => conSesion(LAURA));

  it('salen ordenados por la compatibilidad del reclutador y Mariana tiene 83 %', async () => {
    const items = await todos();
    expect(items).toHaveLength(28);
    const puntajes = items.map((i) => i.compatibilidad);
    expect(puntajes).toEqual([...puntajes].sort((a, b) => b - a));
    expect(items.find((i) => i.postulacion_id === 1)).toMatchObject({
      candidato: { id: 3, nombre: 'Mariana', apellidos: 'López García', foto_url: null },
      compatibilidad: 83,
      estado: 'entrevista',
      creado_en: '2026-09-30T17:20:00Z',
      ajustes_por_confirmar: false,
    });
    // Los empates se resuelven con quien se postuló antes: Karla (100 %) antes que Carlos (100 %).
    expect(items.slice(0, 2).map((i) => [i.postulacion_id, i.compatibilidad])).toEqual([
      [117, 100],
      [110, 100],
    ]);
  });

  it('pagina con page y size y reporta el total', async () => {
    const primera = await postulaciones.postuladosDe(1, { page: 1, size: 20 });
    const segunda = await postulaciones.postuladosDe(1, { page: 2, size: 20 });
    expect(primera).toMatchObject({ total: 28, page: 1, size: 20 });
    expect(primera.items).toHaveLength(20);
    expect(segunda.items).toHaveLength(8);
    const ids = [...primera.items, ...segunda.items].map((i) => i.postulacion_id);
    expect(new Set(ids).size).toBe(28);
  });

  it('filtra por estado y por compatibilidad mínima', async () => {
    const enEntrevista = await todos({ estado: 'entrevista' });
    expect(enEntrevista.map((i) => i.postulacion_id).sort((a, b) => a - b)).toEqual([1, 115]);

    const buenos = await todos({ compatibilidad_min: 85 });
    expect(buenos.length).toBeGreaterThan(0);
    expect(buenos.every((i) => i.compatibilidad >= 85)).toBe(true);
    expect(buenos.some((i) => i.postulacion_id === 1)).toBe(false);

    const combinado = await todos({ estado: 'postulada', compatibilidad_min: 70 });
    expect(combinado.every((i) => i.estado === 'postulada' && i.compatibilidad >= 70)).toBe(true);
    expect(await todos({ compatibilidad_min: 100 })).toHaveLength(2);
  });

  it('las retiradas no aparecen salvo que se pidan', async () => {
    expect((await todos()).some((i) => i.estado === 'retirada')).toBe(false);
    const retiradas = await todos({ estado: 'retirada' });
    expect(retiradas.map((i) => i.postulacion_id)).toEqual([118]);
  });

  it('valida los filtros (422) y la propiedad de la vacante (403 y 404)', async () => {
    await expect(postulaciones.postuladosDe(1, { estado: 'otro' })).rejects.toMatchObject({
      status: 422,
      campos: { estado: expect.any(String) },
    });
    await expect(postulaciones.postuladosDe(1, { compatibilidad_min: 101 })).rejects.toMatchObject({
      status: 422,
      campos: { compatibilidad_min: expect.any(String) },
    });
    // La vacante 2 es de LogiBajío.
    await expect(postulaciones.postuladosDe(2)).rejects.toMatchObject({
      status: 403,
      codigo: 'sin_permiso',
    });
    await expect(postulaciones.postuladosDe(999)).rejects.toMatchObject({ status: 404 });
    conSesion(MARIANA, 'candidato');
    await expect(postulaciones.postuladosDe(1)).rejects.toMatchObject({ status: 403 });
  });

  it('marca «ajustes por confirmar» solo si compartió necesidades que la vacante no tiene como existentes', async () => {
    const porId = Object.fromEntries((await todos()).map((i) => [i.postulacion_id, i]));
    // 112 comparte necesidades que la vacante no declara; 114, una que ofrece bajo solicitud.
    expect(porId[112].ajustes_por_confirmar).toBe(true);
    expect(porId[114].ajustes_por_confirmar).toBe(true);
    expect(porId[121].ajustes_por_confirmar).toBe(true);
    // 111, 119 y Mariana comparten necesidades que el lugar ya cubre; 110 no compartió nada.
    expect(porId[111].ajustes_por_confirmar).toBe(false);
    expect(porId[119].ajustes_por_confirmar).toBe(false);
    expect(porId[1].ajustes_por_confirmar).toBe(false);
    expect(porId[110].ajustes_por_confirmar).toBe(false);
  });

  it('nada sobre discapacidad: ni en la lista ni en el detalle', async () => {
    const texto = JSON.stringify([await todos(), await postulaciones.detallePostulado(1)]);
    expect(texto).not.toMatch(/discapacidad/i);
    expect(texto).not.toMatch(/diagn[oó]stic/i);
    const [primero] = await todos();
    expect(Object.keys(primero).sort()).toEqual([
      'ajustes_por_confirmar',
      'candidato',
      'compatibilidad',
      'creado_en',
      'estado',
      'postulacion_id',
    ]);
  });

  it('las necesidades de ajuste nunca cambian el puntaje ni el orden', async () => {
    const antes = (await todos()).map((i) => [i.postulacion_id, i.compatibilidad]);
    const estado = obtenerEstado();
    // 119 deja de compartir y 110 pasa a compartir muchas necesidades: el orden es el mismo.
    estado.postulaciones.find((p) => p.id === 119)!.comparte_ajustes = false;
    const nuevo = estado.candidatos.find((c) => c.usuario_id === 110)!;
    nuevo.consentimiento_sensibles_en = '2026-09-20T17:00:00Z';
    nuevo.necesidad_ids = [4, 5, 6, 7, 8, 9, 10, 11];
    estado.postulaciones.find((p) => p.id === 110)!.comparte_ajustes = true;
    const despues = (await todos()).map((i) => [i.postulacion_id, i.compatibilidad]);
    expect(despues).toEqual(antes);
    expect((await postulaciones.detallePostulado(110)).compatibilidad.puntaje).toBe(100);
  });
});

describe('detalle del postulado (REC-05)', () => {
  beforeEach(() => conSesion(LAURA));

  it('Mariana: desglose sin el componente A, CV, contacto, necesidades y entrevista', async () => {
    const detalle = await postulaciones.detallePostulado(1);
    expect(detalle.postulacion).toMatchObject({
      id: 1,
      estado: 'entrevista',
      mensaje: 'Me interesa mucho el puesto; tengo experiencia en soporte.',
    });
    expect(detalle.vacante).toEqual({ id: 1, titulo: 'Técnico de soporte de TI' });
    expect(detalle.compatibilidad).toMatchObject({
      puntaje: 83,
      componentes: { h: 0.7, m: 1, f: 1 },
      modalidad: { coincide: true },
      formacion: { cumple: 'si' },
    });
    expect(detalle.compatibilidad.componentes).not.toHaveProperty('a');
    expect(detalle.compatibilidad.habilidades.obligatorias_faltantes).toEqual([
      { id: 3, nombre: 'SQL' },
    ]);
    expect(detalle.candidato).toMatchObject({
      id: 3,
      nombre: 'Mariana',
      correo: 'mariana.lopez@correo.mx',
      telefono: '4427654321',
    });
    expect(detalle.candidato.habilidades).toContainEqual({
      id: 4,
      nombre: 'Soporte técnico',
      nivel: 'avanzado',
    });
    expect(detalle.necesidades).toEqual([
      { id: 1, nombre: 'Acceso con rampa', categoria: 'movilidad', estado: 'existente' },
      { id: 3, nombre: 'Baño accesible', categoria: 'movilidad', estado: 'existente' },
    ]);
    expect(detalle.transiciones_permitidas).toEqual(['aceptada', 'no_seleccionada']);
    expect(detalle.entrevista).toMatchObject({
      id: 1,
      estado: 'agendada',
      duracion_min: 45,
      liga: LIGA,
      puede_cancelar: false,
    });
  });

  it('el contacto del candidato solo sale desde «entrevista»', async () => {
    for (const [id, visible] of [
      [110, false], // postulada
      [111, false], // en revisión
      [113, false], // no seleccionada
      [115, true], // entrevista
      [117, true], // aceptada
    ] as const) {
      const { candidato } = await postulaciones.detallePostulado(id);
      expect(candidato.correo !== null).toBe(visible);
      expect(candidato.telefono !== null).toBe(visible);
    }
  });

  it('necesidades en null si no las compartió; si las compartió, dicen si la vacante las cubre', async () => {
    const sinCompartir = await postulaciones.detallePostulado(110);
    expect(sinCompartir.necesidades).toBeNull();
    expect(sinCompartir.nota_ajustes).toBeNull();

    const compartidas = await postulaciones.detallePostulado(112);
    expect(compartidas.necesidades?.map((n) => [n.id, n.estado])).toEqual([
      [4, 'no_declarada'],
      [5, 'no_declarada'],
    ]);
    expect(compartidas.nota_ajustes).toMatch(/lector de pantalla/);

    const mixtas = await postulaciones.detallePostulado(114);
    expect(mixtas.necesidades?.map((n) => [n.id, n.estado])).toEqual([
      [3, 'existente'],
      [1, 'existente'],
      [12, 'bajo_solicitud'],
    ]);
  });

  it('si el candidato retiró su consentimiento ya no se ven sus necesidades', async () => {
    const candidato = obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!;
    candidato.consentimiento_sensibles_en = null;
    candidato.necesidad_ids = [];
    const detalle = await postulaciones.detallePostulado(1);
    expect(detalle.necesidades).toBeNull();
    expect(detalle.nota_ajustes).toBeNull();
  });

  it('una postulación de otra empresa responde 403 y una inexistente, 404', async () => {
    conSesion(ROBERTO);
    await expect(postulaciones.detallePostulado(1)).rejects.toMatchObject({
      status: 403,
      codigo: 'sin_permiso',
    });
    await expect(postulaciones.detallePostulado(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('cambio de estado', () => {
  beforeEach(() => conSesion(LAURA));

  it('cada estado ofrece solo sus transiciones y las demás responden 409', async () => {
    const permitidas = async (id: number) =>
      (await postulaciones.detallePostulado(id)).transiciones_permitidas;
    expect(await permitidas(110)).toEqual(['en_revision', 'no_seleccionada']); // postulada
    expect(await permitidas(111)).toEqual(['entrevista', 'no_seleccionada']); // en revisión
    expect(await permitidas(115)).toEqual(['aceptada', 'no_seleccionada']); // entrevista
    expect(await permitidas(117)).toEqual([]); // aceptada
    expect(await permitidas(113)).toEqual([]); // no seleccionada
    expect(await permitidas(118)).toEqual([]); // retirada

    await expect(
      postulaciones.cambiarEstado(110, { estado: 'entrevista', mensaje: null }),
    ).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
    await expect(
      postulaciones.cambiarEstado(110, { estado: 'aceptada', mensaje: null }),
    ).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      postulaciones.cambiarEstado(117, { estado: 'no_seleccionada', mensaje: null }),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect((await postulaciones.detallePostulado(110)).postulacion.estado).toBe('postulada');
  });

  it('valida el estado y el mensaje (422) y la propiedad (403)', async () => {
    await expect(
      postulaciones.cambiarEstado(110, { estado: 'retirada' as never, mensaje: null }),
    ).rejects.toMatchObject({ status: 422, campos: { estado: expect.any(String) } });
    await expect(
      postulaciones.cambiarEstado(110, { estado: 'en_revision', mensaje: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ status: 422, campos: { mensaje: expect.any(String) } });
    conSesion(ROBERTO);
    await expect(
      postulaciones.cambiarEstado(110, { estado: 'en_revision', mensaje: null }),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it('registra el historial con el mensaje y avisa al candidato', async () => {
    const resultado = await postulaciones.cambiarEstado(110, {
      estado: 'en_revision',
      mensaje: '  Revisaremos tu perfil esta semana.  ',
    });
    expect(resultado).toMatchObject({ id: 110, estado: 'en_revision' });
    expect(resultado.transiciones_permitidas).toEqual(['entrevista', 'no_seleccionada']);
    expect(resultado.historial.at(-1)).toMatchObject({
      estado_anterior: 'postulada',
      estado_nuevo: 'en_revision',
      mensaje: 'Revisaremos tu perfil esta semana.',
    });
    const aviso = obtenerEstado().notificaciones.find(
      (n) => n.usuario_id === 110 && n.tipo === 'cambio_estado',
    );
    expect(aviso).toMatchObject({
      mensaje: 'Tu postulación a Técnico de soporte de TI pasó a En revisión.',
      referencia: { tipo: 'postulacion', id: 110 },
      leida: false,
    });
  });

  it('al pasar a «entrevista» se muestra el contacto', async () => {
    await postulaciones.cambiarEstado(111, { estado: 'entrevista', mensaje: null });
    const { candidato } = await postulaciones.detallePostulado(111);
    expect(candidato.correo).toBe('daniela.ortega@correo.mx');
    expect(candidato.telefono).toMatch(/^\d{10}$/);
  });

  it('de punta a punta: lo que hace Laura aparece en la línea de tiempo de Mariana (CAN-06)', async () => {
    await postulaciones.cambiarEstado(1, {
      estado: 'aceptada',
      mensaje: '¡Felicidades! Te contactaremos para la contratación.',
    });

    conSesion(MARIANA, 'candidato');
    const detalle = await postulaciones.detalle(1);
    expect(detalle.estado).toBe('aceptada');
    expect(detalle.puede_retirar).toBe(false);
    expect(detalle.historial.at(-1)).toMatchObject({
      estado_anterior: 'entrevista',
      estado_nuevo: 'aceptada',
      mensaje: '¡Felicidades! Te contactaremos para la contratación.',
    });
    const mias = await postulaciones.mias({ activas: false });
    expect(mias.items.find((p) => p.id === 1)?.estado).toBe('aceptada');
  });

  it('«No seleccionada» cancela la entrevista agendada y libera al candidato del horario', async () => {
    await postulaciones.cambiarEstado(1, { estado: 'no_seleccionada', mensaje: null });
    const estado = obtenerEstado();
    expect(estado.entrevistas.find((e) => e.id === 1)?.estado).toBe('cancelada');
    expect(estado.horarios.find((h) => h.id === 1)?.estado).toBe('cancelado');
  });
});

describe('observaciones internas', () => {
  it('lista la de S002 con su autor, agrega nuevas (más reciente primero) y valida', async () => {
    conSesion(LAURA);
    const inicial = await postulaciones.observaciones(1);
    expect(inicial).toEqual([
      {
        id: 1,
        texto: 'Perfil sólido en soporte; confirmar disponibilidad de horario.',
        autor: { id: 2, nombre: 'Laura', apellidos: 'Hernández Ruiz' },
        creado_en: '2026-10-01T15:12:00Z',
      },
    ]);

    const nueva = await postulaciones.agregarObservacion(1, '  Llamar el lunes.  ');
    expect(nueva).toMatchObject({ texto: 'Llamar el lunes.', autor: { id: 2, nombre: 'Laura' } });
    expect((await postulaciones.observaciones(1)).map((o) => o.texto)).toEqual([
      'Llamar el lunes.',
      'Perfil sólido en soporte; confirmar disponibilidad de horario.',
    ]);

    await expect(postulaciones.agregarObservacion(1, '   ')).rejects.toMatchObject({
      status: 422,
      campos: { texto: expect.any(String) },
    });
    await expect(postulaciones.agregarObservacion(1, 'x'.repeat(1001))).rejects.toMatchObject({
      status: 422,
    });
  });

  it('solo las ve y las escribe el reclutador de esa empresa; el candidato no', async () => {
    conSesion(ROBERTO);
    await expect(postulaciones.observaciones(1)).rejects.toMatchObject({ status: 403 });
    await expect(postulaciones.agregarObservacion(1, 'hola')).rejects.toMatchObject({
      status: 403,
    });
    conSesion(MARIANA, 'candidato');
    await expect(postulaciones.observaciones(1)).rejects.toMatchObject({ status: 403 });
    // Y el detalle que ve la candidata no las incluye.
    expect(JSON.stringify(await postulaciones.detalle(1))).not.toMatch(/Perfil sólido en soporte/);
  });
});

describe('publicar y eliminar horarios', () => {
  beforeEach(() => conSesion(LAURA));

  const horario = (cambios: Record<string, unknown> = {}) => ({
    vacante_id: 1,
    inicio: enHoras(200),
    duracion_min: 45 as const,
    liga: LIGA,
    ...cambios,
  });

  it('publica un horario libre que la candidata ve en CAN-06', async () => {
    const creado = await horarios.publicar(horario());
    expect(creado).toMatchObject({
      vacante_id: 1,
      duracion_min: 45,
      estado: 'libre',
      liga: LIGA,
    });
    expect(new Date(creado.fin).getTime() - new Date(creado.inicio).getTime()).toBe(45 * 60000);

    conSesion(MARIANA, 'candidato');
    const disponibles = await horarios.disponibles(1);
    expect(disponibles.map((h) => h.id)).toContain(creado.id);
    expect(disponibles.find((h) => h.id === creado.id)?.liga).toBeNull();
  });

  it('acepta ligas de Meet y de Teams', async () => {
    await horarios.publicar(horario({ liga: 'https://teams.microsoft.com/l/meetup-join/abc' }));
    await horarios.publicar(horario({ inicio: enHoras(210) }));
  });

  it('rechaza liga que no es de Meet o Teams, fecha pasada y duración inválida (422)', async () => {
    await expect(
      horarios.publicar(horario({ liga: 'https://zoom.us/j/123' })),
    ).rejects.toMatchObject({
      status: 422,
      codigo: 'validacion',
      campos: { liga: expect.any(String) },
    });
    await expect(horarios.publicar(horario({ inicio: enHoras(-2) }))).rejects.toMatchObject({
      status: 422,
      campos: { inicio: expect.any(String) },
    });
    await expect(horarios.publicar(horario({ duracion_min: 20 }))).rejects.toMatchObject({
      status: 422,
      campos: { duracion_min: expect.any(String) },
    });
  });

  it('responde 409 horario_traslapado con otro horario del mismo reclutador, pero no si solo se tocan', async () => {
    const existente = obtenerEstado().horarios.find((h) => h.id === 100)!; // en 3 h, 30 min
    const inicio = new Date(existente.inicio).getTime();
    await expect(
      horarios.publicar(horario({ inicio: new Date(inicio + 10 * 60000).toISOString() })),
    ).rejects.toMatchObject({ status: 409, codigo: 'horario_traslapado' });
    // Justo al terminar el anterior no se traslapa.
    await horarios.publicar(
      horario({ inicio: new Date(inicio + 30 * 60000).toISOString(), duracion_min: 30 }),
    );
    // Otro reclutador sí puede usar la misma hora.
    conSesion(ROBERTO);
    await horarios.publicar(
      horario({ vacante_id: 2, inicio: new Date(inicio + 10 * 60000).toISOString() }),
    );
  });

  it('un horario cancelado ya no cuenta para el traslape', async () => {
    obtenerEstado().horarios.find((h) => h.id === 100)!.estado = 'cancelado';
    const inicio = new Date(obtenerEstado().horarios.find((h) => h.id === 100)!.inicio);
    await horarios.publicar(horario({ inicio: inicio.toISOString() }));
  });

  it('exige una vacante publicada de la empresa', async () => {
    // El 7 es un borrador de TecnoQro.
    await expect(horarios.publicar(horario({ vacante_id: 7 }))).rejects.toMatchObject({
      status: 422,
      campos: { vacante_id: expect.any(String) },
    });
    await expect(horarios.publicar(horario({ vacante_id: 2 }))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('elimina un horario libre, pero no uno agendado (409 estado_invalido)', async () => {
    await horarios.eliminar(2);
    expect(obtenerEstado().horarios.some((h) => h.id === 2)).toBe(false);
    await expect(horarios.eliminar(1)).rejects.toMatchObject({
      status: 409,
      codigo: 'estado_invalido',
    });
    expect(obtenerEstado().horarios.some((h) => h.id === 1)).toBe(true);
    conSesion(ROBERTO);
    await expect(horarios.eliminar(100)).rejects.toMatchObject({ status: 404 });
    conSesion(MARIANA, 'candidato');
    await expect(horarios.eliminar(100)).rejects.toMatchObject({ status: 403 });
  });
});

describe('agenda (REC-06)', () => {
  beforeEach(() => conSesion(LAURA));

  it('agrupa por día en orden, con candidato y vacante en los agendados', async () => {
    const agenda = await entrevistas.miAgenda();
    const fechas = agenda.map((d) => d.fecha);
    expect(fechas).toEqual([...fechas].sort());
    const horariosPlano = agenda.flatMap((d) => d.horarios);
    const iniciales = horariosPlano.map((h) => h.inicio);
    expect(iniciales).toEqual([...iniciales].sort());

    const agendado = horariosPlano.find((h) => h.id === 1)!;
    expect(agendado).toMatchObject({
      estado: 'agendado',
      liga: LIGA,
      vacante: { id: 1, titulo: 'Técnico de soporte de TI' },
      entrevista: {
        id: 1,
        estado: 'agendada',
        postulacion_id: 1,
        candidato: { id: 3, nombre: 'Mariana', apellidos: 'López García' },
      },
    });
    expect(horariosPlano.find((h) => h.id === 2)).toMatchObject({
      estado: 'libre',
      entrevista: null,
    });
    // Los horarios de otro reclutador, los pasados y los cancelados no salen.
    expect(horariosPlano.some((h) => h.id === 106)).toBe(false);
  });

  it('filtra por vacante y por rango de fechas, y valida (422)', async () => {
    const soloLaSeis = (await entrevistas.miAgenda({ vacante_id: 6 })).flatMap((d) => d.horarios);
    expect(soloLaSeis.every((h) => h.vacante.id === 6)).toBe(true);
    expect(soloLaSeis.map((h) => h.id)).toEqual([105]);

    const lejos = await entrevistas.miAgenda({ desde: '2030-01-01', hasta: '2030-01-31' });
    expect(lejos).toEqual([]);
    const larga = (await entrevistas.miAgenda({ hasta: '2027-12-31' })).flatMap((d) => d.horarios);
    expect(larga.length).toBeGreaterThan(0);

    await expect(entrevistas.miAgenda({ desde: '22/10/2026' })).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      entrevistas.miAgenda({ desde: '2026-12-01', hasta: '2026-11-01' }),
    ).rejects.toMatchObject({ status: 422 });
    conSesion(MARIANA, 'candidato');
    await expect(entrevistas.miAgenda()).rejects.toMatchObject({ status: 403 });
  });
});

describe('resultado de la entrevista', () => {
  beforeEach(() => conSesion(LAURA));

  it('«realizada» antes de la hora de inicio se rechaza (409 transicion_invalida)', async () => {
    await expect(
      entrevistas.registrarResultado(1, { estado: 'realizada', motivo_cancelacion: null }),
    ).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
    await expect(
      entrevistas.registrarResultado(1, { estado: 'no_asistio', motivo_cancelacion: null }),
    ).rejects.toMatchObject({ status: 409, codigo: 'transicion_invalida' });
    expect(obtenerEstado().entrevistas.find((e) => e.id === 1)?.estado).toBe('agendada');
  });

  it('después de la hora de inicio se marca realizada o «no asistió» y ya no cambia', async () => {
    // La entrevista 110 (Irene) empezó hace una hora.
    const resultado = await entrevistas.registrarResultado(110, {
      estado: 'realizada',
      motivo_cancelacion: null,
    });
    expect(resultado).toMatchObject({ id: 110, estado: 'realizada', puede_cancelar: false });
    await expect(
      entrevistas.registrarResultado(110, { estado: 'no_asistio', motivo_cancelacion: null }),
    ).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });

    // Otra entrevista que ya empezó: «no asistió».
    obtenerEstado().horarios.find((h) => h.id === 1)!.inicio = enHoras(-2);
    expect(
      await entrevistas.registrarResultado(1, { estado: 'no_asistio', motivo_cancelacion: null }),
    ).toMatchObject({
      estado: 'no_asistio',
    });
  });

  it('cancelar exige motivo (422), libera al candidato y le avisa', async () => {
    await expect(
      entrevistas.registrarResultado(1, { estado: 'cancelada', motivo_cancelacion: null }),
    ).rejects.toMatchObject({
      status: 422,
      campos: { motivo_cancelacion: expect.any(String) },
    });
    await expect(
      entrevistas.registrarResultado(1, { estado: 'cancelada', motivo_cancelacion: '   ' }),
    ).rejects.toMatchObject({ status: 422 });

    const cancelada = await entrevistas.registrarResultado(1, {
      estado: 'cancelada',
      motivo_cancelacion: 'Tuvimos un imprevisto con la sala.',
    });
    expect(cancelada.estado).toBe('cancelada');
    const estado = obtenerEstado();
    expect(estado.horarios.find((h) => h.id === 1)?.estado).toBe('cancelado');
    expect(estado.entrevistas.find((e) => e.id === 1)?.motivo_cancelacion).toBe(
      'Tuvimos un imprevisto con la sala.',
    );
    expect(
      estado.notificaciones.find(
        (n) => n.usuario_id === MARIANA && n.tipo === 'entrevista_cancelada',
      ),
    ).toMatchObject({
      mensaje: expect.stringContaining('Tuvimos un imprevisto con la sala.'),
      referencia: { tipo: 'postulacion', id: 1 },
    });

    // En CAN-06 Mariana ya no tiene entrevista y puede elegir otro horario.
    conSesion(MARIANA, 'candidato');
    const detalle = await postulaciones.detalle(1);
    expect(detalle.entrevista).toBeNull();
    expect(detalle.estado).toBe('entrevista');
    expect((await horarios.disponibles(1)).some((h) => h.id === 1)).toBe(false);
    const entrevista = await postulaciones.agendarEntrevista(1, 2);
    expect(entrevista.estado).toBe('agendada');
  });

  it('una entrevista de otra empresa responde 404', async () => {
    conSesion(ROBERTO);
    await expect(
      entrevistas.registrarResultado(1, { estado: 'cancelada', motivo_cancelacion: 'x' }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('valida el estado (422)', async () => {
    await expect(
      entrevistas.registrarResultado(1, { estado: 'agendada' as never, motivo_cancelacion: null }),
    ).rejects.toMatchObject({ status: 422, campos: { estado: expect.any(String) } });
  });
});

describe('reportar un perfil', () => {
  it('el reclutador reporta a quien se postuló a su empresa y no a otros', async () => {
    conSesion(LAURA);
    const reporte = await reportes.crear({ motivo_reporte_id: 2, candidato_id: 3 });
    expect(reporte.estado).toBe('abierto');
    // Jorge se postuló a la vacante 6 de TecnoQro.
    await reportes.crear({ motivo_reporte_id: 1, candidato_id: 4 });
    // Lucía nunca se postuló.
    await expect(reportes.crear({ motivo_reporte_id: 2, candidato_id: 101 })).rejects.toMatchObject(
      {
        status: 404,
      },
    );
    // Roberto no recibió la postulación de Mariana a TecnoQro… pero sí la de la vacante 3.
    conSesion(ROBERTO);
    await expect(reportes.crear({ motivo_reporte_id: 2, candidato_id: 110 })).rejects.toMatchObject(
      {
        status: 404,
      },
    );
  });
});
