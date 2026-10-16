import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import {
  ApiError,
  candidatos,
  useCatalogo,
  type HabilidadCandidato,
  type NivelHabilidad,
} from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  Cargando,
  EstadoError,
  EstadoVacio,
  Selector,
  Texto,
} from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import { useCarga } from '../../../utilidades/useCarga';
import {
  contadorHabilidades,
  contadorHabilidadesAccesible,
  MAX_HABILIDADES,
  OPCIONES_NIVEL,
} from './textosCV';

const MINIMO_BUSQUEDA = 2;
const ESPERA_BUSQUEDA_MS = 300;

const cargar = () => candidatos.listarHabilidades();

const huella = (lista: HabilidadCandidato[]) =>
  JSON.stringify(lista.map(({ id, nivel }) => [id, nivel]));

/** Texto del buscador y el término que se consulta 300 ms después de dejar de escribir. */
function useTermino(texto: string) {
  const [termino, setTermino] = useState('');
  useEffect(() => {
    const limpio = texto.trim();
    const espera = setTimeout(
      () => setTermino(limpio.length >= MINIMO_BUSQUEDA ? limpio : ''),
      ESPERA_BUSQUEDA_MS,
    );
    return () => clearTimeout(espera);
  }, [texto]);
  return termino;
}

function Contenido({ iniciales }: { iniciales: HabilidadCandidato[] }) {
  const [guardadas, setGuardadas] = useState(iniciales);
  const [elegidas, setElegidas] = useState(iniciales);
  const [texto, setTexto] = useState('');
  const termino = useTermino(texto);
  const sugerencias = useCatalogo('habilidades', { q: termino }, termino !== '');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ variante: 'exito' | 'error'; mensaje: string; n: number }>();

  const lleno = elegidas.length >= MAX_HABILIDADES;
  const hayCambios = huella(guardadas) !== huella(elegidas);
  const disponibles = useMemo(
    () => sugerencias.datos.filter((s) => !elegidas.some((e) => e.id === s.id)),
    [sugerencias.datos, elegidas],
  );
  const hayBusqueda = termino !== '' && texto.trim().length >= MINIMO_BUSQUEDA;

  function anunciar(mensaje: string) {
    AccessibilityInfo.announceForAccessibility(mensaje);
  }

  function agregar(id: number, nombre: string) {
    if (lleno) return;
    const nuevas = [...elegidas, { id, nombre, nivel: 'basico' as NivelHabilidad }];
    setElegidas(nuevas);
    setTexto('');
    setAviso(undefined);
    anunciar(
      `${nombre} agregada con nivel básico. ${contadorHabilidadesAccesible(nuevas.length)}.`,
    );
  }

  function quitar(habilidad: HabilidadCandidato) {
    const restantes = elegidas.filter((e) => e.id !== habilidad.id);
    setElegidas(restantes);
    setAviso(undefined);
    anunciar(`${habilidad.nombre} quitada. ${contadorHabilidadesAccesible(restantes.length)}.`);
  }

  function cambiarNivel(id: number, nivel: NivelHabilidad) {
    setElegidas((previo) => previo.map((e) => (e.id === id ? { ...e, nivel } : e)));
  }

  async function guardar() {
    setGuardando(true);
    try {
      const resultado = await candidatos.guardarHabilidades({
        habilidades: elegidas.map(({ id, nivel }) => ({ habilidad_id: id, nivel })),
      });
      setGuardadas(resultado);
      setElegidas(resultado);
      setAviso({
        variante: 'exito',
        mensaje: `Habilidades guardadas. ${contadorHabilidadesAccesible(resultado.length)}.`,
        n: (aviso?.n ?? 0) + 1,
      });
    } catch (fallo) {
      setAviso({
        variante: 'error',
        mensaje: ApiError.desde(fallo).detail,
        n: (aviso?.n ?? 0) + 1,
      });
    }
    setGuardando(false);
  }

  return (
    <View style={estilos.panel} testID="panel-habilidades">
      {aviso ? <Aviso key={aviso.n} variante={aviso.variante} mensaje={aviso.mensaje} /> : null}

      <View style={estilos.encabezado}>
        <Texto variante="subtitulo" accessibilityRole="header" style={estilos.titulo}>
          Habilidades
        </Texto>
        <Texto
          testID="contador-habilidades"
          variante="cuerpoFuerte"
          accessibilityLabel={contadorHabilidadesAccesible(elegidas.length)}
        >
          {contadorHabilidades(elegidas.length)}
        </Texto>
      </View>

      <CampoTexto
        etiqueta="Buscar una habilidad"
        value={texto}
        onChangeText={setTexto}
        editable={!lleno}
        placeholder="Por ejemplo: Excel, Python"
        autoCapitalize="none"
        returnKeyType="search"
        ayuda={
          lleno
            ? `Llegaste al máximo de ${MAX_HABILIDADES} habilidades. Quita una para agregar otra.`
            : `Escribe al menos ${MINIMO_BUSQUEDA} letras para ver sugerencias.`
        }
        testID="buscador-habilidades"
      />

      {hayBusqueda && !lleno ? (
        sugerencias.error ? (
          <Aviso variante="error" mensaje={sugerencias.error.detail} />
        ) : sugerencias.cargando ? (
          <Texto color="textoSecundarioSobreGris">Buscando…</Texto>
        ) : disponibles.length === 0 ? (
          <Texto color="textoSecundarioSobreGris" accessibilityLiveRegion="polite">
            {`No encontramos habilidades con «${termino}».`}
          </Texto>
        ) : (
          <View style={estilos.sugerencias} testID="sugerencias-habilidades">
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              accessibilityLiveRegion="polite"
            >
              {`${disponibles.length} ${disponibles.length === 1 ? 'sugerencia' : 'sugerencias'}. Toca una para agregarla.`}
            </Texto>
            {disponibles.map((habilidad) => (
              <Pressable
                key={habilidad.id}
                onPress={() => agregar(habilidad.id, habilidad.nombre)}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${habilidad.nombre}`}
                style={estilos.sugerencia}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={colores.primario}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Texto accessibilityElementsHidden importantForAccessibility="no">
                  {habilidad.nombre}
                </Texto>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {elegidas.length === 0 ? (
        <EstadoVacio
          titulo="Aún no agregas habilidades"
          mensaje="Busca arriba lo que sabes hacer. Las vacantes se comparan con tus habilidades."
          icono="construct-outline"
        />
      ) : (
        elegidas.map((habilidad) => (
          <View key={habilidad.id} style={estilos.chip} testID={`chip-habilidad-${habilidad.id}`}>
            <View style={estilos.filaChip}>
              <Texto variante="cuerpoFuerte" style={estilos.nombre}>
                {habilidad.nombre}
              </Texto>
              <Pressable
                onPress={() => quitar(habilidad)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar habilidad ${habilidad.nombre}`}
                style={estilos.quitar}
              >
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={colores.error}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            </View>
            <Selector
              etiqueta={`Nivel de ${habilidad.nombre}`}
              opciones={OPCIONES_NIVEL.map(({ id, nombre }) => ({ id, nombre }))}
              valor={OPCIONES_NIVEL.find((o) => o.valor === habilidad.nivel)?.id ?? null}
              onChange={(id) => {
                const nivel = OPCIONES_NIVEL.find((o) => o.id === id)?.valor;
                if (nivel) cambiarNivel(habilidad.id, nivel);
              }}
              testID={`nivel-${habilidad.id}`}
            />
          </View>
        ))
      )}

      <Boton
        titulo="Guardar habilidades"
        onPress={() => void guardar()}
        cargando={guardando}
        deshabilitado={!hayCambios}
        accessibilityHint={
          hayCambios ? undefined : 'Cambia alguna habilidad o su nivel para poder guardar'
        }
        testID="guardar-habilidades"
      />
    </View>
  );
}

/** Pestaña «Habilidades» de Mi CV: buscador con sugerencias, chips con nivel y «n de 30». */
export function TabHabilidades() {
  const { estado, recargar } = useCarga(cargar);
  if (estado.fase === 'cargando') return <Cargando mensaje="Cargando habilidades…" />;
  if (estado.fase === 'error') {
    return <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />;
  }
  return <Contenido iniciales={estado.datos} />;
}

const estilos = StyleSheet.create({
  panel: { gap: espaciado.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  titulo: { flex: 1 },
  sugerencias: {
    backgroundColor: colores.fondo,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
    padding: espaciado.sm,
  },
  sugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: AREA_TACTIL_MINIMA,
    paddingHorizontal: espaciado.sm,
  },
  chip: {
    gap: espaciado.sm,
    padding: espaciado.md,
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  filaChip: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  nombre: { flex: 1 },
  quitar: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centrado: { textAlign: 'center' },
});
