import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';

import { ApiError, auth, candidatos } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN04MiCV from '../CAN04MiCV';

let mockParametros: { pestana?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockParametros }),
}));

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return estado === 'activa' ? <>{children}</> : null;
}

async function abrir(correo = 'mariana.lopez@correo.mx') {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <CAN04MiCV />
      </Entrar>
    </SesionProvider>,
  );
  await screen.findByRole('tab', { name: 'Experiencia' });
}

const pestana = (nombre: string) => screen.getByRole('tab', { name: nombre });
const ultimoBoton = (nombre: string) => screen.getAllByRole('button', { name: nombre }).at(-1)!;

async function irA(nombre: string) {
  await fireEvent.press(pestana(nombre));
  await waitFor(() => expect(pestana(nombre)).toBeSelected());
}

/** Elige una opción de un selector (mes o año) abriendo su lista. */
async function elegir(selector: RegExp, opcion: string) {
  await fireEvent.press(await screen.findByRole('button', { name: selector }));
  await fireEvent.press(await screen.findByRole('radio', { name: opcion }));
}

describe('CAN-04 · Mi CV', () => {
  beforeEach(() => {
    mockParametros = undefined;
  });
  afterEach(() => jest.restoreAllMocks());

  describe('pestañas', () => {
    it('son tres pestañas con rol y estado seleccionado; abre en Experiencia', async () => {
      await abrir();

      expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual([
        'Experiencia',
        'Formación',
        'Habilidades',
      ]);
      expect(pestana('Experiencia')).toBeSelected();
      expect(pestana('Formación')).not.toBeSelected();

      await irA('Formación');
      expect(pestana('Experiencia')).not.toBeSelected();
      expect(await screen.findByText('TSU en Tecnologías de la Información')).toBeOnTheScreen();
      // La pestaña anterior queda fuera del árbol de accesibilidad.
      expect(screen.queryByText('Auxiliar de soporte técnico')).not.toBeOnTheScreen();
    });

    it('abre en la pestaña que pide CAN-03', async () => {
      mockParametros = { pestana: 'habilidades' };
      await abrir();
      expect(pestana('Habilidades')).toBeSelected();
      expect(await screen.findByTestId('contador-habilidades')).toBeOnTheScreen();
    });
  });

  describe('experiencia', () => {
    it('lista la tarjeta con puesto, empresa y periodo', async () => {
      await abrir();

      const tarjeta = within(await screen.findByTestId('tarjeta-1'));
      expect(tarjeta.getByText('Auxiliar de soporte técnico')).toBeOnTheScreen();
      expect(tarjeta.getByText('Servicios Integrales del Bajío')).toBeOnTheScreen();
      expect(tarjeta.getByText('feb 2023 – jun 2025')).toBeOnTheScreen();
      expect(
        screen.getByLabelText(
          'Auxiliar de soporte técnico, Servicios Integrales del Bajío, de febrero de 2023 a junio de 2025',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Editar experiencia Auxiliar de soporte técnico' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Eliminar experiencia Auxiliar de soporte técnico' }),
      ).toBeOnTheScreen();
    });

    it('sin experiencia muestra el vacío con su llamado a la acción', async () => {
      await abrir('jorge.ramirez@correo.mx');

      expect(await screen.findByText('Aún no agregas experiencia')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Agrega tu primera experiencia' }));
      expect(await screen.findByRole('header', { name: 'Agregar experiencia' })).toBeOnTheScreen();
    });

    it('agrega una experiencia actual: la más reciente va primero y no pide fecha de fin', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar experiencia' }));
      await screen.findByRole('header', { name: 'Agregar experiencia' });
      await fireEvent.changeText(screen.getByTestId('campo-puesto'), 'Soporte en sitio');
      await fireEvent.changeText(screen.getByTestId('campo-empresa'), 'Redes del Centro');
      await elegir(/^Mes de fecha de inicio/, 'julio');
      await elegir(/^Año de fecha de inicio/, '2025');
      // Con «Trabajo aquí actualmente» la fecha de fin se oculta.
      expect(screen.getByRole('button', { name: /^Mes de fecha de fin/ })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Trabajo aquí actualmente' }));
      expect(screen.queryByRole('button', { name: /^Mes de fecha de fin/ })).not.toBeOnTheScreen();
      await fireEvent.changeText(
        screen.getByTestId('campo-descripcion'),
        'Mantenimiento de equipos',
      );
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Experiencia agregada.')).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByText('jul 2025 – actual')).toBeOnTheScreen());
      const tarjetas = screen.getAllByTestId(/^tarjeta-\d+$/).map((t) => t.props.testID);
      expect(tarjetas).toEqual(['tarjeta-2', 'tarjeta-1']);
      const guardadas = await candidatos.listarExperiencias();
      expect(guardadas[0]).toMatchObject({
        puesto: 'Soporte en sitio',
        fecha_inicio: '2025-07-01',
        fecha_fin: null,
        actual: true,
        descripcion: 'Mantenimiento de equipos',
      });
    });

    it('una fecha de fin anterior al inicio se marca en su campo y no se envía', async () => {
      const crear = jest.spyOn(candidatos, 'crearExperiencia');
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar experiencia' }));
      await screen.findByRole('header', { name: 'Agregar experiencia' });
      await fireEvent.changeText(screen.getByTestId('campo-puesto'), 'Soporte');
      await fireEvent.changeText(screen.getByTestId('campo-empresa'), 'Redes');
      await elegir(/^Mes de fecha de inicio/, 'junio');
      await elegir(/^Año de fecha de inicio/, '2025');
      await elegir(/^Mes de fecha de fin/, 'enero');
      await elegir(/^Año de fecha de fin/, '2025');
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(
        await screen.findByText('La fecha de fin no puede ser anterior a la de inicio.'),
      ).toBeOnTheScreen();
      expect(crear).not.toHaveBeenCalled();
    });

    it('campos obligatorios vacíos muestran su error', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar experiencia' }));
      await screen.findByRole('header', { name: 'Agregar experiencia' });
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Escribe el puesto.')).toBeOnTheScreen();
      expect(screen.getByText('Escribe el nombre de la empresa.')).toBeOnTheScreen();
      expect(screen.getByText('Elige el mes y el año de inicio.')).toBeOnTheScreen();
      expect(
        screen.getByText('Elige el mes y el año de fin, o marca «Trabajo aquí actualmente».'),
      ).toBeOnTheScreen();
    });

    it('muestra en su campo el error 422 que responde el API', async () => {
      jest.spyOn(candidatos, 'editarExperiencia').mockRejectedValue(
        new ApiError({
          status: 422,
          codigo: 'validacion',
          detail: 'Revisa los datos marcados.',
          campos: { empresa: 'Esa empresa no es válida.' },
        }),
      );
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(
        screen.getByRole('button', { name: 'Editar experiencia Auxiliar de soporte técnico' }),
      );
      await screen.findByRole('header', { name: 'Editar experiencia' });
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Esa empresa no es válida.')).toBeOnTheScreen();
    });

    it('edita una experiencia con sus datos cargados y el contador de 500', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(
        screen.getByRole('button', { name: 'Editar experiencia Auxiliar de soporte técnico' }),
      );
      await screen.findByRole('header', { name: 'Editar experiencia' });
      expect(screen.getByTestId('campo-puesto')).toHaveDisplayValue('Auxiliar de soporte técnico');
      expect(screen.getByRole('button', { name: 'Mes de fecha de fin, junio' })).toBeOnTheScreen();
      expect(screen.getByTestId('campo-descripcion')).toHaveProp('maxLength', 500);

      await fireEvent.changeText(screen.getByTestId('campo-puesto'), 'Técnico de soporte');
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Experiencia actualizada.')).toBeOnTheScreen();
      expect(await screen.findByText('Técnico de soporte')).toBeOnTheScreen();
    });

    it('elimina solo después de confirmar', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(
        screen.getByRole('button', { name: 'Eliminar experiencia Auxiliar de soporte técnico' }),
      );
      expect(await screen.findByText('¿Eliminar esta experiencia?')).toBeOnTheScreen();
      expect(await candidatos.listarExperiencias()).toHaveLength(1);
      await fireEvent.press(ultimoBoton('Eliminar'));

      expect(await screen.findByText('Experiencia eliminada.')).toBeOnTheScreen();
      await waitFor(() => expect(screen.queryByTestId('tarjeta-1')).not.toBeOnTheScreen());
      expect(await candidatos.listarExperiencias()).toEqual([]);
    });

    it('cancelar la confirmación conserva la tarjeta', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(
        screen.getByRole('button', { name: 'Eliminar experiencia Auxiliar de soporte técnico' }),
      );
      await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByText('¿Eliminar esta experiencia?')).not.toBeOnTheScreen();
      expect(screen.getByTestId('tarjeta-1')).toBeOnTheScreen();
    });
  });

  describe('formación', () => {
    it('lista la formación con nivel, institución, estado y periodo', async () => {
      await abrir();
      await irA('Formación');

      const tarjeta = within(await screen.findByTestId('tarjeta-1'));
      expect(tarjeta.getByText('TSU en Tecnologías de la Información')).toBeOnTheScreen();
      expect(
        tarjeta.getByText('Técnico superior universitario · Universidad Tecnológica de Querétaro'),
      ).toBeOnTheScreen();
      expect(tarjeta.getByText('Concluida · sep 2020 – ago 2022')).toBeOnTheScreen();
    });

    it('agrega una formación en curso sin fecha de fin', async () => {
      await abrir();
      await irA('Formación');
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar formación' }));
      await screen.findByRole('header', { name: 'Agregar formación' });
      await elegir(/^Nivel educativo/, 'Licenciatura');
      await fireEvent.changeText(screen.getByTestId('campo-institucion'), 'UPQ');
      await fireEvent.changeText(screen.getByTestId('campo-carrera'), 'Ingeniería en Sistemas');
      await elegir(/^Estado/, 'En curso');
      await elegir(/^Mes de fecha de inicio/, 'septiembre');
      await elegir(/^Año de fecha de inicio/, '2024');
      expect(screen.getByText('Fecha de fin (opcional)')).toBeOnTheScreen();
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Formación agregada.')).toBeOnTheScreen();
      await waitFor(() => expect(screen.getByText('Licenciatura · UPQ')).toBeOnTheScreen());
      expect(screen.getByText('En curso · sep 2024')).toBeOnTheScreen();
    });

    it('una formación concluida pide fecha de fin', async () => {
      await abrir();
      await irA('Formación');
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar formación' }));
      await screen.findByRole('header', { name: 'Agregar formación' });
      await elegir(/^Nivel educativo/, 'Bachillerato');
      await fireEvent.changeText(screen.getByTestId('campo-institucion'), 'CBTis 105');
      await elegir(/^Estado/, 'Concluida');
      await elegir(/^Mes de fecha de inicio/, 'septiembre');
      await elegir(/^Año de fecha de inicio/, '2017');
      await fireEvent.press(ultimoBoton('Guardar'));

      expect(await screen.findByText('Elige el mes y el año de fin.')).toBeOnTheScreen();
    });

    it('elimina la formación tras confirmar y el vacío ofrece agregar otra', async () => {
      await abrir();
      await irA('Formación');
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(
        screen.getByRole('button', {
          name: 'Eliminar formación TSU en Tecnologías de la Información',
        }),
      );
      await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));

      expect(
        await screen.findByRole('button', { name: 'Agrega tu primera formación' }),
      ).toBeOnTheScreen();
      expect(await candidatos.listarFormaciones()).toEqual([]);
    });
  });

  describe('habilidades', () => {
    async function abrirHabilidades(correo?: string) {
      mockParametros = { pestana: 'habilidades' };
      await abrir(correo);
      await screen.findByTestId('contador-habilidades');
    }

    it('muestra el contador «4 de 30» y un chip por habilidad con su nivel y su botón de quitar', async () => {
      await abrirHabilidades();

      const contador = screen.getByTestId('contador-habilidades');
      expect(contador).toHaveTextContent('4 de 30');
      expect(contador).toHaveProp('accessibilityLabel', '4 de 30 habilidades');
      const chip = within(screen.getByTestId('chip-habilidad-4'));
      expect(chip.getByText('Soporte técnico')).toBeOnTheScreen();
      expect(
        chip.getByRole('button', { name: 'Nivel de Soporte técnico, Avanzado' }),
      ).toBeOnTheScreen();
      expect(
        chip.getByRole('button', { name: 'Quitar habilidad Soporte técnico' }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Guardar habilidades' })).toBeDisabled();
    });

    it('sugiere desde 2 caracteres, agrega con nivel básico y guarda el nivel que se elija', async () => {
      await abrirHabilidades();

      await fireEvent.changeText(screen.getByTestId('buscador-habilidades'), 'p');
      expect(screen.queryByTestId('sugerencias-habilidades')).not.toBeOnTheScreen();
      await fireEvent.changeText(screen.getByTestId('buscador-habilidades'), 'pyth');
      await fireEvent.press(await screen.findByRole('button', { name: 'Agregar Python' }));

      expect(screen.getByTestId('contador-habilidades')).toHaveTextContent('5 de 30');
      expect(screen.getByRole('button', { name: 'Nivel de Python, Básico' })).toBeOnTheScreen();
      await elegir(/^Nivel de Python/, 'Avanzado');
      expect(screen.getByRole('button', { name: 'Nivel de Python, Avanzado' })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Guardar habilidades' }));

      expect(
        await screen.findByText('Habilidades guardadas. 5 de 30 habilidades.'),
      ).toBeOnTheScreen();
      const guardadas = await candidatos.listarHabilidades();
      expect(guardadas).toHaveLength(5);
      expect(guardadas.find((h) => h.nombre === 'Python')?.nivel).toBe('avanzado');
    });

    it('no vuelve a sugerir las que ya están elegidas', async () => {
      await abrirHabilidades();

      await fireEvent.changeText(screen.getByTestId('buscador-habilidades'), 'exc');
      expect(await screen.findByText('No encontramos habilidades con «exc».')).toBeOnTheScreen();
    });

    it('quitar una habilidad baja el contador y habilita «Guardar habilidades»', async () => {
      await abrirHabilidades();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar habilidad Excel' }));
      expect(screen.getByTestId('contador-habilidades')).toHaveTextContent('3 de 30');
      expect(screen.queryByTestId('chip-habilidad-6')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar habilidades' }));

      await screen.findByText('Habilidades guardadas. 3 de 30 habilidades.');
      expect((await candidatos.listarHabilidades()).map((h) => h.nombre)).not.toContain('Excel');
    });

    it('al llegar a 30 el buscador se deshabilita y explica por qué', async () => {
      candidatosConTreinta();
      await abrirHabilidades();

      expect(screen.getByTestId('contador-habilidades')).toHaveTextContent('30 de 30');
      expect(screen.getByTestId('buscador-habilidades')).toBeDisabled();
      expect(
        screen.getByText('Llegaste al máximo de 30 habilidades. Quita una para agregar otra.'),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar habilidad Python' }));
      await waitFor(() => expect(screen.getByTestId('buscador-habilidades')).toBeEnabled());
      expect(screen.getByTestId('contador-habilidades')).toHaveTextContent('29 de 30');
    });

    it('sin habilidades muestra el vacío', async () => {
      await abrirHabilidades('notificaciones@correo.mx');
      expect(await screen.findByText('Aún no agregas habilidades')).toBeOnTheScreen();
    });

    it('muestra el error del API al guardar', async () => {
      jest.spyOn(candidatos, 'guardarHabilidades').mockRejectedValue(
        new ApiError({
          status: 422,
          codigo: 'limite_habilidades',
          detail: 'Hay habilidades repetidas. Quita las duplicadas.',
        }),
      );
      await abrirHabilidades();
      await fireEvent.press(screen.getByRole('button', { name: 'Quitar habilidad Excel' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar habilidades' }));

      expect(
        await screen.findByText('Hay habilidades repetidas. Quita las duplicadas.'),
      ).toBeOnTheScreen();
    });
  });

  describe('vista previa', () => {
    it('muestra el CV como lo ve la empresa, sin correo ni teléfono', async () => {
      await abrir();
      await screen.findByTestId('tarjeta-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Vista previa de mi CV' }));
      const modal = within(await screen.findByTestId('modal-vista-previa'));
      expect(await modal.findByRole('header', { name: 'Mariana López García' })).toBeOnTheScreen();

      expect(modal.getByText('El Marqués, Querétaro')).toBeOnTheScreen();
      expect(modal.getByText('Modalidad: Remoto, Híbrido')).toBeOnTheScreen();
      expect(modal.getByText(/Técnica en sistemas/)).toBeOnTheScreen();
      expect(modal.getByText('Auxiliar de soporte técnico')).toBeOnTheScreen();
      expect(modal.getByText('feb 2023 – jun 2025')).toBeOnTheScreen();
      expect(modal.getByLabelText('Soporte técnico, nivel avanzado')).toBeOnTheScreen();
      expect(
        modal.getByText(
          'Tu correo y teléfono se muestran a la empresa cuando te invite a entrevista.',
        ),
      ).toBeOnTheScreen();
      expect(modal.queryByText(/mariana\.lopez@correo\.mx/)).not.toBeOnTheScreen();
      expect(modal.queryByText(/4427654321/)).not.toBeOnTheScreen();
      expect(modal.queryByText(/Acceso con rampa/)).not.toBeOnTheScreen();

      await fireEvent.press(modal.getByRole('button', { name: 'Cerrar' }));
      await waitFor(() => expect(screen.queryByTestId('modal-vista-previa')).not.toBeOnTheScreen());
    });
  });
});

/** Mariana con 30 habilidades guardadas (el mock tiene un catálogo de más de 30). */
function candidatosConTreinta() {
  const mariana = obtenerEstado().candidatos.find((c) => c.usuario_id === 3)!;
  mariana.habilidades = Array.from({ length: 30 }, (_, i) => ({
    habilidad_id: i + 1,
    nivel: 'basico' as const,
  }));
}
