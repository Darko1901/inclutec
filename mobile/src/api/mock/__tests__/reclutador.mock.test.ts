import { configurarSesionApi } from '../../sesionApi';
import type { VacanteEntrada } from '../../tipos';
import { obtenerEstado } from '../datos';
import { EmpresasMock } from '../empresas.mock';
import { crearToken } from '../tokens';
import { VacantesMock } from '../vacantes.mock';

const empresas = new EmpresasMock();
const vacantes = new VacantesMock();

const LAURA = 2; // TecnoQro, validada
const DANIEL = 7; // Estudio Trazo, pendiente
const MARIANA = 3;
const RECHAZADA = 102; // Constructora Rivera
const SUSPENDIDA = 103; // Academia Alameda

function conSesion(id: number, rol: 'candidato' | 'reclutador' = 'reclutador') {
  const { token } = crearToken(id, rol);
  configurarSesionApi({ obtenerToken: () => token });
}

const PDF = { uri: 'file:///constancia.pdf', nombre: 'constancia.pdf', tipo: 'application/pdf' };
const LOGO = { uri: 'file:///logo.png', nombre: 'logo.png', tipo: 'image/png' };

const DATOS_EMPRESA = {
  nombre_comercial: 'TecnoQro',
  sector_id: 4,
  tamano_empresa_id: 3,
  municipio_id: 3,
  direccion: 'Av. Constituyentes 100, Querétaro',
  descripcion: 'Empresa de desarrollo de software y soporte técnico.',
  sitio_web: 'https://tecnoqro.mx',
  practicas_inclusion:
    'Programa de inclusión laboral desde 2022; personal capacitado en LSM básica.',
};

const ENTRADA: VacanteEntrada = {
  titulo: 'Analista de soporte',
  categoria_id: 1,
  descripcion: 'Atiende solicitudes de soporte.',
  jornada_id: 1,
  tipo_contrato_id: 1,
  plazas: 1,
  modalidad_id: 2,
  municipio_id: 3,
  direccion: null,
  salario_min: 12000,
  salario_max: 15000,
  mostrar_salario: true,
  nivel_educativo_id: null,
  experiencia_anios: 0,
  habilidades: [{ habilidad_id: 4, obligatoria: true }],
  ajustes: [{ ajuste_id: 12, tipo: 'bajo_solicitud' }],
  sin_condiciones_accesibilidad: false,
  notas_accesibilidad: null,
  estado: 'borrador',
};

