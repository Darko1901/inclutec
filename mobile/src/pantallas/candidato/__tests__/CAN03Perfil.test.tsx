import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useEffect, type ReactNode } from 'react';
import { Text } from 'react-native';

import { ApiError, auth, candidatos } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import { SesionProvider, useSesion } from '../../../sesion';
import CAN03Perfil from '../CAN03Perfil';
import { explicacionChipNecesidades } from '../CAN01Vacantes';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
  // Sin NavigationContainer, useFocusEffect se comporta como un efecto normal.
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

// El Modal de pruebas no avisa cuándo termina de cerrarse; este deja alcanzar su onDismiss, que en
// iOS llama el sistema al terminar la animación de cierre.
const mockModales: Record<string, { onDismiss?: () => void }> = {};
function mockGuardarModal(id: string, propiedades: { onDismiss?: () => void }) {
  mockModales[id] = propiedades;
}
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = jest.requireActual('react-native');
  const Modal = (propiedades: {
    testID?: string;
    visible?: boolean;
    children?: unknown;
    onDismiss?: () => void;
  }) => {
    mockGuardarModal(propiedades.testID ?? 'sin-id', propiedades);
    return propiedades.visible === false ? null : (
      <View testID={propiedades.testID}>{propiedades.children as never}</View>
    );
  };
  return { __esModule: true, default: Modal };
});

