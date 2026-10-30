import { StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';

// Revisiones de accesibilidad sobre el árbol que dibuja Jest (lo que verían VoiceOver y TalkBack):
// todo lo tocable con rol, nombre y área táctil; estados anunciados; íconos ocultos; texto que
// escala hasta el 200 %. No sustituye la prueba con el lector de pantalla en el teléfono.

/** Lo que devuelve `screen.toJSON()`. */
interface Nodo {
  type: string;
  props: Record<string, unknown> & { style?: unknown };
  children: (Nodo | string)[] | null;
}
type Arbol = Nodo | Nodo[] | null;

/** Área táctil mínima que se exige (WCAG 2.5.5 pide 44 pt; la app usa 48). */
export const MINIMO_TACTIL = 44;
/** El texto debe poder crecer hasta el 200 % del tamaño del sistema. */
export const ESCALA_MINIMA_TEXTO = 2;

const ROLES_TOCABLES = new Set([
  'button',
  'link',
  'tab',
  'checkbox',
  'radio',
  'switch',
  'menuitem',
  'imagebutton',
  'combobox',
  'adjustable',
]);

const esNodo = (hijo: unknown): hijo is Nodo => typeof hijo === 'object' && hijo !== null;

const estiloDe = (nodo: Nodo): ViewStyle & TextStyle =>
  StyleSheet.flatten(nodo.props.style as StyleProp<ViewStyle & TextStyle>) ?? {};

/** Ionicons y demás fuentes de íconos dibujan un glifo como texto. */
const esIcono = (nodo: Nodo) =>
  /icons|material|fontawesome/i.test(String(estiloDe(nodo).fontFamily));

const ocultaAlNodo = (nodo: Nodo) =>
  nodo.props.accessibilityElementsHidden === true ||
  nodo.props.importantForAccessibility === 'no' ||
  nodo.props.importantForAccessibility === 'no-hide-descendants' ||
  nodo.props['aria-hidden'] === true;

const ocultaADescendientes = (nodo: Nodo) =>
  nodo.props.accessibilityElementsHidden === true ||
  nodo.props.importantForAccessibility === 'no-hide-descendants' ||
  nodo.props['aria-hidden'] === true;

/** Texto visible que un lector de pantalla leería dentro del nodo (sin lo oculto). */
function textoLeido(nodo: Nodo): string {
  const partes: string[] = [];
  for (const hijo of nodo.children ?? []) {
    if (typeof hijo === 'string') partes.push(hijo);
    else if (esNodo(hijo) && !ocultaAlNodo(hijo)) {
      partes.push(
        hijo.props.accessibilityLabel ? String(hijo.props.accessibilityLabel) : textoLeido(hijo),
      );
    }
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/** ¿Hay texto dentro del flujo normal de la caja? Lo que va en posición absoluta (una insignia) no la corta. */
function contieneTexto(nodo: Nodo): boolean {
  return (nodo.children ?? []).some(
    (hijo) =>
      esNodo(hijo) &&
      estiloDe(hijo).position !== 'absolute' &&
      ((hijo.type === 'Text' && !esIcono(hijo)) || contieneTexto(hijo)),
  );
}

function esTocable(nodo: Nodo): boolean {
  if (nodo.type === 'TextInput') return false;
  const rol = nodo.props.accessibilityRole ?? nodo.props.role;
  if (rol && ROLES_TOCABLES.has(String(rol))) return true;
  return nodo.props.focusable === true && nodo.props.accessible === true;
}

interface Contexto {
  oculto: boolean;
  agrupado: boolean;
}

export interface Hallazgo {
  regla: string;
  detalle: string;
}

function describir(nodo: Nodo): string {
  const rotulo = nodo.props.accessibilityLabel ?? textoLeido(nodo);
  const id = nodo.props.testID ? ` [${nodo.props.testID}]` : '';
  return `${nodo.type}${id} «${String(rotulo).slice(0, 50)}»`;
}

/**
 * Revisa un árbol (`screen.toJSON()`) y devuelve lo que un lector de pantalla o el zoom de letra
 * del sistema no perdonarían. Las reglas están numeradas en `detalle` para ubicarlas rápido.
 */
export function auditarAccesibilidad(arbol: Arbol): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const reportar = (regla: string, nodo: Nodo, detalle: string) =>
    hallazgos.push({ regla, detalle: `${describir(nodo)}: ${detalle}` });

  function recorrer(nodo: Nodo, contexto: Contexto) {
    const oculto = contexto.oculto || ocultaAlNodo(nodo);
    const estilo = estiloDe(nodo);
    const props = nodo.props;

    if (!oculto) {
      // 1. Todo lo tocable tiene rol, nombre y área táctil.
      if (esTocable(nodo)) {
        if (!props.accessibilityRole && !props.role) reportar('rol', nodo, 'sin accessibilityRole');
        if (!props.accessibilityLabel && textoLeido(nodo) === '') {
          reportar('nombre', nodo, 'sin nombre: ni accessibilityLabel ni texto');
        }
        const alto = Number(estilo.minHeight ?? estilo.height ?? 0);
        const ancho = Number(estilo.minWidth ?? estilo.width ?? Number.POSITIVE_INFINITY);
        if (alto < MINIMO_TACTIL)
          reportar('area-tactil', nodo, `alto ${alto || 'sin definir'} < ${MINIMO_TACTIL}`);
        if (ancho < MINIMO_TACTIL)
          reportar('area-tactil', nodo, `ancho ${ancho} < ${MINIMO_TACTIL}`);

        // 2. Los estados se anuncian.
        const estado = (props.accessibilityState ?? {}) as Record<string, unknown>;
        const rol = String(props.accessibilityRole ?? props.role);
        if (rol === 'tab' && estado.selected === undefined) {
          reportar('estado', nodo, 'pestaña sin accessibilityState.selected');
        }
        if (['checkbox', 'switch'].includes(rol) && estado.checked === undefined) {
          reportar('estado', nodo, `${rol} sin accessibilityState.checked`);
        }
        if (rol === 'radio' && estado.checked === undefined && estado.selected === undefined) {
          reportar('estado', nodo, 'radio sin accessibilityState.checked');
        }
      }

      // 3. Campos de texto con nombre.
      if (nodo.type === 'TextInput' && !props.accessibilityLabel && !props['aria-label']) {
        reportar('nombre', nodo, 'campo sin accessibilityLabel');
      }

      // 4. El texto escala con el tamaño de letra del sistema.
      if (nodo.type === 'Text') {
        if (esIcono(nodo)) {
          // 5. Los íconos son decorativos: ocultos, o parte de un elemento agrupado con nombre.
          if (!contexto.agrupado && !props.accessibilityLabel) {
            reportar('icono', nodo, 'ícono visible para el lector de pantalla sin nombre');
          }
        } else {
          if (props.allowFontScaling === false)
            reportar('texto', nodo, 'allowFontScaling desactivado');
          const tope = props.maxFontSizeMultiplier;
          if (typeof tope === 'number' && tope > 0 && tope < ESCALA_MINIMA_TEXTO) {
            reportar('texto', nodo, `maxFontSizeMultiplier ${tope} < ${ESCALA_MINIMA_TEXTO}`);
          }
        }
      }

      // 6. Imágenes: con descripción o ocultas.
      if (
        nodo.type === 'Image' &&
        !props.accessibilityLabel &&
        !props.alt &&
        !props.accessibilityElementsHidden
      ) {
        reportar('imagen', nodo, 'imagen sin descripción ni ocultar');
      }

      // 7. Una caja de alto fijo con texto adentro lo cortaría al agrandar la letra.
      const altoFijo = estilo.height ?? estilo.maxHeight;
      if (
        typeof altoFijo === 'number' &&
        ((nodo.type === 'View' && contieneTexto(nodo)) || nodo.type === 'TextInput')
      ) {
        reportar('texto-cortado', nodo, `alto fijo ${altoFijo} con texto adentro`);
      }
    }

    const siguiente: Contexto = {
      oculto: oculto && (contexto.oculto || ocultaADescendientes(nodo)),
      agrupado: contexto.agrupado || props.accessible === true,
    };
    for (const hijo of nodo.children ?? []) {
      if (esNodo(hijo)) recorrer(hijo, siguiente);
    }
  }

  const raices = Array.isArray(arbol) ? arbol : arbol ? [arbol] : [];
  for (const raiz of raices) recorrer(raiz, { oculto: false, agrupado: false });
  return hallazgos;
}

export interface TextoEscalado {
  texto: string;
  /** Tamaño y interlineado que dibujaría el teléfono con la letra del sistema al `escala` indicado. */
  tamano: number;
  interlineado: number | null;
}

/**
 * Cómo quedaría cada texto del árbol con el tamaño de letra del sistema en `escala` (2 = 200 %):
 * el sistema multiplica el tamaño y el interlineado, sin pasar de `maxFontSizeMultiplier`, y no los
 * toca si `allowFontScaling` está apagado. Sirve para comprobar que nada se queda en su tamaño base.
 */
export function textosEscalados(arbol: Arbol, escala: number): TextoEscalado[] {
  const resultado: TextoEscalado[] = [];
  const visitar = (nodo: Nodo) => {
    if (nodo.type === 'Text' && !esIcono(nodo)) {
      const estilo = estiloDe(nodo);
      const tope =
        typeof nodo.props.maxFontSizeMultiplier === 'number'
          ? nodo.props.maxFontSizeMultiplier
          : Infinity;
      const factor = nodo.props.allowFontScaling === false ? 1 : Math.min(escala, tope || Infinity);
      resultado.push({
        texto: textoLeido(nodo),
        tamano: (estilo.fontSize ?? 14) * factor,
        interlineado: estilo.lineHeight === undefined ? null : estilo.lineHeight * factor,
      });
    }
    for (const hijo of nodo.children ?? []) if (esNodo(hijo)) visitar(hijo);
  };
  for (const raiz of Array.isArray(arbol) ? arbol : arbol ? [arbol] : []) visitar(raiz);
  return resultado;
}

/** Cuántos encabezados (para el lector de pantalla) tiene el árbol. */
export function contarEncabezados(arbol: Arbol): number {
  let total = 0;
  const visitar = (nodo: Nodo) => {
    if (nodo.props.accessibilityRole === 'header' && !ocultaAlNodo(nodo)) total++;
    for (const hijo of nodo.children ?? []) if (esNodo(hijo)) visitar(hijo);
  };
  for (const raiz of Array.isArray(arbol) ? arbol : arbol ? [arbol] : []) visitar(raiz);
  return total;
}
