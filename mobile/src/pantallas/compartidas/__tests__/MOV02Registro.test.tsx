import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError, auth } from '../../../api';
import { SesionProvider, useSesion } from '../../../sesion';
import MOV02Registro from '../MOV02Registro';

// Las pruebas no usan un NavigationContainer: useFocusEffect se comporta como un efecto normal.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

const navegacion = { navigate: jest.fn() };

// Basta con la parte de la navegación que usa la pantalla.
const props = {
  navigation: navegacion,
  route: { key: 'k', name: 'Registro' },
} as unknown as React.ComponentProps<typeof MOV02Registro>;

/** Muestra el estado de la sesión para comprobar a dónde llevó el registro. */
function Sonda() {
  const { estado, usuario, pantallaInicial } = useSesion();
  return <Text testID="sonda">{`${estado}|${usuario?.rol ?? ''}|${pantallaInicial ?? ''}`}</Text>;
}

async function abrir() {
  await render(
    <SesionProvider>
      <Sonda />
      <MOV02Registro {...props} />
    </SesionProvider>,
  );
}

const sonda = () => screen.getByTestId('sonda').props.children as string;
const escribir = (etiqueta: string, texto: string) =>
  fireEvent.changeText(screen.getByLabelText(etiqueta), texto);

async function elegir(selector: RegExp, opcion: string) {
  await fireEvent.press(await screen.findByRole('button', { name: selector }));
  await fireEvent.press(await screen.findByRole('radio', { name: opcion }));
}

async function elegirUbicacion(sufijo = '') {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: new RegExp(`^Entidad${sufijo}, `) })).toBeEnabled(),
  );
  await elegir(new RegExp(`^Entidad${sufijo}, `), 'Querétaro');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: new RegExp(`^Municipio${sufijo}, `) })).toBeEnabled(),
  );
  await elegir(new RegExp(`^Municipio${sufijo}, `), 'Querétaro');
}

async function llenarCandidato(sobre: Partial<Record<string, string>> = {}) {
  const datos = {
    nombre: 'Ana',
    apellidos: 'Pérez Luna',
    correo: 'ana.perez@correo.mx',
    telefono: '4421110000',
    contrasena: 'Clave2026',
    ...sobre,
  };
  await escribir('Nombre(s)', datos.nombre);
  await escribir('Apellidos', datos.apellidos);
  await escribir('Correo', datos.correo);
  await escribir('Teléfono (10 dígitos)', datos.telefono);
  await elegirUbicacion();
  await escribir('Contraseña', datos.contrasena);
  await escribir('Confirmar contraseña', datos.contrasena);
}

async function llenarReclutador(sobre: Partial<Record<string, string>> = {}) {
  const datos = {
    correo: 'luis.mora@empresa.mx',
    rfc: 'SBA200101XY2',
    ...sobre,
  };
  await escribir('Nombre(s)', 'Luis');
  await escribir('Apellidos', 'Mora Díaz');
  await escribir('Puesto', 'Gerente de RH');
  await escribir('Correo', datos.correo);
  await escribir('Teléfono (10 dígitos)', '4429998877');
  await escribir('Contraseña', 'Clave2026');
  await escribir('Confirmar contraseña', 'Clave2026');
  await escribir('Razón social', 'Soluciones del Bajío S.A. de C.V.');
  await escribir('Nombre comercial', 'SolBajío');
  await escribir('RFC', datos.rfc);
  await elegir(/^Sector, /, 'Comercio');
  await elegir(/^Tamaño de la empresa, /, 'Micro, 1 a 10 trabajadores');
  await elegirUbicacion(' de la empresa');
}

/** Espera a que terminen de cargar los catálogos del paso 2 (los selectores quedan habilitados). */
async function esperarCatalogos(selectores: RegExp[]) {
  for (const selector of selectores) {
    await waitFor(() => expect(screen.getByRole('button', { name: selector })).toBeEnabled());
  }
}