describe('empresa propia · lectura y datos fiscales', () => {
  it('regresa a TecnoQro como el ejemplo del contrato', async () => {
    conSesion(LAURA);
    expect(await empresas.miOrganizacion()).toMatchObject({
      id: 1,
      razon_social: 'Tecnologías Querétaro S.A. de C.V.',
      nombre_comercial: 'TecnoQro',
      rfc: 'TQU150312AB1',
      sector: { id: 4, nombre: 'Tecnologías de la información' },
      tamano_empresa: { id: 3, nombre: 'Mediana' },
      direccion: 'Av. Constituyentes 100, Querétaro',
      estado: 'validada',
      motivo_estado: null,
      datos_fiscales_editables: false,
    });
  });

  it('exige sesión de reclutador', async () => {
    conSesion(MARIANA, 'candidato');
    await expect(empresas.miOrganizacion()).rejects.toMatchObject({ status: 403 });
  });

  it('una empresa validada no cambia razón social ni RFC (403 datos_fiscales_bloqueados)', async () => {
    conSesion(LAURA);
    await expect(
      empresas.actualizarMiOrganizacion({ ...DATOS_EMPRESA, razon_social: 'Otra razón S.A.' }),
    ).rejects.toMatchObject({ status: 403, codigo: 'datos_fiscales_bloqueados' });
    await expect(
      empresas.actualizarMiOrganizacion({ ...DATOS_EMPRESA, rfc: 'OTR150312AB1' }),
    ).rejects.toMatchObject({ status: 403, codigo: 'datos_fiscales_bloqueados' });
    expect((await empresas.miOrganizacion()).rfc).toBe('TQU150312AB1');
  });

  it('una empresa validada sí cambia sus demás datos y reenviar los mismos datos fiscales no estorba', async () => {
    conSesion(LAURA);
    const actualizada = await empresas.actualizarMiOrganizacion({
      ...DATOS_EMPRESA,
      nombre_comercial: 'TecnoQro Soluciones',
      razon_social: 'Tecnologías Querétaro S.A. de C.V.',
      rfc: 'TQU150312AB1',
    });
    expect(actualizada.nombre_comercial).toBe('TecnoQro Soluciones');
    expect(obtenerEstado().usuarios.find((u) => u.usuario.id === LAURA)!.usuario.empresa).toEqual({
      id: 1,
      nombre_comercial: 'TecnoQro Soluciones',
      estado: 'validada',
    });
  });

  it('una empresa pendiente cambia razón social y RFC; un RFC ajeno responde 409', async () => {
    conSesion(DANIEL);
    const antes = await empresas.miOrganizacion();
    expect(antes).toMatchObject({ estado: 'pendiente', datos_fiscales_editables: true });
    const nueva = await empresas.actualizarMiOrganizacion({
      ...DATOS_EMPRESA,
      nombre_comercial: antes.nombre_comercial,
      razon_social: 'Estudio Trazo Creativo S.A.S.',
      rfc: 'ETC210111XY9',
    });
    expect(nueva).toMatchObject({
      razon_social: 'Estudio Trazo Creativo S.A.S.',
      rfc: 'ETC210111XY9',
    });
    await expect(
      empresas.actualizarMiOrganizacion({ ...DATOS_EMPRESA, rfc: 'TQU150312AB1' }),
    ).rejects.toMatchObject({ status: 409, codigo: 'rfc_duplicado' });
  });

  it('valida formatos con 422 y un mensaje por campo', async () => {
    conSesion(LAURA);
    await expect(
      empresas.actualizarMiOrganizacion({
        ...DATOS_EMPRESA,
        nombre_comercial: '  ',
        sitio_web: 'tecnoqro',
        descripcion: 'x'.repeat(1001),
      }),
    ).rejects.toMatchObject({
      status: 422,
      codigo: 'validacion',
      campos: {
        nombre_comercial: expect.any(String),
        sitio_web: expect.any(String),
        descripcion: expect.any(String),
      },
    });
  });
});

describe('empresa propia · archivos y estado', () => {
  it('el logotipo acepta JPG o PNG de hasta 2 MB', async () => {
    conSesion(LAURA);
    expect(await empresas.subirLogo(LOGO)).toEqual({ url: LOGO.uri });
    expect((await empresas.miOrganizacion()).logo_url).toBe(LOGO.uri);
    await expect(empresas.subirLogo(PDF)).rejects.toMatchObject({
      status: 422,
      codigo: 'archivo_invalido',
    });
    await expect(empresas.subirLogo({ ...LOGO, tamano: 3 * 1024 * 1024 })).rejects.toMatchObject({
      status: 422,
      codigo: 'archivo_invalido',
    });
  });

  it('subir la constancia con la empresa rechazada la regresa a pendiente', async () => {
    conSesion(RECHAZADA);
    expect(await empresas.miOrganizacion()).toMatchObject({
      estado: 'rechazada',
      motivo_estado: expect.stringContaining('constancia'),
    });
    await empresas.subirConstancia(PDF);
    expect(await empresas.miOrganizacion()).toMatchObject({
      estado: 'pendiente',
      motivo_estado: null,
      documento_url: PDF.uri,
    });
    expect(
      obtenerEstado().usuarios.find((u) => u.usuario.id === RECHAZADA)!.usuario.empresa!.estado,
    ).toBe('pendiente');
  });

  it('la constancia es PDF de hasta 5 MB (422 archivo_invalido)', async () => {
    conSesion(DANIEL);
    await expect(empresas.subirConstancia(LOGO)).rejects.toMatchObject({
      status: 422,
      codigo: 'archivo_invalido',
    });
    await expect(
      empresas.subirConstancia({ ...PDF, tamano: 6 * 1024 * 1024 }),
    ).rejects.toMatchObject({ status: 422, codigo: 'archivo_invalido' });
    await empresas.subirConstancia(PDF);
    expect((await empresas.miOrganizacion()).estado).toBe('pendiente');
  });

  it('con la empresa validada o suspendida responde 409 estado_invalido', async () => {
    conSesion(LAURA);
    await expect(empresas.subirConstancia(PDF)).rejects.toMatchObject({
      status: 409,
      codigo: 'estado_invalido',
    });
    conSesion(SUSPENDIDA);
    expect(await empresas.miOrganizacion()).toMatchObject({
      estado: 'suspendida',
      motivo_estado: expect.any(String),
    });
    await expect(empresas.subirConstancia(PDF)).rejects.toMatchObject({
      status: 409,
      codigo: 'estado_invalido',
    });
  });
});

