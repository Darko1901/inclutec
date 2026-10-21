import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { obtenerEstado } from '../../../api/mock/datos';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';
import REC03CrearEditarVacante from '../REC03CrearEditarVacante';

type Props = ComponentProps<typeof REC03CrearEditarVacante>;

// El Modal de pruebas no avisa cuándo termina de cerrarse; aquí solo se muestra su contenido.
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = jest.requireActual('react-native');
  const Modal = (propiedades: { testID?: string; visible?: boolean; children?: unknown }) =>
    propiedades.visible === false ? null : (
      <View testID={propiedades.testID}>{propiedades.children as never}</View>
    );
  return { __esModule: true, default: Modal };
});

/** Navegación mínima: guarda el listener de `beforeRemove` para simular que se sale de la pantalla. */
function crearNavegacion() {
  const oyentes: ((evento: { preventDefault: () => void; data: { action: object } }) => void)[] =
    [];
  const navegacion = {
    setOptions: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn((tipo: string, oyente: (typeof oyentes)[number]) => {
      if (tipo === 'beforeRemove') oyentes.push(oyente);
      return () => {
        const i = oyentes.indexOf(oyente);
        if (i >= 0) oyentes.splice(i, 1);
      };
    }),
  };
  /** Intenta salir; devuelve true si la pantalla lo impidió. */
  const intentarSalir = () => {
    const evento = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
    oyentes.forEach((oyente) => oyente(evento));
    return evento.preventDefault.mock.calls.length > 0;
  };
  return { navegacion, intentarSalir };
}

async function abrir(correo: string, vacanteId?: number, esperar = 'indicador-paso') {
  const { navegacion, intentarSalir } = crearNavegacion();
  const props = {
    route: {
      key: 'EditarVacante',
      name: 'EditarVacante',
      params: vacanteId ? { vacante_id: vacanteId } : undefined,
    },
    navigation: navegacion,
  } as unknown as Props;
  await renderizarComo(correo, <REC03CrearEditarVacante {...props} />);
  await screen.findByTestId(esperar);
  return { navegacion, intentarSalir };
}

const paso = () => screen.getByTestId('indicador-paso').props.accessibilityLabel as string;
const siguiente = () => fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
const anterior = () => fireEvent.press(screen.getByRole('button', { name: 'Anterior' }));

/** Abre un selector y elige una opción. */
async function elegir(testID: string, opcion: string) {
  await fireEvent.press(screen.getByTestId(testID));
  await fireEvent.press(await screen.findByRole('radio', { name: opcion }));
}

async function llenarPaso1() {
  await fireEvent.changeText(screen.getByTestId('campo-titulo'), 'Analista de soporte');
  await elegir('selector-categoria', 'Tecnologías de la información');
  await fireEvent.changeText(
    screen.getByTestId('campo-descripcion-vacante'),
    'Atiende solicitudes.',
  );
  await elegir('selector-jornada', 'Tiempo completo');
  await elegir('selector-contrato', 'Indefinido');
  await elegir('selector-entidad', 'Querétaro');
  // El municipio se habilita cuando termina de cargar la lista de la entidad.
  await waitFor(() => expect(screen.getByTestId('selector-municipio')).toBeEnabled());
  await elegir('selector-municipio', 'Querétaro');
  await fireEvent.changeText(screen.getByTestId('campo-salario-min'), '12000');
  await fireEvent.changeText(screen.getByTestId('campo-salario-max'), '15000');
}

async function agregarHabilidad(busqueda: string, nombre: string) {
  await fireEvent.changeText(screen.getByTestId('buscador-habilidades'), busqueda);
  await fireEvent.press(await screen.findByRole('button', { name: `Agregar ${nombre}` }));
}

