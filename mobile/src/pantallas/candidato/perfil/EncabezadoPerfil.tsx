import type { Ref } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { PerfilCandidato, SeccionPerfil } from '../../../api';
import { Aviso, Avatar, BarraProgreso, Boton, Texto } from '../../../componentes';
import { espaciado } from '../../../tema';
import {
  ACCION_PENDIENTE,
  porcentajeAccesible,
  textoCompletitud,
  textoFaltantes,
} from './textosPerfil';

export interface AvisoFoto {
  variante: 'exito' | 'error' | 'advertencia';
  mensaje: string;
  n: number;
  /** Con el permiso de la cámara negado se ofrece abrir los Ajustes del teléfono. */
  conAjustes?: boolean;
}

interface Props {
  perfil: PerfilCandidato;
  ocupado: boolean;
  aviso: AvisoFoto | undefined;
  refCambiarFoto: Ref<View>;
  refQuitarFoto: Ref<View>;
  onCambiarFoto: () => void;
  onQuitarFoto: () => void;
  onPendiente: (seccion: SeccionPerfil) => void;
  style?: StyleProp<ViewStyle>;
}

/** Foto, nombre, barra de completitud con sus pendientes y los botones de la foto. */
export function EncabezadoPerfil({
  perfil,
  ocupado,
  aviso,
  refCambiarFoto,
  refQuitarFoto,
  onCambiarFoto,
  onQuitarFoto,
  onPendiente,
  style,
}: Props) {
  const { nombre, apellidos, correo } = perfil.usuario;
  const faltantes = textoFaltantes(perfil.secciones_pendientes);

  return (
    <View style={[estilos.contenedor, style]}>
      <View style={estilos.persona}>
        <Avatar
          fotoUrl={perfil.foto_url}
          nombre={nombre}
          apellidos={apellidos}
          descripcion="Tu foto de perfil"
          testID="avatar-perfil"
        />
        <View style={estilos.datos}>
          <Texto variante="subtitulo">{`${nombre} ${apellidos}`}</Texto>
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            {correo}
          </Texto>
        </View>
      </View>

      <View style={estilos.completitud}>
        {/* La barra ya dice el porcentaje; el texto visible solo lee lo que falta. */}
        <BarraProgreso
          etiqueta="Completitud del perfil"
          valor={perfil.completitud}
          valorAccesible={porcentajeAccesible(perfil.completitud)}
          testID="barra-completitud"
        />
        <Texto
          testID="texto-completitud"
          accessibilityLabel={faltantes ?? 'Tu perfil está completo'}
        >
          {textoCompletitud(perfil)}
        </Texto>
        {perfil.secciones_pendientes.map((seccion) => (
          <Boton
            key={seccion}
            titulo={ACCION_PENDIENTE[seccion]}
            variante="texto"
            onPress={() => onPendiente(seccion)}
            testID={`pendiente-${seccion}`}
          />
        ))}
      </View>

      {aviso ? (
        <Aviso
          key={aviso.n}
          variante={aviso.variante}
          mensaje={aviso.mensaje}
          testID="aviso-foto"
        />
      ) : null}
      {aviso?.conAjustes ? (
        <Boton
          titulo="Abrir los ajustes del teléfono"
          variante="secundario"
          icono="settings-outline"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}

      <View style={estilos.botonesFoto}>
        <Boton
          ref={refCambiarFoto}
          titulo="Cambiar foto"
          icono="camera-outline"
          variante="secundario"
          cargando={ocupado}
          onPress={onCambiarFoto}
          testID="cambiar-foto"
        />
        {perfil.foto_url ? (
          <Boton
            ref={refQuitarFoto}
            titulo="Quitar foto"
            icono="trash-outline"
            variante="texto"
            deshabilitado={ocupado}
            onPress={onQuitarFoto}
            testID="quitar-foto"
          />
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.lg },
  persona: { flexDirection: 'row', alignItems: 'center', gap: espaciado.lg },
  datos: { flex: 1, gap: espaciado.xs },
  completitud: { gap: espaciado.sm },
  botonesFoto: { gap: espaciado.sm },
});