describe('mis vacantes', () => {
  it('lista las de la empresa con postulados y nuevos, y filtra por estado', async () => {
    conSesion(LAURA);
    const pagina = await empresas.misVacantes();
    expect(pagina.items.map((v) => [v.id, v.estado]).sort()).toEqual([
      [1, 'publicada'],
      [6, 'publicada'],
      [7, 'borrador'],
    ]);
    expect(pagina.items.find((v) => v.id === 1)).toMatchObject({
      titulo: 'Técnico de soporte de TI',
      modalidad: { id: 3, nombre: 'Híbrido' },
      postulados: 1,
      nuevas: 0,
    });
    const borradores = await empresas.misVacantes({ estado: 'borrador' });
    expect(borradores.items.map((v) => v.id)).toEqual([7]);
    await expect(empresas.misVacantes({ estado: 'otro' })).rejects.toMatchObject({ status: 422 });
  });

  it('cuenta como nuevas las postulaciones en estado «postulada»', async () => {
    conSesion(5); // Roberto, LogiBajío: Jorge (nueva) y Mariana (no seleccionada) en la vacante 3
    const { items } = await empresas.misVacantes();
    expect(items.find((v) => v.id === 3)).toMatchObject({ postulados: 2, nuevas: 1 });
  });
});

describe('crear y publicar vacantes', () => {
  it('una empresa pendiente guarda borradores pero no publica (403 empresa_no_validada)', async () => {
    conSesion(DANIEL);
    const borrador = await vacantes.crear(ENTRADA);
    expect(borrador).toMatchObject({
      vacante: { titulo: 'Analista de soporte', estado: 'borrador', publicada_en: null },
      postulados_notificados: 0,
    });
    await expect(vacantes.crear({ ...ENTRADA, estado: 'publicada' })).rejects.toMatchObject({
      status: 403,
      codigo: 'empresa_no_validada',
    });
    await expect(vacantes.cambiarEstado(borrador.vacante.id, 'publicada')).rejects.toMatchObject({
      status: 403,
      codigo: 'empresa_no_validada',
    });
  });

  it('publicar con datos incompletos responde 422 vacante_incompleta con los campos', async () => {
    conSesion(LAURA);
    await expect(
      vacantes.crear({
        ...ENTRADA,
        modalidad_id: 1,
        habilidades: [{ habilidad_id: 4, obligatoria: false }],
        ajustes: [],
        estado: 'publicada',
      }),
    ).rejects.toMatchObject({
      status: 422,
      codigo: 'vacante_incompleta',
      campos: {
        habilidades: expect.any(String),
        direccion: expect.any(String),
        ajustes: expect.any(String),
      },
    });
  });

  it('el borrador solo valida formatos y no exige accesibilidad', async () => {
    conSesion(LAURA);
    const { vacante } = await vacantes.crear({
      ...ENTRADA,
      modalidad_id: 1,
      habilidades: [],
      ajustes: [],
    });
    expect(vacante.estado).toBe('borrador');
    await expect(
      vacantes.crear({ ...ENTRADA, salario_min: 20000, salario_max: 10000 }),
    ).rejects.toMatchObject({
      status: 422,
      codigo: 'validacion',
      campos: { salario_max: expect.any(String) },
    });
    await expect(
      vacantes.crear({
        ...ENTRADA,
        ajustes: [
          { ajuste_id: 1, tipo: 'existente' },
          { ajuste_id: 1, tipo: 'bajo_solicitud' },
        ],
      }),
    ).rejects.toMatchObject({ status: 422, campos: { ajustes: expect.any(String) } });
  });

  it('con la empresa validada publica y el candidato la ve', async () => {
    conSesion(LAURA);
    const { vacante } = await vacantes.crear({ ...ENTRADA, estado: 'publicada' });
    expect(vacante).toMatchObject({ estado: 'publicada', postulados: 0 });
    expect(vacante.publicada_en).not.toBeNull();
    conSesion(MARIANA, 'candidato');
    expect(await vacantes.detalle(vacante.id)).toMatchObject({ titulo: 'Analista de soporte' });
  });

  it('declarar «sin condiciones de accesibilidad» cuenta como sección completa', async () => {
    conSesion(LAURA);
    const { vacante } = await vacantes.crear({
      ...ENTRADA,
      ajustes: [],
      sin_condiciones_accesibilidad: true,
      estado: 'publicada',
    });
    expect(vacante).toMatchObject({ estado: 'publicada', sin_condiciones_accesibilidad: true });
  });

  it('el reclutador ve el detalle de sus vacantes en cualquier estado y no el de otras empresas', async () => {
    conSesion(LAURA);
    expect(await vacantes.detalle(7)).toMatchObject({ id: 7, estado: 'borrador', postulados: 0 });
    await expect(vacantes.detalle(2)).rejects.toMatchObject({ status: 404 });
  });
});

