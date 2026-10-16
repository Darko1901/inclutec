import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ApiError,
  candidatos,
  useCatalogo,
  type CompartirAjustes,
  type PerfilCandidato,
} from '../../../api';
import {
  Aviso,
  Boton,
  CampoTexto,
  Casilla,
  GrupoRadio,
  ModalConfirmacion,
  SeccionDesplegable,
  Texto,
  useRetornoFoco,
} from '../../../componentes';
import { colores, espaciado, radio } from '../../../tema';
import { CATEGORIAS_AJUSTE, ICONO_CATEGORIA } from '../vacantes/categoriasAjuste';
import {
  entradaDePerfil,
  MAX_NOTA_AJUSTES,
  OPCIONES_COMPARTIR,
  TEXTO_SIN_DIAGNOSTICO,
  type PropiedadesSeccion,
} from './textosPerfil';

/** Lo que va en el recuadro fijo al inicio de la sección. */
function SinDiagnostico() {
  return (
    <View style={estilos.sinDiagnostico}>
      <Ionicons
        name="shield-checkmark-outline"
        size={24}
        color={colores.infoTexto}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Texto style={estilos.textoSinDiagnostico} testID="texto-sin-diagnostico">
        {TEXTO_SIN_DIAGNOSTICO}
      </Texto>
    </View>
  );
}

function SinConsentimiento({
  aviso,
  onGuardado,
}: Pick<PropiedadesSeccion, 'aviso' | 'onGuardado'>) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registrar, recordar, devolver } = useRetornoFoco();

  async function otorgar() {
    setEnviando(true);
    try {
      const nuevo = await candidatos.cambiarConsentimiento(true);
      onGuardado('Consentimiento registrado. Ya puedes elegir tus necesidades de ajuste.', nuevo);
    } catch (fallo) {
      setError(ApiError.desde(fallo).detail);
      setEnviando(false);
      setConfirmando(false);
      devolver();
    }
  }

  return (
    <>
      <Texto>
        Tus necesidades de ajuste son datos personales sensibles. Las usamos solo para recomendarte
        vacantes que cuenten con lo que necesitas y, si tú lo decides, para que la empresa a la que
        te postules lo sepa. Para guardarlas necesitamos tu consentimiento expreso. Puedes retirarlo
        cuando quieras y entonces las borramos.
      </Texto>
      <Boton
        titulo="Leer el aviso de privacidad"
        variante="texto"
        icono="document-text-outline"
        onPress={() => navigation.navigate('AvisoPrivacidad')}
      />
      {error ? <Aviso variante="error" mensaje={error} /> : null}
      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}
      <Boton
        ref={registrar('consentimiento')}
        titulo="Dar mi consentimiento"
        onPress={() => {
          recordar('consentimiento');
          setError(null);
          setConfirmando(true);
        }}
        testID="dar-consentimiento"
      />
      <ModalConfirmacion
        visible={confirmando}
        titulo="¿Dar tu consentimiento?"
        mensaje="Autorizas a IncluTec a guardar tus necesidades de ajuste para recomendarte vacantes y, si tú lo decides, compartirlas con las empresas a las que te postules. Puedes retirar tu consentimiento en cualquier momento."
        textoConfirmar="Sí, dar mi consentimiento"
        cargando={enviando}
        onConfirmar={() => void otorgar()}
        onCancelar={() => {
          setConfirmando(false);
          devolver();
        }}
      />
    </>
  );
}

