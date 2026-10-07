import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { ApiError, auth, candidatos, postulaciones, reportes, vacantes } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN02DetalleVacante from '../CAN02DetalleVacante';

const navegacion = { navigate: jest.fn(), setOptions: jest.fn() };

// En las pruebas no hay vistas nativas: findNodeHandle devuelve siempre el mismo número.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get: (objetivo, propiedad, receptor) =>
      propiedad === 'findNodeHandle' ? () => 42 : Reflect.get(objetivo, propiedad, receptor),
  });
});

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return estado === 'activa' ? <>{children}</> : null;
}

/** Hace de navegador: guarda lo que la pantalla pone en el encabezado (el botón ⋮) y lo dibuja. */
function Anfitrion({ id }: { id: number }) {
  const [cabecera, setCabecera] = useState<ReactNode>(null);
  const navigation = useMemo(
    () => ({
      ...navegacion,
      setOptions: (opciones: { headerRight?: () => ReactNode }) =>
        setCabecera(opciones.headerRight?.() ?? null),
    }),
    [],
  );
  const props = {
    navigation,
    route: { key: 'k', name: 'DetalleVacante', params: { id } },
  } as unknown as React.ComponentProps<typeof CAN02DetalleVacante>;
  return (
    <>
      <View>{cabecera}</View>
      <CAN02DetalleVacante {...props} />
    </>
  );
}

async function abrir(id: number, correo = 'mariana.lopez@correo.mx') {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <Anfitrion id={id} />
      </Entrar>
    </SesionProvider>,
  );
}

/** Abre la lista de motivos (cuando ya cargó el catálogo) y elige uno. */
async function elegirMotivo(nombre: string) {
  const boton = await screen.findByRole('button', { name: /^Motivo, / });
  await waitFor(() => expect(boton).toBeEnabled());
  await fireEvent.press(boton);
  await fireEvent.press(await screen.findByRole('radio', { name: nombre }));
}

async function abrirMenu() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Más opciones' }));
}

const botonPostular = () => screen.getByRole('button', { name: 'Postularme' });

async function esperar() {
  await screen
    .findByRole('header', { name: 'Compatibilidad 88 por ciento' })
    .catch(() => undefined);
  await screen.findByTestId('detalle-vacante');
}

async function postularA(vacante: number, correo = 'mariana.lopez@correo.mx') {
  await abrir(vacante, correo);
  await esperar();
  await fireEvent.press(await screen.findByRole('button', { name: 'Postularme' }));
  await screen.findByRole('header', { name: 'Postularme', hidden: true }).catch(() => undefined);
}

