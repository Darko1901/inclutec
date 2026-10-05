import { Ionicons } from '@expo/vector-icons';
import { render, screen } from '@testing-library/react-native';

import { ChipEstado, ESTADOS } from '../ChipEstado';
import type { TipoEstado } from '../ChipEstado';

// Valores de la tabla 3.4 de docs/diseno/pantallas.md.
const ESTADOS_ESPERADOS: Record<TipoEstado, Record<string, string>> = {
  postulacion: {
    postulada: 'Postulada',
    en_revision: 'En revisión',
    entrevista: 'Entrevista',
    aceptada: 'Aceptada',
    no_seleccionada: 'No seleccionada',
    retirada: 'Retirada',
  },
  vacante: {
    borrador: 'Borrador',
    publicada: 'Publicada',
    pausada: 'Pausada',
    cerrada: 'Cerrada',
    suspendida: 'Suspendida',
  },
  empresa: {
    pendiente: 'Pendiente de validación',
    validada: 'Validada',
    rechazada: 'Rechazada',
    suspendida: 'Suspendida',
  },
  entrevista: {
    agendada: 'Agendada',
    realizada: 'Realizada',
    no_asistio: 'No asistió',
    cancelada: 'Cancelada',
  },
  horario: { libre: 'Libre', agendado: 'Agendado', cancelado: 'Cancelado' },
  reporte: {
    abierto: 'Abierto',
    en_revision: 'En revisión',
    resuelto: 'Resuelto',
    descartado: 'Descartado',
  },
  usuario: { activo: 'Activo', suspendido: 'Suspendido', eliminado: 'Eliminado' },
  ajuste_vacante: {
    existente: 'El lugar cuenta con',
    bajo_solicitud: 'Podemos ofrecer bajo solicitud',
  },
  compartir_ajustes: {
    preguntar: 'Preguntarme en cada postulación',
    siempre: 'Siempre',
    nunca: 'Nunca',
  },
};

type Nodo = { type: string; props: Record<string, unknown>; children?: (Nodo | string)[] | null };

/** Glifos de Ionicons dentro del árbol renderizado. */
function glifos(nodo: unknown): string[] {
  if (!nodo || typeof nodo === 'string') return [];
  const actual = nodo as Nodo;
  const estilos = [actual.props?.style].flat(3) as { fontFamily?: string }[];
  const esIcono = estilos.some((estilo) => estilo?.fontFamily === 'ionicons');
  const propios = esIcono
    ? (actual.children ?? []).filter((h): h is string => typeof h === 'string')
    : [];
  return [...propios, ...(actual.children ?? []).flatMap((hijo) => glifos(hijo))];
}

const casos = (Object.keys(ESTADOS_ESPERADOS) as TipoEstado[]).flatMap((tipo) =>
  Object.entries(ESTADOS_ESPERADOS[tipo]).map(([estado, texto]) => ({ tipo, estado, texto })),
);

describe('ChipEstado', () => {
  it('cubre exactamente los estados de la tabla 3.4', () => {
    for (const tipo of Object.keys(ESTADOS_ESPERADOS) as TipoEstado[]) {
      expect(Object.keys(ESTADOS[tipo]).sort()).toEqual(
        Object.keys(ESTADOS_ESPERADOS[tipo]).sort(),
      );
    }
    expect(casos).toHaveLength(34);
  });

  it.each(casos)(
    '$tipo · $estado muestra el texto «$texto» y un ícono',
    async ({ tipo, estado, texto }) => {
      // @ts-expect-error: la tabla recorre todos los tipos; el tipado estricto se comprueba en tsc
      await render(<ChipEstado tipo={tipo} estado={estado} />);

      expect(screen.getByText(texto)).toBeOnTheScreen();
      expect(screen.getByLabelText(`Estado: ${texto}`)).toBeOnTheScreen();
      // El ícono es un Text con la fuente de Ionicons y el glifo del ícono declarado.
      const definicion = (
        ESTADOS[tipo] as Record<string, { icono: keyof typeof Ionicons.glyphMap }>
      )[estado];
      expect(glifos(screen.toJSON())).toContain(
        String.fromCodePoint(Number(Ionicons.glyphMap[definicion.icono])),
      );
    },
  );

  it('nunca comunica solo con color: todo estado tiene texto y un ícono válido', () => {
    for (const tipo of Object.keys(ESTADOS) as TipoEstado[]) {
      for (const definicion of Object.values(ESTADOS[tipo]) as { texto: string; icono: string }[]) {
        expect(definicion.texto.trim().length).toBeGreaterThan(0);
        expect(Object.keys(Ionicons.glyphMap)).toContain(definicion.icono);
      }
    }
  });
});
