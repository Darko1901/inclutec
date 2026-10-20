import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, empresas, type EmpresaPropia } from '../../../api';
import { Aviso, Boton, ChipEstado, Texto } from '../../../componentes';
import { espaciado } from '../../../tema';
import { elegirConstancia, mensajeConstancia } from './constancia';
import { puedeSubirConstancia, textoConstancia } from './textosOrganizacion';

interface Props {
  empresa: EmpresaPropia;
  /** Se subió la constancia: la pantalla vuelve a pedir la empresa (puede pasar a «pendiente»). */
  onSubida: () => Promise<void> | void;
}

/** Documento de validación: estado de la constancia y «Subir constancia (PDF)» si hace falta. */
export function SeccionDocumento({ empresa, onSubida }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ variante: 'exito' | 'error'; mensaje: string; n: number }>();

  const avisar = (variante: 'exito' | 'error', mensaje: string) =>
    setAviso((previo) => ({ variante, mensaje, n: (previo?.n ?? 0) + 1 }));

  async function subir() {
    setAviso(undefined);
    const resultado = await elegirConstancia();
    if (resultado.tipo === 'error') {
      avisar('error', 'No pudimos abrir tus archivos. Intenta de nuevo.');
      return;
    }
    if (resultado.tipo === 'cancelado') return;
    const invalido = mensajeConstancia(resultado.archivo);
    if (invalido) {
      avisar('error', invalido);
      return;
    }
    setSubiendo(true);
    try {
      await empresas.subirConstancia(resultado.archivo);
      await onSubida();
      avisar('exito', 'Constancia enviada. Tu empresa quedó pendiente de validación.');
    } catch (fallo) {
      avisar('error', ApiError.desde(fallo).detail);
    }
    setSubiendo(false);
  }

  return (
    <View style={estilos.seccion} testID="seccion-documento">
      <Texto variante="subtitulo" accessibilityRole="header">
        Documento de validación
      </Texto>
      <ChipEstado tipo="empresa" estado={empresa.estado} testID="estado-empresa" />
      <Texto testID="texto-constancia">{textoConstancia(empresa)}</Texto>
      <Texto variante="pequeno" color="textoSecundarioSobreGris">
        {`Constancia de situación fiscal en PDF, de hasta 5 MB.`}
      </Texto>
      {aviso ? (
        <Aviso
          key={aviso.n}
          variante={aviso.variante}
          mensaje={aviso.mensaje}
          testID="aviso-constancia"
        />
      ) : null}
      {puedeSubirConstancia(empresa.estado) ? (
        <Boton
          titulo="Subir constancia (PDF)"
          icono="document-attach-outline"
          cargando={subiendo}
          onPress={() => void subir()}
          testID="subir-constancia"
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.md },
});
