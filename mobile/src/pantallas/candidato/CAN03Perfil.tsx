import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { type LayoutChangeEvent, type ScrollView, View } from 'react-native';

import { ApiError, candidatos, type PerfilCandidato, type SeccionPerfil } from '../../api';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoError,
  ModalConfirmacion,
  Pantalla,
  Texto,
  useRetornoFoco,
} from '../../componentes';
import { espaciado } from '../../tema';
import { useCarga } from '../../utilidades/useCarga';
import { EncabezadoPerfil, type AvisoFoto } from './perfil/EncabezadoPerfil';
import { elegirFoto, type OrigenFoto } from './perfil/foto';
import { ModalFoto } from './perfil/ModalFoto';
import { SeccionCuenta } from './perfil/SeccionCuenta';
import { SeccionDatos } from './perfil/SeccionDatos';
import { SeccionNecesidades } from './perfil/SeccionNecesidades';
import { SeccionPreferencias } from './perfil/SeccionPreferencias';
import { porcentajeAccesible, type AvisoSeccion } from './perfil/textosPerfil';

type Seccion = 'datos' | 'preferencias' | 'necesidades';

const cargarPerfil = () => candidatos.obtenerPerfil();

const SECCION_DE: Partial<Record<SeccionPerfil, Seccion>> = {
  datos_personales: 'datos',
  resumen: 'datos',
  preferencias: 'preferencias',
};

