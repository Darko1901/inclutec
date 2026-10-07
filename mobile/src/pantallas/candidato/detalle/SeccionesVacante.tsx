import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { VacanteDetalle } from '../../../api';
import { Texto } from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { ICONO_CATEGORIA } from '../vacantes/categoriasAjuste';
import { textoSalario } from '../vacantes/textos';
import { textoExperiencia, textoPlazas } from './textosDetalle';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );
}

function Subtitulo({ children }: { children: string }) {
  return (
    <Texto variante="cuerpoFuerte" accessibilityRole="header" style={estilos.subtitulo}>
      {children}
    </Texto>
  );
}

function Punto({ texto }: { texto: string }) {
  return (
    <View style={estilos.punto}>
      <View style={estilos.vineta} accessibilityElementsHidden importantForAccessibility="no" />
      <Texto style={estilos.flexible}>{texto}</Texto>
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.fila} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Texto
        color="textoSecundarioSobreGris"
        style={estilos.etiqueta}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {etiqueta}
      </Texto>
      <Texto
        variante="cuerpoFuerte"
        style={estilos.valor}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {valor}
      </Texto>
    </View>
  );
}

function GrupoAjustes({ titulo, ajustes }: { titulo: string; ajustes: VacanteDetalle['ajustes'] }) {
  if (ajustes.length === 0) return null;
  return (
    <View style={estilos.grupo}>
      <Subtitulo>{titulo}</Subtitulo>
      {ajustes.map((ajuste) => (
        <View
          key={ajuste.id}
          style={estilos.ajuste}
          accessible
          accessibilityLabel={`${ajuste.nombre}. ${ajuste.descripcion}`}
        >
          <Ionicons
            name={ICONO_CATEGORIA[ajuste.categoria]}
            size={22}
            color={colores.primario}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={estilos.flexible}>
            <Texto
              variante="cuerpoFuerte"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {ajuste.nombre}
            </Texto>
            <Texto
              variante="pequeno"
              color="textoSecundarioSobreGris"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {ajuste.descripcion}
            </Texto>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Descripción, requisitos, condiciones y accesibilidad de la vacante. */
export function SeccionesVacante({ vacante }: { vacante: VacanteDetalle }) {
  const obligatorias = vacante.habilidades.filter((h) => h.obligatoria);
  const deseables = vacante.habilidades.filter((h) => !h.obligatoria);
  const salario = textoSalario(vacante.salario);
  const existentes = vacante.ajustes.filter((a) => a.tipo === 'existente');
  const bajoSolicitud = vacante.ajustes.filter((a) => a.tipo === 'bajo_solicitud');
  const sinAjustes = vacante.ajustes.length === 0;

  return (
    <View style={estilos.contenedor}>
      <Seccion titulo="Descripción">
        <Texto>{vacante.descripcion}</Texto>
      </Seccion>

      <Seccion titulo="Requisitos">
        {obligatorias.length > 0 ? (
          <View style={estilos.grupo}>
            <Subtitulo>Habilidades obligatorias</Subtitulo>
            {obligatorias.map((h) => (
              <Punto key={h.id} texto={h.nombre} />
            ))}
          </View>
        ) : null}
        {deseables.length > 0 ? (
          <View style={estilos.grupo}>
            <Subtitulo>Habilidades deseables</Subtitulo>
            {deseables.map((h) => (
              <Punto key={h.id} texto={h.nombre} />
            ))}
          </View>
        ) : null}
        <Fila
          etiqueta="Formación mínima"
          valor={vacante.nivel_educativo?.nombre ?? 'No se pide formación mínima'}
        />
        <Fila etiqueta="Experiencia" valor={textoExperiencia(vacante.experiencia_anios)} />
      </Seccion>

      <Seccion titulo="Condiciones">
        <Fila etiqueta="Jornada" valor={vacante.jornada.nombre} />
        <Fila etiqueta="Contrato" valor={vacante.tipo_contrato.nombre} />
        <Fila etiqueta="Plazas" valor={textoPlazas(vacante.plazas)} />
        <Fila etiqueta="Modalidad" valor={vacante.modalidad.nombre} />
        {vacante.direccion ? <Fila etiqueta="Dirección" valor={vacante.direccion} /> : null}
        {salario ? <Fila etiqueta="Salario" valor={salario} /> : null}
      </Seccion>

      <Seccion titulo="Accesibilidad">
        {vacante.sin_condiciones_accesibilidad ? (
          <View
            style={estilos.declaracion}
            accessible
            accessibilityLabel="La empresa declaró que el lugar no cuenta con condiciones de accesibilidad"
          >
            <Ionicons
              name="information-circle"
              size={24}
              color={colores.advertenciaTexto}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Texto
              style={estilos.textoDeclaracion}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              La empresa declaró que el lugar no cuenta con condiciones de accesibilidad
            </Texto>
          </View>
        ) : (
          <>
            <GrupoAjustes titulo="El lugar cuenta con" ajustes={existentes} />
            <GrupoAjustes
              titulo="La empresa puede ofrecer bajo solicitud"
              ajustes={bajoSolicitud}
            />
            {sinAjustes ? (
              <Texto color="textoSecundarioSobreGris">
                La empresa aún no declara condiciones de accesibilidad.
              </Texto>
            ) : null}
          </>
        )}
        {vacante.notas_accesibilidad ? (
          <View style={estilos.grupo}>
            <Subtitulo>Notas de la empresa</Subtitulo>
            <Texto>{vacante.notas_accesibilidad}</Texto>
          </View>
        ) : null}
      </Seccion>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xl },
  seccion: { gap: espaciado.md },
  grupo: { gap: espaciado.sm },
  subtitulo: { color: colores.texto },
  flexible: { flex: 1 },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  vineta: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colores.primario,
    marginTop: 8,
  },
  fila: { gap: espaciado.xs },
  etiqueta: {},
  valor: {},
  ajuste: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.md },
  declaracion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.advertenciaTexto,
    backgroundColor: colores.advertenciaFondo,
  },
  textoDeclaracion: { flex: 1, color: colores.advertenciaTexto },
});