describe('REC-03 · Crear o editar vacante', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('pasos', () => {
    it('empieza en «Paso 1 de 4» y lo anuncia; el título del paso es un encabezado', async () => {
      const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await abrir(CUENTAS.laura);

      expect(paso()).toBe('Paso 1 de 4, Datos generales');
      expect(screen.getByText('Paso 1 de 4')).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Datos generales' })).toBeOnTheScreen();
      expect(anunciar).toHaveBeenCalledWith('Paso 1 de 4: Datos generales');
      expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull();
    });

    it('«Siguiente» valida solo el paso actual y señala los campos', async () => {
      await abrir(CUENTAS.laura);
      await siguiente();

      expect(await screen.findByText('Escribe el título de la vacante.')).toBeOnTheScreen();
      expect(screen.getByText('Elige una categoría.')).toBeOnTheScreen();
      expect(screen.getByText('Describe la vacante.')).toBeOnTheScreen();
      expect(screen.getByText('Elige la jornada.')).toBeOnTheScreen();
      expect(screen.getByText('Elige el tipo de contrato.')).toBeOnTheScreen();
      expect(screen.getByText('Elige la entidad y el municipio.')).toBeOnTheScreen();
      expect(paso()).toBe('Paso 1 de 4, Datos generales');
    });

    it('el salario máximo no puede ser menor que el mínimo', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await fireEvent.changeText(screen.getByTestId('campo-salario-max'), '9000');
      await siguiente();
      expect(
        await screen.findByText('El salario máximo no puede ser menor que el mínimo.'),
      ).toBeOnTheScreen();
      expect(paso()).toBe('Paso 1 de 4, Datos generales');
    });

    it('avanza y regresa conservando lo capturado; los pasos 2 y 4 no exigen nada para avanzar', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();
      expect(paso()).toBe('Paso 2 de 4, Requisitos');
      expect(screen.getByRole('header', { name: 'Requisitos' })).toBeOnTheScreen();

      await siguiente();
      expect(paso()).toBe('Paso 3 de 4, Modalidad');
      // La modalidad sí hace falta para avanzar.
      await siguiente();
      expect(await screen.findByText('Elige cómo se trabaja en esta vacante.')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('radio', { name: 'Remoto' }));
      await siguiente();
      expect(paso()).toBe('Paso 4 de 4, Accesibilidad');

      await anterior();
      await anterior();
      await anterior();
      expect(paso()).toBe('Paso 1 de 4, Datos generales');
      expect(screen.getByTestId('campo-titulo').props.value).toBe('Analista de soporte');
    });
  });

  describe('requisitos', () => {
    it('agrega habilidades con el buscador y las marca como obligatoria o deseable', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();

      await agregarHabilidad('soporte', 'Soporte técnico');
      await agregarHabilidad('redes', 'Redes');
      const grupo = within(screen.getByTestId('habilidad-5'));
      expect(grupo.getByRole('radio', { name: 'Obligatoria' })).toBeChecked();

      await fireEvent.press(grupo.getByRole('radio', { name: 'Deseable' }));
      expect(grupo.getByRole('radio', { name: 'Deseable' })).toBeChecked();
      expect(grupo.getByRole('radio', { name: 'Obligatoria' })).not.toBeChecked();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar habilidad Redes' }));
      expect(screen.queryByTestId('habilidad-5')).toBeNull();
      expect(screen.getByTestId('habilidad-4')).toBeOnTheScreen();
    });

    it('la formación mínima es opcional y los años de experiencia se validan', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();
      await fireEvent.changeText(screen.getByTestId('campo-experiencia'), '');
      await siguiente();
      expect(
        await screen.findByText('Escribe los años de experiencia, de 0 a 50.'),
      ).toBeOnTheScreen();
      await fireEvent.changeText(screen.getByTestId('campo-experiencia'), '2');
      await elegir('selector-formacion', 'Licenciatura');
      await siguiente();
      expect(paso()).toBe('Paso 3 de 4, Modalidad');
    });
  });

  describe('accesibilidad de la vacante', () => {
    async function irAlPaso4() {
      await llenarPaso1();
      await siguiente();
      await siguiente();
      await fireEvent.press(await screen.findByRole('radio', { name: 'Remoto' }));
      await siguiente();
      await screen.findByTestId('existentes-ajuste-1');
    }

    it('muestra los dos bloques del catálogo agrupados por categoría', async () => {
      await abrir(CUENTAS.laura);
      await irAlPaso4();

      expect(screen.getByRole('header', { name: 'El lugar ya cuenta con' })).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: 'Podemos ofrecer bajo solicitud' }),
      ).toBeOnTheScreen();
      const existentes = within(screen.getByTestId('bloque-existentes'));
      expect(existentes.getByText('Movilidad')).toBeOnTheScreen();
      expect(existentes.getByText('Acceso con rampa', { hidden: true })).toBeOnTheScreen();
      expect(existentes.getByText('Cognitiva y psicosocial')).toBeOnTheScreen();
    });

    it('un ajuste no puede estar en los dos bloques', async () => {
      await abrir(CUENTAS.laura);
      await irAlPaso4();

      await fireEvent.press(screen.getByTestId('existentes-ajuste-1'));
      expect(screen.getByTestId('existentes-ajuste-1')).toBeChecked();
      const enElOtro = screen.getByTestId('bajoSolicitud-ajuste-1');
      expect(enElOtro).toBeDisabled();
      expect(enElOtro.props.accessibilityHint).toBe('Ya está en «El lugar ya cuenta con».');
      expect(enElOtro.props.accessibilityLabel).toBe(
        'Acceso con rampa, podemos ofrecer bajo solicitud',
      );

      await fireEvent.press(screen.getByTestId('existentes-ajuste-1'));
      expect(screen.getByTestId('bajoSolicitud-ajuste-1')).toBeEnabled();
    });

    it('«Por ahora no contamos con condiciones» desactiva y limpia los dos bloques', async () => {
      await abrir(CUENTAS.laura);
      await irAlPaso4();
      await fireEvent.press(screen.getByTestId('existentes-ajuste-1'));
      await fireEvent.press(screen.getByTestId('bajoSolicitud-ajuste-12'));

      await fireEvent.press(
        screen.getByRole('checkbox', {
          name: 'Por ahora no contamos con condiciones de accesibilidad',
        }),
      );
      expect(screen.getByTestId('existentes-ajuste-1')).not.toBeChecked();
      expect(screen.getByTestId('existentes-ajuste-1')).toBeDisabled();
      expect(screen.getByTestId('bajoSolicitud-ajuste-12')).not.toBeChecked();
      expect(screen.getByTestId('bajoSolicitud-ajuste-12')).toBeDisabled();
    });

    it('las notas tienen contador de 500', async () => {
      await abrir(CUENTAS.laura);
      await irAlPaso4();
      await fireEvent.changeText(screen.getByTestId('campo-notas'), 'Entrada lateral con rampa.');
      expect(screen.getByText('26 / 500')).toBeOnTheScreen();
    });
  });

  describe('crear y publicar', () => {
    async function llenarTodo() {
      await llenarPaso1();
      await siguiente();
      await agregarHabilidad('soporte', 'Soporte técnico');
      await siguiente();
      await fireEvent.press(await screen.findByRole('radio', { name: 'Remoto' }));
      await siguiente();
      await screen.findByTestId('existentes-ajuste-1');
    }

    it('Laura crea una vacante en 4 pasos y la publica tras confirmar', async () => {
      await abrir(CUENTAS.laura);
      await llenarTodo();
      await fireEvent.press(screen.getByTestId('bajoSolicitud-ajuste-12'));

      await fireEvent.press(screen.getByRole('button', { name: 'Publicar' }));
      expect(await screen.findByText('¿Publicar esta vacante?')).toBeOnTheScreen();
      const antes = obtenerEstado().vacantes.length;
      expect(obtenerEstado().vacantes).toHaveLength(antes);
      await fireEvent.press(
        within(screen.getByTestId('modal-confirmacion')).getByRole('button', { name: 'Publicar' }),
      );

      const resultado = await screen.findByTestId('resultado-guardado');
      expect(within(resultado).getByText('Vacante publicada')).toBeOnTheScreen();
      expect(
        within(resultado).getByText('«Analista de soporte» ya está publicada.'),
      ).toBeOnTheScreen();
      const nueva = obtenerEstado().vacantes.find((v) => v.titulo === 'Analista de soporte')!;
      expect(nueva).toMatchObject({
        estado: 'publicada',
        empresa_id: 1,
        salario_min: 12000,
        salario_max: 15000,
        modalidad_id: 2,
        ajustes: [{ ajuste_id: 12, tipo: 'bajo_solicitud' }],
        habilidades: [{ habilidad_id: 4, obligatoria: true }],
      });
    });

    it('guarda un borrador sin accesibilidad ni habilidades obligatorias', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();
      await siguiente();
      await fireEvent.press(await screen.findByRole('radio', { name: 'Presencial' }));
      await siguiente();
      await fireEvent.press(await screen.findByRole('button', { name: 'Guardar borrador' }));

      const resultado = await screen.findByTestId('resultado-guardado');
      expect(within(resultado).getByText('Borrador guardado')).toBeOnTheScreen();
      expect(obtenerEstado().vacantes.find((v) => v.titulo === 'Analista de soporte')!.estado).toBe(
        'borrador',
      );
    });

    it('con datos incompletos el API responde 422 y lleva al primer paso con error', async () => {
      await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();
      await siguiente(); // sin habilidades
      await fireEvent.press(await screen.findByRole('radio', { name: 'Presencial' })); // sin dirección
      await siguiente();
      await screen.findByTestId('existentes-ajuste-1'); // sin accesibilidad

      await fireEvent.press(screen.getByRole('button', { name: 'Publicar' }));
      await fireEvent.press(
        within(await screen.findByTestId('modal-confirmacion')).getByRole('button', {
          name: 'Publicar',
        }),
      );

      // El primer paso con error es el 2 (habilidades).
      await waitFor(() => expect(paso()).toBe('Paso 2 de 4, Requisitos'));
      expect(screen.getByTestId('error-habilidades')).toHaveTextContent(
        'Agrega al menos una habilidad obligatoria.',
      );
      expect(screen.getByTestId('error-general')).toHaveTextContent(
        /Revisa el paso 2: Requisitos\./,
      );

      await agregarHabilidad('soporte', 'Soporte técnico');
      await siguiente();
      // Paso 3: la dirección falta.
      expect(
        await screen.findByText(/Escribe la dirección: la vacante es presencial o híbrida\./),
      ).toBeOnTheScreen();
      await fireEvent.changeText(screen.getByTestId('campo-direccion-vacante'), 'Av. Zaragoza 5');
      await siguiente();
      // Paso 4: falta declarar la accesibilidad.
      expect(await screen.findByTestId('error-ajustes')).toBeOnTheScreen();
    });

    it('Estudio Trazo (pendiente): Publicar deshabilitado con su explicación, pero guarda borradores', async () => {
      await abrir(CUENTAS.daniel);
      await llenarTodo();

      const publicar = screen.getByRole('button', { name: 'Publicar' });
      expect(publicar).toBeDisabled();
      expect(publicar.props.accessibilityHint).toBe('Disponible cuando validemos tu empresa');
      expect(screen.getByTestId('explicacion-publicar')).toHaveTextContent(
        /Podrás publicar cuando validemos tu empresa/,
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Guardar borrador' }));
      expect(await screen.findByTestId('resultado-guardado')).toBeOnTheScreen();
      expect(
        obtenerEstado().vacantes.find((v) => v.titulo === 'Analista de soporte'),
      ).toMatchObject({ estado: 'borrador', empresa_id: 4 });
    });
  });

  describe('editar', () => {
    it('abre con los datos cargados y avisa que la compatibilidad se recalculará', async () => {
      await abrir(CUENTAS.laura, 1);
      await waitFor(() =>
        expect(screen.getByTestId('campo-titulo').props.value).toBe('Técnico de soporte de TI'),
      );
      expect(screen.getByTestId('campo-plazas').props.value).toBe('2');
      expect(screen.getByTestId('campo-salario-min').props.value).toBe('14000');
      expect(screen.getByTestId('aviso-recalculo')).toHaveAccessibilityValue?.({});
      expect(
        screen.getByText('La compatibilidad se recalculará y avisaremos a los postulados'),
      ).toBeOnTheScreen();

      await siguiente();
      expect(screen.getByTestId('habilidad-3')).toBeOnTheScreen(); // SQL
      expect(
        within(screen.getByTestId('habilidad-3')).getByRole('radio', { name: 'Obligatoria' }),
      ).toBeChecked();
    });

    it('cambiar una habilidad obligatoria guarda, recalcula y avisa a cuántos postulados', async () => {
      await abrir(CUENTAS.laura, 1);
      await waitFor(() =>
        expect(screen.getByTestId('campo-titulo').props.value).toBe('Técnico de soporte de TI'),
      );
      await siguiente();
      await fireEvent.press(
        within(screen.getByTestId('habilidad-3')).getByRole('radio', { name: 'Deseable' }),
      );
      await siguiente();
      await siguiente();
      // Es una vacante publicada: un solo botón, «Guardar cambios».
      expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
      await fireEvent.press(await screen.findByRole('button', { name: 'Guardar cambios' }));

      const resultado = await screen.findByTestId('resultado-guardado');
      expect(within(resultado).getByText('Cambios guardados')).toBeOnTheScreen();
      expect(
        within(resultado).getByText(/Avisamos a 26 postulados que cambiaron los requisitos/),
      ).toBeOnTheScreen();
      expect(
        obtenerEstado()
          .vacantes.find((v) => v.id === 1)!
          .habilidades.find((h) => h.habilidad_id === 3),
      ).toMatchObject({ obligatoria: false });
    });

    it('una vacante cerrada no se edita y lo explica', async () => {
      obtenerEstado().vacantes.find((v) => v.id === 6)!.estado = 'cerrada';
      const { navegacion } = await abrirCerrada();
      expect(screen.getByRole('header', { name: 'Esta vacante está cerrada' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
      expect(navegacion.goBack).toHaveBeenCalled();
    });

    it('borrador existente: Publicar y Guardar borrador', async () => {
      await abrir(CUENTAS.laura, 7);
      await waitFor(() =>
        expect(screen.getByTestId('campo-titulo').props.value).toBe('Diseñador gráfico'),
      );
      await siguiente();
      await siguiente();
      await siguiente();
      expect(await screen.findByRole('button', { name: 'Publicar' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeOnTheScreen();
      // Sin postulados no hay aviso de recálculo.
      expect(screen.queryByTestId('aviso-recalculo')).toBeNull();
    });
  });

  describe('salir con cambios sin guardar', () => {
    it('pide confirmar antes de descartarlos', async () => {
      const { navegacion, intentarSalir } = await abrir(CUENTAS.laura);
      await fireEvent.changeText(screen.getByTestId('campo-titulo'), 'Algo');

      expect(intentarSalir()).toBe(true);
      expect(await screen.findByText('¿Descartar los cambios?')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Seguir editando' }));
      expect(navegacion.dispatch).not.toHaveBeenCalled();
      expect(screen.getByTestId('campo-titulo').props.value).toBe('Algo');

      expect(intentarSalir()).toBe(true);
      await fireEvent.press(await screen.findByRole('button', { name: 'Descartar cambios' }));
      expect(navegacion.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    });

    it('sin cambios sale directo', async () => {
      const { intentarSalir } = await abrir(CUENTAS.laura);
      expect(intentarSalir()).toBe(false);
    });

    it('después de guardar ya no pregunta', async () => {
      const { intentarSalir } = await abrir(CUENTAS.laura);
      await llenarPaso1();
      await siguiente();
      await siguiente();
      await fireEvent.press(await screen.findByRole('radio', { name: 'Remoto' }));
      await siguiente();
      await fireEvent.press(await screen.findByRole('button', { name: 'Guardar borrador' }));
      await screen.findByTestId('resultado-guardado');
      await act(async () => undefined);
      expect(intentarSalir()).toBe(false);
    });
  });

  it('los botones del pie son fijos: están fuera del contenido que se desplaza', async () => {
    await abrir(CUENTAS.laura);
    const contenido = screen.getByTestId('contenido-vacante');
    expect(within(contenido).queryByRole('button', { name: 'Siguiente' })).toBeNull();
    expect(
      within(screen.getByTestId('pie-vacante')).getByRole('button', { name: 'Siguiente' }),
    ).toBeOnTheScreen();
  });
});

async function abrirCerrada() {
  return abrir(CUENTAS.laura, 6, 'no-editable');
}