describe('CAN-02 · Detalle de vacante', () => {
  beforeEach(() => {
    navegacion.navigate.mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('contenido', () => {
    it('muestra el encabezado: puesto, empresa validada, ubicación y fecha', async () => {
      await abrir(1);
      await esperar();

      expect(screen.getByRole('header', { name: 'Técnico de soporte de TI' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'TecnoQro, empresa validada' })).toBeOnTheScreen();
      expect(screen.getByText('Empresa validada', { hidden: true })).toBeOnTheScreen();
      expect(screen.getByText('Querétaro, Querétaro')).toBeOnTheScreen();
      expect(screen.getByText('Publicada hoy')).toBeOnTheScreen();
    });

    it('«Publicada hace 3 días» en una vacante de hace tres días (Desarrollador web junior)', async () => {
      await abrir(6);
      await esperar();

      expect(screen.getByText('Publicada hace 3 días')).toBeOnTheScreen();
    });

    it('tocar la empresa abre CAN-07 con su id', async () => {
      await abrir(1);
      await esperar();

      await fireEvent.press(screen.getByRole('button', { name: 'TecnoQro, empresa validada' }));

      expect(navegacion.navigate).toHaveBeenCalledWith('CandidatoTabs', {
        screen: 'Empresas',
        params: { empresa_id: 1 },
      });
    });

    it('la tarjeta de compatibilidad desglosa en texto, con 88 por ciento para el lector', async () => {
      await abrir(1);
      await esperar();

      const tarjeta = within(screen.getByTestId('tarjeta-compatibilidad'));
      expect(tarjeta.getByText('Compatibilidad 88 %', { hidden: true })).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: 'Compatibilidad 88 por ciento' }),
      ).toBeOnTheScreen();
      for (const linea of [
        'Habilidades: 3 de 4 obligatorias · te falta SQL',
        'Tus necesidades de ajuste: 2 de 2 cubiertas',
        'Modalidad: coincide',
        'Formación: cumple',
      ]) {
        expect(screen.getByLabelText(linea)).toBeOnTheScreen();
        expect(tarjeta.getByText(linea, { hidden: true })).toBeOnTheScreen();
      }
    });

    it('Jorge: el desglose dice que la modalidad no coincide del todo y que cursa la formación', async () => {
      await abrir(1, 'jorge.ramirez@correo.mx');
      await esperar();

      expect(
        screen.getByLabelText(
          'Modalidad: la vacante es híbrida y no coincide del todo con tus preferencias',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(
          'Formación: la estás cursando (se pide Técnico superior universitario)',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(
          'Tus necesidades de ajuste: no tienes necesidades registradas que comparar',
        ),
      ).toBeOnTheScreen();
    });

    it('separa requisitos obligatorios y deseables, formación y experiencia', async () => {
      await abrir(1);
      await esperar();

      for (const encabezado of ['Descripción', 'Requisitos', 'Condiciones', 'Accesibilidad']) {
        expect(screen.getByRole('header', { name: encabezado })).toBeOnTheScreen();
      }
      expect(screen.getByRole('header', { name: 'Habilidades obligatorias' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Habilidades deseables' })).toBeOnTheScreen();
      expect(screen.getByText('Soporte técnico')).toBeOnTheScreen();
      expect(screen.getByText('JavaScript')).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Formación mínima: Técnico superior universitario'),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('Experiencia: 1 año de experiencia')).toBeOnTheScreen();
    });

    it('condiciones: jornada, contrato, plazas y salario cuando viene', async () => {
      await abrir(1);
      await esperar();

      expect(screen.getByLabelText('Jornada: Tiempo completo')).toBeOnTheScreen();
      expect(screen.getByLabelText('Contrato: Indefinido')).toBeOnTheScreen();
      expect(screen.getByLabelText('Plazas: 2 plazas')).toBeOnTheScreen();
      expect(screen.getByLabelText('Salario: $14,000 a $18,000 MXN')).toBeOnTheScreen();
    });

    it('no muestra salario si la empresa no lo publica (Auxiliar contable)', async () => {
      await abrir(4);
      await screen.findByTestId('detalle-vacante');

      expect(screen.queryByLabelText(/^Salario:/)).not.toBeOnTheScreen();
      expect(screen.getByLabelText('Jornada: Medio tiempo')).toBeOnTheScreen();
    });

    it('accesibilidad dividida en «El lugar cuenta con» y «La empresa puede ofrecer bajo solicitud»', async () => {
      await abrir(1);
      await esperar();

      expect(screen.getByRole('header', { name: 'El lugar cuenta con' })).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: 'La empresa puede ofrecer bajo solicitud' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(
          'Acceso con rampa. Entrada y áreas de trabajo accesibles en silla de ruedas',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(
          'Horario flexible. Posibilidad de ajustar horarios de entrada y salida',
        ),
      ).toBeOnTheScreen();
    });

    it('muestra las notas de accesibilidad de la empresa (Auxiliar de almacén)', async () => {
      await abrir(2);
      await screen.findByTestId('detalle-vacante');

      expect(screen.getByRole('header', { name: 'Notas de la empresa' })).toBeOnTheScreen();
      expect(
        screen.getByText('Pasillos de 1.5 m y estaciones de trabajo a dos alturas.'),
      ).toBeOnTheScreen();
    });

    it('ConCentro (atención telefónica) muestra la declaración de «sin condiciones»', async () => {
      await abrir(5);
      await screen.findByTestId('detalle-vacante');

      expect(
        screen.getByLabelText(
          'La empresa declaró que el lugar no cuenta con condiciones de accesibilidad',
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'El lugar cuenta con' })).not.toBeOnTheScreen();
    });

    it('un borrador responde 404: muestra el mensaje con «Reintentar»', async () => {
      await abrir(7);

      expect(
        await screen.findByText('La vacante no existe o ya no está disponible.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
    });
  });

  describe('postularse', () => {
    it('en la vacante 1 ya aparece «Ver mi postulación» y abre CAN-06 con su id', async () => {
      await abrir(1);
      await esperar();

      expect(screen.queryByRole('button', { name: 'Postularme' })).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Ver mi postulación' }));

      expect(navegacion.navigate).toHaveBeenCalledWith('DetallePostulacion', { id: 1 });
    });

    it('Mariana se postula a otra vacante: pregunta, confirma, avisa y el botón cambia', async () => {
      const crear = jest.spyOn(postulaciones, 'crear');
      await postularA(2);

      // «preguntar»: no hay respuesta inicial y es obligatoria.
      expect(screen.getByRole('radio', { name: 'Sí' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'No' })).not.toBeChecked();
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      expect(await screen.findByText('Elige Sí o No para continuar.')).toBeOnTheScreen();
      expect(crear).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('radio', { name: 'Sí' }));
      await fireEvent.changeText(
        screen.getByLabelText('Mensaje para la empresa (opcional)'),
        'Me interesa el puesto.',
      );
      expect(screen.getByText('22 / 500')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));

      // Pide confirmar antes de enviar.
      expect(await screen.findByText('¿Enviar tu postulación?')).toBeOnTheScreen();
      expect(crear).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: 'Sí, enviar' }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith({
          vacante_id: 2,
          mensaje: 'Me interesa el puesto.',
          compartir_ajustes: true,
        }),
      );
      expect(
        await screen.findByText('Listo, te postulaste. La empresa recibirá tu postulación.'),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Postularme' })).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Ver mi postulación' }));
      expect(navegacion.navigate).toHaveBeenCalledWith('DetallePostulacion', { id: 3 });
    });

    it('la respuesta inicial sigue la preferencia del perfil: siempre → Sí, nunca → No', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      await postularA(2);
      expect(screen.getByRole('radio', { name: 'Sí' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'No' })).not.toBeChecked();
    });

    it('con «nunca» parte en No y manda compartir_ajustes en false', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'nunca';
      const crear = jest.spyOn(postulaciones, 'crear');
      await postularA(2);
      expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();

      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith({
          vacante_id: 2,
          mensaje: null,
          compartir_ajustes: false,
        }),
      );
    });

    it('sin consentimiento (Jorge) explica que no hay necesidades para compartir', async () => {
      const crear = jest.spyOn(postulaciones, 'crear');
      await postularA(2, 'jorge.ramirez@correo.mx');

      expect(screen.queryByRole('radio', { name: 'Sí' })).not.toBeOnTheScreen();
      expect(screen.getByText(/No hay necesidades de ajuste para compartir/)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith({
          vacante_id: 2,
          mensaje: null,
          compartir_ajustes: false,
        }),
      );
      expect(await screen.findByRole('button', { name: 'Ver mi postulación' })).toBeOnTheScreen();
    });

    it('«Revisar» en la confirmación regresa al formulario sin enviar', async () => {
      const crear = jest.spyOn(postulaciones, 'crear');
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      await postularA(2);
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));

      await fireEvent.press(await screen.findByRole('button', { name: 'Revisar' }));

      expect(crear).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Enviar postulación' })).toBeOnTheScreen();
    });

    it('409 postulacion_duplicada: avisa y el botón cambia a «Ver mi postulación»', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      await postularA(2);
      // Otra sesión se postuló mientras esta pantalla estaba abierta.
      await postulaciones.crear({ vacante_id: 2, mensaje: null, compartir_ajustes: false });
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      expect(await screen.findByText('Ya te postulaste a esta vacante.')).toBeOnTheScreen();
      await fireEvent.press(await screen.findByRole('button', { name: 'Ver mi postulación' }));
      expect(navegacion.navigate).toHaveBeenCalledWith('DetallePostulacion', { id: 3 });
    });

    it('409 vacante_no_disponible: explica y deja el botón deshabilitado', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      await postularA(2);
      obtenerEstado().vacantes.find((v) => v.id === 2)!.estado = 'pausada';
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      expect(await screen.findByText('Esta vacante ya no está disponible.')).toBeOnTheScreen();
      expect(screen.getByText('Esta vacante ya no recibe postulaciones.')).toBeOnTheScreen();
      expect(botonPostular()).toBeDisabled();
    });

    it('422 perfil_incompleto: muestra el mensaje y explica qué falta', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      await postularA(2);
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.habilidad_ids = [];
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      expect(
        await screen.findByText('Completa tu perfil para poder postularte.'),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText(
          'Para postularte completa tu perfil: te falta al menos una habilidad.',
        ),
      ).toBeOnTheScreen();
      expect(botonPostular()).toBeDisabled();
    });

    it('un error del servidor se muestra en el modal y permite volver a intentar', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.compartir_ajustes = 'siempre';
      jest.spyOn(postulaciones, 'crear').mockRejectedValueOnce(ApiError.servicioNoDisponible(503));
      await postularA(2);
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));

      expect(
        await screen.findByText('El servicio no está disponible; intenta más tarde'),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Enviar postulación' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Sí, enviar' }));
      expect(await screen.findByRole('button', { name: 'Ver mi postulación' })).toBeOnTheScreen();
    });

    it('«Volver» cierra el modal sin postular', async () => {
      const crear = jest.spyOn(postulaciones, 'crear');
      await postularA(2);

      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

      expect(crear).not.toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: 'Postularme' })).toBeOnTheScreen();
    });
  });

  describe('perfil incompleto', () => {
    it('deshabilita «Postularme», dice qué falta y da acceso a Perfil', async () => {
      await abrir(2, 'notificaciones@correo.mx');
      await screen.findByTestId('detalle-vacante');

      const explicacion =
        'Para postularte completa tu perfil: te falta al menos una habilidad y al menos una formación académica.';
      await waitFor(() => expect(botonPostular()).toBeDisabled());
      expect(screen.getByText(explicacion)).toBeOnTheScreen();
      expect(botonPostular().props.accessibilityHint).toBe(explicacion);

      await fireEvent.press(screen.getByRole('button', { name: 'Completar mi perfil' }));
      expect(navegacion.navigate).toHaveBeenCalledWith('CandidatoTabs', { screen: 'Perfil' });
    });

    it('con perfil completo el botón está habilitado', async () => {
      await abrir(2);
      await screen.findByTestId('detalle-vacante');

      expect(botonPostular()).toBeEnabled();
    });

    it('si falta el nombre o el municipio también lo explica', async () => {
      obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!.municipio_id = null;
      await abrir(2);
      await screen.findByTestId('detalle-vacante');

      expect(
        screen.getByText(
          'Para postularte completa tu perfil: te falta tus datos personales (nombre y municipio).',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('reportar la vacante', () => {
    it('el menú ⋮ ofrece «Reportar vacante»', async () => {
      await abrir(1);
      await esperar();

      await abrirMenu();

      expect(await screen.findByRole('header', { name: 'Más opciones' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Reportar vacante' })).toBeOnTheScreen();
    });

    it('pide un motivo, envía y da las gracias', async () => {
      const crear = jest.spyOn(reportes, 'crear');
      await abrir(5, 'jorge.ramirez@correo.mx');
      await screen.findByTestId('detalle-vacante');
      await abrirMenu();
      await fireEvent.press(await screen.findByRole('button', { name: 'Reportar vacante' }));
      await screen.findByRole('button', { name: 'Enviar reporte' });

      await fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));
      expect(
        await screen.findByText('Elige un motivo para poder enviar el reporte.'),
      ).toBeOnTheScreen();
      expect(crear).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: /^Motivo, / }));
      // Solo los motivos que aplican a vacantes.
      expect(
        await screen.findByRole('radio', { name: 'Solicitud de pago al candidato' }),
      ).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('radio', { name: 'Información falsa' }));
      await fireEvent.changeText(
        screen.getByLabelText('Descripción (opcional)'),
        'El salario no coincide.',
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith({
          motivo_reporte_id: 2,
          vacante_id: 5,
          descripcion: 'El salario no coincide.',
        }),
      );
      expect(await screen.findByText('Gracias, revisaremos tu reporte')).toBeOnTheScreen();
      expect(obtenerEstado().reportes).toHaveLength(2);
    });

    it('si la vacante ya no existe, lo explica en el modal', async () => {
      await abrir(5);
      await screen.findByTestId('detalle-vacante');
      await abrirMenu();
      await fireEvent.press(await screen.findByRole('button', { name: 'Reportar vacante' }));
      await elegirMotivo('Información falsa');
      obtenerEstado().vacantes.find((v) => v.id === 5)!.estado = 'cerrada';

      await fireEvent.press(screen.getByRole('button', { name: 'Enviar reporte' }));

      expect(
        await screen.findByText(
          'Esta vacante ya no está disponible, así que no se puede reportar.',
        ),
      ).toBeOnTheScreen();
    });
  });

  it('carga el detalle, el desglose y el perfil con los servicios', async () => {
    const detalle = jest.spyOn(vacantes, 'detalle');
    const compatibilidad = jest.spyOn(vacantes, 'compatibilidad');
    const perfil = jest.spyOn(candidatos, 'obtenerPerfil');
    await abrir(3);
    await screen.findByTestId('detalle-vacante');

    expect(detalle).toHaveBeenCalledWith(3);
    expect(compatibilidad).toHaveBeenCalledWith(3);
    expect(perfil).toHaveBeenCalled();
  });
});
