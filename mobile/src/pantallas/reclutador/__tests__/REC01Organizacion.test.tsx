import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AccessibilityInfo } from 'react-native';

import { empresas } from '../../../api';
import { obtenerEstado } from '../../../api/mock/datos';
import REC01Organizacion from '../REC01Organizacion';
import { CUENTAS, renderizarComo } from '../ayudasPrueba';

const mockNavegar = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavegar }),
  // Sin NavigationContainer, useFocusEffect se comporta como un efecto normal.
  useFocusEffect: (efecto: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(efecto, [efecto]),
}));

// El Modal de pruebas no avisa cuándo termina de cerrarse; este deja alcanzar su onDismiss.
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
jest.mock('expo-image-picker', () => ({
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
  launchImageLibraryAsync: (...args: unknown[]) => mockGaleria(...args),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const mockDocumento = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockDocumento(...args),
}));

const LOGO = {
  uri: 'file:///logos/nuevo.png',
  fileName: 'nuevo.png',
  mimeType: 'image/png',
  fileSize: 90000,
};
const PDF = {
  uri: 'file:///docs/constancia.pdf',
  name: 'constancia.pdf',
  mimeType: 'application/pdf',
  size: 200000,
};

const PROPIEDADES = {} as ComponentProps<typeof REC01Organizacion>;

async function abrir(correo: string) {
  await renderizarComo(correo, <REC01Organizacion {...PROPIEDADES} />);
  await screen.findByRole('header', { name: 'Organización' });
}

const banner = () => screen.getByTestId('banner-validacion');