const continuar = () => fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
const crearCuenta = () => fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
const aceptarAviso = () =>
  fireEvent.press(screen.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' }));

describe('MOV-02 · Registro', () => {
  beforeEach(() => navegacion.navigate.mockClear());
  afterEach(() => jest.restoreAllMocks());

  it('empieza en «Paso 1 de 3» con las dos tarjetas de tipo de cuenta', async () => {
    await abrir();

    expect(screen.getByText('Paso 1 de 3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Busco empleo/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Represento a una empresa/ })).toBeOnTheScreen();
  });

  describe('candidato', () => {
    beforeEach(async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: /^Busco empleo/ }));
      await esperarCatalogos([/^Entidad, /]);
    });

    it('el paso 2 muestra los campos del candidato y los dos selectores encadenados', async () => {
      expect(screen.getByText('Paso 2 de 3')).toBeOnTheScreen();
      for (const etiqueta of ['Nombre(s)', 'Apellidos', 'Correo', 'Teléfono (10 dígitos)']) {
        expect(screen.getByLabelText(etiqueta)).toBeOnTheScreen();
      }
      expect(screen.getByRole('button', { name: 'Entidad, sin seleccionar' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Municipio, sin seleccionar' })).toBeDisabled();
      expect(screen.queryByLabelText('RFC')).not.toBeOnTheScreen();
    });

    it('los municipios dependen de la entidad elegida', async () => {
      await elegirUbicacion();
      expect(screen.getByRole('button', { name: 'Entidad, Querétaro' })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^Municipio, / }));
      // Solo los municipios de Querétaro, no los de otras entidades.
      expect(screen.getByRole('radio', { name: 'El Marqués' })).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: 'Monterrey' })).not.toBeOnTheScreen();
    });

    it('no avanza con datos vacíos y marca cada campo con cómo corregirlo', async () => {
      await continuar();

      expect(screen.getByText('Paso 2 de 3')).toBeOnTheScreen();
      expect(screen.getByText('Escribe tu nombre.')).toBeOnTheScreen();
      expect(screen.getByText('Escribe tu correo electrónico.')).toBeOnTheScreen();
      expect(screen.getByText('Elige la entidad.')).toBeOnTheScreen();
    });

    it('valida la política de contraseña y la confirmación', async () => {
      await escribir('Contraseña', 'sololetras');
      await fireEvent(screen.getByLabelText('Contraseña'), 'blur');
      expect(
        screen.getByText('Usa de 8 a 64 caracteres, con al menos una letra y un número.'),
      ).toBeOnTheScreen();

      await escribir('Contraseña', 'Clave2026');
      await escribir('Confirmar contraseña', 'Otra2026');
      await fireEvent(screen.getByLabelText('Confirmar contraseña'), 'blur');
      expect(
        screen.getByText('Las contraseñas no coinciden. Escríbelas igual en los dos campos.'),
      ).toBeOnTheScreen();
    });

    it('el paso 3 pide el aviso y ofrece el consentimiento opcional con su explicación', async () => {
      await llenarCandidato();
      await continuar();

      expect(screen.getByText('Paso 3 de 3')).toBeOnTheScreen();
      expect(
        screen.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' }),
      ).not.toBeChecked();
      const consentimiento = screen.getByRole('checkbox', {
        name: /^Autorizo el tratamiento de mis necesidades de ajuste/,
      });
      expect(consentimiento.props.accessibilityHint).toMatch(
        /puedes cambiarlo después en Mi perfil/,
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Leer el aviso de privacidad' }));
      expect(navegacion.navigate).toHaveBeenCalledWith('AvisoPrivacidad');
    });

    it('sin aceptar el aviso no crea la cuenta', async () => {
      const registrar = jest.spyOn(auth, 'registrarCandidato');
      await llenarCandidato();
      await continuar();

      await crearCuenta();

      expect(
        screen.getByText('Debes aceptar el aviso de privacidad para crear tu cuenta.'),
      ).toBeOnTheScreen();
      expect(registrar).not.toHaveBeenCalled();
    });

    it('registra sin consentimiento, inicia sesión y lleva a Perfil (CAN-03)', async () => {
      const registrar = jest.spyOn(auth, 'registrarCandidato');
      await llenarCandidato();
      await continuar();
      await aceptarAviso();
      await crearCuenta();

      await waitFor(() => expect(sonda()).toBe('activa|candidato|Perfil'));
      expect(registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          correo: 'ana.perez@correo.mx',
          municipio_id: 3,
          acepta_aviso: true,
          consentimiento_sensibles: false,
        }),
      );
    });

    it('registra con consentimiento', async () => {
      const registrar = jest.spyOn(auth, 'registrarCandidato');
      await llenarCandidato();
      await continuar();
      await aceptarAviso();
      await fireEvent.press(
        screen.getByRole('checkbox', { name: /^Autorizo el tratamiento de mis necesidades/ }),
      );
      await crearCuenta();

      await waitFor(() => expect(sonda()).toBe('activa|candidato|Perfil'));
      expect(registrar).toHaveBeenCalledWith(
        expect.objectContaining({ consentimiento_sensibles: true }),
      );
    });

    it('con un correo ya registrado regresa al paso 2, lo marca y ofrece iniciar sesión o recuperar la contraseña', async () => {
      await llenarCandidato({ correo: 'mariana.lopez@correo.mx' });
      await continuar();
      await aceptarAviso();
      await crearCuenta();

      expect(await screen.findByText('Paso 2 de 3')).toBeOnTheScreen();
      expect(screen.getAllByText('Ese correo ya está registrado.').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(sonda()).toBe('cargando||');

      await fireEvent.press(screen.getByRole('button', { name: 'Ir a iniciar sesión' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Recuperar mi contraseña' }));
      expect(navegacion.navigate).toHaveBeenNthCalledWith(1, 'InicioSesion');
      expect(navegacion.navigate).toHaveBeenNthCalledWith(2, 'RecuperarContrasena');
    });

    it('un 422 con campos marca el campo y regresa al paso donde está', async () => {
      jest.spyOn(auth, 'registrarCandidato').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          codigo: 'validacion',
          detail: 'Revisa los datos marcados.',
          campos: { telefono: 'El servidor no acepta ese teléfono.' },
        }),
      );
      await llenarCandidato();
      await continuar();
      await aceptarAviso();
      await crearCuenta();

      expect(await screen.findByText('Paso 2 de 3')).toBeOnTheScreen();
      expect(screen.getByText('El servidor no acepta ese teléfono.')).toBeOnTheScreen();
    });

    it('un 422 sobre el aviso de privacidad se queda en el paso 3', async () => {
      jest.spyOn(auth, 'registrarCandidato').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          codigo: 'validacion',
          detail: 'Revisa los datos marcados.',
          campos: { acepta_aviso: 'Debes aceptar el aviso de privacidad.' },
        }),
      );
      await llenarCandidato();
      await continuar();
      await aceptarAviso();
      await crearCuenta();

      expect(await screen.findByText('Debes aceptar el aviso de privacidad.')).toBeOnTheScreen();
      expect(screen.getByText('Paso 3 de 3')).toBeOnTheScreen();
    });
  });

  describe('reclutador', () => {
    beforeEach(async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: /^Represento a una empresa/ }));
      await esperarCatalogos([/^Entidad de la empresa, /, /^Sector, /, /^Tamaño de la empresa, /]);
    });

    it('el paso 2 tiene las secciones «Tus datos» y «Tu empresa»', async () => {
      expect(screen.getByRole('header', { name: 'Tus datos' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Tu empresa' })).toBeOnTheScreen();
      for (const etiqueta of ['Puesto', 'Razón social', 'Nombre comercial', 'RFC']) {
        expect(screen.getByLabelText(etiqueta)).toBeOnTheScreen();
      }
    });

    it('convierte el RFC a mayúsculas mientras se escribe', async () => {
      await escribir('RFC', 'tqu150312ab1');
      expect(screen.getByLabelText('RFC').props.value).toBe('TQU150312AB1');
    });

    it('valida el formato del RFC', async () => {
      await escribir('RFC', 'ABC');
      await fireEvent(screen.getByLabelText('RFC'), 'blur');
      expect(
        screen.getByText(
          'El RFC tiene 12 o 13 caracteres, en mayúsculas, por ejemplo TQU150312AB1.',
        ),
      ).toBeOnTheScreen();
    });

    it('registra al reclutador, deja su empresa pendiente y lo lleva a Organización (REC-01)', async () => {
      const registrar = jest.spyOn(auth, 'registrarReclutador');
      await llenarReclutador();
      await continuar();

      expect(screen.getByText('Paso 3 de 3')).toBeOnTheScreen();
      // El consentimiento de necesidades de ajuste es solo para candidatos.
      expect(
        screen.queryByRole('checkbox', { name: /necesidades de ajuste/ }),
      ).not.toBeOnTheScreen();

      await aceptarAviso();
      await crearCuenta();

      await waitFor(() => expect(sonda()).toBe('activa|reclutador|Organizacion'));
      const sesion = await registrar.mock.results[0].value;
      expect(sesion.usuario.empresa).toMatchObject({
        nombre_comercial: 'SolBajío',
        estado: 'pendiente',
      });
    });

    it('con el RFC de TecnoQro marca el campo RFC y regresa al paso 2', async () => {
      await llenarReclutador({ rfc: 'TQU150312AB1' });
      await continuar();
      await aceptarAviso();
      await crearCuenta();

      expect(await screen.findByText('Paso 2 de 3')).toBeOnTheScreen();
      expect(screen.getByText('Otra empresa ya registró ese RFC.')).toBeOnTheScreen();
      expect(sonda()).toBe('cargando||');
    });
  });
});
