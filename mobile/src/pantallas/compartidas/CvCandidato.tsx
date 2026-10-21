import { StyleSheet, View } from 'react-native';

import type { CV } from '../../api';
import { Avatar, Tarjeta, Texto } from '../../componentes';
import { espaciado } from '../../tema';
import {
  etiquetaExperiencia,
  etiquetaFormacion,
  NOMBRE_ESTADO_FORMACION,
  NOMBRE_NIVEL,
  periodoExperiencia,
  periodoFormacion,
} from '../candidato/cv/textosCV';

interface Props {
  cv: CV;
  /** Aclaración al final (por ejemplo, cuándo se comparte el contacto). */
  avisoContacto?: string;
  /** Sin la foto y el nombre cuando la pantalla ya los muestra en su propio encabezado. */
  conPersona?: boolean;
}

/** CV tal como lo ve una empresa: resumen, experiencia, formación y habilidades con nivel. */
export function CvCandidato({ cv, avisoContacto, conPersona = true }: Props) {
  const modalidades =
    cv.modalidades.length > 0
      ? `Modalidad: ${cv.modalidades.map((m) => m.nombre).join(', ')}`
      : null;
  const ubicacion = cv.municipio ? `${cv.municipio.nombre}, ${cv.municipio.entidad.nombre}` : null;
  return (
    <>
      {conPersona ? (
        <View style={estilos.persona}>
          <Avatar fotoUrl={cv.foto_url} nombre={cv.nombre} apellidos={cv.apellidos} tamano={72} />
          <View style={estilos.textosPersona}>
            <Texto variante="subtitulo" accessibilityRole="header">
              {`${cv.nombre} ${cv.apellidos}`}
            </Texto>
            {ubicacion ? <Texto color="textoSecundarioSobreGris">{ubicacion}</Texto> : null}
            {modalidades ? <Texto color="textoSecundarioSobreGris">{modalidades}</Texto> : null}
          </View>
        </View>
      ) : (
        <View style={estilos.textosPersona}>
          {ubicacion ? <Texto color="textoSecundarioSobreGris">{ubicacion}</Texto> : null}
          {modalidades ? <Texto color="textoSecundarioSobreGris">{modalidades}</Texto> : null}
        </View>
      )}

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

      {avisoContacto ? (
        <Texto variante="pequeno" color="textoSecundarioSobreGris" testID="aviso-contacto">
          {avisoContacto}
        </Texto>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  persona: { flexDirection: 'row', alignItems: 'center', gap: espaciado.lg },
  textosPersona: { flex: 1, gap: espaciado.xs },
  textos: { gap: espaciado.xs },
  habilidad: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.md },
});