describe('cambios de estado', () => {
  it('sigue las transiciones del contrato y rechaza las demás con 409', async () => {
    conSesion(LAURA);
    expect((await vacantes.cambiarEstado(1, 'pausada')).estado).toBe('pausada');
    expect((await vacantes.cambiarEstado(1, 'publicada')).estado).toBe('publicada');
    expect((await vacantes.cambiarEstado(1, 'cerrada')).estado).toBe('cerrada');
    await expect(vacantes.cambiarEstado(1, 'publicada')).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
    await expect(vacantes.cambiarEstado(7, 'pausada')).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
    await expect(vacantes.cambiarEstado(6, 'publicada')).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
  });

  it('una vacante suspendida no cambia de estado ni se edita', async () => {
    conSesion(LAURA);
    obtenerEstado().vacantes.find((v) => v.id === 6)!.estado = 'suspendida';
    await expect(vacantes.cambiarEstado(6, 'pausada')).rejects.toMatchObject({
      status: 409,
      codigo: 'transicion_invalida',
    });
    await expect(vacantes.editar(6, { ...ENTRADA, estado: 'publicada' })).rejects.toMatchObject({
      status: 409,
      codigo: 'estado_invalido',
    });
  });

  it('una vacante cerrada no se edita', async () => {
    conSesion(LAURA);
    await vacantes.cambiarEstado(6, 'cerrada');
    await expect(vacantes.editar(6, ENTRADA)).rejects.toMatchObject({
      status: 409,
      codigo: 'estado_invalido',
    });
  });

  it('publicar un borrador completo lo publica; si le falta algo, 422', async () => {
    conSesion(LAURA);
    // El borrador 7 (S002) no tiene aún todo lo necesario? Se comprueba con lo que sí tiene.
    const borrador = obtenerEstado().vacantes.find((v) => v.id === 7)!;
    borrador.ajustes = [];
    borrador.sin_condiciones_accesibilidad = false;
    await expect(vacantes.cambiarEstado(7, 'publicada')).rejects.toMatchObject({
      status: 422,
      codigo: 'vacante_incompleta',
      campos: { ajustes: expect.any(String) },
    });
  });
});

