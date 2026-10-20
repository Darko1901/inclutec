import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, candidatos, type HabilidadCandidato, type NivelHabilidad } from '../../../api';
import {
  Aviso,
  Boton,
  BuscadorHabilidades,
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

const cargar = () => candidatos.listarHabilidades();

const huella = (lista: HabilidadCandidato[]) =>
  JSON.stringify(lista.map(({ id, nivel }) => [id, nivel]));

function Contenido({ iniciales }: { iniciales: HabilidadCandidato[] }) {
  const [guardadas, setGuardadas] = useState(iniciales);
  const [elegidas, setElegidas] = useState(iniciales);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ variante: 'exito' | 'error'; mensaje: string; n: number }>();

  const lleno = elegidas.length >= MAX_HABILIDADES;
  const hayCambios = huella(guardadas) !== huella(elegidas);
  const excluidas = useMemo(() => elegidas.map((e) => e.id), [elegidas]);

  function anunciar(mensaje: string) {
    AccessibilityInfo.announceForAccessibility(mensaje);
  }

  function agregar(id: number, nombre: string) {
    if (lleno) return;
    const nuevas = [...elegidas, { id, nombre, nivel: 'basico' as NivelHabilidad }];
    setElegidas(nuevas);
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

      <BuscadorHabilidades
        excluidas={excluidas}
        onAgregar={agregar}
        deshabilitado={lleno}
        ayudaDeshabilitado={`Llegaste al máximo de ${MAX_HABILIDADES} habilidades. Quita una para agregar otra.`}
      />

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