function ConConsentimiento({
  perfil,
  aviso,
  onGuardado,
}: Pick<PropiedadesSeccion, 'perfil' | 'aviso' | 'onGuardado'>) {
  const ajustes = useCatalogo('ajustes');
  const [seleccion, setSeleccion] = useState<number[]>(perfil.necesidades.map((n) => n.id));
  const [nota, setNota] = useState(perfil.nota_ajustes ?? '');
  const [compartir, setCompartir] = useState<CompartirAjustes>(perfil.compartir_ajustes);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const [enviandoRetiro, setEnviandoRetiro] = useState(false);
  const { registrar, recordar, devolver } = useRetornoFoco();

  async function guardar() {
    setErrorGeneral(null);
    setErrores({});
    setGuardando(true);
    try {
      await candidatos.guardarNecesidades({
        ajuste_ids: seleccion,
        nota_ajustes: nota.trim() === '' ? null : nota.trim(),
      });
      let nuevo: PerfilCandidato | undefined;
      if (compartir !== perfil.compartir_ajustes) {
        nuevo = await candidatos.actualizarPerfil({
          ...entradaDePerfil(perfil),
          compartir_ajustes: compartir,
        });
      }
      onGuardado('Necesidades de ajuste guardadas.', nuevo);
    } catch (fallo) {
      const error = ApiError.desde(fallo);
      if (error.campos) setErrores(error.campos);
      if (!error.campos || error.detail !== 'Revisa los datos marcados.') {
        setErrorGeneral(error.detail);
      }
    }
    setGuardando(false);
  }

  async function retirar() {
    setEnviandoRetiro(true);
    try {
      const nuevo = await candidatos.cambiarConsentimiento(false);
      onGuardado('Consentimiento retirado. Borramos tus necesidades de ajuste.', nuevo);
    } catch (fallo) {
      setErrorGeneral(ApiError.desde(fallo).detail);
      setEnviandoRetiro(false);
      setRetirando(false);
      devolver();
    }
  }

  return (
    <>
      {errorGeneral ? <Aviso variante="error" mensaje={errorGeneral} /> : null}
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

      {CATEGORIAS_AJUSTE.map(({ id, nombre }) => {
        const delGrupo = ajustes.datos.filter((ajuste) => ajuste.categoria === id);
        if (delGrupo.length === 0) return null;
        return (
          <View key={id} style={estilos.grupo} testID={`grupo-${id}`}>
            <View style={estilos.tituloGrupo}>
              <Ionicons
                name={ICONO_CATEGORIA[id]}
                size={22}
                color={colores.primario}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Texto variante="etiqueta" accessibilityRole="header">
                {nombre}
              </Texto>
            </View>
            {delGrupo.map((ajuste) => (
              <Casilla
                key={ajuste.id}
                texto={ajuste.nombre}
                ayuda={ajuste.descripcion ?? undefined}
                marcada={seleccion.includes(ajuste.id)}
                onCambio={(marcada) =>
                  setSeleccion((ids) =>
                    marcada ? [...ids, ajuste.id] : ids.filter((actual) => actual !== ajuste.id),
                  )
                }
                testID={`ajuste-${ajuste.id}`}
              />
            ))}
          </View>
        );
      })}
      {errores.ajuste_ids ? <Aviso variante="error" mensaje={errores.ajuste_ids} /> : null}

      <CampoTexto
        etiqueta="Nota para las empresas (opcional)"
        ayuda="Por ejemplo, algo más que ayude a prepararte el lugar de trabajo."
        value={nota}
        onChangeText={(texto) => {
          setNota(texto);
          setErrores((previo) => ({ ...previo, nota_ajustes: '' }));
        }}
        maxLength={MAX_NOTA_AJUSTES}
        contador
        multiline
        error={errores.nota_ajustes || null}
        testID="campo-nota-ajustes"
      />

      <GrupoRadio
        etiqueta="¿Compartir tus necesidades con las empresas?"
        opciones={[...OPCIONES_COMPARTIR]}
        valor={compartir}
        onCambio={setCompartir}
        testID="grupo-compartir"
      />

      <Boton
        titulo="Guardar"
        accessibilityLabel="Guardar necesidades de ajuste"
        onPress={() => void guardar()}
        cargando={guardando}
        testID="guardar-necesidades"
      />
      {aviso ? <Aviso key={aviso.n} variante="exito" mensaje={aviso.mensaje} /> : null}

      <Boton
        ref={registrar('retirar')}
        titulo="Retirar mi consentimiento"
        variante="secundario"
        icono="close-circle-outline"
        onPress={() => {
          recordar('retirar');
          setRetirando(true);
        }}
        testID="retirar-consentimiento"
      />
      <ModalConfirmacion
        visible={retirando}
        titulo="¿Retirar tu consentimiento?"
        mensaje="Se borrarán las necesidades de ajuste y la nota que registraste. Las empresas ya no podrán verlas y tus recomendaciones dejarán de considerarlas. Si quieres, podrás dar tu consentimiento otra vez."
        textoConfirmar="Retirar y borrar"
        peligro
        cargando={enviandoRetiro}
        onConfirmar={() => void retirar()}
        onCancelar={() => {
          setRetirando(false);
          devolver();
        }}
      />
    </>
  );
}

/** «Necesidades de ajuste» de CAN-03: consentimiento expreso, necesidades y a quién se comparten. */
export function SeccionNecesidades({
  refBoton,
  perfil,
  expandida,
  onAlternar,
  aviso,
  onGuardado,
}: PropiedadesSeccion) {
  const conConsentimiento = perfil.consentimiento_sensibles_en !== null;
  return (
    <SeccionDesplegable
      ref={refBoton}
      titulo="Necesidades de ajuste"
      icono="accessibility-outline"
      expandida={expandida}
      onAlternar={onAlternar}
      testID="seccion-necesidades"
    >
      <SinDiagnostico />
      {/* La clave reinicia el formulario cuando se da o se retira el consentimiento. */}
      {conConsentimiento ? (
        <ConConsentimiento key="con" perfil={perfil} aviso={aviso} onGuardado={onGuardado} />
      ) : (
        <SinConsentimiento key="sin" aviso={aviso} onGuardado={onGuardado} />
      )}
    </SeccionDesplegable>
  );
}

const estilos = StyleSheet.create({
  sinDiagnostico: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: radio.md,
    backgroundColor: colores.infoFondo,
  },
  textoSinDiagnostico: { flex: 1, color: colores.infoTexto },
  grupo: { gap: espaciado.xs },
  tituloGrupo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
});
