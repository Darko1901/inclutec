import { Ionicons } from '@expo/vector-icons';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useCatalogo, type CatalogoItem } from '../../../api';
import { Aviso, Boton, CampoTexto, Casilla, Cargando, Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { CATEGORIAS_AJUSTE, ICONO_CATEGORIA } from '../../candidato/vacantes/categoriasAjuste';
import { MAX_NOTAS, TITULOS_PASO } from './formulario';
import { TituloPaso } from './TituloPaso';
import type { PropiedadesPaso } from './tipos';

type Bloque = 'existentes' | 'bajoSolicitud';

const BLOQUES: { clave: Bloque; titulo: string; otro: Bloque; tituloOtro: string }[] = [
  {
    clave: 'existentes',
    titulo: 'El lugar ya cuenta con',
    otro: 'bajoSolicitud',
    tituloOtro: 'Podemos ofrecer bajo solicitud',
  },
  {
    clave: 'bajoSolicitud',
    titulo: 'Podemos ofrecer bajo solicitud',
    otro: 'existentes',
    tituloOtro: 'El lugar ya cuenta con',
  },
];

/** Paso 4 (obligatorio para publicar): ajustes en dos bloques, notas y declaración de «sin condiciones». */
export function PasoAccesibilidad({ formulario: f, cambiar, errores, limpiar }: PropiedadesPaso) {
  const ajustes = useCatalogo('ajustes');

  function alternar(bloque: Bloque, otro: Bloque, id: number, marcada: boolean) {
    // Un mismo ajuste no puede estar en los dos bloques: la casilla del otro bloque se deshabilita.
    if (f[otro].includes(id)) return;
    cambiar({ [bloque]: marcada ? [...f[bloque], id] : f[bloque].filter((x) => x !== id) });
    limpiar('ajustes');
  }

  function declararSinCondiciones(marcada: boolean) {
    if (marcada) {
      const habiaAjustes = f.existentes.length + f.bajoSolicitud.length > 0;
      cambiar({ sinCondiciones: true, existentes: [], bajoSolicitud: [] });
      AccessibilityInfo.announceForAccessibility(
        habiaAjustes
          ? 'Se quitaron los ajustes que habías marcado.'
          : 'Declaraste que por ahora no cuentas con condiciones de accesibilidad.',
      );
    } else {
      cambiar({ sinCondiciones: false });
    }
    limpiar('ajustes', 'sin_condiciones_accesibilidad');
  }

  return (
    <View style={estilos.paso}>
      <TituloPaso texto={TITULOS_PASO[4]} />
      <Texto color="textoSecundarioSobreGris">
        Cuéntales a los candidatos qué condiciones de accesibilidad tiene el lugar y qué ajustes
        puedes ofrecer. Esta sección es obligatoria para publicar.
      </Texto>

      {ajustes.error ? (
        <>
          <Aviso variante="error" mensaje={ajustes.error.detail} />
          <Boton
            titulo="Reintentar"
            variante="secundario"
            icono="refresh"
            onPress={ajustes.recargar}
          />
        </>
      ) : null}
      {errores.ajustes ? (
        <Aviso variante="error" mensaje={errores.ajustes} testID="error-ajustes" />
      ) : null}

      <Casilla
        texto="Por ahora no contamos con condiciones de accesibilidad"
        ayuda="Al marcarla se quitan los ajustes de los dos bloques."
        marcada={f.sinCondiciones}
        onCambio={declararSinCondiciones}
        error={errores.sin_condiciones_accesibilidad}
        testID="casilla-sin-condiciones"
      />

      {ajustes.cargando ? <Cargando mensaje="Cargando ajustes…" /> : null}
      {BLOQUES.map(({ clave, titulo, otro, tituloOtro }) => (
        <View key={clave} style={estilos.bloque} testID={`bloque-${clave}`}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {titulo}
          </Texto>
          {CATEGORIAS_AJUSTE.map(({ id, nombre }) => {
            const delGrupo = ajustes.datos.filter((a: CatalogoItem) => a.categoria === id);
            if (delGrupo.length === 0) return null;
            return (
              <View key={id} style={estilos.grupo} testID={`${clave}-${id}`}>
                <View style={estilos.tituloGrupo}>
                  <Ionicons
                    name={ICONO_CATEGORIA[id]}
                    size={22}
                    color={colores.primario}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Texto variante="cuerpoFuerte" accessibilityRole="header">
                    {nombre}
                  </Texto>
                </View>
                {delGrupo.map((ajuste) => {
                  const enElOtro = f[otro].includes(ajuste.id);
                  return (
                    <Casilla
                      key={ajuste.id}
                      texto={ajuste.nombre}
                      etiquetaAccesible={`${ajuste.nombre}, ${titulo.toLowerCase()}`}
                      ayuda={enElOtro ? `Ya está en «${tituloOtro}».` : undefined}
                      marcada={f[clave].includes(ajuste.id)}
                      deshabilitada={f.sinCondiciones || enElOtro}
                      onCambio={(marcada) => alternar(clave, otro, ajuste.id, marcada)}
                      testID={`${clave}-ajuste-${ajuste.id}`}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      ))}

      <CampoTexto
        etiqueta="Notas de accesibilidad"
        ayuda="Opcional. Por ejemplo: cómo llegar a la entrada accesible."
        value={f.notas}
        onChangeText={(notas) => {
          cambiar({ notas });
          limpiar('notas_accesibilidad');
        }}
        multiline
        maxLength={MAX_NOTAS}
        contador
        error={errores.notas_accesibilidad}
        testID="campo-notas"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: espaciado.lg },
  bloque: {
    gap: espaciado.md,
    padding: espaciado.md,
    backgroundColor: colores.fondo,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  grupo: { gap: espaciado.xs },
  tituloGrupo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
});