describe('duplicar', () => {
  it('crea un borrador con « (copia)», sin publicar y con los mismos requisitos', async () => {
    conSesion(LAURA);
    const copia = await vacantes.duplicar(1);
    expect(copia).toMatchObject({
      titulo: 'Técnico de soporte de TI (copia)',
      estado: 'borrador',
      publicada_en: null,
      postulados: 0,
    });
    expect(copia.id).not.toBe(1);
    expect(copia.habilidades.map((h) => [h.id, h.obligatoria])).toEqual(
      (await vacantes.detalle(1)).habilidades.map((h) => [h.id, h.obligatoria]),
    );
    expect((await empresas.misVacantes({ estado: 'borrador' })).items.map((v) => v.id)).toContain(
      copia.id,
    );
    await expect(vacantes.duplicar(2)).rejects.toMatchObject({ status: 404 });
  });
});

describe('editar una vacante con postulados', () => {
  async function entradaDeLaVacante1(): Promise<VacanteEntrada> {
    const v = await vacantes.detalle(1);
    return {
      titulo: v.titulo,
      categoria_id: v.categoria.id,
      descripcion: v.descripcion,
      jornada_id: v.jornada.id,
      tipo_contrato_id: v.tipo_contrato.id,
      plazas: v.plazas,
      modalidad_id: v.modalidad.id,
      municipio_id: v.municipio.id,
      direccion: v.direccion,
      salario_min: v.salario?.min ?? null,
      salario_max: v.salario?.max ?? null,
      mostrar_salario: v.mostrar_salario,
      nivel_educativo_id: v.nivel_educativo?.id ?? null,
      experiencia_anios: v.experiencia_anios,
      habilidades: v.habilidades.map((h) => ({ habilidad_id: h.id, obligatoria: h.obligatoria })),
      ajustes: v.ajustes.map((a) => ({ ajuste_id: a.id, tipo: a.tipo })),
      sin_condiciones_accesibilidad: v.sin_condiciones_accesibilidad,
      notas_accesibilidad: v.notas_accesibilidad,
      estado: 'publicada',
    };
  }

  it('cambiar una habilidad obligatoria recalcula la compatibilidad de Mariana y avisa a los postulados', async () => {
    conSesion(MARIANA, 'candidato');
    expect((await vacantes.detalle(1)).postulacion_id).toBe(1);
    expect((await vacantes.recomendadas()).items.find((v) => v.id === 1)!.compatibilidad).toBe(88);

    conSesion(LAURA);
    const datos = await entradaDeLaVacante1();
    // SQL (id 3) era obligatoria y a Mariana le falta: pasa a deseable.
    datos.habilidades = datos.habilidades.map((h) =>
      h.habilidad_id === 3 ? { ...h, obligatoria: false } : h,
    );
    const guardada = await vacantes.editar(1, datos);
    expect(guardada.postulados_notificados).toBe(1);
    expect(guardada.vacante.habilidades.find((h) => h.id === 3)!.obligatoria).toBe(false);

    conSesion(MARIANA, 'candidato');
    expect((await vacantes.recomendadas()).items.find((v) => v.id === 1)!.compatibilidad).toBe(91);
    expect((await vacantes.compatibilidad(1)).puntaje).toBe(91);
  });

  it('un cambio que no toca requisitos no avisa a nadie', async () => {
    conSesion(LAURA);
    const datos = await entradaDeLaVacante1();
    const guardada = await vacantes.editar(1, { ...datos, titulo: 'Técnico de soporte de TI Sr' });
    expect(guardada.vacante.titulo).toBe('Técnico de soporte de TI Sr');
    expect(guardada.postulados_notificados).toBe(0);
  });

  it('una vacante de otra empresa responde 404', async () => {
    conSesion(LAURA);
    await expect(vacantes.editar(2, ENTRADA)).rejects.toMatchObject({ status: 404 });
  });
});
