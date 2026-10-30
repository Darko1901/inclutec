import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, empresas, type EmpresaPublica } from '../../api';
import { Aviso, Cargando, EstadoError, LogoEmpresa, Texto } from '../../componentes';
import type { RootStackParamList } from '../../navegacion';
import { AREA_TACTIL_MINIMA, colores, espaciado } from '../../tema';
import { MenuOpciones } from './detalle/MenuOpciones';
import { ModalReporte } from './detalle/ModalReporte';
import { dominioDe, MENSAJE_REPORTE_EMPRESA, SIN_PRACTICAS } from './empresas/textosEmpresa';
import { TarjetaVacante } from './vacantes/TarjetaVacante';

type Props = NativeStackScreenProps<RootStackParamList, 'FichaEmpresa'>;

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error'; error: ApiError }
  | { fase: 'listo'; empresa: EmpresaPublica };

type Ventana = 'menu' | 'reporte' | null;
type Mensaje = { variante: 'exito' | 'error'; texto: string };

const ocultar = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/** CAN-07b: ficha de la empresa, sus prácticas de inclusión y sus vacantes publicadas. */
export default function CAN07FichaEmpresa({ route, navigation }: Props) {
  const { id } = route.params;
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [ventana, setVentana] = useState<Ventana>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  useEffect(() => {
    let vigente = true;
    empresas
      .detalle(id)
      .then((empresa) => {
        if (vigente) setCarga({ fase: 'listo', empresa });
      })
      .catch((fallo: unknown) => {
        if (vigente) setCarga({ fase: 'error', error: ApiError.desde(fallo) });
      });
    return () => {
      vigente = false;
    };
  }, [id, intento]);

  // Menú ⋮ en el encabezado de la pantalla.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setVentana('menu')}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          accessibilityHint="Abre las opciones de esta empresa, como reportarla"
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

  async function abrirSitio(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setMensaje({ variante: 'error', texto: 'No pudimos abrir el sitio web. Intenta de nuevo.' });
    }
  }

  if (carga.fase === 'cargando') {
    return (
      <View style={estilos.pantalla}>
        <Cargando mensaje="Cargando la empresa…" />
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

  const { empresa } = carga;

  return (
    <View style={estilos.pantalla}>
      {mensaje ? (
        <View style={estilos.mensaje}>
          <Aviso variante={mensaje.variante} mensaje={mensaje.texto} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={estilos.contenido} testID="ficha-empresa">
        <View style={estilos.encabezado}>
          <LogoEmpresa logoUrl={empresa.logo_url} nombre={empresa.nombre_comercial} tamano={80} />
          <Texto variante="titulo" accessibilityRole="header">
            {empresa.nombre_comercial}
          </Texto>
          <View
            style={estilos.insignia}
            accessible
            accessibilityLabel="Empresa validada"
            testID="empresa-validada"
          >
            <Texto variante="pequeno" style={estilos.textoInsignia} {...ocultar}>
              ✓ Empresa validada
            </Texto>
          </View>
        </View>

        <View style={estilos.datos}>
          <Dato icono="layers-outline" etiqueta="Sector" valor={empresa.sector.nombre} />
          <Dato
            icono="people-outline"
            etiqueta="Tamaño"
            valor={`${empresa.tamano_empresa.nombre} (${empresa.tamano_empresa.rango})`}
          />
          <Dato
            icono="location-outline"
            etiqueta="Ubicación"
            valor={`${empresa.municipio.nombre}, ${empresa.municipio.entidad.nombre}`}
          />
        </View>

        {empresa.descripcion ? (
          <View style={estilos.seccion}>
            <Texto variante="subtitulo" accessibilityRole="header">
              Acerca de la empresa
            </Texto>
            <Texto>{empresa.descripcion}</Texto>
          </View>
        ) : null}

        {empresa.sitio_web ? (
          <Pressable
            onPress={() => void abrirSitio(empresa.sitio_web!)}
            accessibilityRole="link"
            accessibilityLabel={`Sitio web, ${dominioDe(empresa.sitio_web)}`}
            accessibilityHint="Abre el sitio web de la empresa en el navegador"
            style={estilos.sitio}
            testID="sitio-web"
          >
            <Ionicons name="globe-outline" size={22} color={colores.primario} {...ocultar} />
            <Texto color="primario" style={estilos.subrayado} {...ocultar}>
              {dominioDe(empresa.sitio_web)}
            </Texto>
          </Pressable>
        ) : null}

        <View style={estilos.seccion}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Prácticas de inclusión
          </Texto>
          <Texto>{empresa.practicas_inclusion ?? SIN_PRACTICAS}</Texto>
        </View>

        <View style={estilos.seccion}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Vacantes publicadas
          </Texto>
          {empresa.vacantes.length === 0 ? (
            <Texto color="textoSecundarioSobreGris">
              Esta empresa no tiene vacantes publicadas por ahora.
            </Texto>
          ) : (
            empresa.vacantes.map((vacante) => (
              <TarjetaVacante
                key={vacante.id}
                vacante={vacante}
                onPress={() => navigation.navigate('DetalleVacante', { id: vacante.id })}
              />
            ))
          )}
        </View>
      </ScrollView>

      <MenuOpciones
        visible={ventana === 'menu'}
        textoReportar="Reportar empresa"
        onCerrar={() => setVentana(null)}
        onReportar={() => setVentana('reporte')}
      />
      <ModalReporte
        visible={ventana === 'reporte'}
        objeto={{ tipo: 'empresa', id: empresa.id, nombre: empresa.nombre_comercial }}
        onCerrar={() => setVentana(null)}
        onEnviado={() => {
          setVentana(null);
          setMensaje({ variante: 'exito', texto: MENSAJE_REPORTE_EMPRESA });
        }}
      />
    </View>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={estilos.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Ionicons name={icono} size={20} color={colores.texto} {...ocultar} />
      <Texto style={estilos.flexible} {...ocultar}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondoSuave },
  mensaje: { padding: espaciado.lg, paddingBottom: 0 },
  contenido: { padding: espaciado.lg, gap: espaciado.xl },
  encabezado: { gap: espaciado.sm, alignItems: 'flex-start' },
  insignia: {
    backgroundColor: colores.exitoFondo,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    borderRadius: 999,
  },
  textoInsignia: { color: colores.exitoTexto, fontWeight: '600' },
  datos: { gap: espaciado.sm },
  dato: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  flexible: { flexShrink: 1 },
  seccion: { gap: espaciado.md },
  sitio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: AREA_TACTIL_MINIMA,
    alignSelf: 'flex-start',
  },
  subrayado: { textDecorationLine: 'underline' },
  menu: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
