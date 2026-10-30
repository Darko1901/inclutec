import { Ionicons } from '@expo/vector-icons';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { useCatalogo } from '../../../api';
import {
  BuscadorHabilidades,
  CampoTexto,
  ErrorCatalogo,
  EstadoVacio,
  GrupoRadio,
  Selector,
  Texto,
} from '../../../componentes';
import { AREA_TACTIL_MINIMA, colores, espaciado, radio } from '../../../tema';
import { TITULOS_PASO } from './formulario';
import { TituloPaso } from './TituloPaso';
import type { PropiedadesPaso } from './tipos';

/** Opción «sin requisito» del selector de formación: el id 0 no existe en el catálogo. */
const SIN_REQUISITO = 0;

type Tipo = 'obligatoria' | 'deseable';

/** Paso 2: habilidades obligatorias o deseables, formación mínima y años de experiencia. */
export function PasoRequisitos({ formulario: f, cambiar, errores, limpiar }: PropiedadesPaso) {
  const niveles = useCatalogo('niveles-educativos');

  function agregar(id: number, nombre: string) {
    cambiar({ habilidades: [...f.habilidades, { id, nombre, obligatoria: true }] });
    limpiar('habilidades');
    AccessibilityInfo.announceForAccessibility(
      `${nombre} agregada como obligatoria. Puedes cambiarla a deseable.`,
    );
  }

  function quitar(id: number, nombre: string) {
    cambiar({ habilidades: f.habilidades.filter((h) => h.id !== id) });
    AccessibilityInfo.announceForAccessibility(`${nombre} quitada.`);
  }

  function marcar(id: number, tipo: Tipo) {
    cambiar({
      habilidades: f.habilidades.map((h) =>
        h.id === id ? { ...h, obligatoria: tipo === 'obligatoria' } : h,
      ),
    });
    limpiar('habilidades');
  }

  return (
    <View style={estilos.paso}>
      <TituloPaso texto={TITULOS_PASO[2]} />
      <Texto color="textoSecundarioSobreGris">
        Las obligatorias pesan el doble en la compatibilidad. Para publicar necesitas al menos una
        obligatoria.
      </Texto>

      <BuscadorHabilidades excluidas={f.habilidades.map((h) => h.id)} onAgregar={agregar} />

      {f.habilidades.length === 0 ? (
        <EstadoVacio
          titulo="Aún no agregas habilidades"
          mensaje="Busca arriba las habilidades que pides."
          icono="construct-outline"
        />
      ) : (
        f.habilidades.map((habilidad) => (
          <View key={habilidad.id} style={estilos.tarjeta} testID={`habilidad-${habilidad.id}`}>
            <View style={estilos.fila}>
              <Texto variante="cuerpoFuerte" style={estilos.nombre}>
                {habilidad.nombre}
              </Texto>
              <Pressable
                onPress={() => quitar(habilidad.id, habilidad.nombre)}
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
            <GrupoRadio<Tipo>
              etiqueta={`Tipo de ${habilidad.nombre}`}
              opciones={[
                { valor: 'obligatoria', titulo: 'Obligatoria' },
                { valor: 'deseable', titulo: 'Deseable' },
              ]}
              valor={habilidad.obligatoria ? 'obligatoria' : 'deseable'}
              onCambio={(tipo) => marcar(habilidad.id, tipo)}
              testID={`tipo-habilidad-${habilidad.id}`}
            />
          </View>
        ))
      )}
      {errores.habilidades ? (
        <Texto
          color="error"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="error-habilidades"
        >
          {errores.habilidades}
        </Texto>
      ) : null}

      <ErrorCatalogo catalogos={[niveles]} />
      <Selector
        etiqueta="Formación mínima"
        opciones={[
          { id: SIN_REQUISITO, nombre: 'No se requiere' },
          ...niveles.datos.map(({ id, nombre }) => ({ id, nombre })),
        ]}
        valor={f.nivelEducativoId ?? SIN_REQUISITO}
        cargando={niveles.cargando}
        onChange={(id) => {
          cambiar({ nivelEducativoId: id === SIN_REQUISITO ? null : id });
          limpiar('nivel_educativo_id');
        }}
        error={errores.nivel_educativo_id}
        testID="selector-formacion"
      />
      <CampoTexto
        etiqueta="Años de experiencia"
        ayuda="Escribe 0 si no se pide experiencia."
        value={f.experiencia}
        onChangeText={(experiencia) => {
          cambiar({ experiencia: experiencia.replace(/\D/g, '') });
          limpiar('experiencia_anios');
        }}
        keyboardType="number-pad"
        maxLength={2}
        error={errores.experiencia_anios}
        testID="campo-experiencia"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: espaciado.lg },
  tarjeta: {
    gap: espaciado.sm,
    padding: espaciado.md,
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  nombre: { flex: 1 },
  quitar: {
    width: AREA_TACTIL_MINIMA,
    height: AREA_TACTIL_MINIMA,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
