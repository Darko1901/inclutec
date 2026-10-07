import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ApiError,
  candidatos,
  vacantes,
  type Compatibilidad,
  type PerfilCandidato,
  type VacanteDetalle,
} from '../../api';
import { Aviso, Boton, Cargando, EstadoError, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { AREA_TACTIL_MINIMA, colores, espaciado } from '../../tema';
import { MenuOpciones } from './detalle/MenuOpciones';
import { ModalPostulacion, type ResultadoPostulacion } from './detalle/ModalPostulacion';
import { ModalReporte } from './detalle/ModalReporte';
import { SeccionesVacante } from './detalle/SeccionesVacante';
import { TarjetaCompatibilidad } from './detalle/TarjetaCompatibilidad';
import { explicacionPerfilIncompleto } from './detalle/textosDetalle';
import { textoPublicada } from './vacantes/textos';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleVacante'>;

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | {
      fase: 'listo';
      vacante: VacanteDetalle;
      compatibilidad: Compatibilidad;
      perfil: PerfilCandidato;
    };

type Ventana = 'menu' | 'postulacion' | 'reporte' | null;
type Mensaje = { variante: 'exito' | 'info' | 'error'; texto: string };

const MENSAJE_REPORTE = 'Gracias, revisaremos tu reporte';

/** CAN-02: detalle de la vacante, desglose de compatibilidad, postulación y reporte. */
export default function CAN02DetalleVacante({ route, navigation }: Props) {
  const { id } = route.params;
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [ventana, setVentana] = useState<Ventana>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  // Se llena al postularse (o al descubrir que ya existía) sin volver a pedir todo el detalle.
  const [postulacionId, setPostulacionId] = useState<number | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);

  const cargarTodo = useCallback(async (): Promise<Carga> => {
    try {
      const [vacante, compatibilidad, perfil] = await Promise.all([
        vacantes.detalle(id),
        vacantes.compatibilidad(id),
        candidatos.obtenerPerfil(),
      ]);
      return { fase: 'listo', vacante, compatibilidad, perfil };
    } catch (fallo) {
      return { fase: 'error', error: ApiError.desde(fallo) };
    }
  }, [id]);

  useEffect(() => {
    let vigente = true;
    void cargarTodo().then((resultado) => {
      if (vigente) setCarga(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [cargarTodo, intento]);

  // Menú ⋮ en el encabezado de la pantalla.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setVentana('menu')}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          accessibilityHint="Abre las opciones de esta vacante, como reportarla"
          style={estilos.menu}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={colores.primario}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      ),
    });
  }, [navigation]);

  function reintentar() {
    setCarga({ fase: 'cargando' });
    setIntento((actual) => actual + 1);
  }

  const irAPerfil = () => navigation.navigate('CandidatoTabs', { screen: 'Perfil' });

  async function alTerminarPostulacion(resultado: ResultadoPostulacion) {
    setVentana(null);
    switch (resultado.tipo) {
      case 'creada':
        setPostulacionId(resultado.id);
        setMensaje({
          variante: 'exito',
          texto: 'Listo, te postulaste. La empresa recibirá tu postulación.',
        });
        break;
      case 'duplicada':
        setMensaje({ variante: 'info', texto: resultado.detail });
        // El 409 no trae el id: se vuelve a pedir el detalle, que sí lo trae.
        try {
          const vacante = await vacantes.detalle(id);
          setPostulacionId(vacante.postulacion_id);
        } catch {
          // Sin el id no se puede abrir la postulación, pero el aviso ya lo explica.
        }
        break;
      case 'no_disponible':
        setNoDisponible(true);
        setMensaje({ variante: 'error', texto: resultado.detail });
        break;
      case 'perfil_incompleto':
        setMensaje({ variante: 'error', texto: resultado.detail });
        // Se vuelve a pedir el perfil para que el botón explique qué falta.
        void candidatos
          .obtenerPerfil()
          .then((perfil) =>
            setCarga((actual) => (actual.fase === 'listo' ? { ...actual, perfil } : actual)),
          )
          .catch(() => undefined);
        break;
    }
  }

  if (carga.fase === 'cargando') {
    return (
      <View style={estilos.pantalla}>
        <Cargando mensaje="Cargando la vacante…" />
      </View>
    );
  }
  if (carga.fase === 'error') {
    return (
      <View style={estilos.pantalla}>
        <EstadoError mensaje={carga.error.detail} onReintentar={reintentar} />
      </View>
    );
  }

  const { vacante, compatibilidad, perfil } = carga;
  const yaPostulada = postulacionId ?? vacante.postulacion_id;
  const sinPublicar = noDisponible || vacante.estado !== 'publicada';
  const explicacionPerfil = explicacionPerfilIncompleto(perfil);

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido} testID="detalle-vacante">
        <View style={estilos.encabezado}>
          <Texto variante="titulo" accessibilityRole="header">
            {vacante.titulo}
          </Texto>
          <Pressable
            onPress={() =>
              navigation.navigate('CandidatoTabs', {
                screen: 'Empresas',
                params: { empresa_id: vacante.empresa.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${vacante.empresa.nombre_comercial}${
              vacante.empresa.validada ? ', empresa validada' : ''
            }`}
            accessibilityHint="Abre la ficha de la empresa"
            style={estilos.empresa}
          >
            <Texto variante="subtitulo" color="primario" style={estilos.subrayado}>
              {vacante.empresa.nombre_comercial}
            </Texto>
          </Pressable>
          {vacante.empresa.validada ? (
            <View style={estilos.fila} accessibilityElementsHidden importantForAccessibility="no">
              <Ionicons name="checkmark-circle" size={20} color={colores.exitoTexto} />
              <Texto variante="pequeno" style={estilos.textoValidada}>
                Empresa validada
              </Texto>
            </View>
          ) : null}
          <View style={estilos.fila}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colores.texto}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Texto>{`${vacante.municipio.nombre}, ${vacante.municipio.entidad.nombre}`}</Texto>
          </View>
          <Texto color="textoSecundarioSobreGris">{textoPublicada(vacante.publicada_en)}</Texto>
        </View>

        <TarjetaCompatibilidad desglose={compatibilidad} />
        <SeccionesVacante vacante={vacante} />
      </ScrollView>

      {/* El pie va debajo del contenido, no encima: no tapa nada ni el indicador de inicio. */}
      <SafeAreaView edges={['bottom', 'left', 'right']} style={estilos.pie}>
        {mensaje ? <Aviso variante={mensaje.variante} mensaje={mensaje.texto} /> : null}
        {yaPostulada !== null ? (
          <Boton
            titulo="Ver mi postulación"
            icono="document-text-outline"
            onPress={() => navigation.navigate('DetallePostulacion', { id: yaPostulada })}
          />
        ) : sinPublicar ? (
          <>
            <Texto color="textoSecundarioSobreGris">Esta vacante ya no recibe postulaciones.</Texto>
            <Boton titulo="Postularme" deshabilitado onPress={() => undefined} />
          </>
        ) : explicacionPerfil ? (
          <>
            <Boton
              titulo="Postularme"
              deshabilitado
              onPress={() => undefined}
              accessibilityHint={explicacionPerfil}
            />
            <Texto color="textoSecundarioSobreGris">{explicacionPerfil}</Texto>
            <Boton titulo="Completar mi perfil" variante="secundario" onPress={irAPerfil} />
          </>
        ) : (
          <Boton titulo="Postularme" onPress={() => setVentana('postulacion')} />
        )}
      </SafeAreaView>

      <MenuOpciones
        visible={ventana === 'menu'}
        onCerrar={() => setVentana(null)}
        onReportar={() => setVentana('reporte')}
      />
      <ModalPostulacion
        visible={ventana === 'postulacion'}
        vacante={{
          id: vacante.id,
          titulo: vacante.titulo,
          empresa: vacante.empresa.nombre_comercial,
        }}
        perfil={perfil}
        onCerrar={() => setVentana(null)}
        onTerminar={(resultado) => void alTerminarPostulacion(resultado)}
      />
      <ModalReporte
        visible={ventana === 'reporte'}
        vacante={{ id: vacante.id, titulo: vacante.titulo }}
        onCerrar={() => setVentana(null)}
        onEnviado={() => {
          setVentana(null);
          setMensaje({ variante: 'exito', texto: MENSAJE_REPORTE });
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  contenido: { padding: espaciado.lg, gap: espaciado.xl },
  encabezado: { gap: espaciado.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  empresa: { minHeight: AREA_TACTIL_MINIMA, justifyContent: 'center', alignSelf: 'flex-start' },
  subrayado: { textDecorationLine: 'underline' },
  textoValidada: { color: colores.exitoTexto, fontWeight: '600' },
  menu: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pie: {
    gap: espaciado.sm,
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSuave,
    backgroundColor: colores.fondo,
  },
});
