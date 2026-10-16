import { StyleSheet, View } from 'react-native';

import { candidatos, type CV } from '../../../api';
import {
  Avatar,
  Cargando,
  EstadoError,
  ModalFormulario,
  Tarjeta,
  Texto,
} from '../../../componentes';
import { espaciado } from '../../../tema';
import { useCarga } from '../../../utilidades/useCarga';
import {
  etiquetaExperiencia,
  etiquetaFormacion,
  NOMBRE_ESTADO_FORMACION,
  NOMBRE_NIVEL,
  periodoExperiencia,
  periodoFormacion,
} from './textosCV';

export const AVISO_CONTACTO =
  'Tu correo y teléfono se muestran a la empresa cuando te invite a entrevista.';

const cargar = () => candidatos.vistaPrevia();

function Cv({ cv }: { cv: CV }) {
  const ubicacion = cv.municipio ? `${cv.municipio.nombre}, ${cv.municipio.entidad.nombre}` : null;
  return (
    <>
      <View style={estilos.persona}>
        <Avatar fotoUrl={cv.foto_url} nombre={cv.nombre} apellidos={cv.apellidos} tamano={72} />
        <View style={estilos.textosPersona}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {`${cv.nombre} ${cv.apellidos}`}
          </Texto>
          {ubicacion ? <Texto color="textoSecundarioSobreGris">{ubicacion}</Texto> : null}
          {cv.modalidades.length > 0 ? (
            <Texto color="textoSecundarioSobreGris">
              {`Modalidad: ${cv.modalidades.map((m) => m.nombre).join(', ')}`}
            </Texto>
          ) : null}
        </View>
      </View>

      {cv.resumen ? (
        <>
          <Texto variante="cuerpoFuerte" accessibilityRole="header">
            Resumen
          </Texto>
          <Texto>{cv.resumen}</Texto>
        </>
      ) : null}

      <Texto variante="cuerpoFuerte" accessibilityRole="header">
        Experiencia
      </Texto>
      {cv.experiencias.length === 0 ? (
        <Texto color="textoSecundarioSobreGris">Sin experiencia registrada.</Texto>
      ) : (
        cv.experiencias.map((e) => (
          <Tarjeta key={e.id}>
            <View accessible accessibilityLabel={etiquetaExperiencia(e)} style={estilos.textos}>
              <Texto variante="cuerpoFuerte">{e.puesto}</Texto>
              <Texto color="textoSecundarioSobreGris">{e.empresa}</Texto>
              <Texto color="textoSecundarioSobreGris">{periodoExperiencia(e)}</Texto>
              {e.descripcion ? <Texto>{e.descripcion}</Texto> : null}
            </View>
          </Tarjeta>
        ))
      )}

      <Texto variante="cuerpoFuerte" accessibilityRole="header">
        Formación
      </Texto>
      {cv.formaciones.length === 0 ? (
        <Texto color="textoSecundarioSobreGris">Sin formación registrada.</Texto>
      ) : (
        cv.formaciones.map((f) => (
          <Tarjeta key={f.id}>
            <View accessible accessibilityLabel={etiquetaFormacion(f)} style={estilos.textos}>
              <Texto variante="cuerpoFuerte">{f.carrera ?? f.nivel_educativo.nombre}</Texto>
              <Texto color="textoSecundarioSobreGris">
                {f.carrera ? `${f.nivel_educativo.nombre} · ${f.institucion}` : f.institucion}
              </Texto>
              <Texto color="textoSecundarioSobreGris">
                {[NOMBRE_ESTADO_FORMACION[f.estado], periodoFormacion(f)]
                  .filter(Boolean)
                  .join(' · ')}
              </Texto>
            </View>
          </Tarjeta>
        ))
      )}

      <Texto variante="cuerpoFuerte" accessibilityRole="header">
        Habilidades
      </Texto>
      {cv.habilidades.length === 0 ? (
        <Texto color="textoSecundarioSobreGris">Sin habilidades registradas.</Texto>
      ) : (
        cv.habilidades.map((h) => (
          <View
            key={h.id}
            accessible
            accessibilityLabel={`${h.nombre}, nivel ${NOMBRE_NIVEL[h.nivel].toLowerCase()}`}
            style={estilos.habilidad}
          >
            <Texto>{h.nombre}</Texto>
            <Texto color="textoSecundarioSobreGris">{NOMBRE_NIVEL[h.nivel]}</Texto>
          </View>
        ))
      )}

      <Texto variante="pequeno" color="textoSecundarioSobreGris" testID="aviso-contacto">
        {AVISO_CONTACTO}
      </Texto>
    </>
  );
}

function Contenido({ onCerrar }: { onCerrar: () => void }) {
  const { estado, recargar } = useCarga(cargar);
  return (
    <ModalFormulario
      titulo="Vista previa de mi CV"
      onCerrar={onCerrar}
      pistaVolver="Cierra la vista previa"
      accion={{ titulo: 'Cerrar', onPress: onCerrar }}
      testID="modal-vista-previa"
    >
      <Texto color="textoSecundarioSobreGris">
        Así verá tu CV la empresa a la que te postules.
      </Texto>
      {estado.fase === 'cargando' ? <Cargando mensaje="Preparando la vista previa…" /> : null}
      {estado.fase === 'error' ? (
        <EstadoError mensaje={estado.error.detail} onReintentar={() => void recargar()} />
      ) : null}
      {estado.fase === 'listo' ? <Cv cv={estado.datos} /> : null}
    </ModalFormulario>
  );
}

/** Modal de solo lectura con el CV como lo ve una empresa: sin correo ni teléfono. */
export function ModalVistaPrevia({
  visible,
  onCerrar,
}: {
  visible: boolean;
  onCerrar: () => void;
}) {
  return visible ? <Contenido onCerrar={onCerrar} /> : null;
}

const estilos = StyleSheet.create({
  persona: { flexDirection: 'row', alignItems: 'center', gap: espaciado.lg },
  textosPersona: { flex: 1, gap: espaciado.xs },
  textos: { gap: espaciado.xs },
  habilidad: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.md },
});