describe('REC-01 · Organización', () => {
  beforeEach(() => {
    mockNavegar.mockClear();
    mockGaleria.mockReset();
    mockDocumento.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  describe('banner de validación (cuatro variantes)', () => {
    it.each([
      [
        CUENTAS.daniel,
        'Pendiente de validación',
        'Estamos revisando tu empresa. Puedes crear borradores, pero no publicar.',
      ],
      [CUENTAS.laura, 'Empresa validada', 'Tu empresa está validada. Ya puedes publicar vacantes.'],
      [
        CUENTAS.rechazada,
        'Validación rechazada',
        'Motivo: La constancia de situación fiscal se ve borrosa y no se alcanza a leer el RFC.',
      ],
      [
        CUENTAS.suspendida,
        'Empresa suspendida',
        'Motivo: Se recibió un reporte sobre información falsa y la cuenta está en revisión.',
      ],
    ])('%s muestra «%s»', async (correo, titulo, mensaje) => {
      const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await abrir(correo);

      expect(within(banner()).getByText(titulo)).toBeOnTheScreen();
      expect(
        within(banner()).getByText(new RegExp(mensaje.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      ).toBeOnTheScreen();
      expect(banner().props.accessibilityRole).toBe('alert');
      expect(banner().props.accessibilityLabel).toContain(titulo);
      // Se anuncia al abrir.
      expect(anunciar).toHaveBeenCalledWith(expect.stringContaining(titulo));
    });

    it('la rechazada explica qué hacer y la suspendida, con quién hablar', async () => {
      await abrir(CUENTAS.rechazada);
      expect(within(banner()).getByText(/sube de nuevo tu constancia/)).toBeOnTheScreen();
    });
  });

  describe('formulario', () => {
    it('TecnoQro (validada): razón social y RFC bloqueados, con candado y la indicación', async () => {
      await abrir(CUENTAS.laura);

      expect(screen.getByTestId('razon-social-bloqueada').props.accessibilityLabel).toBe(
        'Razón social, Tecnologías Querétaro S.A. de C.V.. Bloqueado, no se puede editar',
      );
      expect(screen.getByTestId('rfc-bloqueado').props.accessibilityLabel).toContain(
        'TQU150312AB1',
      );
      expect(screen.getByText('Para cambiarlos, escribe a soporte.')).toBeOnTheScreen();
      expect(screen.queryByTestId('campo-rfc')).toBeNull();
      expect(screen.getByTestId('campo-nombre-comercial').props.value).toBe('TecnoQro');
    });

    it('guarda los cambios, avisa y mantiene los datos fiscales', async () => {
      await abrir(CUENTAS.laura);
      await fireEvent.changeText(
        screen.getByTestId('campo-nombre-comercial'),
        'TecnoQro Soluciones',
      );
      await fireEvent.changeText(screen.getByTestId('campo-descripcion'), 'Software y soporte.');
      await fireEvent.press(screen.getByTestId('guardar-organizacion'));

      expect(await screen.findByText('Datos de la organización guardados.')).toBeOnTheScreen();
      const guardada = await empresas.miOrganizacion();
      expect(guardada).toMatchObject({
        nombre_comercial: 'TecnoQro Soluciones',
        descripcion: 'Software y soporte.',
        rfc: 'TQU150312AB1',
      });
    });

    it('muestra el contador de la descripción y de las prácticas de inclusión', async () => {
      await abrir(CUENTAS.laura);
      expect(screen.getByText('52 / 1000')).toBeOnTheScreen();
      expect(screen.getByText('76 / 1000')).toBeOnTheScreen();
    });

    it('valida en el campo: nombre vacío y sitio web sin https', async () => {
      await abrir(CUENTAS.laura);
      await fireEvent.changeText(screen.getByTestId('campo-nombre-comercial'), '');
      await fireEvent.changeText(screen.getByTestId('campo-sitio-web'), 'tecnoqro');
      await fireEvent.press(screen.getByTestId('guardar-organizacion'));

      expect(await screen.findByText('Escribe el nombre comercial.')).toBeOnTheScreen();
      expect(screen.getByText(/Escribe la dirección completa/)).toBeOnTheScreen();
    });

    it('Estudio Trazo (pendiente) edita razón social y RFC; un RFC ajeno se marca en su campo', async () => {
      await abrir(CUENTAS.daniel);
      expect(screen.getByTestId('campo-razon-social').props.value).toBe(
        'Estudio Trazo Diseño S.A.S.',
      );

      await fireEvent.changeText(screen.getByTestId('campo-rfc'), 'tqu150312ab1');
      expect(screen.getByTestId('campo-rfc').props.value).toBe('TQU150312AB1');
      await fireEvent.press(screen.getByTestId('guardar-organizacion'));
      expect(await screen.findByText('Otra empresa ya registró ese RFC.')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByTestId('campo-rfc'), 'ETC210111XY9');
      await fireEvent.press(screen.getByTestId('guardar-organizacion'));
      await screen.findByText('Datos de la organización guardados.');
      expect((await empresas.miOrganizacion()).rfc).toBe('ETC210111XY9');
    });

    it('un RFC con formato incorrecto no se envía', async () => {
      await abrir(CUENTAS.daniel);
      await fireEvent.changeText(screen.getByTestId('campo-rfc'), 'ABC');
      await fireEvent.press(screen.getByTestId('guardar-organizacion'));
      expect(await screen.findByText(/Escribe un RFC de 12 o 13 caracteres/)).toBeOnTheScreen();
      expect((await empresas.miOrganizacion()).rfc).toBe('ETR2101119P4');
    });
  });

  describe('logo', () => {
    async function cambiarLogo() {
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar logo' }));
      // El diálogo del logo solo ofrece la galería.
      expect(screen.queryByRole('button', { name: 'Tomar una foto' })).toBeNull();
      await fireEvent.press(await screen.findByRole('button', { name: 'Elegir de la galería' }));
    }

    it('abre el selector solo cuando el diálogo ya terminó de cerrarse', async () => {
      mockGaleria.mockResolvedValue({ canceled: false, assets: [LOGO] });
      await abrir(CUENTAS.laura);
      await cambiarLogo();

      // Mientras el diálogo no avisa que cerró, no se abre el selector del sistema.
      expect(mockGaleria).not.toHaveBeenCalled();
      await act(async () => {
        mockModales['modal-foto'].onDismiss?.();
      });
      await waitFor(() => expect(mockGaleria).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Logo actualizado.')).toBeOnTheScreen();
      expect((await empresas.miOrganizacion()).logo_url).toBe(LOGO.uri);
    });

    it('un archivo que el API rechaza muestra su mensaje', async () => {
      mockGaleria.mockResolvedValue({
        canceled: false,
        assets: [{ ...LOGO, fileSize: 3 * 1024 * 1024 }],
      });
      await abrir(CUENTAS.laura);
      await cambiarLogo();
      await act(async () => {
        mockModales['modal-foto'].onDismiss?.();
      });
      expect(await screen.findByText(/pesa más de 2 MB/)).toBeOnTheScreen();
    });
  });

  describe('documento de validación', () => {
    it('la rechazada sube la constancia y el banner pasa a pendiente', async () => {
      mockDocumento.mockResolvedValue({ canceled: false, assets: [PDF] });
      await abrir(CUENTAS.rechazada);
      expect(screen.getByTestId('texto-constancia')).toHaveTextContent(/no fue aceptada/);

      await fireEvent.press(screen.getByRole('button', { name: 'Subir constancia (PDF)' }));

      expect(await screen.findByText(/Constancia enviada/)).toBeOnTheScreen();
      await waitFor(() =>
        expect(within(banner()).getByText('Pendiente de validación')).toBeOnTheScreen(),
      );
      expect(mockDocumento).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'application/pdf' }),
      );
      expect(obtenerEstado().empresas.find((e) => e.id === 100)!.estado).toBe('pendiente');
    });

    it('solo aparece con la empresa pendiente o rechazada', async () => {
      await abrir(CUENTAS.laura);
      expect(screen.queryByRole('button', { name: 'Subir constancia (PDF)' })).toBeNull();
      expect(screen.getByTestId('texto-constancia')).toHaveTextContent(/Constancia revisada/);
    });

    it('Estudio Trazo (pendiente, sin constancia) ve el botón y el texto de lo que falta', async () => {
      await abrir(CUENTAS.daniel);
      expect(screen.getByRole('button', { name: 'Subir constancia (PDF)' })).toBeOnTheScreen();
      expect(screen.getByTestId('texto-constancia')).toHaveTextContent(/Aún no subes/);
    });

    it('un archivo que no es PDF se rechaza antes de subirlo; cancelar no hace nada', async () => {
      mockDocumento.mockResolvedValueOnce({
        canceled: false,
        assets: [{ ...PDF, name: 'foto.png', mimeType: 'image/png' }],
      });
      await abrir(CUENTAS.daniel);
      await fireEvent.press(screen.getByRole('button', { name: 'Subir constancia (PDF)' }));
      expect(
        await screen.findByText('La constancia debe ser un archivo PDF. Elige otro archivo.'),
      ).toBeOnTheScreen();
      expect((await empresas.miOrganizacion()).documento_url).toBeNull();

      mockDocumento.mockResolvedValueOnce({ canceled: true, assets: null });
      await fireEvent.press(screen.getByRole('button', { name: 'Subir constancia (PDF)' }));
      expect((await empresas.miOrganizacion()).documento_url).toBeNull();
    });

    it('un PDF de más de 5 MB se rechaza con un mensaje claro', async () => {
      mockDocumento.mockResolvedValue({
        canceled: false,
        assets: [{ ...PDF, size: 6 * 1024 * 1024 }],
      });
      await abrir(CUENTAS.daniel);
      await fireEvent.press(screen.getByRole('button', { name: 'Subir constancia (PDF)' }));
      expect(await screen.findByText(/pesa más de 5 MB/)).toBeOnTheScreen();
    });
  });

  describe('cuenta', () => {
    it('muestra a la persona y ofrece cambiar contraseña, aviso de privacidad y cerrar sesión', async () => {
      await abrir(CUENTAS.laura);
      expect(screen.getByText('Laura Hernández Ruiz')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Aviso de privacidad' }));
      expect(mockNavegar).toHaveBeenCalledWith('AvisoPrivacidad');
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeOnTheScreen();
    });

    it('cambia la contraseña desde el mismo modal que CAN-03', async () => {
      await abrir(CUENTAS.laura);
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
      await fireEvent.changeText(
        await screen.findByTestId('campo-contrasena-actual'),
        'Inclutec2026',
      );
      await fireEvent.changeText(screen.getByTestId('campo-contrasena-nueva'), 'NuevaClave2026');
      await fireEvent.changeText(
        screen.getByTestId('campo-contrasena-confirmacion'),
        'NuevaClave2026',
      );
      const modal = within(screen.getByTestId('modal-contrasena'));
      await fireEvent.press(modal.getByRole('button', { name: 'Cambiar contraseña' }));
      expect(await screen.findByText('Tu contraseña se cambió.')).toBeOnTheScreen();
    });
  });
});
