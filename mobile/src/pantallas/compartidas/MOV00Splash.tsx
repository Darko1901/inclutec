import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Logotipo, Pantalla, Texto } from '../../componentes';
import { useSesion } from '../../sesion';
import { colores, espaciado } from '../../tema';

/** MOV-00: muestra el logotipo y valida la sesión guardada (máximo 3 s). */
export default function MOV00Splash() {
  const { restaurarSesion } = useSesion();

  useEffect(() => {
    void restaurarSesion();
  }, [restaurarSesion]);

  return (
    <Pantalla centrado>
      <View style={estilos.centro}>
        <Logotipo />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Cargando IncluTec"
          accessibilityState={{ busy: true }}
          style={estilos.carga}
        >
          <ActivityIndicator color={colores.primario} />
          <Texto variante="pequeno" color="textoSecundarioSobreGris">
            Cargando…
          </Texto>
        </View>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', gap: espaciado.xxl },
  carga: { alignItems: 'center', gap: espaciado.sm },
});