const mockGaleria = jest.fn();
const mockCamara = jest.fn();
const mockPermisoCamara = jest.fn();
jest.mock('expo-image-picker', () => ({
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
  launchImageLibraryAsync: (...args: unknown[]) => mockGaleria(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamara(...args),
  requestCameraPermissionsAsync: () => mockPermisoCamara(),
}));

const FOTO = {
  uri: 'file:///fotos/mariana.jpg',
  fileName: 'mariana.jpg',
  mimeType: 'image/jpeg',
  fileSize: 150000,
};

/** Inicia sesión con una cuenta de prueba y solo entonces muestra la pantalla. */
function Entrar({ correo, children }: { correo: string; children: ReactNode }) {
  const { iniciarSesion, estado, aviso } = useSesion();
  useEffect(() => {
    void auth.login({ correo, contrasena: 'Inclutec2026' }).then((sesion) => iniciarSesion(sesion));
  }, [correo, iniciarSesion]);
  return (
    <>
      <Text testID="estado-sesion">{estado}</Text>
      {aviso ? <Text testID="aviso-sesion">{aviso}</Text> : null}
      {estado === 'activa' ? children : null}
    </>
  );
}

async function abrir(correo = 'mariana.lopez@correo.mx') {
  await render(
    <SesionProvider>
      <Entrar correo={correo}>
        <CAN03Perfil />
      </Entrar>
    </SesionProvider>,
  );
  await screen.findByRole('header', { name: 'Mi perfil' });
}

/** Elige una opción del diálogo de la foto y simula que el modal ya terminó de cerrarse. */
async function soltarModalFoto(opcion: string) {
  await fireEvent.press(screen.getByRole('button', { name: 'Cambiar foto' }));
  await fireEvent.press(await screen.findByRole('button', { name: opcion }));
  await act(async () => {
    mockModales['modal-foto'].onDismiss?.();
  });
}

const textoCompletitud = () => screen.getByTestId('texto-completitud').props.children as string;
const seccion = (nombre: string) => screen.getByRole('button', { name: new RegExp(`^${nombre}`) });

async function expandir(nombre: string) {
  await fireEvent.press(seccion(nombre));
  await waitFor(() => expect(seccion(nombre)).toBeExpanded());
}

describe('CAN-03 · Mi perfil', () => {
  beforeEach(() => {
    mockNavegar.mockClear();
    mockGaleria.mockReset();
    mockCamara.mockReset();
    mockPermisoCamara.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('encabezado y completitud', () => {
    it('Mariana abre al 90 % con «Falta: foto» y una barra de progreso con su valor', async () => {
      await abrir();

      expect(screen.getByText('Mariana López García')).toBeOnTheScreen();
      expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto');
      const barra = screen.getByRole('progressbar', { name: 'Completitud del perfil' });
      expect(barra).toHaveAccessibilityValue({ min: 0, max: 100, now: 90, text: '90 por ciento' });
      // Sin foto se muestran las iniciales y no hay «Quitar foto».
      expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Agregar foto' })).toBeOnTheScreen();
    });

    it('Jorge: faltan foto y experiencia, y cada pendiente lleva a su lugar', async () => {
      await abrir('jorge.ramirez@correo.mx');

      expect(textoCompletitud()).toBe('Tu perfil está al 80 % · Faltan: foto y experiencia');
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 80 });

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar experiencia' }));
      expect(mockNavegar).toHaveBeenCalledWith('MiCV', { pestana: 'experiencia' });
    });

    it('el botón «Mi CV» abre CAN-04', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Mi CV' }));
      expect(mockNavegar).toHaveBeenCalledWith('MiCV');
    });

    it('con la foto llega a 100 % y al quitarla regresa a 90 %', async () => {
      mockGaleria.mockResolvedValue({ canceled: false, assets: [FOTO] });
      await abrir();

      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar foto' }));
      expect(await screen.findByText(/necesita usar la cámara/)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));
      await act(async () => {
        mockModales['modal-foto'].onDismiss?.();
      });

      await waitFor(() => expect(textoCompletitud()).toBe('Tu perfil está al 100 %'));
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 100 });
      expect(
        screen.getByText('Foto actualizada. Tu perfil está al 100 por ciento.'),
      ).toBeOnTheScreen();
      expect(mockGaleria).toHaveBeenCalledWith(
        expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true }),
      );
      expect((await candidatos.obtenerPerfil()).foto_url).toBe(FOTO.uri);

      await fireEvent.press(screen.getByRole('button', { name: 'Quitar foto' }));
      expect(await screen.findByText('¿Quitar tu foto?')).toBeOnTheScreen();
      const quitar = await screen.findAllByRole('button', { name: 'Quitar foto' });
      await fireEvent.press(quitar[quitar.length - 1]);

      await waitFor(() => expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto'));
      expect((await candidatos.obtenerPerfil()).foto_url).toBeNull();
    });

    it('la galería se abre solo después de que el modal de la foto terminó de cerrarse', async () => {
      mockGaleria.mockResolvedValue({ canceled: false, assets: [FOTO] });
      await abrir();

      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar foto' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Elegir de la galería' }));

      // El modal ya se está cerrando, pero iOS todavía no puede presentar el selector.
      await act(async () => {});
      expect(mockGaleria).not.toHaveBeenCalled();

      // Al terminar de cerrarse, el Modal avisa (onDismiss en iOS) y recién entonces se abre.
      await act(async () => {
        mockModales['modal-foto'].onDismiss?.();
      });
      await waitFor(() => expect(mockGaleria).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(textoCompletitud()).toBe('Tu perfil está al 100 %'));
    });

    it('cerrar el diálogo sin elegir no abre ningún selector', async () => {
      await abrir();

      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar foto' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));
      await act(async () => {
        mockModales['modal-foto'].onDismiss?.();
      });

      expect(mockGaleria).not.toHaveBeenCalled();
      expect(mockCamara).not.toHaveBeenCalled();
    });

    it('una foto HEIC se rechaza con un mensaje claro', async () => {
      mockGaleria.mockResolvedValue({
        canceled: false,
        assets: [
          {
            ...FOTO,
            uri: 'file:///fotos/IMG_1.HEIC',
            fileName: 'IMG_1.HEIC',
            mimeType: 'image/heic',
          },
        ],
      });
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      expect(await screen.findByText('La foto debe ser JPG o PNG.')).toBeOnTheScreen();
      expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto');
    });

    it('una foto HEIC sin tipo MIME también se rechaza', async () => {
      mockGaleria.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///fotos/IMG_2.heic', fileName: null, mimeType: undefined }],
      });
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      expect(await screen.findByText('La foto debe ser JPG o PNG.')).toBeOnTheScreen();
    });

    it('pide a iOS la representación compatible para recibir JPEG', async () => {
      mockGaleria.mockResolvedValue({ canceled: true, assets: null });
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      expect(mockGaleria).toHaveBeenCalledWith(
        expect.objectContaining({ preferredAssetRepresentationMode: 'compatible' }),
      );
    });

    it('un error del selector de la galería se muestra', async () => {
      mockGaleria.mockRejectedValue(new Error('PHPicker no disponible'));
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      expect(
        await screen.findByText('No pudimos abrir tus fotos. Intenta de nuevo.'),
      ).toBeOnTheScreen();
      expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto');
    });

    it('un error de la cámara también se muestra', async () => {
      mockPermisoCamara.mockResolvedValue({ granted: true });
      mockCamara.mockRejectedValue(new Error('Cámara no disponible'));
      await abrir();

      await soltarModalFoto('Tomar una foto');

      expect(
        await screen.findByText('No pudimos abrir tus fotos. Intenta de nuevo.'),
      ).toBeOnTheScreen();
    });

    it('tomar una foto con la cámara sigue funcionando', async () => {
      mockPermisoCamara.mockResolvedValue({ granted: true });
      mockCamara.mockResolvedValue({ canceled: false, assets: [FOTO] });
      await abrir();

      await soltarModalFoto('Tomar una foto');

      await waitFor(() => expect(textoCompletitud()).toBe('Tu perfil está al 100 %'));
      expect(mockGaleria).not.toHaveBeenCalled();
    });

    it('cancelar el selector no cambia nada', async () => {
      mockGaleria.mockResolvedValue({ canceled: true, assets: null });
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      await waitFor(() => expect(mockGaleria).toHaveBeenCalled());
      expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto');
    });

    it('sin permiso de cámara explica cómo activarlo y no abre la cámara', async () => {
      mockPermisoCamara.mockResolvedValue({ granted: false });
      await abrir();

      await soltarModalFoto('Tomar una foto');

      expect(await screen.findByText(/Sin permiso para usar la cámara/)).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Abrir los ajustes del teléfono' }),
      ).toBeOnTheScreen();
      expect(mockCamara).not.toHaveBeenCalled();
    });

    it('una foto que el API rechaza muestra el error y no cambia el perfil', async () => {
      mockGaleria.mockResolvedValue({
        canceled: false,
        assets: [{ ...FOTO, fileSize: 3 * 1024 * 1024 }],
      });
      await abrir();

      await soltarModalFoto('Elegir de la galería');

      expect(
        await screen.findByText('La foto pesa más de 2 MB. Elige una más ligera.'),
      ).toBeOnTheScreen();
      expect(textoCompletitud()).toBe('Tu perfil está al 90 % · Falta: foto');
    });
  });

  describe('secciones desplegables', () => {
    it('cada sección es un botón con estado expandido o contraído', async () => {
      await abrir();

      for (const nombre of [
        'Datos personales',
        'Preferencias laborales',
        'Necesidades de ajuste',
      ]) {
        expect(seccion(nombre)).toBeCollapsed();
      }
      await expandir('Datos personales');
      expect(seccion('Preferencias laborales')).toBeCollapsed();

      await fireEvent.press(seccion('Datos personales'));
      await waitFor(() => expect(seccion('Datos personales')).toBeCollapsed());
    });

    it('los pendientes de datos, resumen y preferencias abren su sección', async () => {
      // Lucía (cuenta solo del mock) tiene el perfil casi vacío.
      await abrir('notificaciones@correo.mx');
      expect(textoCompletitud()).toBe(
        'Tu perfil está al 20 % · Faltan: resumen, foto, preferencias laborales, formación, experiencia y habilidades',
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Escribir mi resumen' }));
      await waitFor(() => expect(seccion('Datos personales')).toBeExpanded());

      await fireEvent.press(screen.getByRole('button', { name: 'Elegir preferencias' }));
      await waitFor(() => expect(seccion('Preferencias laborales')).toBeExpanded());

      await fireEvent.press(screen.getByRole('button', { name: 'Agregar habilidades' }));
      expect(mockNavegar).toHaveBeenCalledWith('MiCV', { pestana: 'habilidades' });
    });
  });

  describe('datos personales', () => {
    it('guarda, anuncia el aviso con la completitud y se ve al volver a leer el perfil', async () => {
      await abrir();
      await expandir('Datos personales');

      await fireEvent.changeText(screen.getByTestId('campo-telefono'), '4429998877');
      await fireEvent.changeText(screen.getByTestId('campo-resumen'), 'Resumen actualizado');
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar datos personales' }));

      expect(
        await screen.findByText('Datos personales guardados. Tu perfil está al 90 por ciento.'),
      ).toBeOnTheScreen();
      const perfil = await candidatos.obtenerPerfil();
      expect(perfil.usuario.telefono).toBe('4429998877');
      expect(perfil.resumen).toBe('Resumen actualizado');
    });

    it('muestra el contador de 500 caracteres del resumen', async () => {
      await abrir();
      await expandir('Datos personales');
      expect(screen.getByTestId('campo-resumen')).toHaveProp('maxLength', 500);
      expect(screen.getByText(/^\d+ \/ 500$/)).toBeOnTheScreen();
    });

    it('un teléfono de menos de 10 dígitos se marca en su campo y no se guarda', async () => {
      const actualizar = jest.spyOn(candidatos, 'actualizarPerfil');
      await abrir();
      await expandir('Datos personales');

      await fireEvent.changeText(screen.getByTestId('campo-telefono'), '123');
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar datos personales' }));

      expect(
        await screen.findByText('El teléfono debe tener 10 dígitos, sin espacios ni guiones.'),
      ).toBeOnTheScreen();
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('muestra bajo su campo los errores 422 que responde el API', async () => {
      jest.spyOn(candidatos, 'actualizarPerfil').mockRejectedValue(
        new ApiError({
          status: 422,
          codigo: 'validacion',
          detail: 'Revisa los datos marcados.',
          campos: { apellidos: 'Ese apellido no es válido.' },
        }),
      );
      await abrir();
      await expandir('Datos personales');

      await fireEvent.press(screen.getByRole('button', { name: 'Guardar datos personales' }));

      expect(await screen.findByText('Ese apellido no es válido.')).toBeOnTheScreen();
      expect(screen.queryByText('Revisa los datos marcados.')).not.toBeOnTheScreen();
    });

    it('nombre y apellidos vacíos piden corregirlos', async () => {
      await abrir();
      await expandir('Datos personales');

      await fireEvent.changeText(screen.getByTestId('campo-nombre'), '  ');
      await fireEvent.changeText(screen.getByTestId('campo-apellidos'), '');
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar datos personales' }));

      expect(await screen.findByText('Escribe tu nombre.')).toBeOnTheScreen();
      expect(screen.getByText('Escribe tus apellidos.')).toBeOnTheScreen();
    });
  });

  describe('preferencias laborales', () => {
    it('guarda modalidades, categorías, jornada y reubicación', async () => {
      await abrir();
      await expandir('Preferencias laborales');

      // Mariana tiene Remoto e Híbrido: se agrega Presencial y se quita Remoto.
      expect(await screen.findByRole('checkbox', { name: 'Remoto' })).toBeChecked();
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Presencial' }));
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Remoto' }));
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Administración' }));
      await fireEvent.press(screen.getByRole('switch', { name: 'Disponible para reubicarme' }));
      await fireEvent.press(screen.getByRole('button', { name: /^Jornada deseada/ }));
      await fireEvent.press(await screen.findByRole('radio', { name: 'Medio tiempo' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar preferencias laborales' }));

      expect(
        await screen.findByText(
          'Preferencias laborales guardadas. Tu perfil está al 90 por ciento.',
        ),
      ).toBeOnTheScreen();
      const perfil = await candidatos.obtenerPerfil();
      expect(perfil.modalidades.map((m) => m.nombre).sort()).toEqual(['Híbrido', 'Presencial']);
      expect(perfil.categorias.map((c) => c.id)).toEqual([1, 2]);
      expect(perfil.jornada?.nombre).toBe('Medio tiempo');
      expect(perfil.disponible_reubicacion).toBe(true);
    });
  });

  describe('necesidades de ajuste', () => {
    it('siempre muestra «No te pedimos diagnóstico…» arriba', async () => {
      await abrir();
      await expandir('Necesidades de ajuste');
      expect(screen.getByTestId('texto-sin-diagnostico')).toHaveTextContent(
        'No te pedimos diagnóstico. Solo lo que necesitas para trabajar cómodo(a).',
      );
    });

    it('Jorge sin consentimiento ve la explicación con el aviso de privacidad y puede darlo', async () => {
      await abrir('jorge.ramirez@correo.mx');
      await expandir('Necesidades de ajuste');

      expect(screen.getByText(/datos personales sensibles/)).toBeOnTheScreen();
      expect(screen.queryByRole('checkbox', { name: 'Acceso con rampa' })).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Leer el aviso de privacidad' }));
      expect(mockNavegar).toHaveBeenCalledWith('AvisoPrivacidad');

      // Pide confirmación antes de enviar.
      await fireEvent.press(screen.getByRole('button', { name: 'Dar mi consentimiento' }));
      expect(await screen.findByText('¿Dar tu consentimiento?')).toBeOnTheScreen();
      expect((await candidatos.obtenerPerfil()).consentimiento_sensibles_en).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: 'Sí, dar mi consentimiento' }));

      expect(await screen.findByRole('checkbox', { name: 'Acceso con rampa' })).toBeOnTheScreen();
      expect(
        screen.getByText(
          /Consentimiento registrado\. Ya puedes elegir tus necesidades de ajuste\./,
        ),
      ).toBeOnTheScreen();
      expect((await candidatos.obtenerPerfil()).consentimiento_sensibles_en).not.toBeNull();
    });

    it('cancelar la confirmación no envía el consentimiento', async () => {
      await abrir('jorge.ramirez@correo.mx');
      await expandir('Necesidades de ajuste');

      await fireEvent.press(screen.getByRole('button', { name: 'Dar mi consentimiento' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));

      expect((await candidatos.obtenerPerfil()).consentimiento_sensibles_en).toBeNull();
      expect(screen.getByRole('button', { name: 'Dar mi consentimiento' })).toBeOnTheScreen();
    });

    it('con consentimiento agrupa por categoría, guarda y habilita el filtro de CAN-01', async () => {
      await abrir('jorge.ramirez@correo.mx');
      await expandir('Necesidades de ajuste');
      await fireEvent.press(screen.getByRole('button', { name: 'Dar mi consentimiento' }));
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Sí, dar mi consentimiento' }),
      );
      await screen.findByRole('checkbox', { name: 'Acceso con rampa' });

      // Agrupadas por categoría, con su descripción como pista.
      const auditiva = within(screen.getByTestId('grupo-auditiva'));
      expect(auditiva.getByRole('header', { name: 'Auditiva' })).toBeOnTheScreen();
      expect(
        auditiva.getByRole('checkbox', { name: 'Intérprete de Lengua de Señas Mexicana' }),
      ).toHaveProp('accessibilityHint', 'Intérprete de LSM en reuniones y capacitaciones');
      expect(screen.getByTestId('campo-nota-ajustes')).toHaveProp('maxLength', 300);

      await fireEvent.press(
        screen.getByRole('checkbox', { name: 'Intérprete de Lengua de Señas Mexicana' }),
      );
      await fireEvent.changeText(screen.getByTestId('campo-nota-ajustes'), 'Avisar con tiempo');
      await fireEvent.press(screen.getByRole('radio', { name: 'Compartir siempre' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar necesidades de ajuste' }));

      expect(
        await screen.findByText(
          'Necesidades de ajuste guardadas. Tu perfil está al 80 por ciento.',
        ),
      ).toBeOnTheScreen();
      const perfil = await candidatos.obtenerPerfil();
      expect(perfil.necesidades.map((n) => n.id)).toEqual([6]);
      expect(perfil.nota_ajustes).toBe('Avisar con tiempo');
      expect(perfil.compartir_ajustes).toBe('siempre');
      // El filtro «Solo las que cubren mis necesidades» de CAN-01 ya se puede usar.
      expect(explicacionChipNecesidades(perfil)).toBeNull();
    });

    it('ofrece las tres opciones para compartir con su estado marcado', async () => {
      await abrir();
      await expandir('Necesidades de ajuste');

      expect(
        await screen.findByRole('radio', { name: 'Preguntarme en cada postulación' }),
      ).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Compartir siempre' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'No compartir nunca' })).not.toBeChecked();
      expect(screen.getByTestId('grupo-compartir')).toHaveProp('accessibilityRole', 'radiogroup');
    });

    it('retirar el consentimiento borra las necesidades solo después de confirmar', async () => {
      await abrir();
      await expandir('Necesidades de ajuste');
      expect(await screen.findByRole('checkbox', { name: 'Acceso con rampa' })).toBeChecked();

      await fireEvent.press(screen.getByRole('button', { name: 'Retirar mi consentimiento' }));
      expect(await screen.findByText('¿Retirar tu consentimiento?')).toBeOnTheScreen();
      expect(screen.getByText(/Se borrarán las necesidades de ajuste/)).toBeOnTheScreen();
      expect((await candidatos.obtenerPerfil()).necesidades).toHaveLength(2);

      await fireEvent.press(screen.getByRole('button', { name: 'Retirar y borrar' }));

      expect(
        await screen.findByRole('button', { name: 'Dar mi consentimiento' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/Consentimiento retirado\. Borramos tus necesidades de ajuste\./),
      ).toBeOnTheScreen();
      const perfil = await candidatos.obtenerPerfil();
      expect(perfil.consentimiento_sensibles_en).toBeNull();
      expect(perfil.necesidades).toEqual([]);
      expect(explicacionChipNecesidades(perfil)).toMatch(/da tu consentimiento/);
    });
  });

  describe('cuenta', () => {
    it('cambiar contraseña: error de la actual, luego aviso al cambiarla', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
      expect(await screen.findByRole('header', { name: 'Cambiar contraseña' })).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByTestId('campo-contrasena-actual'), 'Incorrecta1');
      await fireEvent.changeText(screen.getByTestId('campo-contrasena-nueva'), 'NuevaClave2026');
      await fireEvent.changeText(
        screen.getByTestId('campo-contrasena-confirmacion'),
        'NuevaClave2026',
      );
      await fireEvent.press(screen.getAllByRole('button', { name: 'Cambiar contraseña' }).at(-1)!);
      expect(
        await screen.findByText(
          'La contraseña actual no es correcta. Revísala e inténtalo de nuevo.',
        ),
      ).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByTestId('campo-contrasena-actual'), 'Inclutec2026');
      await fireEvent.press(screen.getAllByRole('button', { name: 'Cambiar contraseña' }).at(-1)!);

      expect(await screen.findByText('Tu contraseña se cambió.')).toBeOnTheScreen();
      expect(screen.queryByTestId('campo-contrasena-actual')).not.toBeOnTheScreen();
      await expect(
        auth.login({ correo: 'mariana.lopez@correo.mx', contrasena: 'NuevaClave2026' }),
      ).resolves.toBeDefined();
    });

    it('cambiar contraseña valida en el teléfono la política y la confirmación', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
      await screen.findByRole('header', { name: 'Cambiar contraseña' });

      await fireEvent.changeText(screen.getByTestId('campo-contrasena-nueva'), 'corta');
      await fireEvent.changeText(screen.getByTestId('campo-contrasena-confirmacion'), 'otra');
      await fireEvent.press(screen.getAllByRole('button', { name: 'Cambiar contraseña' }).at(-1)!);

      expect(await screen.findByText('Escribe tu contraseña actual.')).toBeOnTheScreen();
      expect(screen.getByText(/Usa de 8 a 64 caracteres/)).toBeOnTheScreen();
      expect(screen.getByText(/Las contraseñas no coinciden/)).toBeOnTheScreen();
    });

    it('«Aviso de privacidad» abre el aviso completo', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Aviso de privacidad' }));
      expect(mockNavegar).toHaveBeenCalledWith('AvisoPrivacidad');
    });

    it('eliminar la cuenta pide dos confirmaciones y la contraseña', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));

      // Primera confirmación: explica qué se borra y qué pasa con las postulaciones.
      expect(await screen.findByText('¿Eliminar tu cuenta?')).toBeOnTheScreen();
      expect(screen.getByText(/postulaciones activas se retirarán/)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

      // Segunda: contraseña. Una incorrecta no borra nada.
      expect(
        await screen.findByRole('header', { name: 'Confirma con tu contraseña' }),
      ).toBeOnTheScreen();
      await fireEvent.changeText(screen.getByTestId('campo-contrasena-eliminar'), 'Incorrecta1');
      await fireEvent.press(screen.getAllByRole('button', { name: 'Eliminar mi cuenta' }).at(-1)!);
      expect(
        await screen.findByText('La contraseña no es correcta. Revísala e inténtalo de nuevo.'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('estado-sesion')).toHaveTextContent('activa');

      await fireEvent.changeText(screen.getByTestId('campo-contrasena-eliminar'), 'Inclutec2026');
      await fireEvent.press(screen.getAllByRole('button', { name: 'Eliminar mi cuenta' }).at(-1)!);

      // La sesión se cierra y MOV-01 recibe el aviso.
      await waitFor(() =>
        expect(screen.getByTestId('estado-sesion')).toHaveTextContent('sin_sesion'),
      );
      expect(screen.getByTestId('aviso-sesion')).toHaveTextContent(/Tu cuenta se eliminó/);
      expect(screen.queryByRole('header', { name: 'Mi perfil' })).not.toBeOnTheScreen();
      expect(obtenerEstado().postulaciones.find((p) => p.id === 1)?.estado).toBe('retirada');
    });

    it('cancelar la primera confirmación no elimina nada', async () => {
      await abrir();
      await fireEvent.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByText('¿Eliminar tu cuenta?')).not.toBeOnTheScreen();
      expect(screen.getByTestId('estado-sesion')).toHaveTextContent('activa');
    });
  });
});
