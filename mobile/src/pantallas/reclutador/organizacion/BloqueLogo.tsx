import { useRef, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, empresas, type EmpresaPropia } from '../../../api';
import { Aviso, Boton, LogoEmpresa, Texto } from '../../../componentes';
import { espaciado } from '../../../tema';
import { elegirFoto } from '../../candidato/perfil/foto';
import { ModalFoto } from '../../candidato/perfil/ModalFoto';

interface Props {
  empresa: EmpresaPropia;
  onCambiado: () => Promise<void> | void;
  /** Para devolver el foco del lector de pantalla al botón cuando se cierra el diálogo. */
  refBoton: Ref<View>;
  onAbrirDialogo: () => void;
  onCerrarDialogo: () => void;
}

/** Logotipo de la empresa y «Cambiar logo» (el selector se abre cuando el diálogo ya se cerró). */
export function BloqueLogo({
  empresa,
  onCambiado,
  refBoton,
  onAbrirDialogo,
  onCerrarDialogo,
}: Props) {
  const [dialogo, setDialogo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{
    variante: 'exito' | 'error';
    mensaje: string;
    n: number;
  }>();
  const pendiente = useRef(false);

  const avisar = (variante: 'exito' | 'error', mensaje: string) =>
    setAviso((previo) => ({ variante, mensaje, n: (previo?.n ?? 0) + 1 }));

  function abrir() {
    onAbrirDialogo();
    setDialogo(true);
  }

  // iOS no puede presentar el selector mientras el diálogo sigue cerrándose.
  function elegir() {
    pendiente.current = true;
    setDialogo(false);
  }

  async function alCerrarse() {
    if (!pendiente.current) return;
    pendiente.current = false;
    try {
      const resultado = await elegirFoto('galeria', 'logo-empresa');
      if (resultado.tipo === 'error') {
        avisar('error', 'No pudimos abrir tus fotos. Intenta de nuevo.');
      } else if (resultado.tipo === 'archivo') {
        setOcupado(true);
        await empresas.subirLogo(resultado.archivo);
        await onCambiado();
        avisar('exito', 'Logo actualizado.');
      }
    } catch (fallo) {
      avisar('error', ApiError.desde(fallo).detail);
    }
    setOcupado(false);
    onCerrarDialogo();
  }

  return (
    <View style={estilos.bloque}>
      <View style={estilos.fila}>
        <LogoEmpresa logoUrl={empresa.logo_url} nombre={empresa.nombre_comercial} tamano={72} />
        <View style={estilos.textos}>
          <Texto variante="subtitulo">{empresa.nombre_comercial}</Texto>
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            {empresa.logo_url
              ? 'Este es tu logo.'
              : 'Aún no tienes logo: se muestran tus iniciales.'}
          </Texto>
        </View>
      </View>
      {aviso ? (
        <Aviso
          key={aviso.n}
          variante={aviso.variante}
          mensaje={aviso.mensaje}
          testID="aviso-logo"
        />
      ) : null}
      <Boton
        ref={refBoton}
        titulo="Cambiar logo"
        icono="image-outline"
        variante="secundario"
        cargando={ocupado}
        onPress={abrir}
        testID="cambiar-logo"
      />
      <ModalFoto
        visible={dialogo}
        titulo="Cambiar logo"
        descripcion="Tu logo lo verán los candidatos en tus vacantes y en el directorio de empresas. Debe ser JPG o PNG de hasta 2 MB."
        conCamara={false}
        onElegir={elegir}
        onCerrado={() => void alCerrarse()}
        onCancelar={() => {
          pendiente.current = false;
          setDialogo(false);
          onCerrarDialogo();
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: espaciado.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.lg },
  textos: { flex: 1, gap: espaciado.xs },
});