/** CAN-03: foto y completitud, secciones desplegables del perfil y opciones de la cuenta. */
export default function CAN03Perfil() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { estado, recargar, recargarSilencioso, establecer } = useCarga(cargarPerfil);
  const { registrar, recordar, devolver } = useRetornoFoco();
  const scrollRef = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<Seccion, number>>>({});

  const [expandidas, setExpandidas] = useState<Record<Seccion, boolean>>({
    datos: false,
    preferencias: false,
    necesidades: false,
  });
  const [avisos, setAvisos] = useState<Partial<Record<Seccion, AvisoSeccion>>>({});
  const [avisoContrasena, setAvisoContrasena] = useState(0);
  const [avisoFoto, setAvisoFoto] = useState<AvisoFoto>();
  const [elegirOrigen, setElegirOrigen] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Al volver de Mi CV cambian la completitud y los pendientes; se actualizan sin parpadeo.
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) primeraVez.current = false;
      else void recargarSilencioso();
    }, [recargarSilencioso]),
  );

  const avisarFoto = useCallback(
    (variante: AvisoFoto['variante'], mensaje: string, conAjustes = false) =>
      setAvisoFoto((previo) => ({ variante, mensaje, conAjustes, n: (previo?.n ?? 0) + 1 })),
    [],
  );

  /** Pone el perfil al día (lo trae del API si el guardado no lo devolvió) y anuncia el aviso. */
  async function alGuardar(seccion: Seccion, mensaje: string, nuevo?: PerfilCandidato) {
    let perfil = nuevo;
    if (!perfil) {
      try {
        perfil = await candidatos.obtenerPerfil();
      } catch {
        perfil = undefined;
      }
    }
    if (perfil) establecer(perfil);
    const completo = perfil
      ? `${mensaje} Tu perfil está al ${porcentajeAccesible(perfil.completitud)}.`
      : mensaje;
    setAvisos((previos) => ({
      ...previos,
      [seccion]: { mensaje: completo, n: (previos[seccion]?.n ?? 0) + 1 },
    }));
  }

  function alternar(seccion: Seccion) {
    setExpandidas((previas) => ({ ...previas, [seccion]: !previas[seccion] }));
  }

  function irA(seccion: Seccion) {
    setExpandidas((previas) => ({ ...previas, [seccion]: true }));
    const y = posiciones.current[seccion];
    if (y !== undefined)
      scrollRef.current?.scrollTo({ y: Math.max(0, y - espaciado.sm), animated: true });
    recordar(`seccion-${seccion}`);
    devolver();
  }

  function alPendiente(pendiente: SeccionPerfil) {
    const seccion = SECCION_DE[pendiente];
    if (seccion) irA(seccion);
    else if (pendiente === 'foto') abrirSelectorFoto();
    else navigation.navigate('MiCV', { pestana: pendiente });
  }

  function abrirSelectorFoto() {
    recordar('cambiar-foto');
    setElegirOrigen(true);
  }

  async function cambiarFoto(origen: OrigenFoto) {
    setElegirOrigen(false);
    try {
      const resultado = await elegirFoto(origen);
      if (resultado.tipo === 'sin_permiso') {
        avisarFoto(
          'advertencia',
          'Sin permiso para usar la cámara no podemos tomar la foto. Puedes activarlo en los ajustes del teléfono o elegir una foto de la galería.',
          true,
        );
      } else if (resultado.tipo === 'archivo') {
        setOcupado(true);
        await candidatos.subirFoto(resultado.archivo);
        const nuevo = await candidatos.obtenerPerfil();
        establecer(nuevo);
        avisarFoto(
          'exito',
          `Foto actualizada. Tu perfil está al ${porcentajeAccesible(nuevo.completitud)}.`,
        );
      }
    } catch (fallo) {
      avisarFoto('error', ApiError.desde(fallo).detail);
    }
    setOcupado(false);
    devolver();
  }

  async function quitarFoto() {
    setOcupado(true);
    try {
      await candidatos.quitarFoto();
      const nuevo = await candidatos.obtenerPerfil();
      establecer(nuevo);
      avisarFoto(
        'exito',
        `Foto quitada. Tu perfil está al ${porcentajeAccesible(nuevo.completitud)}.`,
      );
    } catch (fallo) {
      avisarFoto('error', ApiError.desde(fallo).detail);
    }
    setOcupado(false);
    setQuitando(false);
    devolver('cambiar-foto');
  }

  const alMedir = (seccion: Seccion) => (evento: LayoutChangeEvent) => {
    posiciones.current[seccion] = evento.nativeEvent.layout.y;
  };

  if (estado.fase === 'cargando') {
    return (
      <Pantalla>
        <Cargando mensaje="Cargando tu perfil…" />
      </Pantalla>
    );
  }
  if (estado.fase === 'error') {
    return (
      <Pantalla>
        <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
      </Pantalla>
    );
  }

  const perfil = estado.datos;
  const propiedades = (seccion: Seccion) => ({
    perfil,
    refBoton: registrar(`seccion-${seccion}`),
    expandida: expandidas[seccion],
    onAlternar: () => alternar(seccion),
    aviso: avisos[seccion],
    onGuardado: (mensaje: string, nuevo?: PerfilCandidato) =>
      void alGuardar(seccion, mensaje, nuevo),
  });

  return (
    <Pantalla desplazable scrollRef={scrollRef}>
      <Texto variante="titulo" accessibilityRole="header">
        Mi perfil
      </Texto>

      <EncabezadoPerfil
        perfil={perfil}
        ocupado={ocupado}
        aviso={avisoFoto}
        refCambiarFoto={registrar('cambiar-foto')}
        refQuitarFoto={registrar('quitar-foto')}
        onCambiarFoto={abrirSelectorFoto}
        onQuitarFoto={() => {
          recordar('quitar-foto');
          setQuitando(true);
        }}
        onPendiente={alPendiente}
      />

      <View onLayout={alMedir('datos')}>
        <SeccionDatos {...propiedades('datos')} />
      </View>
      <View onLayout={alMedir('preferencias')}>
        <SeccionPreferencias {...propiedades('preferencias')} />
      </View>
      <View onLayout={alMedir('necesidades')}>
        <SeccionNecesidades {...propiedades('necesidades')} />
      </View>

      <Boton
        ref={registrar('mi-cv')}
        titulo="Mi CV"
        icono="document-text-outline"
        accessibilityHint="Abre tu experiencia, formación y habilidades"
        onPress={() => navigation.navigate('MiCV')}
        testID="abrir-mi-cv"
      />

      {avisoContrasena > 0 ? (
        <Aviso key={avisoContrasena} variante="exito" mensaje="Tu contraseña se cambió." />
      ) : null}
      <SeccionCuenta onContrasenaCambiada={() => setAvisoContrasena((n) => n + 1)} />

      <ModalFoto
        visible={elegirOrigen}
        onElegir={(origen) => void cambiarFoto(origen)}
        onCancelar={() => {
          setElegirOrigen(false);
          devolver();
        }}
      />
      <ModalConfirmacion
        visible={quitando}
        titulo="¿Quitar tu foto?"
        mensaje="Se mostrarán tus iniciales en lugar de la foto. Puedes agregar otra cuando quieras."
        textoConfirmar="Quitar foto"
        peligro
        cargando={ocupado}
        onConfirmar={() => void quitarFoto()}
        onCancelar={() => {
          setQuitando(false);
          devolver();
        }}
      />
    </Pantalla>
  );
}
